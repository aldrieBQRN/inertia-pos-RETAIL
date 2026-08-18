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

        // 1. Clean database & setup billing plans and system settings
        $this->call(CleanDatabaseSeeder::class);

        // 2. Populate complete demo store, inventory, products, shifts, and sales transactions
        $this->call(DemoSeeder::class);

        $this->command->info('✅ All seeders executed successfully! Your app is ready to test.');
    }
}

