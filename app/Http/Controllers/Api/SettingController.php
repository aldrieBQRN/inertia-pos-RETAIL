<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\SystemSetting;
use App\Models\Shift;
use App\Models\Sale;
use App\Services\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

/**
 * Handles the retrieval and management of tenant-specific application settings.
 */
class SettingController extends Controller
{
    /**
     * Fetch the store configuration settings.
     * Maps the Store model columns to the key-value JSON object
     * the frontend expects, replacing the old global settings table.
     */
    public function index()
    {
        $user = Auth::user();
        $storeId = \App\Traits\BelongsToStore::getActiveStoreId() ?? $user?->store_id;
        $store = $storeId ? Store::find($storeId) : null;

        // Fetch the generalized legal policies from the system settings
        $legalSettings = SystemSetting::whereIn('key', [
            'terms_of_service',
            'privacy_policy',
            'staff_terms_of_service',
            'staff_privacy_policy'
        ])->pluck('value', 'key')->toArray();

        // ---------------------------------------------------------
        // SHIFT RECONCILIATION ENGINE (For Staff Only)
        // Automatically calculates everything since the last Z-Read
        // ---------------------------------------------------------
        $activeShiftData = null;

        if (!$user->is_admin) {
            // Find the store's most recent closed shift
            $lastShift = Shift::where('status', 'closed')
                ->latest('end_time')
                ->first();

            // The starting cash is the actual_cash left in the drawer from the store's previous shift
            $startingCash = $lastShift ? (float) $lastShift->actual_cash : 0.00;

            // The current shift period starts exactly when the last shift was ended/closed
            $startTime = $lastShift && $lastShift->end_time 
                ? $lastShift->end_time 
                : Carbon::parse('2000-01-01 00:00:00');

            // Fetch all completed sales for this store SINCE the last shift was recorded
            $sales = Sale::where('created_at', '>=', $startTime)
                ->where('status', 'completed')
                ->get();

            // Sum up sales by payment method (assuming total_amount is stored in cents)
            $cashSalesCents = $sales->where('payment_method', 'cash')->sum('total_amount');
            $gcashSalesCents = $sales->where('payment_method', 'gcash')->sum('total_amount');

            // NEW: Adding the new digital payment methods
            $mayaSalesCents = $sales->where('payment_method', 'maya')->sum('total_amount');
            $creditCardSalesCents = $sales->where('payment_method', 'credit_card')->sum('total_amount');
            $debitCardSalesCents = $sales->where('payment_method', 'debit_card')->sum('total_amount');

            // Convert DB values to standard decimals for the frontend
            $cashSales = $cashSalesCents / 100;
            $gcashSales = $gcashSalesCents / 100;
            $mayaSales = $mayaSalesCents / 100;
            $creditCardSales = $creditCardSalesCents / 100;
            $debitCardSales = $debitCardSalesCents / 100;

            $activeShiftData = [
                'start_time' => $startTime->format('M d, Y h:i A'),
                'starting_cash' => $startingCash,
                'cash_sales' => $cashSales,
                'gcash_sales' => $gcashSales,
                'maya_sales' => $mayaSales,
                'credit_card_sales' => $creditCardSales,
                'debit_card_sales' => $debitCardSales,
                'expected_cash' => $startingCash + $cashSales, // THE MAGIC NUMBER (Drawer math only)
            ];
        }

        // Fallback if accessed by Super Admin or a user without a store
        if (!$store) {
            return response()->json(array_merge([
                'store_name' => 'System Control Panel',
                'address' => '',
                'phone' => '',
                'logo_path' => null,
                'active_shift' => $activeShiftData
            ], $legalSettings));
        }

        // Return the mapped store details merged with the legal texts and shift data
        return response()->json(array_merge([
            'store_name' => $store->name,
            'address' => $store->address,
            'phone' => $store->phone,
            'logo_path' => $store->logo_path,
            'active_shift' => $activeShiftData
        ], $legalSettings));
    }

    /**
     * Update store details and branding assets.
     * Supports text configuration and logo image uploads scoped to the current tenant.
     */
    public function update(Request $request)
    {
        $request->validate([
            'store_name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'logo' => 'nullable|image|max:2048', // Max 2MB
        ]);

        // Find the current active store
        $storeId = \App\Traits\BelongsToStore::getActiveStoreId() ?? Auth::user()->store_id;
        $store = Store::findOrFail($storeId);

        $oldValues = [
            'store_name' => $store->name,
            'address' => $store->address,
            'phone' => $store->phone,
            'logo_path' => $store->logo_path,
        ];

        $store->name = $request->store_name;
        $store->address = $request->address;
        $store->phone = $request->phone;

        // Handle Logo Upload and Cleanup
        if ($request->hasFile('logo')) {
            // Delete the old logo from the disk to save server space
            if ($store->logo_path) {
                $oldPath = str_replace('/storage/', '', $store->logo_path);
                Storage::disk('public')->delete($oldPath);
            }

            $file = $request->file('logo');
            try {
                // Skip compression for SVG as it is vector-based and not supported by the GD decoder
                if (strtolower($file->getClientOriginalExtension()) === 'svg' || str_contains(strtolower($file->getMimeType()), 'svg')) {
                    $path = $file->store('logos', 'public');
                } else {
                    $imageCompression = new \App\Services\ImageCompressionService();
                    $path = $imageCompression->compressLogo($file);
                }
            } catch (\Exception $e) {
                // Fallback to original upload safely
                $path = $file->store('logos', 'public');
            }
            $store->logo_path = '/storage/' . $path;
        }

        $store->save();

        ActivityService::log(
            'store.settings.update',
            'update',
            'Store',
            $store->id,
            "Updated store details: {$store->name}",
            $oldValues,
            [
                'store_name' => $store->name,
                'address' => $store->address,
                'phone' => $store->phone,
                'logo_path' => $store->logo_path,
            ]
        );

        return redirect()->back()->with('success', 'Store settings updated!');
    }
}
