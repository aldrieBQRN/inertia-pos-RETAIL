<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    /**
     * Ensure only super admins can access protected routes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== 'super_admin') {
            abort(403, 'Unauthorized - Super Admin access required');
        }

        return $next($request);
    }
}
