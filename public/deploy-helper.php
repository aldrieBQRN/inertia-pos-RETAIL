<?php

/**
 * Web-Triggered Deployment Helper for Hostinger (No Symlinks / Overwrite Method)
 * 
 * Secure endpoint to extract build payload, copy public assets, rewrite paths, and run database migrations.
 */

// 1. Setup error reporting for deployment debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

// 2. Identify directories (Works from public_html/)
$domain_dir = '/home/u259109413/domains/violet-raven-871650.hostingersite.com';
$base_dir = $domain_dir . '/WEB-inertia-pos';
$public_html_dir = $domain_dir . '/public_html';

if (!is_dir($base_dir)) {
    mkdir($base_dir, 0755, true);
}

$env_path = $base_dir . '/.env';
$temp_zip_path = $base_dir . '/temp/release.zip';

// 3. Security Verification: Validate Deploy Token
$expected_token = get_deploy_token($env_path);
$incoming_token = isset($_GET['token']) ? $_GET['token'] : '';

if (!$expected_token) {
    http_response_code(500);
    die("Error: DEPLOY_TOKEN not configured in WEB-inertia-pos/.env.\n");
}

if (empty($incoming_token) || $incoming_token !== $expected_token) {
    http_response_code(403);
    die("Error: Unauthorized. Invalid or missing token.\n");
}

echo "--- DEPLOYMENT INITIATED (OVERWRITE METHOD) ---\n";

// 4. Verify release.zip exists
if (!file_exists($temp_zip_path)) {
    http_response_code(400);
    die("Error: release.zip file not found in WEB-inertia-pos/temp/.\n");
}

// 5. Extract Zip directly into WEB-inertia-pos
echo "Extracting release.zip directly into WEB-inertia-pos...\n";
$zip = new ZipArchive();
if ($zip->open($temp_zip_path) === TRUE) {
    $zip->extractTo($base_dir);
    $zip->close();
    echo "Extraction completed successfully.\n";
} else {
    http_response_code(500);
    die("Error: Failed to extract release.zip.\n");
}

// 6. Copy public directory contents to public_html recursively
echo "Copying public assets to public_html...\n";
$public_src = $base_dir . '/public';
if (is_dir($public_src)) {
    copy_directory($public_src, $public_html_dir);
    echo "Public assets copied successfully.\n";
} else {
    http_response_code(500);
    die("Error: Public source folder not found in extracted release.\n");
}

// 7. Rewrite paths in public_html/index.php to point to WEB-inertia-pos
echo "Adjusting autoload paths in public_html/index.php...\n";
$index_file = $public_html_dir . '/index.php';
if (file_exists($index_file)) {
    $index_content = file_get_contents($index_file);
    
    // Replace vendor autoload path
    $index_content = str_replace(
        "__DIR__.'/../vendor/autoload.php'",
        "__DIR__.'/../WEB-inertia-pos/vendor/autoload.php'",
        $index_content
    );
    
    // Replace bootstrap app path
    $index_content = str_replace(
        "__DIR__.'/../bootstrap/app.php'",
        "__DIR__.'/../WEB-inertia-pos/bootstrap/app.php'",
        $index_content
    );
    
    // Replace maintenance path if it exists
    $index_content = str_replace(
        "__DIR__.'/../storage/framework/maintenance.php'",
        "__DIR__.'/../WEB-inertia-pos/storage/framework/maintenance.php'",
        $index_content
    );
    
    file_put_contents($index_file, $index_content);
    echo "Path redirection configured successfully.\n";
} else {
    http_response_code(500);
    die("Error: index.php not found in public_html.\n");
}

// 8. Bootstrap Laravel and run database migrations & caching
echo "Bootstrapping Laravel from WEB-inertia-pos...\n";
$old_cwd = getcwd();
chdir($base_dir);

try {
    require $base_dir . '/vendor/autoload.php';
    $app = require_once $base_dir . '/bootstrap/app.php';
    
    // Resolve Console Kernel
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    
    // Run Migrations
    echo "Running database migrations...\n";
    $status = $kernel->call('migrate', ['--force' => true]);
    echo "Migration output:\n" . Artisan::output() . "\n";
    
    // Cache clearing and optimization
    echo "Optimizing configurations and routes...\n";
    $kernel->call('config:cache');
    $kernel->call('route:cache');
    $kernel->call('view:cache');
    echo "Optimization completed.\n";
    
} catch (Exception $e) {
    http_response_code(500);
    chdir($old_cwd);
    die("Laravel Boot/Command Error: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n");
}

chdir($old_cwd);

// 9. Clean up temporary files and extracted public folder to save space
unlink($temp_zip_path);
delete_directory($public_src);
echo "Cleanup completed.\n";

echo "--- DEPLOYMENT SUCCESSFUL ---\n";

// --- Helper Functions ---

/**
 * Parses the DEPLOY_TOKEN from the WEB-inertia-pos/.env file
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
 * Recursively copies a directory
 */
function copy_directory($src, $dst) {
    $dir = opendir($src);
    @mkdir($dst, 0755, true);
    while (false !== ($file = readdir($dir))) {
        if (($file != '.') && ($file != '..')) {
            if (is_dir($src . '/' . $file)) {
                copy_directory($src . '/' . $file, $dst . '/' . $file);
            } else {
                copy($src . '/' . $file, $dst . '/' . $file);
            }
        }
    }
    closedir($dir);
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
