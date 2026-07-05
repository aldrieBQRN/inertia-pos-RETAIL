<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

/**
 * Handles core POS terminal operations like checkout and stock synchronization.
 * Fully Multi-Tenant (SaaS) secure via Global Scopes.
 */
class PosController extends Controller
{
    /**
     * Process a checkout transaction.
     * Handles stock validation, database transaction safety,
     * Senior/PWD discount logic, and record creation.
     */
    public function checkout(Request $request)
    {
        // 1. Validation for cart contents and payment info
        $request->validate([
            'cart' => 'required|array|min:1',
            'cart.*.id' => 'nullable|exists:products,id',
            'cart.*.quantity' => 'required|numeric|min:0.01',
            'cart.*.name' => 'nullable|string',
            'cart.*.price' => 'required|numeric',
            // ADDED CREDIT AND DEBIT CARDS
            'payment_method' => 'required|string|in:cash,gcash,maya,card,credit_card,debit_card',
            'cash_given' => 'nullable|numeric',
            'change' => 'nullable|numeric',
        ]);

        // Start transaction to ensure data integrity
        DB::beginTransaction();

        try {
            // Convert cash inputs to cents for consistent storage
            $cashGiven = $request->payment_method === 'cash' ? ($request->cash_given * 100) : null;
            $change = $request->payment_method === 'cash' ? ($request->change * 100) : 0;

            // 2. Initialize the main Sale record
            // Multi-tenant isolation: Get the store ID to prefix the invoice
            $storeId = Auth::user()->store_id;

            // Format: INV-[STORE_ID]-[YEAR][MONTH][DAY]-
            // Example: INV-001-20260329-
            $todayPrefix = 'INV-' . str_pad($storeId, 3, '0', STR_PAD_LEFT) . '-' . date('Ymd') . '-';

            // Find the last sale for THIS specific store today
            $lastSale = Sale::where('invoice_number', 'like', $todayPrefix . '%')
                ->lockForUpdate()
                ->orderBy('id', 'desc')
                ->first();

            $nextSequence = 1;
            if ($lastSale) {
                // Extract the last 4 digits of the invoice string and increment by 1
                $lastSequence = (int) substr($lastSale->invoice_number, -4);
                $nextSequence = $lastSequence + 1;
            }

            // Combine prefix and the new padded sequence (e.g., INV-001-20260329-0001)
            $invoiceNumber = $todayPrefix . str_pad($nextSequence, 4, '0', STR_PAD_LEFT);

            $sale = Sale::create([
                'invoice_number' => $invoiceNumber,
                'cashier_id' => Auth::id(),
                'total_amount' => 0,
                'payment_method' => $request->payment_method,
                'payment_reference' => $request->reference ?? null,
                'is_senior' => $request->is_senior ?? false,
                'cash_given' => $cashGiven,
                'change' => $change,
                'transaction_date' => now(),
            ]);

            $calculatedTotal = 0;

            // 3. Process each item in the cart
            foreach ($request->cart as $item) {
                $unitPrice = (int) round($item['price'] * 100);
                $quantity = (float) $item['quantity'];

                if (isset($item['id']) && $item['id'] !== null) {
                    if ((int) $quantity != $quantity) {
                        throw new \Exception('Product quantities must be whole numbers.');
                    }

                    $quantity = (int) $quantity;
                    $product = Product::lockForUpdate()->find($item['id']);

                    if (!$product) {
                        throw new \Exception("Item no longer available in catalog.");
                    }

                    if ($product->stock_quantity < $quantity) {
                        throw new \Exception("Insufficient stock for {$product->name}. Only {$product->stock_quantity} remaining.");
                    }

                    // Update inventory level
                    $product->decrement('stock_quantity', $quantity);

                    $subtotal = $unitPrice * $quantity;

                    // Record the sale item detail
                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                    ]);
                } else {
                    // Custom item
                    $subtotal = $unitPrice * $quantity;

                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => null,
                        'custom_name' => $item['name'] ?? 'Custom Item',
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                    ]);
                }

                $calculatedTotal += $subtotal;
            }

            // 4. Apply Senior/PWD 20% discount logic (Philippine Standard)
            $discountAmount = 0;
            if ($request->is_senior) {
                $discountAmount = $calculatedTotal * 0.20;
                $calculatedTotal = $calculatedTotal - $discountAmount;
            }

            // Store the final calculated total and discount amount
            $sale->update([
                'total_amount' => $calculatedTotal,
                'discount_amount' => $discountAmount
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'sale_id' => $sale->id,
                'invoice' => $invoiceNumber,
                'message' => 'Transaction successful!'
            ]);
        } catch (\Exception $e) {
            // Roll back all database changes
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
