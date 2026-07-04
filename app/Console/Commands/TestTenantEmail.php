<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Store;
use App\Mail\TenantInviteMail;
use App\Mail\SubscriptionReminderMail;
use App\Mail\SubscriptionDueMail;
use App\Mail\StoreSuspendedMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Carbon\Carbon;

class TestTenantEmail extends Command
{
    /**
     * The name and signature of the console command.
     * Run via: php artisan email:test or php artisan email:test renewal
     */
    protected $signature = 'email:test {type=all : Type of email to test (tenant, renewal, due, suspended, all)}';

    /**
     * The console command description.
     */
    protected $description = 'Test email sending - automatically finds users who need these emails';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $type = $this->argument('type');

        try {
            if ($type === 'tenant' || $type === 'all') {
                $this->testTenantEmail();
            }
            if ($type === 'renewal' || $type === 'all') {
                $this->testRenewalReminder();
            }
            if ($type === 'due' || $type === 'all') {
                $this->testDueDateWarning();
            }
            if ($type === 'suspended' || $type === 'all') {
                $this->testSuspensionNotice();
            }
        } catch (\Exception $e) {
            $this->error('✗ Error sending email: ' . $e->getMessage());
            return 1;
        }
    }

    /**
     * Test Tenant Invitation Email
     */
    private function testTenantEmail()
    {
        // Get first admin user without a store, or create one
        $user = User::whereDoesntHave('stores')
            ->where('role', 'admin')
            ->first();

        if (!$user) {
            $user = User::create([
                'name' => 'Test Tenant',
                'email' => 'tenant-test-' . time() . '@example.com',
                'phone' => '123-456-7890',
                'role' => 'admin'
            ]);
        }

        // Generate a 7-day temporary signed URL
        $setupUrl = URL::temporarySignedRoute('tenant.setup', now()->addDays(7), ['user' => $user->id]);

        // Send the email
        Mail::to($user->email)->send(new TenantInviteMail($user, $setupUrl));

        $this->info("✓ Tenant Invitation Email");
        $this->line("  Recipient: {$user->email}");
        $this->line("  Setup link expires in: 7 days");
    }

    /**
     * Test Subscription Renewal Reminder (5 days before expiration)
     */
    private function testRenewalReminder()
    {
        $targetDate = Carbon::now()->addDays(5)->toDateString();

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
            $this->warn("⚠ No stores found expiring in 5 days (renewal reminder target)");
            $this->line("  To test: Create a store with subscription_ends_at = " . $targetDate);
            return;
        }

        foreach ($stores as $store) {
            $admin = $store->users->first();
            if ($admin && $admin->email) {
                Mail::to($admin->email)->send(new SubscriptionReminderMail($store));
                $this->info("✓ Renewal Reminder Email");
                $this->line("  Store: {$store->name}");
                $this->line("  Admin: {$admin->email}");
                $this->line("  Expiry date: {$store->subscription_ends_at}");
            }
        }
    }

    /**
     * Test Due Date Warning (expiring today)
     */
    private function testDueDateWarning()
    {
        $today = Carbon::today()->toDateString();

        $stores = Store::with(['users' => function ($query) {
            $query->where('role', 'admin');
        }])
            ->where('status', true)
            ->whereDate('subscription_ends_at', $today)
            ->where(function ($query) {
                $query->whereNull('last_reminder_sent_at')
                    ->orWhere('last_reminder_sent_at', '<', Carbon::now()->subDays(3));
            })
            ->get();

        if ($stores->isEmpty()) {
            $this->warn("⚠ No stores found expiring today (due date warning target)");
            $this->line("  To test: Create a store with subscription_ends_at = " . $today);
            return;
        }

        foreach ($stores as $store) {
            $admin = $store->users->first();
            if ($admin && $admin->email) {
                Mail::to($admin->email)->send(new SubscriptionDueMail($store));
                $this->info("✓ Due Date Warning Email");
                $this->line("  Store: {$store->name}");
                $this->line("  Admin: {$admin->email}");
                $this->line("  Expiry date: {$store->subscription_ends_at}");
            }
        }
    }

    /**
     * Test Store Suspension Notice
     */
    private function testSuspensionNotice()
    {
        // Find any suspended store
        $store = Store::with(['users' => function ($query) {
            $query->where('role', 'admin');
        }])
            ->where('status', false)
            ->first();

        if (!$store) {
            // Fallback: search for any store
            $store = Store::with(['users' => function ($query) {
                $query->where('role', 'admin');
            }])->first();
        }

        if (!$store) {
            $this->warn("⚠ No stores found in database to test suspension email.");
            return;
        }

        $admin = $store->users->first();
        if ($admin && $admin->email) {
            Mail::to($admin->email)->send(new StoreSuspendedMail($store));
            $this->info("✓ Store Suspension Email");
            $this->line("  Store: {$store->name}");
            $this->line("  Admin: {$admin->email}");
        } else {
            $this->warn("⚠ Store '{$store->name}' has no registered admin user.");
        }
    }
}
