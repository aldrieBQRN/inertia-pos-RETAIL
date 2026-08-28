<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HeldOrderController;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\TerminalController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DeveloperController;
use App\Http\Controllers\Api\SetupController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\TenantSetupController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/**
 * ========================================================================
 * PUBLIC ONBOARDING (MAGIC LINKS)
 * These MUST remain outside the 'auth' middleware so new users
 * can access them without being logged in.
 * ========================================================================
 */

// 1. Tenant/Store Owner Setup (Initial Store Creation)
Route::get('/setup/{user}', [TenantSetupController::class, 'show'])
    ->name('tenant.setup')
    ->middleware(['signed', 'throttle:guest_api']);

Route::post('/setup/{user}', [TenantSetupController::class, 'submit'])
    ->name('tenant.setup.submit')
    ->middleware(['signed', 'throttle:guest_api']);

// 2. Staff Setup (Onboarding via Admin Invitation)
// These routes handle the "Ultimate Tech Solution" onboarding flow
Route::get('/setup-account/{user}', [SetupController::class, 'show'])
    ->name('staff.setup')
    ->middleware(['signed', 'throttle:guest_api']); // Prevents link tampering

Route::post('/setup-account/{user}', [SetupController::class, 'store'])
    ->name('staff.setup.store')
    ->middleware(['signed', 'throttle:guest_api']);


/**
 * TENANT BILLING PORTAL
 * Requires login, but bypassed Tenant Status (so expired stores can pay).
 */
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/portal/billing', [BillingController::class, 'portal'])->name('tenant.billing.portal');
    Route::post('/portal/billing', [BillingController::class, 'store'])->name('tenant.billing.submit');
    Route::get('/api/portal/billing/history', [BillingController::class, 'getHistory'])->name('tenant.billing.history');
});


// Explicit route for Web App Manifest to ensure correct application/manifest+json Content-Type
Route::get('/manifest.webmanifest', function () {
    $path = public_path('manifest.webmanifest');
    if (file_exists($path)) {
        return response()->file($path, [
            'Content-Type' => 'application/manifest+json; charset=utf-8',
            'Cache-Control' => 'public, max-age=3600'
        ]);
    }
    return response()->json(['name' => 'Inertia POS', 'short_name' => 'POS', 'start_url' => '/'], 200, [
        'Content-Type' => 'application/manifest+json; charset=utf-8'
    ]);
});

/**
 * ROOT REDIRECT LOGIC
 */
Route::get('/', function () {
    if (Auth::check()) {
        $role = Auth::user()->role;
        if ($role === 'super_admin') return redirect()->route('developer.index');
        if ($role === 'admin') return redirect()->route('dashboard');
        return redirect()->route('pos');
    }
    return redirect()->route('login');
});


/**
 * MAIN APPLICATION VIEWS (Inertia/React)
 * Requires: Authentication + Verified Email + Active Subscription Status
 */
