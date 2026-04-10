<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon; // <-- Imported for the exact timestamp
use Inertia\Inertia;

class TenantSetupController extends Controller
{
    /**
     * Show the setup form to the new tenant.
     */
    public function show(Request $request, User $user)
    {
        // If they already set up their account, don't let them do it again.
        if ($user->store->address !== 'Pending Details') {
            return redirect()->route('login')->with('info', 'Your workspace is already set up. Please log in.');
        }

        // FIX: Pluck the 'value' and 'key' to create a perfect associative array
        // This transforms the DB rows into: ['logo_path' => '...', 'terms_of_service' => '...', 'privacy_policy' => '...']
        $settings = \App\Models\SystemSetting::pluck('value', 'key')->toArray();

        return Inertia::render('Tenant/Setup', [
            'user' => $user,
            'settings' => $settings, // Now this perfectly feeds the Modals in React!
            'submitUrl' => route('tenant.setup.submit', [
                'user' => $user->id,
                'signature' => $request->query('signature'),
                'expires' => $request->query('expires')
            ])
        ]);
    }

    /**
     * Process the setup form and log them in.
     */
    public function submit(Request $request, User $user)
    {
        // 1. Validate incoming fields mapped perfectly to the new form variables
        $request->validate([
            // Store fields
            'store_name'    => 'required|string|max:255',
            'store_phone'   => 'required|string|max:20',
            'store_address' => 'required|string|max:500',

            // User fields
            'user_phone'    => 'required|string|max:20',
            'user_address'  => 'required|string|max:255',
            'user_city'     => 'required|string|max:100',
            'user_province' => 'required|string|max:100',
            'user_country'  => 'required|string|max:100',

            // Security & Compliance
            'password'      => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::defaults()],
            'terms'         => 'accepted', // <-- Enforces that the checkbox was checked
        ], [
            // Custom friendly error message if they bypass the frontend check
            'terms.accepted' => 'You must agree to the Terms of Service and Privacy Policy to continue.',
        ]);

        // 2. Save User Data (Phone, Address breakdown, Password, and Compliance Timestamp)
        $user->update([
            'password'          => Hash::make($request->password),
            'phone_number'      => $request->user_phone,
            'address'           => $request->user_address,
            'city'              => $request->user_city,
            'province'          => $request->user_province,
            'country'           => $request->user_country,
            'terms_accepted_at' => Carbon::now(), // <-- Records the exact date & time they agreed!
        ]);

        // 3. Save Store Data (Name, Phone, Single Address String)
        $user->store->update([
            'name'    => $request->store_name,
            'phone'   => $request->store_phone,
            'address' => $request->store_address,
        ]);

        // 4. Automatically log them in
        Auth::login($user);

        return redirect()->route('dashboard')->with('success', 'Welcome! Your workspace is now ready.');
    }
}
