web: php -S 0.0.0.0:${PORT:-8080} -t public
worker: php artisan queue:work --sleep=3 --tries=3
