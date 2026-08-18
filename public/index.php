<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Find core directory path across possible InfinityFree directory layouts
$coreCandidates = [
    __DIR__ . '/..',
    __DIR__ . '/../inertia-pos-core',
    __DIR__ . '/../../inertia-pos-core',
    __DIR__ . '/../../../inertia-pos-core',
];

$corePath = null;
foreach ($coreCandidates as $candidate) {
    if (file_exists($candidate . '/vendor/autoload.php') && file_exists($candidate . '/bootstrap/app.php')) {
        $corePath = realpath($candidate) ?: $candidate;
        break;
    }
}

if (!$corePath) {
    http_response_code(500);
    echo "<div style='font-family:sans-serif;padding:30px;max-width:800px;margin:auto;'>";
    echo "<h2 style='color:#e11d48;'>Inertia POS - Core Engine Not Found</h2>";
    echo "<p>Could not locate <code>vendor/autoload.php</code> or <code>bootstrap/app.php</code> in any expected directory.</p>";
    echo "<p><strong>Current Web Root (__DIR__):</strong> <code>" . htmlspecialchars(__DIR__) . "</code></p>";
    echo "<p><strong>Checked Candidate Paths:</strong></p><ul>";
    foreach ($coreCandidates as $c) {
        $exists = is_dir($c);
        echo "<li><code>" . htmlspecialchars($c) . "</code> &mdash; " . ($exists ? "<strong style='color:#16a34a;'>Directory Exists</strong> (but missing vendor or bootstrap)" : "<span style='color:#94a3b8;'>Directory Not Found</span>") . "</li>";
    }
    echo "</ul></div>";
    exit(1);
}

// Auto-create essential Laravel storage directories if missing
$storageDirs = [
    $corePath . '/storage/framework/views',
    $corePath . '/storage/framework/sessions',
    $corePath . '/storage/framework/cache/data',
    $corePath . '/storage/logs',
    $corePath . '/bootstrap/cache',
];
foreach ($storageDirs as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = $corePath . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require $corePath . '/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
try {
    /** @var Application $app */
    $app = require_once $corePath . '/bootstrap/app.php';

    if (is_dir($corePath . '/storage')) {
        $app->useStoragePath($corePath . '/storage');
    }

    $app->handleRequest(Request::capture());
} catch (\Throwable $e) {
    http_response_code(500);
    echo "<div style='font-family:sans-serif;padding:30px;max-width:900px;margin:auto;'>";
    echo "<h2 style='color:#e11d48;'>Inertia POS - Application Error (500)</h2>";
    echo "<p><strong>Exception:</strong> " . htmlspecialchars(get_class($e)) . "</p>";
    echo "<p><strong>Message:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>File:</strong> <code>" . htmlspecialchars($e->getFile()) . "</code> on line <strong>" . $e->getLine() . "</strong></p>";
    echo "<h4 style='margin-top:20px;'>Stack Trace:</h4>";
    echo "<pre style='background:#1e1e2e;color:#cdd6f4;padding:16px;border-radius:8px;overflow:auto;font-size:13px;line-height:1.4;'>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    echo "</div>";
    exit(1);
}
