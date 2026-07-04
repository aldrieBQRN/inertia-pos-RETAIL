<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Cache;

class ThrottleMailRecipient
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $email = $request->input('email');

        if (!empty($email)) {
            $email = strtolower(trim($email));

            // Validate email format to avoid caching invalid strings
            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $key = 'mail_cooldown:' . sha1($email);

                // If cache key exists, throttle the request
                if (Cache::has($key)) {
                    return response()->json([
                        'message' => 'Too many verification attempts. Please wait 60 seconds before retrying.'
                    ], 429);
                }

                // Reserve the cache key for 60 seconds (1 minute cooldown)
                Cache::put($key, true, 60);
            }
        }

        return $next($request);
    }
}
