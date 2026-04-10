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
        $this->command->info('Creating MASSIVE Finance & User Data to test Pagination and Filters...');

        // 0. Ensure a Super Admin exists for the Developer Panel
        User::firstOrCreate(
            ['email' => 'superadmin@developer.com'],
            [
                'name' => 'System Developer',
                'password' => Hash::make('password'),
                'role' => 'super_admin',
                'is_admin' => true,
                'store_id' => null,
                'email_verified_at' => now(),
            ]
        );

        $plans = Plan::all();
        if ($plans->isEmpty()) {
            $this->command->warn('No plans found. Please seed plans first.');
            return;
        }

        // SCENARIO 1: UPCOMING RENEWALS (15 Stores expiring in the next 1-30 days)
        for ($i = 1; $i <= 15; $i++) {
            $plan = $plans->random();
            $store = Store::create([
                'name' => "Upcoming Store {$i}",
                'address' => "Future Ave {$i}",
                'status' => true,
                'plan_id' => $plan->id,
                'subscription_ends_at' => Carbon::now()->addDays(rand(1, 30)),
            ]);
            $this->createUserForStore($store, "upcoming{$i}@store.com", "Admin Upcoming {$i}", 'admin');
        }

        // SCENARIO 2: OVERDUE COLLECTIONS (15 Stores expired 1-45 days ago)
        for ($i = 1; $i <= 15; $i++) {
            $plan = $plans->random();
            $isGracePeriod = rand(1, 10) > 5; // 50% chance to be in grace period (active) or suspended (false)

            $store = Store::create([
                'name' => "Overdue Mart {$i}",
                'address' => "Past St {$i}",
                'status' => $isGracePeriod,
                'plan_id' => $plan->id,
                'subscription_ends_at' => Carbon::now()->subDays(rand(1, 45)),
            ]);
            $this->createUserForStore($store, "overdue{$i}@store.com", "Admin Overdue {$i}", 'admin');
        }

        // SCENARIO 3: PENDING APPROVALS (15 Stores that just uploaded a receipt)
        for ($i = 1; $i <= 15; $i++) {
            $plan = $plans->random();
            $store = Store::create([
                'name' => "Pending Shop {$i}",
                'address' => "Waitline Blvd {$i}",
                'status' => false,
                'plan_id' => $plan->id,
                'subscription_ends_at' => Carbon::now()->subDays(rand(1, 10)),
            ]);
            $user = $this->createUserForStore($store, "pending{$i}@store.com", "Admin Pending {$i}", 'admin');

            // Create the Pending Payment in the queue
            $this->createPayment($store, $user, $plan, Carbon::now()->subMinutes(rand(5, 500)), 'pending');
        }

        // SCENARIO 4: TRANSACTION HISTORY (30 Historical Records - Approved & Rejected)
        for ($i = 1; $i <= 30; $i++) {
            $plan = $plans->random();
            $store = Store::create([
                'name' => "History Cafe {$i}",
                'address' => "Memory Lane {$i}",
                'status' => true,
                'plan_id' => $plan->id,
                'subscription_ends_at' => Carbon::now()->addDays(rand(30, 365)),
            ]);
            $user = $this->createUserForStore($store, "history{$i}@store.com", "Admin History {$i}", 'admin');

            $status = rand(1, 10) > 3 ? 'approved' : 'rejected'; // 70% approved, 30% rejected
            $date = Carbon::now()->subDays(rand(1, 60)); // Spread out over the last 2 months for Date Filters

            $this->createPayment($store, $user, $plan, $date, $status);
        }

        // SCENARIO 5: STAFF & CASHIERS (Generate 30 random cashiers to populate the User Management grid)
        for ($i = 1; $i <= 30; $i++) {
            $store = Store::inRandomOrder()->first();
            if ($store) {
                $this->createUserForStore($store, "cashier{$i}@store.com", "Cashier Staff {$i}", 'cashier');
            }
        }

        $this->command->info('✅ Generated 15 Upcoming, 15 Overdue, 15 Pending, 30 History records, and 30 Cashiers!');
    }

    /**
     * Helper to quickly create a user for a store with a dynamic role
     */
    private function createUserForStore($store, $email, $name, $role = 'admin')
    {
        return User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make('password'),
                'role' => $role,
                'is_admin' => in_array($role, ['super_admin', 'admin']), // Dynamically set admin flag
                'store_id' => $store->id,
                'email_verified_at' => now(),
            ]
        );
    }

    /**
     * Helper to create a SubscriptionPayment record
     */
    private function createPayment($store, $user, $plan, $date, $status)
    {
        SubscriptionPayment::create([
            'store_id' => $store->id,
            'plan_id' => $plan->id,
            'full_name' => $user->name,
            'amount' => $plan->price,
            'reference_number' => 'REF-' . strtoupper(Str::random(8)),
            'receipt_path' => 'receipts/dummy-receipt.png', // Dummy path to bypass database constraints
            'status' => $status,
            'created_at' => $date,
            'updated_at' => $date,
        ]);
    }
}
