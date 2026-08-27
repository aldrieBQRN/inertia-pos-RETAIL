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
                'terminal_id' => $request->terminal_id ?? null,
                'total_amount' => 0,
                'payment_method' => $request->payment_method,
                'payment_reference' => $request->reference ?? null,
                'is_senior' => $request->is_senior ?? false,
                'cash_given' => $cashGiven,
                'change' => $change,
                'transaction_date' => now(),
            ]);

            $calculatedTotal = 0;
            $saleItemsToInsert = [];
            $now = now();

            // 3. Batch fetch & lock all product catalog items in a SINGLE database query
            $productIds = collect($request->cart)->pluck('id')->filter(function ($id) {
                return $id !== null && !is_string($id);
            })->unique()->values()->toArray();

            $products = count($productIds) > 0
                ? Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id')
                : collect();

            // Process cart items in memory
            foreach ($request->cart as $item) {
                $unitPrice = (int) round($item['price'] * 100);
                $quantity = (float) $item['quantity'];

                if (isset($item['id']) && $item['id'] !== null && !is_string($item['id'])) {
                    if ((int) $quantity != $quantity) {
                        throw new \Exception('Product quantities must be whole numbers.');
                    }

                    $quantity = (int) $quantity;
                    $product = $products->get($item['id']);

                    if (!$product) {
                        throw new \Exception("Item no longer available in catalog.");
                    }

                    if ($product->stock_quantity < $quantity) {
                        throw new \Exception("Insufficient stock for {$product->name}. Only {$product->stock_quantity} remaining.");
                    }

                    // Decrement inventory level
                    $product->decrement('stock_quantity', $quantity);

                    $subtotal = $unitPrice * $quantity;

                    $saleItemsToInsert[] = [
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'custom_name' => $product->name,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                } else {
                    // Custom item
                    $subtotal = (int) round($unitPrice * $quantity);
                    $customName = trim((string) ($item['name'] ?? ''));

                    $saleItemsToInsert[] = [
                        'sale_id' => $sale->id,
                        'product_id' => null,
                        'custom_name' => $customName !== '' ? $customName : 'Custom Item',
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                $calculatedTotal += $subtotal;
            }

            // Execute single bulk INSERT for all line items
            if (count($saleItemsToInsert) > 0) {
                SaleItem::insert($saleItemsToInsert);
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

            // Log sale transaction in background
            try {
                \App\Services\ActivityService::logCreate('Sale', $sale->id, "Completed checkout sale {$invoiceNumber} for ₱" . number_format($calculatedTotal / 100, 2), [
                    'invoice_number' => $invoiceNumber,
                    'total_amount' => $calculatedTotal / 100,
                    'payment_method' => $request->payment_method,
                    'items_count' => count($request->cart)
                ]);
            } catch (\Exception $logEx) {
                // Silently swallow log errors to never disrupt cashier checkout
            }

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
