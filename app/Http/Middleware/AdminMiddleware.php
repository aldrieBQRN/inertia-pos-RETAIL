<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifies that the authenticated user has administrative privileges.
 */
class AdminMiddleware
{
    /**
     * Handle an incoming request.
     * * * If the user is not authenticated or does not have the 'is_admin' flag,
     * the request is aborted with a 403 Forbidden error.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if user exists and has admin status
        if (! $request->user() || ! $request->user()->is_admin) {
            if ($request->expectsJson()) {
                abort(403, 'Unauthorized access.');
            }
            return redirect()->route('pos');
        }

        return $next($request);
    }
}
