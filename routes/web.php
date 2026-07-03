<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HeldOrderController;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DeveloperController;
use App\Http\Controllers\Api\SetupController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\TenantSetupController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
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
    ->middleware('signed');

Route::post('/setup/{user}', [TenantSetupController::class, 'submit'])
    ->name('tenant.setup.submit')
    ->middleware('signed');

// 2. Staff Setup (Onboarding via Admin Invitation)
// These routes handle the "Ultimate Tech Solution" onboarding flow
Route::get('/setup-account/{user}', [SetupController::class, 'show'])
    ->name('staff.setup')
    ->middleware('signed'); // Prevents link tampering

Route::post('/setup-account/{user}', [SetupController::class, 'store'])
    ->name('staff.setup.store')
    ->middleware('signed');


/**
 * TENANT BILLING PORTAL
 * Requires login, but bypassed Tenant Status (so expired stores can pay).
 */
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/portal/billing', [BillingController::class, 'portal'])->name('tenant.billing.portal');
    Route::post('/portal/billing', [BillingController::class, 'store'])->name('tenant.billing.submit');
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
        return Inertia::render('PosTerminal');
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

    // Shift Records (Z-Read History)
    Route::get('/shifts', function (Request $request) {
        if ($request->user()->role === 'super_admin') return redirect()->route('developer.index');
        return Inertia::render('ShiftHistory');
    })->name('shifts.index');

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
Route::middleware(['auth', \App\Http\Middleware\CheckTenantStatus::class])->group(function () {

    // Profile Management
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // OTP Verification Routes
    Route::post('/profile/send-otp', [ProfileController::class, 'sendOtp'])->name('profile.sendOtp');
    Route::post('/profile/verify-otp', [ProfileController::class, 'verifyOtp'])->name('profile.verifyOtp');

    // Staff OTP Verification Routes
    Route::post('/staff/send-otp', [UserController::class, 'sendOtp'])->name('staff.sendOtp');
    Route::post('/staff/verify-otp', [UserController::class, 'verifyOtp'])->name('staff.verifyOtp');

    // API: System Data (Accessible by everyone authenticated)
    Route::get('/api/user', fn(Request $request) => $request->user());
    Route::get('/api/settings', [SettingController::class, 'index']);

    // API: Operational - Shared (Accessible by everyone authenticated)
    Route::post('/api/checkout', [PosController::class, 'checkout']);
    Route::get('/api/products', [ProductController::class, 'index']);
    Route::post('/api/products', [ProductController::class, 'store']);
    Route::get('/api/products/next-sku', [ProductController::class, 'getNextSku']);
    Route::get('/api/categories', [CategoryController::class, 'index']);
    Route::get('/api/transactions', [TransactionController::class, 'index']);
    Route::get('/api/transactions/{id}', [TransactionController::class, 'show']);
    Route::post('/api/products/{id}/stock', [ProductController::class, 'adjustStock']);

    // API: Operational & Config - Admin Restricted
    Route::middleware('admin')->group(function () {
        Route::post('/api/settings', [SettingController::class, 'update']);
        Route::get('/api/dashboard', [DashboardController::class, 'index']);
        Route::get('/api/reports', [DashboardController::class, 'reports']);
        Route::get('/api/dashboard/export', [DashboardController::class, 'export']);

        Route::post('/api/products/import', [ProductController::class, 'bulkImport']);
        Route::put('/api/products/{id}', [ProductController::class, 'update']);
        Route::delete('/api/products/{id}', [ProductController::class, 'destroy']);
        Route::patch('/api/products/{id}/toggle-active', [ProductController::class, 'toggleActive']);

        Route::post('/api/categories', [CategoryController::class, 'store']);
        Route::put('/api/categories/{id}', [CategoryController::class, 'update']);
        Route::delete('/api/categories/{id}', [CategoryController::class, 'destroy']);

        Route::post('/api/transactions/{id}/void', [TransactionController::class, 'void']);
    });

    // API: Shift & Reporting
    Route::get('/api/shifts', [ShiftController::class, 'index']);
    Route::get('/api/shift/check', [ShiftController::class, 'check']);
    Route::post('/api/shift/start', [ShiftController::class, 'start']);
    Route::post('/api/shift/close', [ShiftController::class, 'close']);
    Route::get('/api/pos/shift/data/{id}', [ShiftController::class, 'data']);

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
