<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use Illuminate\Support\Facades\Log;

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
                Log::info('Subscription reminder email sent successfully');
            })
            ->onFailure(function () {
                Log::error('Subscription reminder email failed');
            });

        // Send final warning on the day of expiration
        // Runs daily at 9:00 AM
        $schedule->command('subscription:due')
            ->dailyAt('09:00')
            ->timezone('UTC')
            ->withoutOverlapping()
            ->onSuccess(function () {
                Log::info('Subscription due warning email sent successfully');
            })
            ->onFailure(function () {
                Log::error('Subscription due warning email failed');
            });

        // Automatically suspend stores past their grace period (5 days after expiration)
        // Runs daily at 10:00 AM
        $schedule->command('subscription:suspend')
            ->dailyAt('10:00')
            ->timezone('UTC')
            ->withoutOverlapping()
            ->onSuccess(function () {
                Log::info('Store auto-suspensions processed successfully');
            })
            ->onFailure(function () {
                Log::error('Store auto-suspensions processing failed');
            });

        // Process default queued jobs (emails, notifications, etc.)
        // Runs every minute to check for pending jobs
        $schedule->command('queue:work', ['--max-jobs' => 1, '--max-time' => 60])
            ->everyMinute()
            ->withoutOverlapping()
            ->onFailure(function () {
                Log::error('Queue worker failed');
            });

        // Process audit log queue explicitly so activity logs do not build up.
        $schedule->command('queue:work', ['--queue' => 'logs', '--max-jobs' => 25, '--max-time' => 60])
            ->everyMinute()
            ->withoutOverlapping()
            ->onFailure(function () {
                Log::error('Audit log queue worker failed');
            });

        // Prune old failed jobs while keeping recent failures visible for debugging.
        $schedule->command('queue:prune-failed', ['--hours' => 168])
            ->daily()
            ->withoutOverlapping();

        // Prune old activity logs using the configured retention window
        // Runs monthly on the 1st day at 2:00 AM
        $schedule->command('activity-logs:prune')
            ->monthlyOn(1, '02:00')
            ->withoutOverlapping()
            ->onFailure(function () {
                Log::error('Activity log pruning failed');
            });
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
