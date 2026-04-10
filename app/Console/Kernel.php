<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // Send subscription renewal reminders 5 days before expiration
        // Runs daily at 8:00 AM
        $schedule->command('subscription:remind')
            ->dailyAt('08:00')
            ->timezone('UTC')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::info('Subscription reminder email sent successfully');
            })
            ->onFailure(function () {
                \Log::error('Subscription reminder email failed');
            });

        // Send final warning on the day of expiration
        // Runs daily at 9:00 AM
        $schedule->command('subscription:due')
            ->dailyAt('09:00')
            ->timezone('UTC')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::info('Subscription due warning email sent successfully');
            })
            ->onFailure(function () {
                \Log::error('Subscription due warning email failed');
            });

        // Process queued jobs (emails, notifications, etc.)
        // Runs every minute to check for pending jobs
        $schedule->command('queue:work', ['--max-jobs' => 1, '--max-time' => 60])
            ->everyMinute()
            ->withoutOverlapping()
            ->onFailure(function () {
                \Log::error('Queue worker failed');
            });

        // Clean up old failed jobs (optional)
        // Runs daily at midnight
        $schedule->command('queue:flush')
            ->daily()
            ->withoutOverlapping();
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__ . '/Commands');

        // Register custom commands here if needed
    }
}