Route::middleware(['auth', 'verified', \App\Http\Middleware\CheckTenantStatus::class])->group(function () {

    // Dashboard: Restricted to Store Admins only
    Route::get('/dashboard', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'super_admin') return redirect()->route('developer.index');
        if (!$user->is_admin) return redirect()->route('pos');

        $statsRes = app(\App\Http\Controllers\Api\DashboardController::class)->index($request);
        $stats = $statsRes instanceof \Illuminate\Http\JsonResponse ? $statsRes->getData(true) : $statsRes;

        return Inertia::render('Dashboard', [
            'initial_stats' => $stats,
        ]);
    })->name('dashboard');

    // NEW: Analytics & Reports: Restricted to Store Admins only
    Route::get('/reports', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'super_admin') return redirect()->route('developer.index');
        if (!$user->is_admin) return redirect()->route('pos');

        $reportsRes = app(\App\Http\Controllers\Api\ReportController::class)->index($request);
        $reportData = $reportsRes instanceof \Illuminate\Http\JsonResponse ? $reportsRes->getData(true) : $reportsRes;

        return Inertia::render('Reports', [
            'initial_report_data' => $reportData,
        ]);
    })->name('reports');

    // POS Terminal
    Route::get('/pos', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'super_admin') return redirect()->route('developer.index');
        if ($user->is_admin) return redirect()->route('dashboard');

        // Preload data so POS renders instantly with zero loading delay or layout shift
        $terminalsRes = app(\App\Http\Controllers\Api\TerminalController::class)->index($request);
        $terminals = $terminalsRes instanceof \Illuminate\Http\JsonResponse ? $terminalsRes->getData(true) : $terminalsRes;

        $categories = \App\Models\Category::where('store_id', $user->store_id)
            ->orderBy('name', 'asc')
            ->get();

        $products = \App\Models\Product::where('store_id', $user->store_id)
            ->where('is_active', true)
            ->with('category')
            ->orderBy('name', 'asc')
            ->get();

        $shiftRes = app(\App\Http\Controllers\Api\ShiftController::class)->current($request);
        $shiftData = $shiftRes instanceof \Illuminate\Http\JsonResponse ? $shiftRes->getData(true) : $shiftRes;
        $heldOrders = \App\Models\HeldOrder::orderBy('created_at', 'desc')->get();

        return Inertia::render('PosTerminal', [
            'initial_shift_data' => $shiftData,
            'initial_terminals' => $terminals,
            'initial_categories' => $categories,
            'initial_products' => $products,
            'initial_held_orders' => $heldOrders,
        ]);
    })->name('pos');

    // Inventory Management
    Route::get('/inventory', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'super_admin') return redirect()->route('developer.index');

        $categories = \App\Models\Category::where('store_id', $user->store_id)
            ->orderBy('name', 'asc')
            ->get();

        $products = \App\Models\Product::where('store_id', $user->store_id)
            ->with('category')
            ->orderBy('created_at', 'desc')
            ->get();

        // Preload recent activity feed for instant zero-delay modal opening
        $storeId = $user->store_id;
        $logs = \App\Models\ActivityLog::where('store_id', $storeId)
            ->where(function ($q) {
                $q->whereIn('model_type', ['Product', 'Inventory', 'Category'])
                  ->orWhere('action', 'like', '%stock%')
                  ->orWhere('action', 'like', '%product%')
                  ->orWhere('action', 'like', '%category%');
            })
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => 'log-' . $log->id,
                    'action' => $log->action,
                    'model_type' => $log->model_type,
                    'model_id' => $log->model_id,
                    'reference_no' => 'LOG-' . str_pad($log->id, 5, '0', STR_PAD_LEFT),
                    'description' => $log->description,
                    'user_name' => $log->user ? $log->user->name : 'System',
                    'user_avatar' => $log->user && $log->user->avatar_path ? (str_starts_with($log->user->avatar_path, 'http') ? $log->user->avatar_path : asset('storage/' . $log->user->avatar_path)) : null,
                    'user_account_number' => $log->user ? $log->user->account_number : null,
                    'old_values' => $log->old_values,
                    'new_values' => $log->new_values,
                    'created_at' => $log->created_at ? $log->created_at->toIso8601String() : now()->toIso8601String(),
                ];
            });

        $sales = \App\Models\SaleItem::whereHas('sale', fn($q) => $q->where('store_id', $storeId))
            ->with(['sale.cashier', 'product'])
            ->orderBy('created_at', 'desc')
            ->limit(30)
            ->get()
            ->map(function ($item) {
                $prodName = $item->product ? $item->product->name : ($item->custom_name ?: 'Product Item');
                $invoice = $item->sale ? $item->sale->invoice_number : '';
                return [
                    'id' => 'sale-' . $item->id,
                    'action' => 'stock.sale',
                    'model_type' => 'Product',
                    'model_id' => $item->product_id,
                    'invoice_number' => $invoice,
                    'reference_no' => $invoice ?: ('SALE-' . str_pad($item->sale_id ?: $item->id, 5, '0', STR_PAD_LEFT)),
                    'sku' => $item->product ? $item->product->sku : null,
                    'description' => "Sold {$item->quantity}x {$prodName} via POS" . ($invoice ? " (Inv: {$invoice})" : ""),
                    'user_name' => $item->sale && $item->sale->cashier ? $item->sale->cashier->name : 'Cashier',
                    'user_avatar' => $item->sale && $item->sale->cashier && $item->sale->cashier->avatar_path ? (str_starts_with($item->sale->cashier->avatar_path, 'http') ? $item->sale->cashier->avatar_path : asset('storage/' . $item->sale->cashier->avatar_path)) : null,
                    'user_account_number' => $item->sale && $item->sale->cashier ? $item->sale->cashier->account_number : null,
                    'created_at' => $item->created_at ? $item->created_at->toIso8601String() : now()->toIso8601String(),
                ];
            });

        $recentProducts = \App\Models\Product::where('store_id', $storeId)
            ->orderBy('created_at', 'desc')
            ->limit(15)
            ->get()
            ->map(function ($p) {
                return [
                    'id' => 'prod-reg-' . $p->id,
                    'action' => 'created',
                    'model_type' => 'Product',
                    'model_id' => $p->id,
                    'sku' => $p->sku,
                    'reference_no' => $p->sku ? ('SKU: ' . $p->sku) : ('PRD-' . str_pad($p->id, 5, '0', STR_PAD_LEFT)),
                    'description' => "Registered new product: {$p->name} (SKU: {$p->sku}) with {$p->stock_quantity} units",
                    'user_name' => 'Store Admin',
                    'user_avatar' => null,
                    'user_account_number' => null,
                    'created_at' => $p->created_at ? $p->created_at->toIso8601String() : now()->toIso8601String(),
                ];
            });

        $initialActivity = $logs->concat($sales)->concat($recentProducts)->sortByDesc('created_at')->values()->take(50)->all();

        // Preload complete stock history for products so the modal opens with all movements immediately
        $allSaleItems = \App\Models\SaleItem::whereHas('sale', fn($q) => $q->where('store_id', $storeId))
            ->with(['sale.cashier'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('product_id');

        $allProductLogs = \App\Models\ActivityLog::where('store_id', $storeId)
            ->whereIn('model_type', ['Product', 'Inventory'])
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('model_id');

        $stockHistories = [];
        foreach ($products as $p) {
            $prodSales = ($allSaleItems->get($p->id) ?? collect())->map(function ($item) {
                $inv = $item->sale && $item->sale->invoice_number 
                    ? $item->sale->invoice_number 
                    : ('POS-' . str_pad($item->sale_id ?? $item->id, 5, '0', STR_PAD_LEFT));

                return [
                    'id' => 'sale-' . $item->id,
                    'type' => 'sale',
                    'quantity_change' => -$item->quantity,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price / 100,
                    'subtotal' => $item->subtotal / 100,
                    'invoice_number' => $inv,
                    'reference_no' => $inv,
                    'user_name' => $item->sale && $item->sale->cashier ? $item->sale->cashier->name : 'POS Cashier',
                    'user_avatar' => $item->sale && $item->sale->cashier && $item->sale->cashier->avatar_path ? (str_starts_with($item->sale->cashier->avatar_path, 'http') ? $item->sale->cashier->avatar_path : asset('storage/' . $item->sale->cashier->avatar_path)) : null,
                    'user_account_number' => $item->sale && $item->sale->cashier ? $item->sale->cashier->account_number : null,
                    'description' => "Sold {$item->quantity} unit(s) via POS (₱" . number_format($item->subtotal / 100, 2) . ")",
                    'created_at' => $item->created_at ? $item->created_at->toIso8601String() : now()->toIso8601String(),
                ];
            });

            $prodLogs = ($allProductLogs->get($p->id) ?? collect())->map(function ($log) {
                $type = 'adjustment';
                $quantityChange = 0;

                if ($log->action === 'stock.adjusted' || str_contains(strtolower($log->action), 'stock')) {
                    $type = 'restock';
                    $quantityChange = (int) ($log->new_values['quantity_added'] ?? $log->new_values['quantity'] ?? 0);
                    if ($quantityChange === 0 && isset($log->new_values['stock_quantity'], $log->old_values['stock_quantity'])) {
                        $quantityChange = (int)$log->new_values['stock_quantity'] - (int)$log->old_values['stock_quantity'];
                    }
                } elseif ($log->action === 'created') {
                    $type = 'creation';
                    $quantityChange = (int) ($log->new_values['stock'] ?? $log->new_values['stock_quantity'] ?? 0);
                }

                $refNo = 'LOG-' . str_pad($log->id, 5, '0', STR_PAD_LEFT);

                return [
                    'id' => 'log-' . $log->id,
                    'type' => $type,
                    'action' => $log->action,
                    'quantity_change' => $quantityChange,
                    'reference_no' => $refNo,
                    'invoice_number' => $refNo,
                    'old_values' => $log->old_values,
                    'new_values' => $log->new_values,
                    'user_name' => $log->user ? $log->user->name : 'Store Admin',
                    'user_avatar' => $log->user && $log->user->avatar_path ? (str_starts_with($log->user->avatar_path, 'http') ? $log->user->avatar_path : asset('storage/' . $log->user->avatar_path)) : null,
                    'user_account_number' => $log->user ? $log->user->account_number : null,
                    'description' => $log->description ?: "Stock updated for product",
                    'created_at' => $log->created_at ? $log->created_at->toIso8601String() : now()->toIso8601String(),
                ];
            });

            $timeline = $prodSales->concat($prodLogs)->all();
            $hasCreation = collect($timeline)->contains(fn($t) => $t['type'] === 'creation');
            if (!$hasCreation && $p->created_at) {
                $skuRef = $p->sku ?: ('PRD-' . str_pad($p->id, 5, '0', STR_PAD_LEFT));
                $timeline[] = [
                    'id' => 'initial-reg-' . $p->id,
                    'type' => 'creation',
                    'action' => 'created',
                    'quantity_change' => $p->stock_quantity,
                    'reference_no' => $skuRef,
                    'invoice_number' => $skuRef,
                    'user_name' => 'Store Admin',
                    'user_avatar' => null,
                    'user_account_number' => null,
                    'description' => "Initial catalog registration for {$p->name} (SKU: {$p->sku})",
                    'created_at' => $p->created_at->toIso8601String(),
                ];
            }

            usort($timeline, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));

            $soldUnits = (int) ($allSaleItems->get($p->id) ?? collect())->sum('quantity');
            $addedUnits = (int) ($allProductLogs->get($p->id) ?? collect())
                ->filter(fn($l) => $l->action === 'stock.adjusted' || str_contains(strtolower($l->action), 'stock'))
                ->sum(fn($l) => (int) ($l->new_values['quantity_added'] ?? $l->new_values['quantity'] ?? 0));

            $stockHistories[$p->id] = [
                'product' => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sku' => $p->sku,
                    'stock_quantity' => $p->stock_quantity,
                    'category_name' => $p->category ? $p->category->name : 'General'
                ],
                'timeline' => $timeline,
                'stats' => [
                    'total_sold_units' => $soldUnits,
                    'total_added_units' => $addedUnits,
                    'current_stock' => $p->stock_quantity,
                    'total_revenue' => (int) ($allSaleItems->get($p->id) ?? collect())->sum('subtotal'),
                    'transaction_count' => ($allSaleItems->get($p->id) ?? collect())->count()
                ]
            ];
        }

        return Inertia::render('Inventory', [
            'initial_products' => $products,
            'initial_categories' => $categories,
            'initial_recent_activity' => $initialActivity,
            'initial_stock_histories' => $stockHistories,
        ]);
    })->name('inventory.index');

    // Transaction History
    Route::get('/transactions', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'super_admin') return redirect()->route('developer.index');

        $transactions = \App\Models\Sale::where('store_id', $user->store_id)
            ->with(['items.product', 'cashier'])
            ->orderBy('created_at', 'desc')
            ->get();

        $settingsRes = app(\App\Http\Controllers\Api\SettingController::class)->index($request);
        $settings = $settingsRes instanceof \Illuminate\Http\JsonResponse ? $settingsRes->getData(true) : $settingsRes;

        return Inertia::render('Transactions', [
            'initial_transactions' => $transactions,
            'initial_settings' => $settings,
        ]);
    })->name('transactions.index');

    // Shift Records (Z-Read History) - Admin Restricted
    Route::get('/shifts', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'super_admin') return redirect()->route('developer.index');

        $shifts = \App\Models\Shift::where('store_id', $user->store_id)
            ->with(['user', 'terminal', 'cashMovements.user'])
            ->orderBy('id', 'desc')
            ->get();

        $terminals = \App\Models\Terminal::where('store_id', $user->store_id)->get();
        $settingsRes = app(\App\Http\Controllers\Api\SettingController::class)->index($request);
        $settings = $settingsRes instanceof \Illuminate\Http\JsonResponse ? $settingsRes->getData(true) : $settingsRes;

        $activeShiftsRes = app(\App\Http\Controllers\Api\ShiftController::class)->activeShifts($request);
        $activeShifts = $activeShiftsRes instanceof \Illuminate\Http\JsonResponse ? $activeShiftsRes->getData(true) : $activeShiftsRes;

        // Precompute detailed breakdown data for all shifts for instant modal preview with 0ms delay
        $shiftDetails = [];
        foreach ($shifts as $shift) {
            $shiftDetails[$shift->id] = [
                'id'                    => $shift->id,
                'staff_name'            => $shift->user?->name ?? 'Staff',
                'staff_avatar'          => $shift->user?->avatar_path ? (str_starts_with($shift->user->avatar_path, 'http') ? $shift->user->avatar_path : asset('storage/' . $shift->user->avatar_path)) : null,
                'staff_role'            => $shift->user?->role ?? 'cashier',
                'start_time'            => $shift->start_time,
                'end_time'              => $shift->end_time,
                'start'                 => $shift->start_time ? $shift->start_time->format('m/d/Y h:i A') : '—',
                'end'                   => $shift->end_time ? $shift->end_time->format('m/d/Y h:i A') : 'ACTIVE',
                'printed_at'            => now()->format('m/d/Y h:i A'),
                'expected_opening_cash' => (float) $shift->expected_opening_cash,
                'starting_cash'         => (float) $shift->starting_cash,
                'opening_discrepancy'   => (float) $shift->opening_discrepancy,
                'opening_notes'         => $shift->opening_notes,
                'closing_notes'         => $shift->closing_notes,
                'cash_sales'            => (float) $shift->cash_sales,
                'cash_in'               => (float) $shift->cash_in,
                'cash_out'              => (float) $shift->cash_out,
                'expenses'              => (float) ($shift->expenses ?? 0),
                'expected_cash'         => (float) $shift->expected_cash,
                'actual_cash'           => (float) $shift->actual_cash,
                'difference'            => (float) $shift->difference,
                'status'                => $shift->status,
                'total_sales'           => (float) $shift->cash_sales,
                'cash_movements'        => $shift->cashMovements,
                'shift_record'          => $shift
            ];
        }

        return Inertia::render('ShiftHistory', [
            'initial_shifts'        => $shifts,
            'initial_terminals'     => $terminals,
            'initial_settings'      => $settings,
            'initial_active_shifts' => $activeShifts,
            'initial_shift_details' => $shiftDetails,
        ]);
    })->name('shifts.index')->middleware('admin');

    // Store Settings
    Route::get('/settings', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'super_admin') return redirect()->route('developer.index');

        $settingsRes = app(\App\Http\Controllers\Api\SettingController::class)->index($request);
        $settings = $settingsRes instanceof \Illuminate\Http\JsonResponse ? $settingsRes->getData(true) : $settingsRes;

        $terminalsRes = app(\App\Http\Controllers\Api\TerminalController::class)->index($request);
        $terminals = $terminalsRes instanceof \Illuminate\Http\JsonResponse ? $terminalsRes->getData(true) : $terminalsRes;

        return Inertia::render('Settings', [
            'initial_settings'  => $settings,
            'initial_terminals' => $terminals,
        ]);
    })->name('settings');

    // User/Staff Management
    Route::get('/users', [UserController::class, 'index'])->name('users.index')->middleware('admin');

    // System Activity Logs - Store Admin Restricted
    Route::get('/activity-logs', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'super_admin') return redirect()->route('developer.activity-logs');
        if (!$user->is_admin) return redirect()->route('pos');

        $storeId = $user->store_id;

        // Fetch store activity logs with user relationship
        $rawLogs = \App\Models\ActivityLog::where('store_id', $storeId)
            ->with(['user:id,name,role,email,account_number,avatar_path'])
            ->orderBy('created_at', 'desc')
            ->limit(500)
            ->get();

        $logs = $rawLogs->map(function ($log) {
            $cat = \App\Models\ActivityLog::resolveCategory($log->action, $log->model_type);
            return [
                'id' => $log->id,
                'action' => $log->action,
                'category' => $cat,
                'model_type' => $log->model_type,
                'model_id' => $log->model_id,
                'description' => $log->description,
                'old_values' => $log->old_values,
                'new_values' => $log->new_values,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'user_id' => $log->user_id,
                'user_name' => $log->user ? $log->user->name : 'System / Auto',
                'user_role' => $log->user ? $log->user->role : 'system',
                'user_account_number' => $log->user ? $log->user->account_number : null,
                'user_avatar' => $log->user && $log->user->avatar_path ? (str_starts_with($log->user->avatar_path, 'http') ? $log->user->avatar_path : asset('storage/' . $log->user->avatar_path)) : null,
                'created_at' => $log->created_at ? $log->created_at->toIso8601String() : now()->toIso8601String(),
            ];
        });

        // Precompute staff members for filter dropdown
        $staffMembers = \App\Models\User::where('store_id', $storeId)
            ->select('id', 'name', 'role', 'email')
            ->orderBy('name')
            ->get();

        $settingsRes = app(\App\Http\Controllers\Api\SettingController::class)->index($request);
        $settings = $settingsRes instanceof \Illuminate\Http\JsonResponse ? $settingsRes->getData(true) : $settingsRes;

        return Inertia::render('ActivityLogs', [
            'initial_logs' => $logs,
            'staff_members' => $staffMembers,
            'initial_settings' => $settings,
        ]);
    })->name('activity-logs.index')->middleware('admin');
});


