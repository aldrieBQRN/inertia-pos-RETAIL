<?php

header('Content-Type: text/plain; charset=utf-8');

$base_dir = realpath(__DIR__ . '/../WEB-inertia-pos');
if (!$base_dir) {
    $base_dir = '/home/u259109413/domains/violet-raven-871650.hostingersite.com/WEB-inertia-pos';
}

echo "=== DIAGNOSTICS FOR THROTTLE.MAIL MIDDLEWARE ===\n\n";

echo "Base Directory: {$base_dir}\n";

$target_file = $base_dir . '/app/Http/Middleware/ThrottleMailRecipient.php';
echo "Target File Path: {$target_file}\n";

if (file_exists($target_file)) {
    echo "✅ File exists on the server!\n";
    echo "File Size: " . filesize($target_file) . " bytes\n";
} else {
    echo "❌ File does NOT exist on the server!\n";
}

$middleware_dir = $base_dir . '/app/Http/Middleware';
echo "\nListing files in {$middleware_dir}:\n";
if (is_dir($middleware_dir)) {
    $files = scandir($middleware_dir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            echo " - {$file}\n";
        }
    }
} else {
    echo "❌ Directory does not exist!\n";
}

echo "\nBootstrapping Autoloader to test class loading:\n";
$autoloader = $base_dir . '/vendor/autoload.php';
if (file_exists($autoloader)) {
    require $autoloader;
    echo "✅ Autoloader loaded.\n";
    
    $class_name = 'App\\Http\\Middleware\\ThrottleMailRecipient';
    echo "Testing class_exists('{$class_name}'):\n";
    if (class_exists($class_name)) {
        echo "✅ Class exists and is fully loadable!\n";
    } else {
        echo "❌ Class does NOT exist or could not be autoloaded!\n";
    }
} else {
    echo "❌ Autoloader not found!\n";
}
