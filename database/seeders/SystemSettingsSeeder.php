<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('⚙️ Configuring System Settings for Developer & Super Admin Dashboard...');

        // System Settings & Information matching DeveloperController & SystemInfo.jsx
        $settings = [
            // Developer System Info Page fields
            'app_name' => 'Inertia POS',
            'support_email' => 'inertiadigitalsolution@gmail.com',
            'support_phone' => '+63 900 000 0000',
            'company_address' => '789 Business Park, Ortigas, Pasig City, Philippines',
            
            // Payment Methods for Tenant Subscription Renewals (GCash, Maya, Bank Transfer)
            'payment_methods' => json_encode([
                [
                    'type' => 'gcash',
                    'label' => 'GCash Merchant',
                    'number' => '0917-123-4567',
                    'name' => 'John A. (Finance)',
                    'icon' => '📱'
                ],
                [
                    'type' => 'maya',
                    'label' => 'Maya Business',
                    'number' => '0918-987-6543',
                    'name' => 'Inertia Digital Solutions',
                    'icon' => '💳'
                ],
                [
                    'type' => 'bank',
                    'label' => 'BDO Unibank',
                    'number' => '0012-3456-7890',
                    'name' => 'Inertia Solutions Inc.',
                    'icon' => '🏦'
                ],
            ]),

            // General System Settings (Legacy / Fallback keys)
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
        $this->command->info('   App Name: Inertia POS');
        $this->command->info('   Support Email: inertiadigitalsolution@gmail.com');
        $this->command->info('   Support Phone: +63 900 000 0000');
        $this->command->info('   Company Address: 789 Business Park, Ortigas, Pasig City');
        $this->command->info('   Payment Methods: GCash, Maya, BDO Unibank');
    }
}
