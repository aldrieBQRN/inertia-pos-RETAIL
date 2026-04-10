<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Store;

class CheckTenantStatus
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();

        // 1. Skip if the user is a Super Admin (they shouldn't be locked out of the panel)
        if ($user && $user->role === 'super_admin') {
            return $next($request);
        }

        // 2. Check if the user belongs to a store
        if ($user && $user->store_id) {
            $store = Store::find($user->store_id);

            // 3. If the store exists but is suspended (status == false)
            if ($store && !$store->status) {

                // SAFETY: Prevent an infinite redirect loop if they are already heading to the portal
                if ($request->routeIs('tenant.billing.*')) {
                    return $next($request);
                }

                // Redirect to the billing portal instead of logging them out
                return redirect()->route('tenant.billing.portal')->with('error', 'Your store is currently suspended. Please settle your balance to restore access.');
            }
        }

        return $next($request);
    }
}
