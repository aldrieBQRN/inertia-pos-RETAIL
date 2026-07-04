<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\BlockedIp;
use App\Models\Category;
use App\Models\HeldOrder;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Shift;
use App\Models\Store;
use App\Models\SubscriptionPayment;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class CleanDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🧹 Starting clean database seeding...');

        // 1. Clean existing tables
        Schema::disableForeignKeyConstraints();
        ActivityLog::truncate();
        Announcement::truncate();
        BlockedIp::truncate();
        HeldOrder::truncate();
        SaleItem::truncate();
        Sale::truncate();
        Shift::truncate();
        Product::truncate();
        Category::truncate();
        SubscriptionPayment::truncate();
        User::truncate();
        Store::truncate();
        SystemSetting::truncate();
        Plan::truncate();
        Schema::enableForeignKeyConstraints();

        $this->command->info('🗑️ Cleared all tables: users, stores, products, categories, sales, shifts, payments, held orders, announcements, activity logs, blocked IPs, system settings, and plans.');

        // 2. Create Billing Plans
        $plans = [
            [
                'name' => 'Monthly Starter',
                'duration_months' => 1,
                'price' => 499.00,
                'is_active' => true,
            ],
            [
                'name' => 'Quarterly Pro',
                'duration_months' => 3,
                'price' => 1399.00,
                'is_active' => true,
            ],
            [
                'name' => 'Annual Premium',
                'duration_months' => 12,
                'price' => 4999.00,
                'is_active' => true,
            ],
            [
                'name' => 'One-Time License + Free 1 Year Maintenance',
                'duration_months' => 12,
                'price' => 0.00,
                'is_active' => true,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::create($plan);
        }
        $this->command->info('💳 Re-seeded Billing Plans.');

        // 3. Create Developer Account
        $dev = User::create([
            'name' => 'System Developer',
            'email' => 'dev@email.com',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'is_admin' => true,
            'store_id' => null,
            'account_number' => 'DEV-001',
            'phone_number' => '+63 917 123 4567',
            'address' => '456 Developer Ave, Makati',
            'city' => 'Makati',
            'province' => 'NCR',
            'country' => 'Philippines',
            'email_verified_at' => now(),
            'terms_accepted_at' => now(),
            'is_active' => true,
        ]);
        $this->command->info('✅ Developer Account Created: dev@email.com / password');

        // 4. Seed system settings and legal settings
        $this->call(SystemSettingsSeeder::class);
        $this->call(LegalSettingsSeeder::class);

        $this->command->info('🎉 Clean database seeding completed successfully!');
    }
}
