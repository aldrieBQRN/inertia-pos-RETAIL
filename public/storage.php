<?php

/**
 * Storage file server for InfinityFree
 * Serves files from /storage/app/public/ when /public/storage/ symlink isn't available
 *
 * Usage: Visit /storage/file-path in the browser
 */

// Get the requested file path
$requestedPath = ltrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/storage/');

// Build the actual file path
$basePath = dirname(dirname(__DIR__)) . '/storage/app/public/';
$filePath = realpath($basePath . $requestedPath);

// Security: Ensure the file is within the storage directory
if ($filePath === false || strpos($filePath, realpath($basePath)) !== 0) {
    http_response_code(404);
    die('File not found');
}

// Check if file exists
if (!file_exists($filePath) || !is_file($filePath)) {
    http_response_code(404);
    die('File not found');
}

// Get MIME type
$mimeType = mime_content_type($filePath);
if ($mimeType === false) {
    $mimeType = 'application/octet-stream';
}

// Set headers
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: public, max-age=31536000');

// Serve the file
readfile($filePath);
