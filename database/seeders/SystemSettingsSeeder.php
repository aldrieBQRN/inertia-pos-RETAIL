<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('⚙️ Configuring System Settings...');

        // System Information
        $settings = [
            'store_name' => 'Inertia POS',
            'email' => 'inertiadigitalsolution@gmail.com',
            'phone' => '+63 900 000 0000',
            'address' => '789 Business Park, Ortigas, Pasig City, Philippines',
            'city' => 'Pasig',
            'province' => 'NCR',
            'country' => 'Philippines',
            'timezone' => 'Asia/Manila',
        ];

        foreach ($settings as $key => $value) {
            SystemSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        $this->command->info('✅ System Settings Configured:');
        $this->command->info('   Store Name: Inertia POS');
        $this->command->info('   Email: inertiadigitalsolution@gmail.com');
        $this->command->info('   Phone: +63 900 000 0000');
        $this->command->info('   Address: 789 Business Park, Ortigas, Pasig City');
    }
}
