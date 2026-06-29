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
                'user' => $request->user(),
                'csrf_token' => csrf_token(),
            ],

            // Share flash messages
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
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
                $globalAppName = $globalSettings['app_name'] ?? 'Smart Retail POS';
                $globalLogo = $globalSettings['logo_path'] ?? null;

                // 2. Tenant Context (Has store_id)
                if ($user && $user->store_id) {
                    $store = Store::find($user->store_id);

                    if ($store) {
                        return [
                            // GLOBAL SAAS BRANDING (Used for the AuthenticatedLayout Header)
                            'app_name'        => $globalAppName,
                            'logo_path'       => $globalLogo,

                            // TENANT SPECIFIC DATA (Used for printing receipts, store settings, etc.)
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
