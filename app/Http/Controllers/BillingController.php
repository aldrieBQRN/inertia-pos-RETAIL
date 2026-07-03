<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\SubscriptionPayment;
use App\Models\SystemSetting;
use App\Services\ImageCompressionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class BillingController extends Controller
{
    /**
     * Display the Authenticated Tenant Billing Portal
     */
    public function portal(Request $request)
    {
        $user = $request->user();

        // Ensure we eager load the current plan so React knows the starting point
        $store = $user->store()->with('plan')->first();

        if (!$store) {
            return redirect()->route('dashboard')->with('error', 'Store details not found.');
        }

        // Fetch all active plans so the user can choose/switch during renewal
        $plans = Plan::where('is_active', true)->orderBy('price', 'asc')->get();

        $pendingPayment = SubscriptionPayment::where('store_id', $store->id)
            ->where('status', 'pending')
            ->latest()
            ->first();

        // Include the plan relationship in history so they can see what they paid for previously
        $history = SubscriptionPayment::with('plan')
            ->where('store_id', $store->id)
            ->latest()
            ->take(5)
            ->get();

        // Fetch payment methods from system settings
        $paymentMethods = $this->getPaymentMethods();

        return Inertia::render('Tenant/BillingPortal', [
            'store' => $store,
            'plans' => $plans,
            'pendingPayment' => $pendingPayment,
            'history' => $history,
            'paymentMethods' => $paymentMethods
        ]);
    }

    /**
     * Handle the Receipt Upload
     */
    public function store(Request $request)
    {
        $store = $request->user()->store;

        // 1. Prevent double uploads
        $hasPending = SubscriptionPayment::where('store_id', $store->id)
            ->where('status', 'pending')
            ->exists();

        if ($hasPending) {
            return redirect()->back()->with('error', 'You already have a payment pending approval.');
        }

        // 2. Validate - Notice we now validate plan_id
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'nullable|string|max:255',
            'reference_number' => 'required|string|max:255',
            'receipt' => 'required|image|mimes:jpeg,png,jpg|max:5120',
            'terms' => 'accepted',
        ]);

        try {
            // 3. Store the file with compression
            $imageCompression = new ImageCompressionService();
            $receiptPath = $imageCompression->compressReceipt($request->file('receipt'));

            // 4. Create record with the selected plan_id
            SubscriptionPayment::create([
                'store_id' => $store->id,
                'plan_id' => $request->plan_id, // CRITICAL: Save their choice here
                'payment_method' => $request->payment_method,
                'full_name' => $request->user()->name,
                'amount' => $request->amount,
                'reference_number' => $request->reference_number,
                'receipt_path' => $receiptPath,
                'status' => 'pending',
            ]);

            return redirect()->back()->with('success', 'Receipt uploaded successfully. Awaiting admin approval.');
        } catch (\Exception $e) {
            Log::error('Receipt upload failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to upload receipt. Please try again.');
        }
    }

    /**
     * Get all payment methods from system settings
     */
    private function getPaymentMethods()
    {
        $paymentMethodsJson = SystemSetting::where('key', 'payment_methods')->value('value');

        if (!$paymentMethodsJson) {
            // Return default if not configured
            return [
                [
                    'type' => 'gcash',
                    'label' => 'GCash',
                    'number' => '0912 345 6789',
                    'name' => 'Juan Dela Cruz',
                    'icon' => '📱'
                ]
            ];
        }

        return json_decode($paymentMethodsJson, true) ?: [];
    }
}
