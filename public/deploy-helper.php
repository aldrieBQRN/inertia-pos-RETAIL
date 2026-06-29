<?php
// SECURITY: Delete this file after first use!

$allowedSecret = '081124';
$secret = $_GET['secret'] ?? '';

if ($secret !== $allowedSecret) {
    http_response_code(403);
    die('Forbidden');
}

$baseDir = __DIR__;
$cleared = [];

// Clear bootstrap cache files
$cacheFiles = [
    $baseDir . '/bootstrap/cache/config.php',
    $baseDir . '/bootstrap/cache/routes-v7.php',
    $baseDir . '/bootstrap/cache/packages.php',
    $baseDir . '/bootstrap/cache/services.php',
];

foreach ($cacheFiles as $file) {
    if (file_exists($file)) {
        unlink($file);
        $cleared[] = "✅ Deleted: " . basename($file);
    } else {
        $cleared[] = "⏭️ Not found (skipped): " . basename($file);
    }
}

// Clear framework cache/views
$dirs = [
    $baseDir . '/storage/framework/views',
    $baseDir . '/storage/framework/cache/data',
];

foreach ($dirs as $dir) {
    if (is_dir($dir)) {
        foreach (glob($dir . '/*') as $f) {
            if (is_file($f)) {
                unlink($f);
                $cleared[] = "✅ Cleared: " . $f;
            }
        }
    }
}

$cleared[] = "🎉 All done! Cache cleared successfully.";
echo "<pre>" . implode("\n", $cleared) . "</pre>";
