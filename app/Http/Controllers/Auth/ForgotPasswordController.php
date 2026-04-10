<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\EmailVerificationOtp;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;

class ForgotPasswordController extends Controller
{
    /**
     * Send OTP to user's email for password reset
     */
    public function sendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ], [
            'email.exists' => 'We could not find a user with that email address.',
        ]);

        // Find the user
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found.'], 422);
        }

        // Generate 6-digit OTP
        $otp = random_int(100000, 999999);

        // Store OTP in cache for 10 minutes
        Cache::put('forgot_password_otp_' . $request->email, [
            'code' => $otp,
            'user_id' => $user->id
        ], now()->addMinutes(10));

        // Send OTP via email
        Mail::to($request->email)->send(new EmailVerificationOtp($otp, $request->email, false));

        return response()->json(['message' => 'OTP sent to your email address.']);
    }

    /**
     * Verify OTP for password reset
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|numeric',
        ]);

        // Retrieve the cached OTP
        $cacheData = Cache::get('forgot_password_otp_' . $request->email);

        // Check if OTP exists and matches
        if (!$cacheData || (string)$cacheData['code'] !== (string)$request->code) {
            return response()->json(['message' => 'Invalid or expired verification code.'], 422);
        }

        // Store verification status in cache for the next step (password reset)
        Cache::put('forgot_password_verified_' . $request->email, [
            'user_id' => $cacheData['user_id'],
            'verified_at' => now()
        ], now()->addMinutes(30)); // 30 minutes to complete password reset

        // Clean up the OTP cache
        Cache::forget('forgot_password_otp_' . $request->email);

        return response()->json(['message' => 'Email verified successfully.']);
    }

    /**
     * Reset password after OTP verification
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Check if email is verified via OTP
        $verified = Cache::get('forgot_password_verified_' . $request->email);

        if (!$verified) {
            return response()->json([
                'message' => 'Email verification expired or invalid. Please start over.'
            ], 422);
        }

        // Find the user
        $user = User::findOrFail($verified['user_id']);

        // Update the password
        $user->update([
            'password' => Hash::make($request->password),
        ]);

        // Clean up cache
        Cache::forget('forgot_password_verified_' . $request->email);

        return response()->json(['message' => 'Password reset successfully. Please log in with your new password.']);
    }
}
