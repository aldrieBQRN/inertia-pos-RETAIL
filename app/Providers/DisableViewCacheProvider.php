<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class DisableViewCacheProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Disable view caching on ephemeral filesystems
        if ($this->app->runningInConsole() && isset($_SERVER['RAILWAY_ENVIRONMENT_NAME'])) {
            $this->app['config']['view.compiled'] = null;
        }
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
