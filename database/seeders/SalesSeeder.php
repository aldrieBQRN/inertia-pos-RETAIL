<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Store;
use Carbon\Carbon;

class SalesSeeder extends Seeder
{
    public function run(): void
    {
        $store = Store::first();
        if (!$store) {
            $this->command->info('No store found! Run DatabaseSeeder first.');
            return;
        }

        // Get products and a cashier specifically for this store
        $products = Product::where('store_id', $store->id)->get();
        $cashier = User::where('store_id', $store->id)->where('role', 'cashier')->first();

        if ($products->count() === 0) {
            $this->command->info('No products found for this store!');
            return;
        }

        if (!$cashier) {
            $this->command->info('No cashier found for this store!');
            return;
        }

        // 2. Create 50 Fake Transactions
        for ($i = 0; $i < 50; $i++) {
            $date = Carbon::today()->subDays(rand(0, 6))->setTime(rand(8, 20), rand(0, 59));

            // Create the Sale Ticket
            $sale = Sale::create([
                'store_id' => $store->id, // Injected for multi-tenancy
                'invoice_number' => 'INV-' . strtoupper(uniqid()),
                'cashier_id' => $cashier->id,
                'total_amount' => 0,
                'payment_method' => rand(0, 1) ? 'cash' : 'gcash',
                'payment_reference' => rand(0, 1) ? 'REF-' . rand(1000, 9999) : null,
                'transaction_date' => $date, // <-- FIX: Added transaction date
                'created_at' => $date,
                'updated_at' => $date,
            ]);

            $total = 0;
            $itemsCount = rand(1, 4);

            for ($j = 0; $j < $itemsCount; $j++) {
                $product = $products->random();
                $quantity = rand(1, 3);
                $price = $product->price;

                SaleItem::create([
                    'store_id' => $store->id, // Injected for multi-tenancy
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $price,
                    'subtotal' => $price * $quantity,
                    'created_at' => $date,
                    'updated_at' => $date,
                ]);

                $total += ($price * $quantity);

                if ($product->stock_quantity > $quantity) {
                    $product->decrement('stock_quantity', $quantity);
                }
            }

            $sale->update(['total_amount' => $total]);
        }
    }
}
