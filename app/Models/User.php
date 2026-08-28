<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * User Model
 * * Represents an application user and handles authentication,
 * notification routing, and administrative role assignment.
 */
class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     * * * Includes 'is_admin' to allow for role-based access control
     * during user creation or updates.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_admin',
        'store_id',
        'account_number',
        'phone_number',
        'address',
        'city',
        'province',
        'country',
        'avatar_path',
        'terms_accepted_at',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     * * * Prevents sensitive authentication data from being
     * included in JSON API responses.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     * * * Handles automatic hashing for passwords and converts the
     * 'is_admin' database flag into a boolean.
     *
     * @return array<string, string>
     */
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'terms_accepted_at' => 'datetime', // <--- Add this exact line
            'is_active' => 'boolean',
        ];
    }

    /**
     * The "booted" method of the model.
     * This automatically runs whenever a User model is manipulated.
     */
    protected static function boot()
    {
        parent::boot();

        // Automatically assign a purely numeric, sequential account number right before saving a NEW user
        static::creating(function ($user) {
            if (empty($user->account_number)) {
                // Find the user with the highest ID to determine the last used number
                $latestUser = self::orderBy('id', 'desc')->first();

                if ($latestUser && $latestUser->account_number) {
                    // Extract ONLY the numbers (This prevents crashes if old records still have 'ACC-')
                    $lastNumber = (int) preg_replace('/[^0-9]/', '', $latestUser->account_number);
                    $nextNumber = $lastNumber > 0 ? $lastNumber + 1 : 10000001;
                } else {
                    // Fallback starting number if database is completely empty (8 digits for massive scale)
                    $nextNumber = 10000001;
                }

                // Format it with zero-padding to guarantee at least 8 digits (e.g., 10000001)
                $user->account_number = str_pad($nextNumber, 8, '0', STR_PAD_LEFT);
            }
        });
    }

    /**
     * Get the primary store that the user belongs to.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Stores owned by this user (Tenant Owner).
     */
    public function ownedStores(): HasMany
    {
        return $this->hasMany(Store::class, 'owner_id');
    }

    /**
     * Stores this user has access to via pivot table.
     */
    public function stores(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Store::class, 'store_user')
            ->withPivot('role', 'is_primary')
            ->withTimestamps();
    }

    protected $accessibleStoresCache = null;

    /**
     * Get all accessible stores for the user.
     */
    public function getAccessibleStores()
    {
        if ($this->accessibleStoresCache !== null) {
            return $this->accessibleStoresCache;
        }

        if ($this->role === 'super_admin') {
            return $this->accessibleStoresCache = Store::orderBy('name')->get();
        }

        // 1. Tenant Owner (created by Developer / owns stores): has full access to switch between all owned branches
        if ($this->ownedStores()->exists()) {
            return $this->accessibleStoresCache = Store::where('owner_id', $this->id)
                ->orderBy('name')
                ->get();
        }

        // 2. Branch Admin / Cashier (added via Staff page): restricted ONLY to their assigned store
        return $this->accessibleStoresCache = Store::where('id', $this->store_id)
            ->orWhereHas('assignedUsers', fn($q) => $q->where('users.id', $this->id))
            ->distinct()
            ->orderBy('name')
            ->get();
    }

    /**
     * Scope to filter users by store.
     */
    public function scopeForStore($query, $storeId)
    {
        return $query->where('store_id', $storeId);
    }

    /**
     * Shifts worked by this user.
     */
    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class, 'user_id');
    }

    /**
     * Current open shift (if any).
     */
    public function activeShift()
    {
        return $this->hasOne(Shift::class, 'user_id')->where('status', 'open')->latest('start_time');
    }

    /**
     * Sales transactions processed by this cashier.
     */
    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'cashier_id');
    }
}
