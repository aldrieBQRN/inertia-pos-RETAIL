<?php

namespace App\Http\Controllers;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BranchController extends Controller
{
    /**
     * Switch the active branch stored in session.
     */
    public function switchBranch(Request $request)
    {
        $request->validate([
            'branch_id' => 'required|integer|exists:stores,id',
        ]);

        $user = Auth::user();
        $targetStoreId = (int) $request->branch_id;
        $targetStore = Store::findOrFail($targetStoreId);

        // Authorization check
        $hasAccess = false;

        if ($user->role === 'super_admin') {
            $hasAccess = true;
        } elseif ($targetStore->owner_id && (int) $targetStore->owner_id === (int) $user->id) {
            $hasAccess = true;
        } elseif ((int) $user->store_id === $targetStoreId) {
            $hasAccess = true;
        } elseif ($user->stores()->where('stores.id', $targetStoreId)->exists()) {
            $hasAccess = true;
        }

        if (!$hasAccess) {
            return redirect()->back()->with('error', 'Unauthorized: You do not have permission to access this branch.');
        }

        // Store active branch in session
        session(['active_store_id' => $targetStoreId]);

        return redirect()->back()->with('success', "Switched to branch: {$targetStore->name}");
    }
}
