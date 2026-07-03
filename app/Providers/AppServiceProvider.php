<?php

namespace App\Providers;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL; // <-- ADDED THIS IMPORT
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;

/**
 * Global Application Service Provider
 * * Used to register and bootstrap various services,
 * global configurations, and asset management logic.
 */
class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     * * Bind interfaces to implementations or register singleton services here.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     * * Runs after all other service providers have been registered.
     */
    public function boot(): void
    {
        // Configures Vite to prefetch assets for improved frontend performance
        Vite::prefetch(concurrency: 3);

        // Production guardrail: never change user flow, only record the risk if debug is left on.
        if (app()->environment('production') && config('app.debug')) {
            Log::warning('Production debug mode is enabled. Set APP_DEBUG=false before deploying.');
        }

        // Force HTTPS if running through a secure proxy like Ngrok
        if (request()->header('x-forwarded-proto') === 'https') {
            URL::forceScheme('https');
        }

        // Skip symlink creation on InfinityFree (shared hosting doesn't support exec)
        // Symlink creation is not supported on ephemeral/shared hosting like InfinityFree
        // Users will need to upload files to storage/app/public/ manually

        // 1. Guest API Throttling: Strict rate limit to prevent brute force & signature scanning (10 per minute per IP)
        RateLimiter::for('guest_api', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // 2. Auth API Throttling: High limit per User ID to avoid interrupting busy cashiers/admins
        RateLimiter::for('auth_api', function (Request $request) {
            return Limit::perMinute(300)->by($request->user()?->id ?: $request->ip());
        });

        // 3. Checkout API Throttling: High limit to support rapid scanning & checkouts, but prevents double clicks
        RateLimiter::for('checkout_api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
