<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventDemoModifications
{
    /**
     * Handle an incoming request.
     * Block mutating operations when APP_DEMO_MODE is active.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (config('app.demo_mode', false)) {
            $message = 'Demo Mode Active: Please contact the POS provider to access this feature.';

            if ($request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json([
                    'message' => $message,
                    'error'   => $message,
                ], 403);
            }

            return back()->with('error', $message);
        }

        return $next($request);
    }
}
