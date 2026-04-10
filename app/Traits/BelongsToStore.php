<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait BelongsToStore
{
    protected static function bootBelongsToStore()
    {
        static::addGlobalScope('store', function (Builder $builder) {
            // UPDATED: hasUser() prevents infinite loops by checking memory instead of querying the DB
            if (Auth::hasUser() && Auth::user()->store_id) {
                // We add the table name to prevent "ambiguous column" SQL errors in future joins
                $builder->where($builder->getModel()->getTable() . '.store_id', Auth::user()->store_id);
            }
        });

        static::creating(function ($model) {
            if (Auth::hasUser() && Auth::user()->store_id && empty($model->store_id)) {
                $model->store_id = Auth::user()->store_id;
            }
        });
    }

    public function store()
    {
        return $this->belongsTo(\App\Models\Store::class);
    }
}
