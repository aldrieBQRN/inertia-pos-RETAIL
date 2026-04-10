<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = ['name', 'duration_months', 'price', 'is_active'];

    public function stores()
    {
        return $this->hasMany(Store::class);
    }
}
