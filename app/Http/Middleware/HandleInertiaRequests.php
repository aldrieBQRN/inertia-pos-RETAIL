<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\Store;
use App\Models\Announcement;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Schema;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),

            // Share authenticated user data globally
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role,
                    'is_admin' => (bool) ($request->user()->role === 'admin' || $request->user()->role === 'super_admin' || $request->user()->is_admin),
                    'store_id' => $request->user()->store_id,
                    'avatar_path' => $request->user()->avatar_path,
                    'account_number' => $request->user()->account_number,
                    'phone_number' => $request->user()->phone_number,
                    'address' => $request->user()->address,
                    'city' => $request->user()->city,
                    'province' => $request->user()->province,
                    'country' => $request->user()->country,
                    'is_active' => (bool) $request->user()->is_active,
                ] : null,
                'csrf_token' => csrf_token(),
                'active_store_id' => $request->user() ? \App\Traits\BelongsToStore::getActiveStoreId() : null,
                'accessible_stores' => function () use ($request) {
                    $user = $request->user();
                    if (!$user) return [];

                    return $user->getAccessibleStores()->map(function ($store) {
                        return [
                            'id' => $store->id,
                            'name' => $store->name,
                            'address' => $store->address,
                            'phone' => $store->phone,
                            'status' => (bool) $store->status,
                        ];
                    });
                },
            ],

            'is_demo_mode' => filter_var(env('APP_DEMO_MODE', config('app.demo_mode', false)), FILTER_VALIDATE_BOOLEAN),

            // Share flash messages
            'flash' => [
                'success' => $request->hasSession() ? $request->session()->get('success') : null,
                'error' => $request->hasSession() ? $request->session()->get('error') : null,
            ],

            // Share dynamic settings (Global Branding overrides Tenant defaults in UI)
            'settings' => function () use ($request) {
                $user = $request->user();

                // 1. Fetch global system settings safely
                $globalSettings = [];
                if (Schema::hasTable('system_settings')) {
                    $globalSettings = SystemSetting::pluck('value', 'key')->toArray();
                }

                // Isolate the Global SaaS Branding
                $globalAppName = $globalSettings['app_name'] ?? 'Inertia POS';
                $globalLogo = $globalSettings['logo_path'] ?? null;

                // 2. Tenant Context (Has active branch or store_id)
                $activeStoreId = $user ? \App\Traits\BelongsToStore::getActiveStoreId() : null;
                if ($activeStoreId) {
                    $store = Store::find($activeStoreId);

                    if ($store) {
                        return [
                            // GLOBAL SAAS BRANDING (Used for the AuthenticatedLayout Header)
                            'app_name'        => $globalAppName,
                            'logo_path'       => $globalLogo,

                            // TENANT SPECIFIC DATA (Used for printing receipts, store settings, etc.)
                            'store_id'        => $store->id,
                            'store_name'      => $store->name,
                            'store_logo_path' => $store->logo_path ?? null,
                            'address'         => $store->address,
                            'phone'           => $store->phone,

                            // GLOBAL SUPPORT INFO
                            'support_email'   => $globalSettings['support_email'] ?? '',
                            'support_phone'   => $globalSettings['support_phone'] ?? '',
                            'company_address' => $globalSettings['company_address'] ?? '',
                        ];
                    }
                }

                // 3. Super Admin / Developer Context (Uses Global System Settings entirely)
                return [
                    'app_name'        => $globalAppName,
                    'logo_path'       => $globalLogo,
                    'store_name'      => $globalAppName,
                    'address'         => $globalSettings['company_address'] ?? '',
                    'phone'           => $globalSettings['support_phone'] ?? '',
                    'support_email'   => $globalSettings['support_email'] ?? '',
                    'support_phone'   => $globalSettings['support_phone'] ?? '',
                    'company_address' => $globalSettings['company_address'] ?? '',
                ];
            },

            // Share active announcements globally
            'active_announcement' => function () {
                if (Schema::hasTable('announcements')) {
                    return Announcement::where('is_active', true)
                        ->select('id', 'message', 'style')
                        ->latest()
                        ->first();
                }
                return null;
            },
        ];
    }
}
