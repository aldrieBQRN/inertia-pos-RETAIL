<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Store;
use App\Mail\SubscriptionDueMail; // We will create this next
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class SendDueDateWarnings extends Command
{
    /**
     * Run manually via: php artisan subscription:due
     */
    protected $signature = 'subscription:due';
    protected $description = 'Sends final warning to stores expiring TODAY, mentioning the 5-day grace period.';

    public function handle()
    {
        // Target is TODAY
        $today = Carbon::today()->toDateString();

        $this->info("Scanning for active stores expiring exactly TODAY: {$today}...");

        $stores = Store::with(['users' => function ($query) {
            $query->where('role', 'admin');
        }])
            ->where('status', true)
            ->whereDate('subscription_ends_at', $today)
            ->where(function ($query) {
                // Safety Catch: Allow sending if they haven't been emailed in the last 3 days.
                // (This comfortably allows the 5-day advance reminder to have happened).
                $query->whereNull('last_reminder_sent_at')
                    ->orWhere('last_reminder_sent_at', '<', Carbon::now()->subDays(3));
            })
            ->get();

        if ($stores->isEmpty()) {
            $this->info("No stores are due for renewal today.");
            return;
        }

        $sentCount = 0;

        foreach ($stores as $store) {
            $admin = $store->users->first();

            if ($admin && $admin->email) {
                try {
                    // Send the "Due Today" email
                    Mail::to($admin->email)->send(new SubscriptionDueMail($store));

                    // Update the safety catch timestamp
                    $store->update(['last_reminder_sent_at' => now()]);

                    $this->info("SUCCESS: Due warning sent to {$store->name} ({$admin->email})");
                    $sentCount++;
                } catch (\Exception $e) {
                    $this->error("FAILED: Could not send to {$store->name}. Error: " . $e->getMessage());
                }
            }
        }

        $this->info("Run Complete: {$sentCount} due warnings sent.");
    }
}
