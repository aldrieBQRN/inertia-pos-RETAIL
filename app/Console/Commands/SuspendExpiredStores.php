<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Store;
use App\Mail\StoreSuspendedMail;
use App\Services\ActivityService;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class SuspendExpiredStores extends Command
{
    /**
     * The name and signature of the console command.
     * Run this manually via: php artisan subscription:suspend
     */
    protected $signature = 'subscription:suspend';

    /**
     * The console command description.
     */
    protected $description = 'Automatically suspends stores whose subscription has expired past the 5-day grace period';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Grace period is 5 days, so anything that expired more than 5 days ago gets suspended
        $cutoffDate = Carbon::now()->subDays(5)->toDateTimeString();

        $this->info("Scanning for active stores whose subscription expired before: {$cutoffDate}...");

        $stores = Store::with(['users' => function ($query) {
            $query->where('role', 'admin');
        }])
            ->where('status', true) // Only scan currently active stores
            ->where('subscription_ends_at', '<', $cutoffDate)
            ->get();

        if ($stores->isEmpty()) {
            $this->info("No expired stores found needing automatic suspension today.");
            return;
        }

        $suspendedCount = 0;
        $failCount = 0;

        foreach ($stores as $store) {
            $admin = $store->users->first();

            try {
                // 1. Suspend the store
                $store->update(['status' => false]);

                // 2. Log the activity (automated billing system event)
                ActivityService::log(
                    'store.suspend_automated',
                    'update',
                    'Store',
                    $store->id,
                    "Store {$store->name} was automatically suspended due to subscription expiration",
                    ['status' => true],
                    ['status' => false, 'store_name' => $store->name]
                );

                // 3. Send email notice to the admin
                if ($admin && $admin->email) {
                    Mail::to($admin->email)->send(new StoreSuspendedMail($store));
                    $this->info("SUCCESS: Suspended and emailed store: {$store->name} ({$admin->email})");
                } else {
                    $this->warn("WARNING: Suspended store '{$store->name}' but could not email (no registered admin).");
                }

                $suspendedCount++;
            } catch (\Exception $e) {
                $this->error("FAILED: Could not suspend store {$store->name}. Error: " . $e->getMessage());
                $failCount++;
            }
        }

        $this->info("--------------------------------------------------");
        $this->info("Run Complete: {$suspendedCount} automatically suspended, {$failCount} failed.");
        $this->info("--------------------------------------------------");
    }
}
