<?php

header('Content-Type: text/plain; charset=utf-8');

echo "=== OPCACHE RESET DIAGNOSTICS ===\n\n";

if (function_exists('opcache_reset')) {
    if (opcache_reset()) {
        echo "✅ OPcache cleared and reset successfully! All PHP files will be reloaded from disk.\n";
    } else {
        echo "❌ OPcache reset call failed.\n";
    }
} else {
    echo "❌ opcache_reset() function is disabled or not supported on this PHP configuration.\n";
}
