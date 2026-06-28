<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\App;

class SecurityHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Prevent clickjacking attacks
        // SAMEORIGIN: iframe only allowed from same origin
        $response->header('X-Frame-Options', 'SAMEORIGIN');

        // Prevent MIME type sniffing
        // Forces browser to respect declared content-type
        $response->header('X-Content-Type-Options', 'nosniff');

        // XSS Protection
        // Modern browsers: 1; mode=block stops page if XSS detected
        $response->header('X-XSS-Protection', '1; mode=block');

        // Strict Transport Security (HSTS)
        // Forces HTTPS for 1 year (31536000 seconds)
        // includeSubDomains: applies to all subdomains
        // Only sent over HTTPS
        if (request()->secure()) {
            $response->header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        // Referrer Policy
        // strict-origin-when-cross-origin:
        // - Send full URL for same-origin requests
        // - Send only origin for cross-origin requests
        $response->header('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions Policy (formerly Feature Policy)
        // Restrict which browser features can be used
        $response->header('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');

        // Content Security Policy (CSP)
        // Whitelist allowed sources for scripts, styles, etc.
        // In development, allow Vite dev server on any localhost port (5173, 5174, etc.)
        $isLocal = App::environment('local', 'development');
        $scriptSrc = $isLocal
            ? "'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*"
            : "'self' 'unsafe-inline'";

        $csp = "default-src 'self'; "
            . "script-src {$scriptSrc}; "
            . "style-src 'self' 'unsafe-inline' https://fonts.bunny.net; "
            . "img-src 'self' data: blob: https:; "
            . "font-src 'self' https://fonts.bunny.net; "
            . "connect-src 'self' https: ws: " . ($isLocal ? "http://localhost:* ws://localhost:*" : "") . "; "
            . "frame-ancestors 'self'; "
            . "base-uri 'self'; "
            . "form-action 'self';";

        $response->header('Content-Security-Policy', $csp);

        return $response;
    }
}
