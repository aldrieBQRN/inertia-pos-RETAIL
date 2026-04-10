<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// 1. The 5-Day Advance Warning
Schedule::command('subscription:remind')->dailyAt('08:00');

// 2. The "Day Of" Warning (with grace period notice)
Schedule::command('subscription:due')->dailyAt('08:15');
