<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait BelongsToStore
{
    /**
     * Get the active store ID for the current request.
     */
    public static function getActiveStoreId(): ?int
    {
        if (!Auth::hasUser()) {
            return null;
        }

        $user = Auth::user();

        // 1. If user is a regular branch staff / admin (does not own stores), strictly force their assigned store_id
        if (!$user->ownedStores()->exists() && $user->role !== 'super_admin') {
            return $user->store_id ? (int) $user->store_id : null;
        }

        // 2. If user is Tenant Owner or Super Admin, use the session active_store_id if valid
        if (session()->has('active_store_id')) {
            $sessId = (int) session('active_store_id');

            if ($user->role === 'super_admin') {
                return $sessId;
            }

            // Verify the owner actually owns this store
            if ($user->ownedStores()->where('stores.id', $sessId)->exists()) {
                return $sessId;
            }

            // If session has an invalid/unowned store, clear it
            session()->forget('active_store_id');
        }

        return $user->store_id ? (int) $user->store_id : null;
    }

    protected static function bootBelongsToStore()
    {
        static::addGlobalScope('store', function (Builder $builder) {
            $storeId = static::getActiveStoreId();

            if ($storeId) {
                // We add the table name to prevent "ambiguous column" SQL errors in future joins
                $builder->where($builder->getModel()->getTable() . '.store_id', $storeId);
            }
        });

        static::creating(function ($model) {
            $storeId = static::getActiveStoreId();

            if ($storeId && empty($model->store_id)) {
                $model->store_id = $storeId;
            }
        });
    }

    public function store()
    {
        return $this->belongsTo(\App\Models\Store::class);
    }
}