/**
 * INTERNAL API ENDPOINTS
 */
Route::middleware(['auth', \App\Http\Middleware\CheckTenantStatus::class, 'throttle:auth_api'])->group(function () {

    // Profile Management
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->middleware(\App\Http\Middleware\PreventDemoModifications::class)->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->middleware(\App\Http\Middleware\PreventDemoModifications::class)->name('profile.destroy');

    // OTP Verification Routes
    Route::post('/profile/send-otp', [ProfileController::class, 'sendOtp'])
        ->middleware('throttle.mail')
        ->name('profile.sendOtp');
    Route::post('/profile/verify-otp', [ProfileController::class, 'verifyOtp'])->name('profile.verifyOtp');

    // Staff OTP Verification Routes
    Route::post('/staff/send-otp', [UserController::class, 'sendOtp'])
        ->middleware('throttle.mail')
        ->name('staff.sendOtp');
    Route::post('/staff/verify-otp', [UserController::class, 'verifyOtp'])->name('staff.verifyOtp');

    // API: System Data (Accessible by everyone authenticated)
    Route::get('/api/user', fn(Request $request) => $request->user());
    Route::get('/api/settings', [SettingController::class, 'index']);

    // API: Operational - Shared (Accessible by everyone authenticated)
    Route::post('/api/checkout', [PosController::class, 'checkout'])->middleware('throttle:checkout_api');
    Route::get('/api/products', [ProductController::class, 'index']);
    Route::post('/api/products', [ProductController::class, 'store'])->middleware(\App\Http\Middleware\PreventDemoModifications::class);
    Route::get('/api/products/next-sku', [ProductController::class, 'getNextSku']);
    Route::get('/api/products/{id}/history', [ProductController::class, 'stockHistory']);
    Route::get('/api/inventory/recent-activity', [ProductController::class, 'recentActivity']);
    Route::get('/api/categories', [CategoryController::class, 'index']);
    Route::get('/api/transactions', [TransactionController::class, 'index']);
    Route::get('/api/transactions/{id}', [TransactionController::class, 'show']);
    Route::post('/api/products/{id}/stock', [ProductController::class, 'adjustStock'])->middleware(\App\Http\Middleware\PreventDemoModifications::class);

    // API: Operational & Config - Admin Restricted
    Route::middleware('admin')->group(function () {
        Route::post('/api/settings', [SettingController::class, 'update'])->middleware(\App\Http\Middleware\PreventDemoModifications::class);
        Route::get('/api/dashboard', [DashboardController::class, 'index']);
        Route::get('/api/reports', [ReportController::class, 'index']);
        Route::get('/api/dashboard/export', [DashboardController::class, 'export']);

        Route::post('/api/products/import', [ProductController::class, 'bulkImport'])->middleware(\App\Http\Middleware\PreventDemoModifications::class);
        Route::put('/api/products/{id}', [ProductController::class, 'update'])->middleware(\App\Http\Middleware\PreventDemoModifications::class);
        Route::delete('/api/products/{id}', [ProductController::class, 'destroy'])->middleware(\App\Http\Middleware\PreventDemoModifications::class);
        Route::patch('/api/products/{id}/toggle-active', [ProductController::class, 'toggleActive'])->middleware(\App\Http\Middleware\PreventDemoModifications::class);

        Route::post('/api/categories', [CategoryController::class, 'store'])->middleware(\App\Http\Middleware\PreventDemoModifications::class);
        Route::put('/api/categories/{id}', [CategoryController::class, 'update'])->middleware(\App\Http\Middleware\PreventDemoModifications::class);
        Route::delete('/api/categories/{id}', [CategoryController::class, 'destroy'])->middleware(\App\Http\Middleware\PreventDemoModifications::class);

        Route::post('/api/transactions/{id}/void', [TransactionController::class, 'void']);

        // Shift History API for Admins
        Route::get('/api/shifts', [ShiftController::class, 'index']);

        // Store Activity Logs API
        Route::get('/api/activity-logs', function (Request $request) {
            $user = $request->user();
            $storeId = $user->store_id;
            $rawLogs = \App\Models\ActivityLog::where('store_id', $storeId)
                ->with(['user:id,name,role,email,account_number,avatar_path'])
                ->orderBy('created_at', 'desc')
                ->limit(500)
                ->get();

            $logs = $rawLogs->map(function ($log) {
                $cat = \App\Models\ActivityLog::resolveCategory($log->action, $log->model_type);
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'category' => $cat,
                    'model_type' => $log->model_type,
                    'model_id' => $log->model_id,
                    'description' => $log->description,
                    'old_values' => $log->old_values,
                    'new_values' => $log->new_values,
                    'ip_address' => $log->ip_address,
                    'user_agent' => $log->user_agent,
                    'user_id' => $log->user_id,
                    'user_name' => $log->user ? $log->user->name : 'System / Auto',
                    'user_role' => $log->user ? $log->user->role : 'system',
                    'user_account_number' => $log->user ? $log->user->account_number : null,
                    'user_avatar' => $log->user && $log->user->avatar_path ? (str_starts_with($log->user->avatar_path, 'http') ? $log->user->avatar_path : asset('storage/' . $log->user->avatar_path)) : null,
                    'created_at' => $log->created_at ? $log->created_at->toIso8601String() : now()->toIso8601String(),
                ];
            });

            return response()->json([
                'success' => true,
                'logs' => $logs
            ]);
        });
    });

    // API: Shift Lifecycle & Cash Management (Terminal Operations)
    Route::get('/api/shift/current', [ShiftController::class, 'current']);
    Route::get('/api/shifts/active', [ShiftController::class, 'activeShifts']);
    Route::post('/api/shift/open', [ShiftController::class, 'open']);
    Route::post('/api/shift/cash-movement', [ShiftController::class, 'cashMovement']);
    Route::post('/api/shift/close', [ShiftController::class, 'close']);
    Route::get('/api/pos/shift/data/{id}', [ShiftController::class, 'data']);

    // API: POS Terminals / Registers
    Route::get('/api/terminals', [TerminalController::class, 'index']);
    Route::post('/api/terminals', [TerminalController::class, 'store']);
    Route::put('/api/terminals/{id}', [TerminalController::class, 'update']);
    Route::delete('/api/terminals/{id}', [TerminalController::class, 'destroy']);

    // API: Held Orders (Parked Sales)
    Route::get('/api/held-orders', [HeldOrderController::class, 'index']);
    Route::post('/api/held-orders', [HeldOrderController::class, 'store']);
    Route::delete('/api/held-orders/{id}', [HeldOrderController::class, 'destroy']);

    // API: User Management (Admin Actions)
    Route::middleware(['admin', \App\Http\Middleware\PreventDemoModifications::class])->group(function () {
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
        Route::patch('/users/{user}/toggle-active', [UserController::class, 'toggleActive'])->name('users.toggle-active');
        Route::post('/users/{user}/resend-invite', [UserController::class, 'resendInvite'])->name('users.resend-invite');
    });

    // API: Activity Logs (Admin Audit Trail)
    Route::get('/api/activity-logs', [\App\Http\Controllers\Api\ActivityLogController::class, 'index'])->name('activity-logs.index');
    Route::get('/api/activity-logs/{id}', [\App\Http\Controllers\Api\ActivityLogController::class, 'show'])->name('activity-logs.show');
    Route::get('/api/activity-logs/summary', [\App\Http\Controllers\Api\ActivityLogController::class, 'summary'])->name('activity-logs.summary');
    Route::get('/api/activity-logs/export', [\App\Http\Controllers\Api\ActivityLogController::class, 'export'])->name('activity-logs.export');
});


