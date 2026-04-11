<?php

/**
 * InfinityFree Initialization Script
 * IMPORTANT: Delete this file after running (security risk)
 */

// Get the project root - more robust for shared hosting
$projectRoot = dirname(dirname(__FILE__));

// Define required directories
$requiredDirs = [
    $projectRoot . '/storage/framework',
    $projectRoot . '/storage/framework/views',
    $projectRoot . '/storage/framework/sessions',
    $projectRoot . '/storage/framework/cache',
    $projectRoot . '/storage/framework/cache/data',
    $projectRoot . '/storage/logs',
    $projectRoot . '/storage/app',
    $projectRoot . '/storage/app/public',
    $projectRoot . '/storage/app/public/avatars',
    $projectRoot . '/storage/app/public/logos',
    $projectRoot . '/storage/app/public/products',
    $projectRoot . '/storage/app/public/receipts',
    $projectRoot . '/storage/app/public/system',
];

$errors = [];
$created = [];

// Create directories
foreach ($requiredDirs as $dir) {
    if (!is_dir($dir)) {
        if (@mkdir($dir, 0755, true)) {
            $created[] = basename($dir) . ' (created)';
        } else {
            $errors[] = "Failed to create: " . str_replace($projectRoot, '', $dir);
        }
    } else {
        $created[] = basename($dir) . ' (exists)';
    }
}

// Clear cache files
$cacheFiles = [
    $projectRoot . '/bootstrap/cache/config.php',
    $projectRoot . '/bootstrap/cache/routes-v7.php',
    $projectRoot . '/bootstrap/cache/services.php',
    $projectRoot . '/bootstrap/cache/packages.php',
];

$deleted = [];
foreach ($cacheFiles as $file) {
    if (file_exists($file)) {
        if (@unlink($file)) {
            $deleted[] = basename($file);
        } else {
            $errors[] = "Failed to delete: " . basename($file);
        }
    }
}

// Create storage symlink
$storageLink = $projectRoot . '/public/storage';
$storageTarget = $projectRoot . '/storage/app/public';
$symlinkStatus = 'Unknown';

if (!is_link($storageLink) && !is_dir($storageLink)) {
    if (@symlink($storageTarget, $storageLink)) {
        $symlinkStatus = 'Created';
    } else {
        $symlinkStatus = 'Failed (may not be supported)';
    }
} elseif (is_link($storageLink)) {
    $symlinkStatus = 'Already exists (symlink)';
} else {
    $symlinkStatus = 'Already exists (directory)';
}

// Check writeability
$writable = [];
$writeTests = [
    $projectRoot . '/storage' => 'storage',
    $projectRoot . '/bootstrap/cache' => 'bootstrap/cache',
];

foreach ($writeTests as $path => $name) {
    if (is_writable($path)) {
        $writable[] = $name;
    } else {
        $errors[] = "$name is NOT writable";
    }
}
?>
<!DOCTYPE html>
<html>

<head>
    <title>InfinityFree Setup</title>
    <style>
        body {
            font-family: Arial;
            background: #f5f5f5;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        h1 {
            color: #333;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }

        h2 {
            color: #555;
            margin-top: 20px;
            font-size: 18px;
        }

        ul {
            padding-left: 20px;
        }

        li {
            margin: 8px 0;
        }

        .success {
            color: #4CAF50;
            font-weight: bold;
        }

        .error {
            color: #f44336;
            font-weight: bold;
        }

        .warning {
            color: #ff9800;
        }

        .section {
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #4CAF50;
        }

        .error-section {
            border-left-color: #f44336;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>✓ InfinityFree Laravel Setup</h1>

        <div class="section">
            <h2>Directories Created</h2>
            <?php if (!empty($created)): ?>
                <ul>
                    <?php foreach ($created as $dir): ?>
                        <li><span class="success">✓</span> <?php echo htmlspecialchars($dir); ?></li>
                    <?php endforeach; ?>
                </ul>
            <?php else: ?>
                <p class="warning">No directories created</p>
            <?php endif; ?>
        </div>

        <div class="section">
            <h2>Cache Files Cleared</h2>
            <?php if (!empty($deleted)): ?>
                <ul>
                    <?php foreach ($deleted as $file): ?>
                        <li><span class="success">✓</span> <?php echo htmlspecialchars($file); ?></li>
                    <?php endforeach; ?>
                </ul>
            <?php else: ?>
                <p class="warning">No cache files found</p>
            <?php endif; ?>
        </div>

        <div class="section">
            <h2>Storage Symlink</h2>
            <p><span class="success">✓</span> <?php echo htmlspecialchars($symlinkStatus); ?></p>
        </div>

        <div class="section">
            <h2>Writable Directories</h2>
            <?php if (!empty($writable)): ?>
                <ul>
                    <?php foreach ($writable as $dir): ?>
                        <li><span class="success">✓</span> <?php echo htmlspecialchars($dir); ?></li>
                    <?php endforeach; ?>
                </ul>
            <?php else: ?>
                <p class="error">No writable directories found!</p>
            <?php endif; ?>
        </div>

        <?php if (!empty($errors)): ?>
            <div class="section error-section">
                <h2>Errors Detected</h2>
                <ul>
                    <?php foreach ($errors as $error): ?>
                        <li><span class="error">✗</span> <?php echo htmlspecialchars($error); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <div style="margin-top: 30px; padding: 15px; background: #e8f5e9; border-radius: 4px;">
            <h2 style="color: #2e7d32; margin-top: 0;">Next Steps</h2>
            <ol>
                <li>Visit your app: <strong><a href="/login">/login</a></strong></li>
                <li>Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)</li>
                <li><strong style="color: red;">DELETE this file (init.php) via FTP immediately for security</strong></li>
            </ol>
        </div>
    </div>
</body>

</html>