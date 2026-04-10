<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;
use App\Http\Middleware\AdminMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        // 1. THIS LINE ENSURES REACT GETS THE DATA
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        // 2. Your existing Admin alias
        $middleware->alias([
            'admin' => AdminMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {

        // 3. Render Custom Inertia Error Pages
        $exceptions->respond(function (Response $response, \Throwable $exception, Request $request) {
            $validStatuses = [500, 503, 404, 403];

            if (in_array($response->getStatusCode(), $validStatuses)) {

                // If we are in local development mode, let Laravel show its detailed error page for 500 crashes
                // But ALWAYS show the custom Inertia 404/403 pages so you don't get stuck while testing!
                if (app()->environment(['local', 'testing']) && $response->getStatusCode() === 500) {
                    return $response;
                }

                return Inertia::render('Error', ['status' => $response->getStatusCode()])
                    ->toResponse($request)
                    ->setStatusCode($response->getStatusCode());
            }

            return $response;
        });
    })->create();