/**
 * SUPER ADMIN / DEVELOPER ROUTES
 * (Strictly for System Maintainers)
 */
Route::middleware(['auth', 'super_admin'])->prefix('developer')->group(function () {

    // 1. Core Management Pages
    Route::get('/', [DeveloperController::class, 'index'])->name('developer.index');
    Route::get('/tenants', [DeveloperController::class, 'tenants'])->name('developer.tenants');
    Route::get('/billing', [DeveloperController::class, 'billing'])->name('developer.billing');
    Route::get('/broadcasts', [DeveloperController::class, 'broadcasts'])->name('developer.broadcasts');
    Route::get('/activity-logs', [\App\Http\Controllers\Api\ActivityLogController::class, 'index'])->name('developer.activity-logs');
    Route::get('/policies', [DeveloperController::class, 'policies'])->name('developer.policies');

    // 2. Finance Separation
    Route::get('/payments/pending', [DeveloperController::class, 'pendingApprovals'])->name('developer.payments.pending');
    Route::get('/payments/history', [DeveloperController::class, 'paymentHistory'])->name('developer.payments.history');
    Route::get('/payments/overdue', [DeveloperController::class, 'overduePayments'])->name('developer.payments.overdue');
    Route::get('/payments/upcoming', [DeveloperController::class, 'upcomingRenewals'])->name('developer.payments.upcoming');

    // 3. Provisioning & Actions
    Route::post('/stores', [DeveloperController::class, 'storeStore'])->name('developer.stores.store');
    Route::post('/plans', [DeveloperController::class, 'storePlan'])->name('developer.plans.store');
    Route::post('/plans/{plan}/toggle-status', [DeveloperController::class, 'togglePlanStatus'])->name('developer.plans.toggle-status');
    Route::post('/stores/{store}/toggle-status', [DeveloperController::class, 'toggleStatus'])->name('developer.stores.toggle-status');
    Route::post('/stores/{store}/suspend', [DeveloperController::class, 'suspendStore'])->name('developer.stores.suspend');
    Route::post('/stores/{store}/remind', [DeveloperController::class, 'sendReminder'])->name('developer.stores.remind');

    // 4. Payment Approval
    Route::post('/payments/{payment}/approve', [DeveloperController::class, 'approvePayment'])->name('developer.payments.approve');
    Route::post('/payments/{payment}/reject', [DeveloperController::class, 'rejectPayment'])->name('developer.payments.reject');
    Route::get('/payments/export-pdf', [DeveloperController::class, 'downloadPendingList'])->name('developer.payments.export');

    // 5. System Management
    Route::get('/system-info', [DeveloperController::class, 'systemInfo'])->name('developer.system.info');
    Route::post('/system-info', [DeveloperController::class, 'updateSystemInfo'])->name('developer.system.update');
    Route::post('/policies', [DeveloperController::class, 'updatePolicies'])->name('developer.policies.update');

    // 5.5. Announcements/Broadcasts
    Route::post('/announcements', [DeveloperController::class, 'storeAnnouncement'])->name('developer.announcements.store');
    Route::post('/announcements/clear', [DeveloperController::class, 'clearAnnouncement'])->name('developer.announcements.clear');

    // 6. Global User Management (Super Admin level)
    Route::get('/users', [DeveloperController::class, 'users'])->name('developer.users.index');
    Route::post('/users', [DeveloperController::class, 'storeUser'])->name('developer.users.store');
    Route::put('/users/{user}', [DeveloperController::class, 'updateUser'])->name('developer.users.update');
    Route::delete('/users/{user}', [DeveloperController::class, 'destroyUser'])->name('developer.users.destroy');
});

