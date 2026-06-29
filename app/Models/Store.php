<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Store extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'phone',
        'status',
        'logo_path',
        'enable_shortcuts',
        'plan_id',             // REQUIRED: This allows the ID to be saved
        'subscription_ends_at',
        'last_reminder_sent_at',
    ];

    protected $casts = [
        'status' => 'boolean',
        'enable_shortcuts' => 'boolean',
        'subscription_ends_at' => 'datetime',
        'last_reminder_sent_at' => 'datetime', // Good practice to cast this too
    ];

    /**
     * Get all users associated with the store.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the plan associated with the store.
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
