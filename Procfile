web: bash bin/start && php -S 0.0.0.0:${PORT:-8080} -t public
worker: bash bin/start && php artisan queue:work --sleep=3 --tries=3 --max-time=3600
