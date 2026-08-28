<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Store extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'address',
        'phone',
        'status',
        'logo_path',
        'plan_id',             // REQUIRED: This allows the ID to be saved
        'subscription_ends_at',
        'last_reminder_sent_at',
    ];

    protected $casts = [
        'status' => 'boolean',
        'subscription_ends_at' => 'datetime',
        'last_reminder_sent_at' => 'datetime', // Good practice to cast this too
    ];

    /**
     * Get the owner of the store.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get all users associated with the store via foreign key.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get all users assigned to this branch via pivot.
     */
    public function assignedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'store_user')
            ->withPivot('role', 'is_primary')
            ->withTimestamps();
    }

    /**
     * Get the plan associated with the store.
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
