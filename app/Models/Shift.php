<?php

namespace App\Models;

use App\Traits\BelongsToStore;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Shift Model
 * * Tracks cashier work sessions, including starting float,
 * total sales, and final cash reconciliation (overages/shortages).
 */
class Shift extends Model
{
    use HasFactory, BelongsToStore;

    /**
     * The attributes that are mass assignable.
     * * * Captures time-tracking, financial totals, and shift status.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'start_time',
        'end_time',
        'starting_cash',
        'cash_sales',
        'expenses',
        'expected_cash',
        'actual_cash',
        'difference',
        'status'
    ];

    /**
     * The attributes that should be cast to native types.
     * * * Ensures start and end times are treated as Carbon datetime objects.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'start_time' => 'datetime',
        'end_time'   => 'datetime',
    ];

    /**
     * Relationship: Each shift is associated with a specific cashier (User).
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
