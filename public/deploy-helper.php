<?php

/**
 * Web-Triggered Deployment Helper for Hostinger (Zero-Downtime Releases)
 * 
 * Secure endpoint to extract build payload, update symlinks, and run database migrations.
 */

// 1. Setup error reporting for deployment debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

// 2. Identify the base directory structure (works during bootstrap and normal releases)
$base_dir = null;
if (strpos(__DIR__, 'releases') !== false) {
    // Inside releases/release_xxx/public
    $base_dir = realpath(__DIR__ . '/../../..');
} else {
    // Inside public_html bootstrap folder
    $base_dir = realpath(__DIR__ . '/../WEB-inertia-pos');
}

if (!$base_dir || !is_dir($base_dir)) {
    http_response_code(500);
    die("Error: Base WEB-inertia-pos directory not found.\n");
}

$shared_env_path = $base_dir . '/shared/.env';
$temp_zip_path = $base_dir . '/temp/release.zip';
$releases_dir = $base_dir . '/releases';
$shared_dir = $base_dir . '/shared';

// 3. Security Verification: Validate Deploy Token
$expected_token = get_deploy_token($shared_env_path);
$incoming_token = isset($_GET['token']) ? $_GET['token'] : '';

if (!$expected_token) {
    http_response_code(500);
    die("Error: DEPLOY_TOKEN not configured in shared/.env.\n");
}

if (empty($incoming_token) || $incoming_token !== $expected_token) {
    http_response_code(403);
    die("Error: Unauthorized. Invalid or missing token.\n");
}

echo "--- DEPLOYMENT INITIATED ---\n";

// 4. Verify release.zip exists
if (!file_exists($temp_zip_path)) {
    http_response_code(400);
    die("Error: release.zip file not found in temp/.\n");
}

// 5. Create new release folder
$release_name = 'release_' . date('Ymd_His');
$new_release_path = $releases_dir . '/' . $release_name;
echo "Creating new release folder: {$release_name}...\n";

if (!mkdir($new_release_path, 0755, true)) {
    http_response_code(500);
    die("Error: Failed to create release directory.\n");
}

// 6. Extract Zip
echo "Extracting release.zip...\n";
$zip = new ZipArchive();
if ($zip->open($temp_zip_path) === TRUE) {
    $zip->extractTo($new_release_path);
    $zip->close();
    echo "Extraction completed successfully.\n";
} else {
    http_response_code(500);
    delete_directory($new_release_path);
    die("Error: Failed to extract release.zip.\n");
}

// 7. Ensure shared folders exist and copy structure if needed
echo "Configuring persistent storage...\n";
$shared_storage_path = $shared_dir . '/storage';
if (!is_dir($shared_storage_path)) {
    mkdir($shared_storage_path, 0755, true);
}

// Ensure necessary Laravel storage subdirectories exist in shared/storage
$storage_subdirs = [
    'app/public',
    'framework/cache/data',
    'framework/sessions',
    'framework/testing',
    'framework/views',
    'logs'
];
foreach ($storage_subdirs as $subdir) {
    $path = $shared_storage_path . '/' . $subdir;
    if (!is_dir($path)) {
        mkdir($path, 0755, true);
    }
}

// 8. Link shared resources to the new release
if (is_dir($new_release_path . '/storage')) {
    delete_directory($new_release_path . '/storage');
}

// Create symlink for storage and .env
if (!symlink('../../shared/storage', $new_release_path . '/storage')) {
    http_response_code(500);
    die("Error: Failed to symlink storage.\n");
}

if (!symlink('../../shared/.env', $new_release_path . '/.env')) {
    http_response_code(500);
    die("Error: Failed to symlink .env.\n");
}

echo "Symlinks for storage and .env successfully created.\n";

// 9. Run Laravel Migrations and Cache Cleaning programmatically
echo "Bootstrapping Laravel for migrations and caching...\n";
$old_cwd = getcwd();
chdir($new_release_path);

try {
    require $new_release_path . '/vendor/autoload.php';
    $app = require_once $new_release_path . '/bootstrap/app.php';
    
    // Resolve Console Kernel
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    
    // Run Migrations
    echo "Running database migrations...\n";
    $status = $kernel->call('migrate', ['--force' => true]);
    echo "Migration output:\n" . Artisan::output() . "\n";
    
    // Build link to public storage
    echo "Generating public storage link...\n";
    $kernel->call('storage:link');
    echo "Storage link output:\n" . Artisan::output() . "\n";
    
    // Cache clear and caching
    echo "Caching configurations and routes...\n";
    $kernel->call('config:cache');
    $kernel->call('route:cache');
    $kernel->call('view:cache');
    echo "Optimization completed.\n";
    
} catch (Exception $e) {
    http_response_code(500);
    chdir($old_cwd);
    delete_directory($new_release_path);
    die("Laravel Boot/Command Error: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n");
}

chdir($old_cwd);

// 10. Atomic Symlink Switch
echo "Swapping active release symlink...\n";
$current_symlink = $base_dir . '/current';
$temp_symlink = $base_dir . '/current_temp';

if (file_exists($temp_symlink)) {
    unlink($temp_symlink);
}

// Create new symlink pointing to the new release
if (!symlink('releases/' . $release_name, $temp_symlink)) {
    http_response_code(500);
    die("Error: Failed to create temp symlink.\n");
}

// Rename temp symlink to current (Atomic switch)
if (!rename($temp_symlink, $current_symlink)) {
    http_response_code(500);
    die("Error: Failed to switch symlink to current.\n");
}

echo "Active symlink updated successfully to {$release_name}.\n";

// 11. Cleanup release.zip
unlink($temp_zip_path);
echo "Cleaned up temporary release.zip payload.\n";

// 12. Cleanup old releases (Keep last 3)
echo "Cleaning up old releases...\n";
$releases = glob($releases_dir . '/release_*', GLOB_ONLYDIR);
if (count($releases) > 3) {
    sort($releases);
    $to_delete = array_slice($releases, 0, count($releases) - 3);
    foreach ($to_delete as $dir) {
        echo "Deleting old release: " . basename($dir) . "\n";
        delete_directory($dir);
    }
}

echo "--- DEPLOYMENT SUCCESSFUL ---\n";

// --- Helper Functions ---

/**
 * Parses the DEPLOY_TOKEN from the live shared .env file
 */
function get_deploy_token($env_file) {
    if (!file_exists($env_file)) {
        return null;
    }
    $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            if (trim($name) === 'DEPLOY_TOKEN') {
                return trim(str_replace(['"', "'"], '', $value));
            }
        }
    }
    return null;
}

/**
 * Recursively deletes a directory
 */
function delete_directory($dir) {
    if (!file_exists($dir)) {
        return true;
    }
    if (!is_dir($dir)) {
        return unlink($dir);
    }
    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..') {
            continue;
        }
        if (!delete_directory($dir . DIRECTORY_SEPARATOR . $item)) {
            return false;
        }
    }
    return rmdir($dir);
}
