<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\ActivityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Handles user authentication sessions (Login/Logout).
 */
class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        ActivityService::logSecurityAction(
            'login_success',
            'User logged in successfully',
            [
                'user_id' => $request->user()->id,
                'email' => $request->user()->email,
                'role' => $request->user()->role,
            ]
        );

        $role = $request->user()->role;

        // Redirect based on role
        if ($role === 'super_admin') {
            return redirect()->intended('/developer');
        } elseif ($role === 'admin') {
            return redirect()->intended('/dashboard');
        } else {
            // Managers and Cashiers go straight to the POS
            return redirect()->intended('/pos');
        }
    }

    /**
     * Destroy an authenticated session (Logout).
     */
    public function destroy(Request $request): RedirectResponse
    {
        if (Auth::check()) {
            ActivityService::logSecurityAction(
                'logout',
                'User logged out',
                [
                    'user_id' => Auth::id(),
                    'email' => Auth::user()->email,
                ]
            );
        }

        Auth::guard('web')->logout();

        // Clear session data and regenerate the CSRF token
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
