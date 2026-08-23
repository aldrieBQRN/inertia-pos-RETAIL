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
        return Inertia::render('Dashboard');
    })->name('dashboard');

    // NEW: Analytics & Reports: Restricted to Store Admins only
    Route::get('/reports', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'super_admin') return redirect()->route('developer.index');
        if (!$user->is_admin) return redirect()->route('pos');
        return Inertia::render('Reports');
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

        return Inertia::render('PosTerminal', [
            'initial_shift_data' => $shiftData,
            'initial_terminals' => $terminals,
            'initial_categories' => $categories,
            'initial_products' => $products,
        ]);
    })->name('pos');

    // Inventory Management
    Route::get('/inventory', function (Request $request) {
        if ($request->user()->role === 'super_admin') return redirect()->route('developer.index');
        return Inertia::render('Inventory');
    })->name('inventory.index');

    // Transaction History
    Route::get('/transactions', function (Request $request) {
        if ($request->user()->role === 'super_admin') return redirect()->route('developer.index');
        return Inertia::render('Transactions');
    })->name('transactions.index');

    // Shift Records (Z-Read History) - Admin Restricted
    Route::get('/shifts', function (Request $request) {
        if ($request->user()->role === 'super_admin') return redirect()->route('developer.index');
        return Inertia::render('ShiftHistory');
    })->name('shifts.index')->middleware('admin');

    // Store Settings
    Route::get('/settings', function (Request $request) {
        if ($request->user()->role === 'super_admin') return redirect()->route('developer.index');
        return Inertia::render('Settings');
    })->name('settings');

    // User/Staff Management
    Route::get('/users', [UserController::class, 'index'])->name('users.index')->middleware('admin');
});


/**
 * INTERNAL API ENDPOINTS
 */
Route::middleware(['auth', \App\Http\Middleware\CheckTenantStatus::class, 'throttle:auth_api'])->group(function () {

    // Profile Management
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

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
    Route::post('/api/products', [ProductController::class, 'store']);
    Route::get('/api/products/next-sku', [ProductController::class, 'getNextSku']);
    Route::get('/api/products/{id}/history', [ProductController::class, 'stockHistory']);
    Route::get('/api/inventory/recent-activity', [ProductController::class, 'recentActivity']);
    Route::get('/api/categories', [CategoryController::class, 'index']);
    Route::get('/api/transactions', [TransactionController::class, 'index']);
    Route::get('/api/transactions/{id}', [TransactionController::class, 'show']);
    Route::post('/api/products/{id}/stock', [ProductController::class, 'adjustStock']);

    // API: Operational & Config - Admin Restricted
    Route::middleware('admin')->group(function () {
        Route::post('/api/settings', [SettingController::class, 'update']);
        Route::get('/api/dashboard', [DashboardController::class, 'index']);
        Route::get('/api/reports', [ReportController::class, 'index']);
        Route::get('/api/dashboard/export', [DashboardController::class, 'export']);

        Route::post('/api/products/import', [ProductController::class, 'bulkImport']);
        Route::put('/api/products/{id}', [ProductController::class, 'update']);
        Route::delete('/api/products/{id}', [ProductController::class, 'destroy']);
        Route::patch('/api/products/{id}/toggle-active', [ProductController::class, 'toggleActive']);

        Route::post('/api/categories', [CategoryController::class, 'store']);
        Route::put('/api/categories/{id}', [CategoryController::class, 'update']);
        Route::delete('/api/categories/{id}', [CategoryController::class, 'destroy']);

        Route::post('/api/transactions/{id}/void', [TransactionController::class, 'void']);

        // Shift History API for Admins
        Route::get('/api/shifts', [ShiftController::class, 'index']);
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
    Route::middleware('admin')->group(function () {
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
