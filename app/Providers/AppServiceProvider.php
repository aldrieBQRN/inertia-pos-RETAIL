<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL; // <-- ADDED THIS IMPORT
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

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

        // Force HTTPS if running through a secure proxy like Ngrok
        if (request()->header('x-forwarded-proto') === 'https') {
            URL::forceScheme('https');
        }

        // Skip symlink creation on InfinityFree (shared hosting doesn't support exec)
        // Symlink creation is not supported on ephemeral/shared hosting like InfinityFree
        // Users will need to upload files to storage/app/public/ manually
    }
}
