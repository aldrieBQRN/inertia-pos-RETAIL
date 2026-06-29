<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SystemSetting; // <-- Imported to fetch the legal text
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Carbon\Carbon; // <-- Imported for the exact timestamp
use Inertia\Inertia;

class SetupController extends Controller
{
    /**
     * Display the account setup form when the staff clicks the email link.
     */
    public function show(Request $request, User $user)
    {
        if (!$user->is_active) {
            abort(403, 'This invitation has been revoked.');
        }

        // Optional Security Check:
        // If they already have a phone number saved, it means they already set up their account.
        if ($user->phone_number) {
            return response('This invite link has already been used. Please log in at the store POS.', 403);
        }

        // Fetch all dynamic settings from the database (including our new staff legal policies)
        $settings = SystemSetting::pluck('value', 'key')->toArray();

        // Pass the user's basic info and settings to the React frontend
        return Inertia::render('SetupAccount', [
            'staff' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'account_number' => $user->account_number,
            ],
            'settings' => $settings // <-- Passed to React to feed the Modals!
        ]);
    }

    /**
     * Save the staff member's personal details and new password.
     */
    public function store(Request $request, User $user)
    {
        if (!$user->is_active) {
            abort(403, 'This invitation has been revoked.');
        }

        // 1. Validate the personal data
        $request->validate([
            'phone_number' => 'required|string|max:50',
            'address'      => 'required|string|max:255',
            'city'         => 'required|string|max:255',
            'province'     => 'required|string|max:255',
            'password'     => ['required', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'agreed_terms' => 'accepted'
        ], [
            'agreed_terms.accepted' => 'You must agree to the Data Privacy Consent to activate your account.',
        ]);

        // 2. THE BULLETPROOF WAY TO SAVE (Bypasses $fillable entirely)
        $user->phone_number = $request->phone_number;
        $user->address      = $request->address;
        $user->city         = $request->city;
        $user->province     = $request->province;
        $user->password     = Hash::make($request->password);

        // Force the timestamp using Laravel's built-in now() helper
        $user->terms_accepted_at = now();

        // Save directly to the database
        $user->save();

        // 3. Return the success view with Role-Based routing
        return Inertia::render('SetupSuccess', [
            'role' => $user->role,
            'message' => $user->role === 'admin'
                ? 'Your admin identity has been verified and your dashboard access is ready.'
                : 'Your identity has been verified, policies accepted, and your account is completely set up.'
        ]);
    }
}
