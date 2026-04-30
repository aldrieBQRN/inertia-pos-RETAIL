<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StaffSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Find the primary store created in DemoSeeder
        $store = Store::where('name', 'Metro Retail Hub')->first();

        if (!$store) {
            $this->command->error('Store "Metro Retail Hub" not found. Please run DemoSeeder first.');
            return;
        }

        $this->command->info('👥 Adding additional staff accounts to ' . $store->name . '...');

        // 2. Define a list of specific staff to add
        $staffMembers = [
            ['name' => 'Alice Hernandez', 'email' => 'alice@email.com', 'role' => 'admin'],
            ['name' => 'Mark Rivera', 'email' => 'mark@email.com', 'role' => 'admin'],
            ['name' => 'Sarah Concepcion', 'email' => 'sarah@email.com', 'role' => 'cashier'],
            ['name' => 'Paolo Reyes', 'email' => 'paolo@email.com', 'role' => 'cashier'],
            ['name' => 'Elena Cruz', 'email' => 'elena@email.com', 'role' => 'cashier'],
        ];

        foreach ($staffMembers as $staff) {
            User::firstOrCreate(
                ['email' => $staff['email']],
                [
                    'name' => $staff['name'],
                    'password' => Hash::make('password'), // Standard dev password
                    'role' => $staff['role'],
                    'is_admin' => ($staff['role'] === 'admin'),
                    'store_id' => $store->id,
                    'account_number' => strtoupper(substr($staff['role'], 0, 3)) . '-' . rand(100, 999),
                    'email_verified_at' => now(),
                ]
            );
        }

        // 3. Optional: Generate 10 more random cashiers for the same store
        for ($i = 1; $i <= 10; $i++) {
            User::create([
                'name' => "Extra Cashier {$i}",
                'email' => "extra_cashier{$i}@email.com",
                'password' => Hash::make('password'),
                'role' => 'cashier',
                'is_admin' => false,
                'store_id' => $store->id,
                'account_number' => 'XCS-' . (100 + $i),
                'email_verified_at' => now(),
            ]);
        }

        $this->command->info('✅ Added 5 specific staff and 10 random cashiers successfully!');
    }
}