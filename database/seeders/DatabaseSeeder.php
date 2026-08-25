<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Plan;
use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🚀 Starting Complete Database Seeding...');

        // 1. Clean database & setup billing plans and developer account
        $this->call(CleanDatabaseSeeder::class);

        // 2. System Settings (Branding, App Name, Global configs)
        $this->call(SystemSettingsSeeder::class);

        // 3. Legal Policies & Documents (Terms of Service, Privacy Policy, etc.)
        $this->call(LegalSettingsSeeder::class);

        // 4. Subscriptions, Tenant Stores, and Billing History
        $this->call(SubscriptionSeeder::class);

        // 5. Populate complete live products (with photos), Terminals, Multi-Cashier shifts, Inventory & Transactions
        $this->call(ApiProductSeeder::class);

        $this->command->info('✅ All seeders executed successfully! Your app is ready to test.');
    }
}