require __DIR__ . '/auth.php';

/**
 * PUBLIC STORAGE ASSET SERVING ROUTE
 * Streams uploaded store logos and product images directly from storage/app/public/
 * Works on InfinityFree / shared hosting without symlink support
 */
Route::get('/storage/{path}', function ($path) {
    $cleanPath = ltrim($path, '/');
    $candidates = [
        storage_path('app/public/' . $cleanPath),
        base_path('storage/app/public/' . $cleanPath),
        __DIR__ . '/../storage/app/public/' . $cleanPath,
        public_path('storage/' . $cleanPath),
        dirname(__DIR__) . '/inertia-pos-core/storage/app/public/' . $cleanPath,
        $_SERVER['DOCUMENT_ROOT'] . '/inertia-pos-core/storage/app/public/' . $cleanPath,
        $_SERVER['DOCUMENT_ROOT'] . '/storage/' . $cleanPath,
    ];

    foreach ($candidates as $file) {
        if (!empty($file) && file_exists($file) && is_file($file)) {
            return response()->file($file);
        }
    }

    abort(404, 'File not found: ' . htmlspecialchars($cleanPath));
})->where('path', '.*')->name('storage.local');

/**
 * SECURE PRODUCTION DATABASE & SYSTEM UTILITY ROUTE
 * Use this to run migrations, seeds, or storage links on InfinityFree
 * URL: /artisan-migrate?token=YOUR_TOKEN[&fresh=1][&seed=1][&storage=1]
 */
