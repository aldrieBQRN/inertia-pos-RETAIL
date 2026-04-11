<?php

/**
 * Simple storage file server
 * Serves files from /storage/app/public/ via /storage/ URLs
 */

// Get requested file
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = str_replace('/storage/', '', $path);
$file = ltrim($file, '/');

// Build full path
$fullPath = dirname(dirname(__DIR__)) . '/storage/app/public/' . $file;

// Security check
$realPath = realpath($fullPath);
$basePath = realpath(dirname(dirname(__DIR__)) . '/storage/app/public');

if ($realPath === false || strpos($realPath, $basePath) !== 0) {
    http_response_code(404);
    exit('Not found');
}

// Serve the file
if (file_exists($realPath) && is_file($realPath)) {
    header('Content-Type: ' . mime_content_type($realPath));
    header('Cache-Control: public, max-age=31536000');
    readfile($realPath);
} else {
    http_response_code(404);
    exit('Not found');
}
