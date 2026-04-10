<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ViewCacheCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'view:cache';

    /**
     * The console command description.
     */
    protected $description = 'Compile all of the application views (disabled on ephemeral filesystems)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // On ephemeral filesystems like Railway, we skip view caching
        // Views are compiled on-demand at runtime instead
        $this->info('View caching disabled (ephemeral filesystem detected)');
        return 0;
    }
}
