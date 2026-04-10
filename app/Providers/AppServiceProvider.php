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

        // Ensure storage symlink exists (important for ephemeral filesystems like Railway)
        if (!is_link(public_path('storage'))) {
            try {
                $this->app->make(\Illuminate\Filesystem\Filesystem::class)->link(
                    storage_path('app/public'),
                    public_path('storage')
                );
            } catch (\Exception $e) {
                // Silently fail if symlink creation fails (e.g., insufficient permissions)
            }
        }
    }
}
