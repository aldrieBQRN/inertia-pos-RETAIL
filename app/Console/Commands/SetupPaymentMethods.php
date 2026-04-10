<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SystemSetting;

class SetupPaymentMethods extends Command
{
    /**
     * The name and signature of the console command.
     * Run via: php artisan payment:setup
     */
    protected $signature = 'payment:setup';

    /**
     * The console command description.
     */
    protected $description = 'Configure payment methods for the billing portal';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Payment Methods Configuration');
        $this->line('');

        $methods = [];

        while ($this->confirm('Add a payment method?', true)) {
            $this->line('');
            $this->info('Enter Payment Method Details:');

            $type = $this->ask('Type (gcash, paymaya, bank, etc.)', 'gcash');
            $label = $this->ask('Label (GCash, PayMaya, BDO, etc.)', 'GCash');
            $number = $this->ask('Account/Reference Number', '0912 345 6789');
            $name = $this->ask('Account/Business Name', 'Juan Dela Cruz');
            $icon = $this->ask('Icon/Emoji (optional)', '📱');

            $methods[] = [
                'type' => $type,
                'label' => $label,
                'number' => $number,
                'name' => $name,
                'icon' => $icon
            ];

            $this->info("✓ Added: {$label}");
            $this->line('');
        }

        if (empty($methods)) {
            $this->error('At least one payment method is required.');
            return;
        }

        // Save to system settings
        SystemSetting::updateOrCreate(
            ['key' => 'payment_methods'],
            ['value' => json_encode($methods)]
        );

        $this->info('✓ Payment methods saved successfully!');
        $this->line('');
        $this->line('Configured Methods:');
        foreach ($methods as $method) {
            $this->line("  {$method['icon']} {$method['label']} - {$method['number']} ({$method['name']})");
        }
    }
}
