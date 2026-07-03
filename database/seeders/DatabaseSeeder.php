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
        $this->command->info('🚀 Starting Database Seeding...');

        // Create Billing Plans
        $plans = [
            [
                'name' => 'Monthly Starter',
                'duration_months' => 1,
                'price' => 1499.00,
                'is_active' => true,
            ],
            [
                'name' => 'Quarterly Pro',
                'duration_months' => 3,
                'price' => 3999.00,
                'is_active' => true,
            ],
            [
                'name' => 'Annual Premium',
                'duration_months' => 12,
                'price' => 14999.00,
                'is_active' => true,
            ],
            [
                'name' => 'One-Time License + Monthly Maintenance',
                'duration_months' => 1,
                'price' => 499.00,
                'is_active' => true,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::firstOrCreate(['name' => $plan['name']], $plan);
        }
        $this->command->info('💳 Billing Plans: Monthly (₱1,499) | Quarterly (₱3,999) | Annual (₱14,999) | Maintenance (₱499/mo)');

        // Call the system settings seeder
        $this->call(SystemSettingsSeeder::class);

        // Call the legal policies / terms seeder
        $this->call(LegalSettingsSeeder::class);

        // Call the comprehensive demo seeder
        $this->call(DemoSeeder::class);

        $this->command->info('✅ All seeders executed successfully! Your app is ready to test.');
    }
}
