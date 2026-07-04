<?php

header('Content-Type: text/plain; charset=utf-8');

echo "=== STORAGE SYMLINK DIAGNOSTICS & REPAIR ===\n\n";

$target = '/home/u259109413/domains/violet-raven-871650.hostingersite.com/WEB-inertia-pos/storage/app/public';
$link = '/home/u259109413/domains/violet-raven-871650.hostingersite.com/public_html/storage';

echo "Expected Target: {$target}\n";
echo "Expected Link Location: {$link}\n\n";

if (!is_dir($target)) {
    echo "❌ Target storage folder does NOT exist. Creating it...\n";
    mkdir($target, 0755, true);
} else {
    echo "✅ Target storage folder exists.\n";
}

// Check current link status
if (file_exists($link) || is_link($link)) {
    echo "⚠️ Path already exists at: {$link}\n";
    if (is_link($link)) {
        $current_target = readlink($link);
        echo "   - It is a SYMLINK.\n";
        echo "   - Currently points to: {$current_target}\n";
        
        if ($current_target === $target) {
            echo "   - ✅ Link is CORRECT! Nothing to change.\n";
            exit;
        } else {
            echo "   - ❌ Link points to the WRONG folder! Removing it...\n";
            unlink($link);
        }
    } else {
        echo "   - ❌ It is a REGULAR DIRECTORY (not a symlink)! Removing it...\n";
        // Delete directory and its contents to make room for symlink
        delete_directory($link);
    }
} else {
    echo "✅ No file or link exists at {$link}. Safe to create new symlink.\n";
}

// Create symlink
echo "\nAttempting to create symbolic link...\n";
if (symlink($target, $link)) {
    echo "✅ Symlink created successfully!\n";
} else {
    echo "❌ Failed to create symlink. Check file permissions or hosting settings.\n";
}

function delete_directory($dir) {
    if (!file_exists($dir)) return true;
    if (!is_dir($dir)) return unlink($dir);
    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..') continue;
        if (!delete_directory($dir . DIRECTORY_SEPARATOR . $item)) return false;
    }
    return rmdir($dir);
}
