<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine if the user can view any users (staff).
     */
    public function viewAny(User $user): bool
    {
        // Only admins can view staff members
        return $user->is_admin;
    }

    /**
     * Determine if the user can view another user.
     */
    public function view(User $user, User $target): bool
    {
        // Admins can only view users from their own store
        return $user->is_admin && $user->store_id === $target->store_id;
    }

    /**
     * Determine if the user can create a new user (invite staff).
     */
    public function create(User $user): bool
    {
        // Only admins can create/invite users
        return $user->is_admin;
    }

    /**
     * Determine if the user can update another user.
     */
    public function update(User $user, User $target): bool
    {
        // Admins can only update users from their own store
        // and cannot edit super_admin users
        return $user->is_admin
            && $user->store_id === $target->store_id
            && $target->role !== 'super_admin';
    }

    /**
     * Determine if the user can delete another user.
     */
    public function delete(User $user, User $target): bool
    {
        // Admins can only delete users from their own store
        // and cannot delete super_admin users
        return $user->is_admin
            && $user->store_id === $target->store_id
            && $target->role !== 'super_admin';
    }

    /**
     * Determine if the user can send OTP to another user.
     */
    public function sendOtp(User $user, User $target): bool
    {
        // Admins can send OTP to staff from their own store
        return $user->is_admin && $user->store_id === $target->store_id;
    }

    /**
     * Determine if the user can verify OTP for another user.
     */
    public function verifyOtp(User $user, User $target): bool
    {
        // Admins can verify OTP for staff from their own store
        return $user->is_admin && $user->store_id === $target->store_id;
    }

    /**
     * Determine if the user can change password for another user.
     */
    public function changePassword(User $user, User $target): bool
    {
        // Admins can change password for staff from their own store
        return $user->is_admin && $user->store_id === $target->store_id;
    }
}
