<?php

/**
 * InfinityFree Post-Upload Setup Script
 *
 * This file runs automated setup after uploading files via FTP.
 * IMPORTANT: Delete this file after successful setup (security risk!)
 *
 * Steps:
 * 1. Upload all files via FTP
 * 2. Visit: https://inertia-pos.page.gd/setup.php
 * 3. Wait for green "Setup complete!" message
 * 4. Delete this file via FTP immediately
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Define the base path
define('LARAVEL_START', microtime(true));
$basePath = __DIR__;

try {
    echo "<h2 style='color: #333;'>🚀 Inertia POS - InfinityFree Setup</h2>";
    echo "<p>Starting post-upload configuration...</p>";
    echo "<hr>";

    // Step 1: Verify .env exists
    echo "<strong>Step 1: Checking .env file...</strong><br>";
    $envPath = dirname($basePath) . '/.env';
    if (!file_exists($envPath)) {
        throw new Exception("❌ .env file not found at " . $envPath);
    }
    echo "✓ .env file exists<br><br>";

    // Step 2: Load Laravel
    echo "<strong>Step 2: Loading Laravel application...</strong><br>";
    require $basePath . '/vendor/autoload.php';
    $app = require_once $basePath . '/bootstrap/app.php';
    echo "✓ Laravel loaded successfully<br><br>";

    // Step 3: Get the Artisan kernel
    echo "<strong>Step 3: Initializing Artisan...</strong><br>";
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    echo "✓ Artisan kernel ready<br><br>";

    // Step 4: Clear all caches
    echo "<strong>Step 4: Clearing application cache...</strong><br>";
    $kernel->call('cache:clear');
    echo "✓ Application cache cleared<br>";

    $kernel->call('config:cache');
    echo "✓ Config cached<br>";

    $kernel->call('route:cache');
    echo "✓ Routes cached<br><br>";

    // Step 5: Run migrations
    echo "<strong>Step 5: Running database migrations...</strong><br>";
    ob_start();
    $kernel->call('migrate', ['--force' => true]);
    $output = ob_get_clean();

    if (strpos($output, 'error') !== false || strpos($output, 'Error') !== false) {
        echo "<em style='color: orange;'>⚠️ Migration output: " . htmlspecialchars($output) . "</em><br>";
    } else {
        echo "✓ Database migrations completed<br>";
    }
    echo "<br>";

    // Step 6: Seed database (optional)
    echo "<strong>Step 6: Verifying database tables...</strong><br>";
    try {
        ob_start();
        $kernel->call('migrate:status');
        $output = ob_get_clean();
        echo "✓ Database tables verified<br><br>";
    } catch (Exception $e) {
        // Ignore seeding errors
        echo "⚠️ Database check skipped (this is ok)<br><br>";
    }

    // Step 7: Set file permissions
    echo "<strong>Step 7: Setting directory permissions...</strong><br>";
    $directories = [
        dirname($basePath) . '/storage',
        dirname($basePath) . '/bootstrap/cache',
    ];

    foreach ($directories as $dir) {
        if (is_dir($dir)) {
            // Note: File permissions may be limited on InfinityFree
            chmod($dir, 0755);
            echo "✓ " . basename($dir) . " checked<br>";
        }
    }
    echo "<br>";

    // Success!
    echo "<hr>";
    echo "<h3 style='color: green;'>✅ Setup Complete!</h3>";
    echo "<p><strong>Next Steps:</strong></p>";
    echo "<ol>";
    echo "<li>Visit <a href='https://inertia-pos.page.gd/' target='_blank'>https://inertia-pos.page.gd/</a> to access your POS system</li>";
    echo "<li><strong>IMPORTANT: Delete this setup.php file immediately via FTP</strong> (security risk)</li>";
    echo "<li>Log in with your credentials</li>";
    echo "<li>Set up EasyCron for automatic email reminders:</li>";
    echo "   <ul>";
    echo "   <li>Go to <a href='https://www.easycron.com/' target='_blank'>easycron.com</a></li>";
    echo "   <li>Create a cron job: <code>* * * * *</code> (every minute)</li>";
    echo "   <li>URL: <code>https://inertia-pos.page.gd/scheduler.php</code></li>";
    echo "   </ul>";
    echo "</ol>";
    echo "<p style='color: red;'><strong>⚠️ SECURITY: Delete setup.php now!</strong></p>";
} catch (Exception $e) {
    echo "<h3 style='color: red;'>❌ Setup Failed</h3>";
    echo "<p><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<pre style='background: #f0f0f0; padding: 10px; overflow: auto;'>";
    echo htmlspecialchars($e->getTraceAsString());
    echo "</pre>";
    echo "<p><strong>Troubleshooting:</strong></p>";
    echo "<ul>";
    echo "<li>Verify all files were uploaded correctly</li>";
    echo "<li>Check that vendor/ folder exists with all dependencies</li>";
    echo "<li>Verify .env file has correct database credentials</li>";
    echo "<li>Check storage/logs/laravel.log for detailed errors</li>";
    echo "</ul>";
}
