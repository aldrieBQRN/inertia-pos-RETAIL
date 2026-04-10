<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Store;
use App\Mail\SubscriptionReminderMail;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class SendRenewalReminders extends Command
{
    /**
     * The name and signature of the console command.
     * Run this manually via: php artisan subscription:remind
     */
    protected $signature = 'subscription:remind';

    /**
     * The console command description.
     */
    protected $description = 'Sends automated renewal emails to active stores exactly 5 days before expiration';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Define the target date (exactly 5 days from today)
        $targetDate = Carbon::now()->addDays(5)->toDateString();

        $this->info("Scanning for active stores expiring on: {$targetDate}...");

        /**
         * The Query Strategy:
         * 1. Only 'active' stores (status = true). We don't remind suspended accounts.
         * 2. Only stores whose subscription ends on the target date.
         * 3. Safety Catch: Ensure we haven't sent an automated reminder in the last 10 days.
         */
        $stores = Store::with(['users' => function ($query) {
            $query->where('role', 'admin');
        }])
            ->where('status', true)
            ->whereDate('subscription_ends_at', $targetDate)
            ->where(function ($query) {
                $query->whereNull('last_reminder_sent_at')
                    ->orWhere('last_reminder_sent_at', '<', Carbon::now()->subDays(10));
            })
            ->get();

        if ($stores->isEmpty()) {
            $this->info("No eligible active stores found for automated reminders today.");
            return;
        }

        $sentCount = 0;
        $failCount = 0;

        foreach ($stores as $store) {
            $admin = $store->users->first();

            // Check if store has a valid admin email
            if ($admin && $admin->email) {
                try {
                    // Send the professional renewal email
                    Mail::to($admin->email)->send(new SubscriptionReminderMail($store));

                    // Update the safety catch timestamp
                    $store->update(['last_reminder_sent_at' => now()]);

                    $this->info("SUCCESS: Reminder sent to {$store->name} ({$admin->email})");
                    $sentCount++;
                } catch (\Exception $e) {
                    $this->error("FAILED: Could not send to {$store->name}. Error: " . $e->getMessage());
                    $failCount++;
                }
            } else {
                $this->warn("SKIPPED: Store '{$store->name}' has no registered admin user.");
            }
        }

        $this->info("--------------------------------------------------");
        $this->info("Run Complete: {$sentCount} sent, {$failCount} failed.");
        $this->info("--------------------------------------------------");
    }
}