Route::get('/artisan-migrate', function (Request $request) {
    $expectedToken = env('MIGRATION_TOKEN', config('app.key'));
    $providedToken = $request->query('token');

    if (empty($providedToken) || empty($expectedToken) || !hash_equals((string) $expectedToken, (string) $providedToken)) {
        return response("<div style='font-family:sans-serif;padding:30px;max-width:700px;margin:auto;'>"
            . "<h2 style='color:#e11d48;'>403 - Invalid or Missing Migration Token</h2>"
            . "<p>The token provided in the URL did not match the <code>MIGRATION_TOKEN</code> (or <code>APP_KEY</code>) on the server.</p>"
            . "<p><strong>Your URL token:</strong> <code>" . htmlspecialchars($providedToken ?: '(empty)') . "</code></p>"
            . "<p>Please ensure <code>MIGRATION_TOKEN</code> in your <code>env.php</code> or <code>.env</code> matches.</p>"
            . "</div>", 200, ['Content-Type' => 'text/html']);
    }

    $output = [];

    // 1. Test Database Connection First
    try {
        DB::connection()->getPdo();
        $output[] = "=== Database Connection: SUCCESSFUL (" . DB::connection()->getDatabaseName() . ") ===\n";
    } catch (\Throwable $e) {
        return response("<div style='font-family:sans-serif;padding:30px;max-width:800px;margin:auto;'>"
            . "<h2 style='color:#e11d48;'>Database Connection Failed</h2>"
            . "<p>Laravel could not connect to MySQL. Please check your InfinityFree database credentials in <code>inertia-pos-core/env.php</code> or <code>.env</code>.</p>"
            . "<p><strong>Host:</strong> <code>" . config('database.connections.mysql.host') . "</code></p>"
            . "<p><strong>Database:</strong> <code>" . config('database.connections.mysql.database') . "</code></p>"
            . "<p><strong>Username:</strong> <code>" . config('database.connections.mysql.username') . "</code></p>"
            . "<p><strong>Error:</strong> <span style='color:#dc2626;font-weight:bold;'>" . htmlspecialchars($e->getMessage()) . "</span></p>"
            . "</div>", 200, ['Content-Type' => 'text/html']);
    }

    try {
        // 2. Optimize & Clear Config Cache
        Artisan::call('optimize:clear');
        $output[] = "=== Cache & Config Clear ===\n" . Artisan::output();

        // 3. Storage link if requested (Safe for shared hosting where exec is disabled)
        if ($request->boolean('storage')) {
            try {
                $target = storage_path('app/public');
                $link = public_path('storage');
                if (!file_exists($link)) {
                    @symlink($target, $link);
                }
                $output[] = "=== Storage Link: Safe Link Handled ===\n";
            } catch (\Throwable $e) {
                $output[] = "=== Storage Link: (Symlink skipped: " . $e->getMessage() . ") ===\n";
            }
        }

        // 4. Database Migration & Seeding
        $seedClass = $request->query('class');
        $seedParams = ['--force' => true];
        if ($seedClass) {
            $seedParams['--class'] = $seedClass;
        }

        if ($request->boolean('fresh')) {
            $params = ['--force' => true];
            if ($request->boolean('seed') && !$seedClass) {
                $params['--seed'] = true;
            }
            Artisan::call('migrate:fresh', $params);
            $output[] = "=== Migrate Fresh ===\n" . Artisan::output();

            if ($request->boolean('seed') && $seedClass) {
                Artisan::call('db:seed', $seedParams);
                $output[] = "=== DB Seed ({$seedClass}) ===\n" . Artisan::output();
            }
        } else {
            $params = ['--force' => true];
            Artisan::call('migrate', $params);
            $output[] = "=== Migrate ===\n" . Artisan::output();

            if ($request->boolean('seed')) {
                Artisan::call('db:seed', $seedParams);
                $output[] = "=== DB Seed ===\n" . Artisan::output();
            }
        }
    } catch (\Throwable $e) {
        $output[] = "\n!!! MIGRATION EXCEPTION !!!\n" . $e->getMessage() . "\n" . $e->getTraceAsString();
    }

    return response('<pre style="background:#1e1e2e;color:#a6adc8;padding:24px;border-radius:8px;font-family:monospace;font-size:14px;line-height:1.5;">' 
        . htmlspecialchars(implode("\n", $output)) 
        . '</pre>', 200, ['Content-Type' => 'text/html']);
});
