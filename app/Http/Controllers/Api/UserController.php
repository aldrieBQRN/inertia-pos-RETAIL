<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Mail\StaffInvite;
use App\Mail\EmailVerificationOtp;
use App\Services\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Get the next globally unique numeric account number.
     */
    public function getNextAccountNumber()
    {
        $maxAccount = User::whereRaw("account_number REGEXP '^[0-9]+$'")
            ->selectRaw("MAX(CAST(account_number AS UNSIGNED)) as max_acc")
            ->first();

        $nextAcc = $maxAccount && $maxAccount->max_acc ? $maxAccount->max_acc + 1 : 10000001;

        return response()->json([
            'next_account_number' => (string) $nextAcc
        ]);
    }

    /**
     * Display a listing of the users for the current store.
     */
    public function index()
    {
        $storeId = Auth::user()->store_id;

        // Automatically fetches all columns, including the new 'terms_accepted_at'
        $users = User::where('store_id', $storeId)
            ->where('role', '!=', 'super_admin')
            ->orderBy('name')
            ->get();

        return Inertia::render('User', [
            'users' => $users
        ]);
    }

    /**
     * Store a newly created user and send a secure setup invitation.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|string|email|max:255|unique:users',
            'account_number' => 'nullable|string|max:255|unique:users',
            'role'           => 'required|in:admin,cashier',
        ]);

        // 1. Create the user with a completely random, unusable password
        $user = User::create([
            'name'           => $request->name,
            'email'          => $request->email,
            'account_number' => $request->account_number,
            'password'       => Hash::make(Str::random(32)), // Secure dummy password
            'role'           => $request->role,
            'is_admin'       => $request->role === 'admin',
            'store_id'       => Auth::user()->store_id,
            // 'terms_accepted_at' remains NULL here because they haven't accepted yet
        ]);

        // 2. Generate a secure, signed URL that expires in 24 hours
        $setupUrl = URL::temporarySignedRoute(
            'staff.setup',
            now()->addHours(24),
            ['user' => $user->id]
        );

        // 3. Send the Email Invitation
        Mail::to($user->email)->send(new StaffInvite($user, $setupUrl));

        // 4. Log the critical user creation
        ActivityService::logCreate('User', $user->id, "Created user: {$user->name} ({$user->email}) with role: {$user->role}", [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ]);

        return redirect()->back()->with('success', 'User created and invite sent successfully');
    }

    /**
     * Update the specified user's full identity and settings.
     */
    public function update(Request $request, User $user)
    {
        // Security check: Ensure the Admin isn't trying to edit a user from another store
        if ($user->store_id !== Auth::user()->store_id) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'role'           => 'required|in:admin,cashier',
            'phone_number'   => 'nullable|string|max:50',
            'address'        => 'nullable|string|max:255',
            'city'           => 'nullable|string|max:255',
            'province'       => 'nullable|string|max:255',
            'password'       => 'nullable|string|min:8', // Optional during edit
            'avatar'         => 'nullable|image|max:5120', // max 5MB
        ]);

        // Store old values for audit trail
        $oldEmail = $user->email;
        $oldRole = $user->role;
        $oldValues = [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone_number' => $user->phone_number,
            'address' => $user->address,
            'city' => $user->city,
            'province' => $user->province,
        ];

        $user->update([
            'name'           => $request->name,
            'email'          => $request->email,
            'role'           => $request->role,
            'is_admin'       => $request->role === 'admin',
            'phone_number'   => $request->phone_number,
            'address'        => $request->address,
            'city'           => $request->city,
            'province'       => $request->province,
        ]);

        if ($request->hasFile('avatar')) {
            // Delete old avatar if it exists
            if ($user->avatar_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar_path);
            }

            // Compress and store the new image
            $avatarPath = $this->compressAndStoreImage($request->file('avatar'));
            $user->update([
                'avatar_path' => $avatarPath
            ]);
        }

        // If the admin typed a new password, hash it and save it
        if ($request->filled('password')) {
            $user->update([
                'password' => Hash::make($request->password)
            ]);
            // Log password change (critical)
            ActivityService::logPasswordChange($user->id, "Password changed for user: {$user->name}");
        }

        // Log role change if it changed (critical)
        if ($oldRole !== $user->role) {
            ActivityService::logRoleChange($user->id, $oldRole, $user->role);
        }

        // Log email change if it changed (critical)
        if ($oldEmail !== $user->email) {
            ActivityService::logEmailChange($user->id, $oldEmail, $user->email);
        }

        // Log general update with before/after values
        ActivityService::logUpdate('User', $user->id, "Updated user: {$user->name}", $oldValues, [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone_number' => $user->phone_number,
            'address' => $user->address,
            'city' => $user->city,
            'province' => $user->province,
        ]);

        return redirect()->back()->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified user.
     */
    public function destroy(User $user)
    {
        // Security check: Ensure the Admin belongs to the same store
        if ($user->store_id !== Auth::user()->store_id) {
            abort(403, 'Unauthorized action.');
        }

        // Check if the user has processed sales history
        $hasSales = \App\Models\Sale::where('cashier_id', $user->id)->exists();
        if ($hasSales) {
            return redirect()->back()->withErrors([
                'delete' => 'linked_to_sales',
                'message' => 'This user has processed sales records and cannot be permanently deleted.'
            ]);
        }

        // Log the deletion (critical)
        ActivityService::logDelete('User', $user->id, "Deleted user: {$user->name} ({$user->email})", [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ]);

        $user->delete();

        return redirect()->back()->with('success', 'User deleted successfully.');
    }

    /**
     * Toggle the user's active status.
     */
    public function toggleActive(User $user)
    {
        // Security check: Ensure the Admin belongs to the same store
        if ($user->store_id !== Auth::user()->store_id) {
            abort(403, 'Unauthorized action.');
        }

        // Do not allow toggling own status
        if ($user->id === Auth::id()) {
            abort(403, 'You cannot revoke your own access.');
        }

        $user->update([
            'is_active' => !$user->is_active
        ]);

        // Log the deactivation/reactivation (critical security event)
        ActivityService::logSecurityAction(
            $user->is_active ? 'user_restored' : 'user_revoked',
            "User access " . ($user->is_active ? 'restored' : 'revoked') . " for: {$user->name} ({$user->email})",
            [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                '_actor_user_id' => Auth::id(),
                '_actor_store_id' => Auth::user()->store_id,
            ]
        );

        $statusMsg = $user->is_active ? 'restored' : 'revoked';
        return redirect()->back()->with('success', "User access {$statusMsg} successfully.");
    }

    // ==========================================
    // OTP EMAIL VERIFICATION FOR STAFF
    // ==========================================

    /**
     * Send OTP to staff member's new email during update
     */
    public function sendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email,' . $request->staff_id,
            'staff_id' => 'required|numeric'
        ]);

        // Security check: Ensure the staff member belongs to the same store
        $staff = User::find($request->staff_id);
        if (!$staff || $staff->store_id !== Auth::user()->store_id) {
            abort(403, 'Unauthorized action.');
        }

        // 1. Generate 6 digit OTP
        $otp = random_int(100000, 999999);

        // 2. Save to cache for 10 minutes with staff_id as key
        Cache::put('staff_email_otp_' . $request->staff_id, [
            'code' => $otp,
            'email' => $request->email
        ], now()->addMinutes(10));

        // 3. Send HTML formatted email
        Mail::to($request->email)->send(new EmailVerificationOtp($otp, $request->email, true));

        // 4. Log OTP generation (critical security event)
        ActivityService::logSecurityAction('otp_generated', "Generated OTP for staff email verification", [
            'staff_id' => $staff->id,
            'staff_name' => $staff->name,
            'target_email' => $request->email,
        ]);

        return response()->json(['message' => 'OTP sent successfully.']);
    }

    /**
     * Verify OTP for staff email update
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'code' => 'required|numeric',
            'staff_id' => 'required|numeric'
        ]);

        // 1. Retrieve the cached code
        $cacheData = Cache::get('staff_email_otp_' . $request->staff_id);

        // 2. Check if it's expired or wrong
        if (!$cacheData || (string)$cacheData['code'] !== (string)$request->code) {
            return response()->json(['message' => 'Invalid or expired verification code.'], 422);
        }

        // 3. Update the staff's email and mark as verified
        $staff = User::find($request->staff_id);
        if (!$staff || $staff->store_id !== Auth::user()->store_id) {
            abort(403, 'Unauthorized action.');
        }

        $oldEmail = $staff->email;

        $staff->email = $cacheData['email'];
        $staff->email_verified_at = now();
        $staff->save();

        // Log email change via OTP verification (critical)
        ActivityService::logEmailChange(
            $staff->id,
            $oldEmail,
            $staff->email,
            "Email updated via OTP verification for user: {$staff->name}"
        );

        // 4. Clean up cache
        Cache::forget('staff_email_otp_' . $request->staff_id);

        return response()->json(['message' => 'Email verified successfully.']);
    }

    /**
     * Compress and store staff avatar image using GD.
     */
    private function compressAndStoreImage($file)
    {
        $tempPath = $file->getPathname();
        $imageInfo = getimagesize($tempPath);
        if ($imageInfo === false) {
            return $file->store('avatars', 'public');
        }

        $mime = $imageInfo['mime'];
        $width = $imageInfo[0];
        $height = $imageInfo[1];
        
        switch ($mime) {
            case 'image/jpeg':
                $srcImage = imagecreatefromjpeg($tempPath);
                break;
            case 'image/png':
                $srcImage = imagecreatefrompng($tempPath);
                break;
            case 'image/gif':
                $srcImage = imagecreatefromgif($tempPath);
                break;
            case 'image/webp':
                $srcImage = imagecreatefromwebp($tempPath);
                break;
            default:
                return $file->store('avatars', 'public');
        }

        if (!$srcImage) {
            return $file->store('avatars', 'public');
        }

        // Resize image to max 400x400 while maintaining aspect ratio
        $maxDim = 400;
        if ($width > $maxDim || $height > $maxDim) {
            $ratio = $width / $height;
            if ($ratio > 1) {
                $newWidth = $maxDim;
                $newHeight = (int)($maxDim / $ratio);
            } else {
                $newHeight = $maxDim;
                $newWidth = (int)($maxDim * $ratio);
            }
        } else {
            $newWidth = $width;
            $newHeight = $height;
        }

        $dstImage = imagecreatetruecolor($newWidth, $newHeight);

        // Fill background with white to preserve transparent background parts as white in JPEG
        $white = imagecolorallocate($dstImage, 255, 255, 255);
        imagefill($dstImage, 0, 0, $white);

        imagecopyresampled($dstImage, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        $filename = 'avatars/' . Str::random(40) . '.jpg';
        $path = storage_path('app/public/' . $filename);

        if (!file_exists(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }

        imagejpeg($dstImage, $path, 75); // 75% quality compression

        imagedestroy($srcImage);
        imagedestroy($dstImage);

        return $filename;
    }
}
