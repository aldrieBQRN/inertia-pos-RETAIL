<?php

define('LARAVEL_START', microtime(true));

// Change working directory to public so all Laravel paths resolve correctly
chdir(__DIR__ . '/public');

require __DIR__ . '/public/index.php';
