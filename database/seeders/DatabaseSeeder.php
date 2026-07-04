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

        // Call the clean database seeder
        $this->call(CleanDatabaseSeeder::class);

        $this->command->info('✅ All seeders executed successfully! Your app is ready to test.');
    }
}

