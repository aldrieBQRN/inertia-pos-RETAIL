<?php

ini_set('display_errors', '1');
ini_set('max_execution_time', '300');
error_reporting(E_ALL);

$zipFile = __DIR__ . '/vendor.zip';
$extractPath = __DIR__ . '/inertia-pos-core';

echo "<div style='font-family:sans-serif;padding:30px;max-width:700px;margin:auto;'>";
echo "<h2>Inertia POS - Fast Vendor Extractor</h2>";

if (!file_exists($zipFile)) {
    echo "<p style='color:#e11d48;'><strong>Error:</strong> <code>vendor.zip</code> was not found in <code>" . htmlspecialchars(__DIR__) . "</code>.</p>";
    echo "<p>Please upload <code>vendor.zip</code> into the <code>htdocs/</code> folder and refresh this page.</p>";
    echo "</div>";
    exit(1);
}

if (!class_exists('ZipArchive')) {
    echo "<p style='color:#e11d48;'><strong>Error:</strong> PHP ZipArchive extension is not enabled on this server.</p>";
    echo "</div>";
    exit(1);
}

$zip = new ZipArchive;
$res = $zip->open($zipFile);

if ($res === TRUE) {
    if (!is_dir($extractPath)) {
        @mkdir($extractPath, 0775, true);
    }

    $zip->extractTo($extractPath);
    $zip->close();

    echo "<p style='color:#16a34a;font-size:18px;'><strong>Success!</strong> <code>vendor.zip</code> has been completely extracted to <code>" . htmlspecialchars($extractPath) . "/vendor/</code>!</p>";
    echo "<p>All 100% of vendor files are now intact and verified.</p>";
    echo "<p>👉 <a href='/' style='background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;'>Go to POS Application</a></p>";
    echo "<hr style='margin-top:20px;'><p style='color:#64748b;font-size:12px;'>You can now safely delete <code>vendor.zip</code> and <code>unzip.php</code> from <code>htdocs/</code>.</p>";
} else {
    echo "<p style='color:#e11d48;'><strong>Error:</strong> Failed to open <code>vendor.zip</code> (Code: $res).</p>";
}

echo "</div>";
