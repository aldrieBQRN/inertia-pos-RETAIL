<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use App\Models\SubscriptionPayment;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use Illuminate\Support\Str;

class SubscriptionSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Configuring single store billing & subscription history...');

        // 0. Ensure a Super Admin exists for the Developer Panel
        User::updateOrCreate(
            ['email' => 'dev@email.com'],
            [
                'name' => 'System Developer',
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
            ]
        );

        $plans = Plan::all();
        if ($plans->isEmpty()) {
            $this->command->warn('No plans found. Please seed plans first.');
            return;
        }

        $activePlan = Plan::where('name', 'Monthly Starter')->first() ?? $plans->first();

        // Single Primary Store (Metro Retail Hub)
        $store = Store::firstOrCreate(
            ['name' => 'Metro Retail Hub'],
            [
                'address' => '456 Commercial Avenue, BGC, Taguig City, Philippines',
                'phone' => '+63 2 8765 4321',
                'status' => true,
                'logo_path' => null,
                'plan_id' => $activePlan->id,
                'subscription_ends_at' => Carbon::now()->addMonths(6),
            ]
        );

        // Ensure Store Admin exists
        $admin = User::updateOrCreate(
            ['email' => 'admin@email.com'],
            [
                'name' => 'Store Manager (Admin)',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'is_admin' => true,
                'store_id' => $store->id,
                'account_number' => 'ADM-001',
                'phone_number' => '+63 917 234 5678',
                'address' => '123 Main Street',
                'city' => 'Manila',
                'province' => 'NCR',
                'country' => 'Philippines',
                'email_verified_at' => now(),
            ]
        );

        // Seed 10 realistic historical subscription billing payments for this store
        for ($i = 10; $i >= 1; $i--) {
            $paymentDate = Carbon::now()->subMonths($i);
            SubscriptionPayment::create([
                'store_id' => $store->id,
                'plan_id' => $activePlan->id,
                'full_name' => $admin->name,
                'amount' => $activePlan->price,
                'reference_number' => 'REF-' . strtoupper(Str::random(8)),
                'receipt_path' => 'receipts/dummy-receipt.png',
                'status' => 'approved',
                'created_at' => $paymentDate,
                'updated_at' => $paymentDate,
            ]);
        }

        $this->command->info('✅ Single store subscription billing records created.');
    }
}
