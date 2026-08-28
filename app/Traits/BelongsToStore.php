<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait BelongsToStore
{
    private static ?int $memoizedActiveStoreId = null;
    private static bool $isStoreIdResolved = false;

    /**
     * Clear memoized store id (e.g. after switching branches).
     */
    public static function clearActiveStoreCache(): void
    {
        static::$memoizedActiveStoreId = null;
        static::$isStoreIdResolved = false;
    }

    /**
     * Get the active store ID for the current request (Instant In-Memory Lookup).
     */
    public static function getActiveStoreId(): ?int
    {
        if (static::$isStoreIdResolved) {
            return static::$memoizedActiveStoreId;
        }

        if (!Auth::hasUser()) {
            static::$isStoreIdResolved = true;
            return static::$memoizedActiveStoreId = null;
        }

        $user = Auth::user();

        try {
            static $hasOwnerId = null;
            if ($hasOwnerId === null) {
                $hasOwnerId = \Illuminate\Support\Facades\Schema::hasColumn('stores', 'owner_id');
            }

            // 1. If user is a regular branch staff / cashier / branch admin (does not own stores)
            if ($hasOwnerId && $user->role !== 'super_admin' && !$user->ownedStores()->exists()) {
                static::$isStoreIdResolved = true;
                return static::$memoizedActiveStoreId = ($user->store_id ? (int) $user->store_id : null);
            }

            // 2. If user is Tenant Owner or Super Admin, use the session active_store_id if valid
            if (session()->has('active_store_id')) {
                $sessId = (int) session('active_store_id');

                if ($user->role === 'super_admin') {
                    static::$isStoreIdResolved = true;
                    return static::$memoizedActiveStoreId = $sessId;
                }

                if ($hasOwnerId && $user->ownedStores()->where('stores.id', $sessId)->exists()) {
                    static::$isStoreIdResolved = true;
                    return static::$memoizedActiveStoreId = $sessId;
                }

                // If session has an invalid/unowned store, clear it
                session()->forget('active_store_id');
            }
        } catch (\Throwable $e) {
            // Graceful fallback if migrations have not completed yet on server
        }

        static::$isStoreIdResolved = true;
        return static::$memoizedActiveStoreId = ($user->store_id ? (int) $user->store_id : null);
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
