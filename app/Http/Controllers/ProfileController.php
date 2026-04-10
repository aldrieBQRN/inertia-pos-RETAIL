<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache; // <-- Added for OTP
use Illuminate\Support\Facades\Mail;  // <-- Added for OTP
use App\Mail\EmailVerificationOtp;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        $user->fill($request->validated());

        $request->validate([
            'phone_number' => ['nullable', 'string', 'max:20'],
            'address'      => ['nullable', 'string', 'max:255'],
            'city'         => ['nullable', 'string', 'max:100'],
            'province'     => ['nullable', 'string', 'max:100'],
            'country'      => ['nullable', 'string', 'max:100'],
            'avatar'       => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        $user->phone_number = $request->phone_number;
        $user->address = $request->address;
        $user->city = $request->city;
        $user->province = $request->province;
        $user->country = $request->country;

        if ($request->hasFile('avatar')) {
            if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
                Storage::disk('public')->delete($user->avatar_path);
            }
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->avatar_path = $path;
        }

        // If they use standard saving (no OTP), reset verification.
        // (If they used the OTP flow, this won't trigger because verifyOtp already updated it!)
        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return Redirect::route('profile.edit')->with('status', 'profile-updated');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        Auth::logout();
        $user->delete();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    // ==========================================
    // OTP EMAIL VERIFICATION LOGIC
    // ==========================================

    public function sendOtp(Request $request)
    {
        // 1. Ensure the new email is valid and not taken by someone else
        $request->validate([
            'email' => 'required|email|unique:users,email,' . Auth::id(),
        ]);

        // 2. Generate 6 digit code
        $otp = random_int(100000, 999999);

        // 3. Save to cache for 10 minutes
        Cache::put('email_otp_' . Auth::id(), [
            'code' => $otp,
            'email' => $request->email
        ], now()->addMinutes(10));

        // 4. Send HTML formatted email
        Mail::to($request->email)->send(new EmailVerificationOtp($otp, $request->email, false));

        return response()->json(['message' => 'OTP sent successfully.']);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'code' => 'required|numeric'
        ]);

        // 1. Retrieve the cached code
        $cacheData = Cache::get('email_otp_' . Auth::id());

        // 2. Check if it's expired or wrong
        if (!$cacheData || (string)$cacheData['code'] !== (string)$request->code) {
            return response()->json(['message' => 'Invalid or expired verification code.'], 422);
        }

        // 3. Success! Update the user's email instantly and flag it as verified.
        /** @var \App\Models\User $user */
        $user = $request->user();

        $user->email = $cacheData['email'];
        $user->email_verified_at = now(); // Automatically verified!
        $user->save();

        // 4. Clean up cache
        Cache::forget('email_otp_' . Auth::id());

        return response()->json(['message' => 'Email updated successfully.']);
    }
}
