<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionPayment extends Model
{
    // Ensure 'plan_id' is in your $fillable array!
    protected $fillable = [
        'store_id',
        'plan_id',
        'payment_method',
        'full_name',
        'amount',
        'reference_number',
        'receipt_path',
        'status',
        'rejection_reason',
    ];

    /**
     * Get the plan that this payment is for.
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * Get the store that made the payment.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
