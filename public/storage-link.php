<?php

/**
 * Setup storage access for InfinityFree
 * Creates symlink or configures alternative access methods
 */

$rootDir = dirname(dirname(__DIR__));
$target = $rootDir . '/storage/app/public';
$link = $rootDir . '/public/storage';

echo "<!DOCTYPE html><html><body style='font-family: Arial, sans-serif; padding: 20px;'>";
echo "<h1>Storage Setup</h1>";

// Check if storage/app/public exists
if (!is_dir($target)) {
    echo "<p style='color: red'>✗ Target directory does not exist: $target</p>";
} else {
    echo "<p style='color: green'>✓ Target directory exists: $target</p>";
}

// Check current status of /public/storage
if (is_link($link)) {
    echo "<p style='color: green'>✓ Symlink already exists at: $link</p>";
    echo "<p>Points to: " . readlink($link) . "</p>";
} elseif (is_dir($link)) {
    echo "<p style='color: orange'>⚠ /public/storage exists but is NOT a symlink (regular directory)</p>";
} else {
    echo "<p style='color: red'>✗ /public/storage does not exist</p>";
}

// Try to create symlink
if (!is_link($link) && is_dir($target)) {
    echo "<h2>Attempting to create symlink...</h2>";
    if (@symlink($target, $link)) {
        echo "<p style='color: green'>✓ Symlink created successfully!</p>";
    } else {
        echo "<p style='color: orange'>⚠ Symlink creation failed (may not be supported on this hosting)</p>";
    }
}

// List what's in the storage/app/public directory
echo "<h2>Files in target storage/app/public:</h2>";
if (is_dir($target)) {
    $all_items = array_slice(scandir($target), 2);
    if (count($all_items) > 0) {
        echo "<ul>";
        foreach ($all_items as $item) {
            $full_path = $target . '/' . $item;
            if (is_dir($full_path)) {
                $count = count(array_slice(scandir($full_path), 2));
                echo "<li><strong>$item/</strong> ($count items)</li>";
            } else {
                echo "<li>$item</li>";
            }
        }
        echo "</ul>";
    } else {
        echo "<p>No files or directories found</p>";
    }
} else {
    echo "<p style='color: red'>Directory not accessible</p>";
}

// Final status
echo "<h2>Status:</h2>";
if (is_link($link) || (is_dir($link) && is_dir($target))) {
    echo "<p style='color: green'>✓ Storage should be accessible at /storage/</p>";
} else {
    echo "<p style='color: red'>✗ Storage may not be accessible. Check if symlink or file copying is needed.</p>";
}

echo "<hr><p><small>DELETE this file (storage-link.php) after setup is complete</small></p>";
echo "</body></html>";
