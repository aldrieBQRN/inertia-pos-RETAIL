<?php

/**
 * Laravel Scheduler Trigger for InfinityFree
 *
 * This file allows you to trigger Laravel's task scheduler via HTTP request.
 * Set up a cron job to call this file every minute:
 * https://your-domain.infinityfree.app/scheduler.php
 *
 * Or use a free cron service like EasyCron to ping this URL every minute.
 */

// Define the base path
define('LARAVEL_START', microtime(true));
$basePath = __DIR__;

// Load Laravel's autoloader
require $basePath . '/vendor/autoload.php';

// Bootstrap Laravel application
$app = require_once $basePath . '/bootstrap/app.php';

// Get the console kernel
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

// Run the scheduler
exit($kernel->call('schedule:run'));
