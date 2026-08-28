<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\SuperAdminMiddleware;
use App\Http\Middleware\SecurityHeaders;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        // 0. Global Security Middleware (Runs before route matching to block probes)
        $middleware->append(\App\Http\Middleware\IpBlacklistMiddleware::class);

        // 1. THIS LINE ENSURES REACT GETS THE DATA
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            SecurityHeaders::class,
        ]);

        // 2. Your existing Admin alias
        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'super_admin' => SuperAdminMiddleware::class,
            'throttle.mail' => \App\Http\Middleware\ThrottleMailRecipient::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {

        // 3. Render Custom Inertia Error Pages
        $exceptions->respond(function (Response $response, \Throwable $exception, Request $request) {
            // Bypass Inertia custom error page for utility/migration routes
            if ($request->is('artisan-migrate*') || $request->is('api/*')) {
                return $response;
            }

            $validStatuses = [500, 503, 404, 403];

            if (in_array($response->getStatusCode(), $validStatuses)) {
                // If we are in local development mode, let Laravel show its detailed error page for 500 crashes
                if (config('app.debug') && $response->getStatusCode() === 500) {
                    return $response;
                }

                return Inertia::render('Error', ['status' => $response->getStatusCode()])
                    ->toResponse($request)
                    ->setStatusCode($response->getStatusCode());
            }

            return $response;
        });
    })->create();

// Support alternative environment files for InfinityFree (env.php, env.txt, app.env)
if (file_exists($envPhp = $app->basePath('env.php')) || file_exists($envPhp = $app->basePath('custom_env.php'))) {
    $envVars = require $envPhp;
    if (is_array($envVars)) {
        foreach ($envVars as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = (string) $value;
            $_SERVER[$key] = (string) $value;
        }
    }
} elseif (!file_exists($app->environmentFilePath())) {
    if (file_exists($app->basePath('env.txt'))) {
        $app->loadEnvironmentFrom('env.txt');
    } elseif (file_exists($app->basePath('app.env'))) {
        $app->loadEnvironmentFrom('app.env');
    } elseif (file_exists($app->basePath('production.env'))) {
        $app->loadEnvironmentFrom('production.env');
    }
}

return $app;
