<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use App\Models\Announcement;
use App\Models\SubscriptionPayment;
use App\Mail\SystemAnnouncementMail;
use App\Mail\SubscriptionReminderMail;
use App\Mail\PaymentApprovedMail;
use App\Mail\PaymentRejectedMail;
use App\Mail\StoreSuspendedMail;
use App\Mail\TenantInviteMail;
use App\Services\ActivityService;
use App\Services\ImageCompressionService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use App\Models\SystemSetting;
use Illuminate\Validation\Rules;
use Illuminate\Support\Str;
use Inertia\Inertia;

class DeveloperController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | PAGE RENDERING METHODS (GET)
    |--------------------------------------------------------------------------
    */

    /**
     * Main Developer Overview (Dashboard)
     */
    public function index()
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $currentMonth = now()->month;
        $currentYear = now()->year;

        $monthlyRevenue = SubscriptionPayment::where('status', 'approved')
            ->whereMonth('created_at', $currentMonth)
            ->whereYear('created_at', $currentYear)
            ->sum('amount');

        $allTimeRevenue = SubscriptionPayment::where('status', 'approved')
            ->sum('amount');

        $activeStores = Store::where('status', true)->count();
        $suspendedStores = Store::where('status', false)->count();
        $pendingPayments = SubscriptionPayment::where('status', 'pending')->count();

        return Inertia::render('Developer/Dashboard', [
            'stats' => [
                'monthly_revenue' => $monthlyRevenue,
                'all_time_revenue' => $allTimeRevenue,
                'active_stores' => $activeStores,
                'suspended_stores' => $suspendedStores,
                'pending_payments' => $pendingPayments,
            ]
        ]);
    }

    /**
     * Tenant Management Page
     */
    public function tenants(Request $request)
    {
        $query = Store::with(['users', 'plan']);

        // 1. Search Filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%")
                ->orWhereHas('users', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
        }

        // 2. Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status === 'active' ? 1 : 0);
        }

        // 3. Plan Filter
        if ($request->filled('plan') && $request->plan !== 'all') {
            $query->where('plan_id', $request->plan);
        }

        // Pass `withQueryString()` to keep filter parameters when switching pages!
        $stores = $query->latest()->paginate(9)->withQueryString();

        return inertia('Developer/Tenants', [
            'stores' => $stores,
            'plans'  => Plan::all()
        ]);
    }
    /**
     * Pricing Plans & Billing Page
     */
    public function billing()
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $plans = Plan::latest()->get();

        return Inertia::render('Developer/Billing', [
            'plans' => $plans
        ]);
    }

    /**
     * System Broadcasts Page
     */
    public function broadcasts()
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $announcements = Announcement::latest()->paginate(10);

        return Inertia::render('Developer/Broadcasts', [
            'announcements' => $announcements
        ]);
    }

    /**
     * Pending Approvals Page (With Pagination for Live Table)
     */
    public function pendingApprovals()
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $pending = SubscriptionPayment::with([
            'plan',
            'store.plan',
            'store.users' => fn($q) => $q->where('role', 'admin')
        ])
            ->where('status', 'pending')
            ->latest()
            ->paginate(10);

        return Inertia::render('Developer/Payments/Pending', [
            'payments' => $pending
        ]);
    }

    /**
     * Payment History / Audit Log
     */
    public function paymentHistory(Request $request)
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $history = SubscriptionPayment::with([
            'store.plan',
            'store.users' => fn($q) => $q->where('role', 'admin')
        ])
            ->whereIn('status', ['approved', 'rejected'])
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->start_date, function ($query, $startDate) {
                $query->whereDate('created_at', '>=', $startDate);
            })
            ->when($request->end_date, function ($query, $endDate) {
                $query->whereDate('created_at', '<=', $endDate);
            })
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('reference_number', 'like', "%{$search}%")
                        ->orWhere('full_name', 'like', "%{$search}%")
                        ->orWhereHas('store', fn($s) => $s->where('name', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Developer/Payments/History', [
            'history' => $history,
            'filters' => $request->only(['search', 'status', 'start_date', 'end_date'])
        ]);
    }

    /**
     * Overdue Stores (Red Zone)
     */
    public function overduePayments(Request $request)
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $search = $request->input('search', '');

        $overdue = Store::with(['plan', 'users' => fn($q) => $q->where('role', 'admin')])
            ->where('subscription_ends_at', '<', now())

            // --- ADDED SEARCH FILTER ---
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhereHas(
                            'users',
                            fn($u) =>
                            $u->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                        );
                });
            })
            // ---------------------------

            ->orderBy('subscription_ends_at', 'asc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Developer/Payments/Overdue', [
            'stores' => $overdue,
            'filters' => ['search' => $search] // Pass filter back to keep state synced
        ]);
    }

    /**
     * Upcoming Renewals
     */
    public function upcomingRenewals(Request $request)
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $days = $request->input('days', 7);
        $search = $request->input('search', '');
        $planId = $request->input('plan', ''); // Grab the plan filter

        $now = now();
        $window = now()->addDays((int)$days);

        $upcoming = Store::with(['plan', 'users' => fn($q) => $q->where('role', 'admin')])
            ->whereBetween('subscription_ends_at', [$now, $window])

            // --- NEW: Filter by specific Plan ---
            ->when($planId, function ($query, $planId) {
                $query->where('plan_id', $planId);
            })

            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhereHas('users', fn($u) => $u->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->orderBy('subscription_ends_at', 'asc')
            ->paginate(15)
            ->withQueryString();

        // --- NEW: Fetch all active plans for the dropdown ---
        $plans = Plan::where('is_active', true)->get();

        return Inertia::render('Developer/Payments/Upcoming', [
            'stores' => $upcoming,
            'plans' => $plans, // Pass the plans to React
            'filters' => [
                'days' => (int)$days,
                'search' => $search,
                'plan' => $planId // Keep state synced
            ]
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ACTION METHODS (POST)
    |--------------------------------------------------------------------------
    */

    /**
     * Create New Billing Plan
     */
    public function storePlan(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'duration_months' => 'required|integer|min:1',
            'price' => 'required|numeric|min:0',
        ]);

        $plan = Plan::create([
            'name' => $request->name,
            'duration_months' => $request->duration_months,
            'price' => $request->price,
            'is_active' => true,
        ]);

        ActivityService::logCreate('Plan', $plan->id, "Created plan: {$plan->name}", [
            'name' => $plan->name,
            'duration_months' => $plan->duration_months,
            'price' => $plan->price,
            'is_active' => $plan->is_active,
        ]);

        return redirect()->back()->with('success', 'New pricing plan created successfully!');
    }

    /**
     * Provision Store (Invite Flow)
     */
    public function storeStore(Request $request)
    {
        $request->validate([
            'owner_name'  => 'required|string|max:255',
            'owner_email' => 'required|string|email|max:255|unique:users,email',
            'plan_id'     => 'required|exists:plans,id',
        ]);

        $plan = Plan::find($request->plan_id);
        $endsAt = now()->addMonths($plan->duration_months);

        $user = DB::transaction(function () use ($request, $endsAt, $plan) {
            $store = Store::create([
                'name'                 => 'Pending Setup - ' . explode('@', $request->owner_email)[0],
                'address'              => 'Pending Details',
                'status'               => true,
                'plan_id'              => $plan->id,
                'subscription_ends_at' => $endsAt,
            ]);

            return User::create([
                'name'              => $request->owner_name,
                'email'             => $request->owner_email,
                'password'          => Hash::make(Str::random(32)),
                'role'              => 'admin',
                'is_admin'          => true,
                'store_id'          => $store->id,
                'email_verified_at' => now(),
            ]);
        });

        ActivityService::log(
            'tenant.invite',
            'create',
            'Store',
            $user->store_id,
            "Invited new tenant owner: {$user->name} ({$user->email})",
            null,
            [
                'store_id' => $user->store_id,
                'owner_name' => $user->name,
                'owner_email' => $user->email,
                'plan_id' => $plan->id,
                'subscription_ends_at' => optional($endsAt)->toDateString(),
            ]
        );

        $setupUrl = URL::temporarySignedRoute('tenant.setup', now()->addDays(7), ['user' => $user->id]);
        Mail::to($user->email)->send(new TenantInviteMail($user, $setupUrl));

        return redirect()->back()->with('success', "Invitation sent! {$user->name} will receive an email to complete setup.");
    }

    public function toggleStatus(Store $store)
    {
        $oldStatus = $store->status;
        $store->update(['status' => !$store->status]);
        $action = $store->status ? 'reactivated' : 'suspended';

        ActivityService::log(
            $store->status ? 'store.reactivate' : 'store.suspend',
            'update',
            'Store',
            $store->id,
            "Store {$store->name} was {$action}",
            ['status' => $oldStatus],
            ['status' => $store->status, 'store_name' => $store->name]
        );

        return redirect()->back()->with('success', "Tenant has been {$action} successfully.");
    }

    public function sendReminder(Store $store)
    {
        $admin = $store->users()->where('role', 'admin')->first();
        if ($admin) {
            Mail::to($admin->email)->send(new SubscriptionReminderMail($store));

            ActivityService::log(
                'store.reminder',
                'action',
                'Store',
                $store->id,
                "Sent subscription reminder to {$admin->email}",
                null,
                [
                    'store_name' => $store->name,
                    'recipient_email' => $admin->email,
                ]
            );

            return redirect()->back()->with('success', "Payment link sent to {$admin->email}.");
        }
        return redirect()->back()->with('error', 'No owner found for this store.');
    }

    /**
     * Approve Payment & Attach PDF Receipt
     */
    public function approvePayment(SubscriptionPayment $payment)
    {
        $oldStatus = $payment->status;
        $store = $payment->store;
        $plan = Plan::find($payment->plan_id) ?? $store->plan;

        if (!$plan) {
            return redirect()->back()->with('error', 'No valid pricing plan found.');
        }

        $baseDate = ($store->subscription_ends_at && $store->subscription_ends_at->isFuture())
            ? $store->subscription_ends_at
            : now();

        $newEnd = $baseDate->copy()->addMonths($plan->duration_months);

        DB::transaction(function () use ($payment, $store, $newEnd, $plan) {
            $payment->update(['status' => 'approved']);
            $store->update([
                'plan_id' => $plan->id,
                'subscription_ends_at' => $newEnd,
                'status' => true
            ]);
        });

        // Generate the Receipt PDF with symbol fix
        $pdf = Pdf::loadView('pdf.official_receipt', compact('payment'))
            ->setOption(['defaultFont' => 'DejaVu Sans']);

        $pdfContent = $pdf->output();

        $owner = $store->users()->where('role', 'admin')->first();
        if ($owner) {
            Mail::to($owner->email)->send(new PaymentApprovedMail($payment, $pdfContent));
        }

        ActivityService::logPayment(
            'approve',
            $payment->id,
            "Approved subscription payment {$payment->reference_number} for {$store->name}",
            [
                'reference_number' => $payment->reference_number,
                'store_name' => $store->name,
                'old_status' => $oldStatus,
                'new_status' => 'approved',
                'new_subscription_end' => optional($newEnd)->toDateString(),
            ]
        );

        return redirect()->back()->with('success', "Payment approved and receipt emailed.");
    }

    /**
     * Reject Payment
     */
    public function rejectPayment(Request $request, SubscriptionPayment $payment)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $oldStatus = $payment->status;
        $payment->update(['status' => 'rejected']);

        $paymentUrl = route('tenant.billing.portal');

        $owner = $payment->store->users()->where('role', 'admin')->first();
        if ($owner) {
            Mail::to($owner->email)->send(new PaymentRejectedMail($payment, $request->reason, $paymentUrl));
        }

        ActivityService::logPayment(
            'reject',
            $payment->id,
            "Rejected subscription payment {$payment->reference_number}",
            [
                'reference_number' => $payment->reference_number,
                'old_status' => $oldStatus,
                'new_status' => 'rejected',
                'reason' => $request->reason,
            ]
        );

        return redirect()->back()->with('success', 'Payment rejected. The tenant has been notified.');
    }

    /*
    |--------------------------------------------------------------------------
    | TOOLS & EXPORTS
    |--------------------------------------------------------------------------
    */

    public function storeAnnouncement(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:255',
            'style' => 'required|string|in:info,warning,danger',
        ]);

        Announcement::where('is_active', true)->update(['is_active' => false]);
        $announcement = Announcement::create(['message' => $request->message, 'style' => $request->style, 'is_active' => true]);

        $adminEmails = User::where('role', 'admin')->pluck('email')->toArray();
        if (!empty($adminEmails)) {
            Mail::bcc($adminEmails)->send(new SystemAnnouncementMail($request->message));
        }

        ActivityService::log(
            'announcement.create',
            'create',
            'Announcement',
            $announcement->id,
            'Published a system announcement',
            null,
            [
                'message' => $announcement->message,
                'style' => $announcement->style,
                'is_active' => $announcement->is_active,
            ]
        );

        return redirect()->back()->with('success', 'Announcement broadcasted!');
    }

    public function clearAnnouncement()
    {
        Announcement::where('is_active', true)->update(['is_active' => false]);

        ActivityService::log(
            'announcement.clear',
            'update',
            'Announcement',
            null,
            'Cleared active system announcements'
        );

        return redirect()->back()->with('success', 'Announcement cleared.');
    }

    public function suspendStore(Store $store)
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $oldStatus = $store->status;
        $store->update(['status' => false]);

        $owner = $store->users()->where('role', 'admin')->first();
        if ($owner && $owner->email) {
            Mail::to($owner->email)->send(new StoreSuspendedMail($store));
        }

        ActivityService::log(
            'store.suspend',
            'update',
            'Store',
            $store->id,
            "Store {$store->name} suspended",
            ['status' => $oldStatus],
            ['status' => false, 'store_name' => $store->name]
        );

        return redirect()->back()->with('success', "{$store->name} has been suspended.");
    }

    /**
     * Export Entire Pending Queue as PDF
     */
    public function downloadPendingList()
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $payments = SubscriptionPayment::with(['store', 'plan'])
            ->where('status', 'pending')
            ->latest()
            ->get();

        if ($payments->isEmpty()) {
            return redirect()->back()->with('error', 'No pending payments to download.');
        }

        ActivityService::log(
            'report.export.pending_payments',
            'action',
            'SubscriptionPayment',
            null,
            'Exported pending approvals PDF',
            null,
            [
                'records_count' => $payments->count(),
            ]
        );

        $pdf = Pdf::loadView('pdf.pending_list', compact('payments'))
            ->setPaper('a4', 'landscape')
            ->setWarnings(false)
            ->setOption(['defaultFont' => 'DejaVu Sans']);

        return $pdf->download("Pending-Approvals-" . now()->format('Y-m-d') . ".pdf");
    }




    /**
     * Display System Information Page
     */
    public function systemInfo()
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        // Pluck all settings into a simple key => value array for React
        $settings = SystemSetting::pluck('value', 'key')->toArray();

        // Decode payment methods if they exist
        $paymentMethodsJson = $settings['payment_methods'] ?? null;
        if ($paymentMethodsJson) {
            $settings['payment_methods'] = json_decode($paymentMethodsJson, true);
        } else {
            $settings['payment_methods'] = [];
        }

        return Inertia::render('Developer/SystemInfo', [
            'settings' => $settings
        ]);
    }

    /**
     * Display Policy Documents Page
     */
    public function policies()
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $keys = [
            'terms_of_service',
            'privacy_policy',
            'staff_terms_of_service',
            'staff_privacy_policy',
        ];

        $settings = SystemSetting::whereIn('key', $keys)->pluck('value', 'key')->toArray();

        foreach ($keys as $key) {
            $settings[$key] = $settings[$key] ?? '';
        }

        return Inertia::render('Developer/Policies', [
            'policySettings' => $settings,
        ]);
    }

    /**
     * Save Policy Documents
     */
    public function updatePolicies(Request $request)
    {
        if (Auth::user()->role !== 'super_admin') abort(403);

        $validated = $request->validate([
            'terms_of_service' => 'nullable|string|max:65000',
            'privacy_policy' => 'nullable|string|max:65000',
            'staff_terms_of_service' => 'nullable|string|max:65000',
            'staff_privacy_policy' => 'nullable|string|max:65000',
        ]);

        $keys = [
            'terms_of_service',
            'privacy_policy',
            'staff_terms_of_service',
            'staff_privacy_policy',
        ];

        $oldSettings = SystemSetting::whereIn('key', $keys)->pluck('value', 'key')->toArray();

        foreach ($keys as $key) {
            SystemSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $validated[$key] ?? null]
            );
        }

        $newSettings = SystemSetting::whereIn('key', $keys)->pluck('value', 'key')->toArray();

        if ($oldSettings !== $newSettings) {
            ActivityService::log(
                'system.policies.update',
                'update',
                'SystemSetting',
                null,
                'Updated policy documents',
                $oldSettings,
                $newSettings
            );
        }

        return redirect()->back()->with('success', 'Policy documents updated successfully.');
    }

    /**
     * Save System Information
     */
    public function updateSystemInfo(\Illuminate\Http\Request $request)
    {
        if (\Illuminate\Support\Facades\Auth::user()->role !== 'super_admin') abort(403);

        $oldSettings = SystemSetting::whereIn('key', [
            'app_name',
            'support_email',
            'support_phone',
            'company_address',
            'logo_path',
            'payment_methods',
        ])->pluck('value', 'key')->toArray();

        $request->validate([
            'app_name' => 'nullable|string|max:255',
            'support_email' => 'nullable|email|max:255',
            'support_phone' => 'nullable|string|max:255',
            'company_address' => 'nullable|string|max:500',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:2048', // 2MB Max
            'payment_methods' => 'nullable|json',
        ]);

        try {
            // Handle the Logo Upload securely
            if ($request->hasFile('logo')) {
                try {
                    // Delete old logo if it exists
                    $currentLogo = SystemSetting::where('key', 'logo_path')->first();
                    if ($currentLogo && $currentLogo->value && Storage::disk('public')->exists($currentLogo->value)) {
                        Storage::disk('public')->delete($currentLogo->value);
                    }

                    $file = $request->file('logo');

                    \Illuminate\Support\Facades\Log::info('Logo upload debug:', [
                        'isValid' => $file->isValid(),
                        'error' => $file->getError(),
                        'errorMessage' => $file->getErrorMessage(),
                        'realPath' => $file->getRealPath(),
                        'pathname' => $file->getPathname(),
                        'mimeType' => $file->getMimeType(),
                        'clientOriginalName' => $file->getClientOriginalName(),
                        'clientOriginalExtension' => $file->getClientOriginalExtension(),
                    ]);

                    // Skip compression for SVG as it is vector-based and not supported by the GD decoder
                    if ($file->getClientOriginalExtension() === 'svg' || $file->getMimeType() === 'image/svg+xml') {
                        $logoPath = $file->store('system', 'public');
                    } else {
                        $imageCompression = new ImageCompressionService();
                        $logoPath = $imageCompression->compressLogo($file);
                    }

                    \App\Models\SystemSetting::updateOrCreate(
                        ['key' => 'logo_path'],
                        ['value' => $logoPath]
                    );
                } catch (\Exception $e) {
                    Log::error('Logo compression failed: ' . $e->getMessage());
                    // Fallback to original upload safely
                    $file = $request->file('logo');
                    if ($file->isValid() && !empty($file->getRealPath())) {
                        $logoPath = $file->store('system', 'public');
                        \App\Models\SystemSetting::updateOrCreate(
                            ['key' => 'logo_path'],
                            ['value' => $logoPath]
                        );
                    } else {
                        return back()->withErrors(['logo' => 'The uploaded logo could not be processed. Please try another image file.']);
                    }
                }
            }

            // Update the rest of the text fields
            $fields = ['app_name', 'support_email', 'support_phone', 'company_address'];

            foreach ($fields as $field) {
                if ($request->has($field) && $request->input($field) !== null) {
                    \App\Models\SystemSetting::updateOrCreate(
                        ['key' => $field],
                        ['value' => $request->input($field)]
                    );
                }
            }

            // Handle payment methods
            if ($request->has('payment_methods') && $request->input('payment_methods') !== null) {
                $paymentMethods = json_decode($request->input('payment_methods'), true);
                if (is_array($paymentMethods)) {
                    $oldPaymentMethods = json_decode($oldSettings['payment_methods'] ?? '[]', true) ?: [];

                    \App\Models\SystemSetting::updateOrCreate(
                        ['key' => 'payment_methods'],
                        ['value' => json_encode($paymentMethods)]
                    );

                    $makeKey = function (array $method): string {
                        $type = strtolower((string) ($method['type'] ?? ''));
                        $number = preg_replace('/\s+/', '', (string) ($method['number'] ?? ''));
                        return $type . '|' . $number;
                    };

                    $oldByKey = collect($oldPaymentMethods)->mapWithKeys(fn($m) => [$makeKey($m) => $m]);
                    $newByKey = collect($paymentMethods)->mapWithKeys(fn($m) => [$makeKey($m) => $m]);

                    $removedKeys = $oldByKey->keys()->diff($newByKey->keys());
                    foreach ($removedKeys as $key) {
                        $method = $oldByKey->get($key);
                        ActivityService::log(
                            'system.payment_methods.delete',
                            'delete',
                            'SystemSetting',
                            null,
                            'Deleted payment method from system information',
                            ['payment_method' => $method],
                            null
                        );
                    }

                    $addedKeys = $newByKey->keys()->diff($oldByKey->keys());
                    foreach ($addedKeys as $key) {
                        $method = $newByKey->get($key);
                        ActivityService::log(
                            'system.payment_methods.create',
                            'create',
                            'SystemSetting',
                            null,
                            'Added payment method to system information',
                            null,
                            ['payment_method' => $method]
                        );
                    }

                    $commonKeys = $newByKey->keys()->intersect($oldByKey->keys());
                    foreach ($commonKeys as $key) {
                        $oldMethod = $oldByKey->get($key);
                        $newMethod = $newByKey->get($key);

                        if ($oldMethod !== $newMethod) {
                            ActivityService::log(
                                'system.payment_methods.update',
                                'update',
                                'SystemSetting',
                                null,
                                'Updated payment method in system information',
                                ['payment_method' => $oldMethod],
                                ['payment_method' => $newMethod]
                            );
                        }
                    }
                }
            }

            $newSettings = SystemSetting::whereIn('key', [
                'app_name',
                'support_email',
                'support_phone',
                'company_address',
                'logo_path',
                'payment_methods',
            ])->pluck('value', 'key')->toArray();

            $oldSettingsForLog = $oldSettings;
            $newSettingsForLog = $newSettings;
            unset($oldSettingsForLog['payment_methods'], $newSettingsForLog['payment_methods']);

            if ($oldSettingsForLog !== $newSettingsForLog) {
                ActivityService::log(
                    'system.update',
                    'update',
                    'SystemSetting',
                    null,
                    'Updated system information settings',
                    $oldSettingsForLog,
                    $newSettingsForLog
                );
            }

            return redirect()->back()->with('success', 'System Information updated successfully.');
        } catch (\Exception $e) {
            Log::error('System info update failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to update system information');
        }
    }

   // =====================================================================
    // GLOBAL USER MANAGEMENT
    // =====================================================================

    /**
     * Display a listing of all users across the system.
     */
    public function users(Request $request)
    {
        $query = \App\Models\User::with('store');

        // 1. Search Filter (Now includes searching by Account Number)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('account_number', 'like', "%{$search}%"); // Search by ID!
            });
        }

        // 2. Role Filter
        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        $users = $query->latest()->paginate(9)->withQueryString();

        return inertia('Developer/Users', [
            'users' => $users,
            'roles' => ['super_admin', 'admin', 'cashier']
        ]);
    }

    /**
     * Store a newly created user in storage.
     */
    public function storeUser(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'role' => 'required|in:super_admin,admin,cashier',
            'password' => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::defaults()],

            // New Extended Fields
            'phone_number' => ['nullable', 'string', 'max:20'],
            'address'      => ['nullable', 'string', 'max:255'],
            'city'         => ['nullable', 'string', 'max:100'],
            'province'     => ['nullable', 'string', 'max:100'],
            'country'      => ['nullable', 'string', 'max:100'],
            'avatar'       => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        $user = \App\Models\User::create([
            'name'         => $request->name,
            'email'        => $request->email,
            'role'         => $request->role,
            'password'     => \Illuminate\Support\Facades\Hash::make($request->password),
            'is_admin'     => in_array($request->role, ['super_admin', 'admin']),
            'phone_number' => $request->phone_number,
            'address'      => $request->address,
            'city'         => $request->city,
            'province'     => $request->province,
            'country'      => $request->country,
        ]);

        // Handle Avatar Upload on Creation
        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->avatar_path = $path;
            $user->save();
        }

        ActivityService::logCreate('User', $user->id, "Created global user: {$user->name} ({$user->email})", [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_admin' => $user->is_admin,
        ]);

        return redirect()->back()->with('success', 'User created successfully.');
    }

    /**
     * Update the specified user in storage.
     */
    public function updateUser(Request $request, \App\Models\User $user)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'role' => 'required|in:super_admin,admin,cashier',
            'password' => ['nullable', 'confirmed', \Illuminate\Validation\Rules\Password::defaults()],

            // New Extended Fields
            'phone_number' => ['nullable', 'string', 'max:20'],
            'address'      => ['nullable', 'string', 'max:255'],
            'city'         => ['nullable', 'string', 'max:100'],
            'province'     => ['nullable', 'string', 'max:100'],
            'country'      => ['nullable', 'string', 'max:100'],
            'avatar'       => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        $oldValues = [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_admin' => $user->is_admin,
            'phone_number' => $user->phone_number,
            'address' => $user->address,
            'city' => $user->city,
            'province' => $user->province,
            'country' => $user->country,
        ];
        $oldRole = $user->role;
        $oldEmail = $user->email;

        $user->name = $request->name;
        $user->email = $request->email;
        $user->role = $request->role;
        $user->is_admin = in_array($request->role, ['super_admin', 'admin']);

        $user->phone_number = $request->phone_number;
        $user->address = $request->address;
        $user->city = $request->city;
        $user->province = $request->province;
        $user->country = $request->country;

        // Handle Avatar Upload & Clean up old avatar
        if ($request->hasFile('avatar')) {
            if ($user->avatar_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($user->avatar_path)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar_path);
            }
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->avatar_path = $path;
        }

        // Only update the password if a new one was provided
        if ($request->filled('password')) {
            $user->password = \Illuminate\Support\Facades\Hash::make($request->password);
            ActivityService::logPasswordChange($user->id, "Password changed for global user: {$user->name}");
        }

        $user->save();

        if ($oldRole !== $user->role) {
            ActivityService::logRoleChange($user->id, $oldRole, $user->role, "Global role changed for {$user->name}");
        }

        if ($oldEmail !== $user->email) {
            ActivityService::logEmailChange($user->id, $oldEmail, $user->email, "Global email changed for {$user->name}");
        }

        ActivityService::logUpdate('User', $user->id, "Updated global user: {$user->name}", $oldValues, [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_admin' => $user->is_admin,
            'phone_number' => $user->phone_number,
            'address' => $user->address,
            'city' => $user->city,
            'province' => $user->province,
            'country' => $user->country,
        ]);

        return redirect()->back()->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroyUser(\App\Models\User $user)
    {
        // Prevent the Super Admin from accidentally deleting themselves
        if ($user->id === \Illuminate\Support\Facades\Auth::id()) {
            return redirect()->back()->with('error', 'You cannot delete your own account.');
        }

        // Prevent deleting the very last super admin to avoid locking everyone out
        if ($user->role === 'super_admin' && \App\Models\User::where('role', 'super_admin')->count() <= 1) {
            return redirect()->back()->with('error', 'You cannot delete the last Super Admin.');
        }

        // Clean up: Delete the user's avatar from storage before deleting the account
        if ($user->avatar_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($user->avatar_path)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar_path);
        }

        ActivityService::logDelete('User', $user->id, "Deleted global user: {$user->name} ({$user->email})", [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_admin' => $user->is_admin,
        ]);

        $user->delete();

        return redirect()->back()->with('success', 'User deleted successfully.');
    }
}
