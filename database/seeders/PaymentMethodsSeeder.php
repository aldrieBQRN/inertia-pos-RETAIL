<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class PaymentMethodsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $methods = [
            [
                'type' => 'gcash',
                'label' => 'GCash',
                'number' => '0912 345 6789',
                'name' => 'Juan Dela Cruz',
                'icon' => '📱'
            ],
            [
                'type' => 'paymaya',
                'label' => 'PayMaya',
                'number' => '0917 123 4567',
                'name' => 'Juan Dela Cruz',
                'icon' => '💳'
            ],
            [
                'type' => 'bdo',
                'label' => 'BDO Bank',
                'number' => '1234567890',
                'name' => 'Juan Dela Cruz Corp',
                'icon' => '🏦'
            ]
        ];

        SystemSetting::updateOrCreate(
            ['key' => 'payment_methods'],
            ['value' => json_encode($methods)]
        );

        $this->command->info('✓ Payment methods seeded successfully!');
    }
}
