<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Product;
use App\Models\Category;
use App\Models\User;
use App\Models\Sale;
use App\Policies\ProductPolicy;
use App\Policies\CategoryPolicy;
use App\Policies\UserPolicy;
use App\Policies\SalePolicy;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * Register any authentication / authorization services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any authentication / authorization services.
     */
    public function boot(): void
    {
        // Register all policies manually
        Gate::policy(Product::class, ProductPolicy::class);
        Gate::policy(Category::class, CategoryPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Sale::class, SalePolicy::class);

        // Define custom gates if needed for fine-grained control
        Gate::define('manage-store', function (User $user) {
            return $user->is_admin;
        });

        Gate::define('process-payment', function (User $user) {
            return $user->is_admin;
        });
    }
}
