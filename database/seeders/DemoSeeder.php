<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Shift;
use App\Models\Store;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🎬 Starting Comprehensive Demo Data Seeding...');

        // ========== 1. CREATE STORE ==========
        $store = Store::firstOrCreate(
            ['name' => 'Metro Retail Hub'],
            [
                'address' => '456 Shopping Center, BGC, Taguig City, Philippines',
                'phone' => '+63 2 8765 4321',
                'status' => true,
                'logo_path' => null,
                'plan_id' => Plan::where('name', 'Monthly Starter')->first()?->id ?? 1,
                'subscription_ends_at' => now()->addMonths(1),
            ]
        );
        $this->command->info('✅ Store Created: ' . $store->name);

        // ========== 2. CREATE USERS ==========
        // DEV / SUPER ADMIN
        $dev = User::firstOrCreate(
            ['email' => 'dev@email.com'],
            [
                'name' => 'System Developer',
                'password' => Hash::make('password'),
                'role' => 'super_admin',
                'is_admin' => true,
                'store_id' => null,
                'account_number' => 'DEV-001',
                'phone_number' => '+63 917 123 4567',
                'address' => '456 Developer Ave, Makati',
                'city' => 'Makati',
                'province' => 'NCR',
                'country' => 'Philippines',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info('✅ Developer: dev@email.com / password');

        // ADMIN USER
        $admin = User::firstOrCreate(
            ['email' => 'admin@email.com'],
            [
                'name' => 'Store Manager',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'is_admin' => true,
                'store_id' => $store->id,
                'account_number' => 'ADM-001',
                'phone_number' => '+63 917 234 5678',
                'address' => '123 Main Street',
                'city' => 'Manila',
                'province' => 'NCR',
                'country' => 'Philippines',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info('✅ Admin: admin@email.com / password');

        // CASHIER USER
        $cashier = User::firstOrCreate(
            ['email' => 'cashier@email.com'],
            [
                'name' => 'John Cashier',
                'password' => Hash::make('password'),
                'role' => 'cashier',
                'is_admin' => false,
                'store_id' => $store->id,
                'account_number' => 'CSR-001',
                'phone_number' => '+63 917 345 6789',
                'address' => '789 Side Street',
                'city' => 'Manila',
                'province' => 'NCR',
                'country' => 'Philippines',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info('✅ Cashier: cashier@email.com / password');

        // ========== 3. CREATE CATEGORIES ==========
        $categories = [
            'Clothing & Apparel' => '#3B82F6',
            'Electronics' => '#8B5CF6',
            'Home & Garden' => '#10B981',
            'Sports & Outdoors' => '#F59E0B',
            'Accessories' => '#EC4899',
        ];

        $categoryIds = [];
        foreach ($categories as $name => $color) {
            $category = Category::firstOrCreate(
                ['name' => $name, 'store_id' => $store->id],
                ['color' => $color]
            );
            $categoryIds[$name] = $category->id;
        }
        $this->command->info('✅ Categories Created: ' . implode(', ', array_keys($categories)));

        // ========== 4. CREATE PRODUCTS WITH INVENTORY ==========
        $products = [
            // CLOTHING & APPAREL
            [
                'name' => 'Cotton T-Shirt (Unisex)',
                'sku' => 'CLOTH-001',
                'price' => 49900, // ₱499
                'cost_price' => 20000,
                'stock_quantity' => 250,
                'low_stock_threshold' => 50,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            [
                'name' => 'Denim Jeans (Blue)',
                'sku' => 'CLOTH-002',
                'price' => 149900,
                'cost_price' => 60000,
                'stock_quantity' => 120,
                'low_stock_threshold' => 30,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            [
                'name' => 'Sports Running Shoes',
                'sku' => 'CLOTH-003',
                'price' => 349900,
                'cost_price' => 140000,
                'stock_quantity' => 85,
                'low_stock_threshold' => 25,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            [
                'name' => 'Winter Jacket',
                'sku' => 'CLOTH-004',
                'price' => 599900,
                'cost_price' => 250000,
                'stock_quantity' => 50,
                'low_stock_threshold' => 15,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            // ELECTRONICS
            [
                'name' => 'Wireless Bluetooth Earbuds',
                'sku' => 'ELEC-001',
                'price' => 189900,
                'cost_price' => 80000,
                'stock_quantity' => 75,
                'low_stock_threshold' => 20,
                'category_id' => $categoryIds['Electronics'],
            ],
            [
                'name' => 'USB-C Fast Charging Cable',
                'sku' => 'ELEC-002',
                'price' => 29900,
                'cost_price' => 10000,
                'stock_quantity' => 300,
                'low_stock_threshold' => 100,
                'category_id' => $categoryIds['Electronics'],
            ],
            [
                'name' => 'Portable Power Bank 20000mAh',
                'sku' => 'ELEC-003',
                'price' => 99900,
                'cost_price' => 40000,
                'stock_quantity' => 110,
                'low_stock_threshold' => 25,
                'category_id' => $categoryIds['Electronics'],
            ],
            [
                'name' => 'LED USB Desk Lamp',
                'sku' => 'ELEC-004',
                'price' => 79900,
                'cost_price' => 32000,
                'stock_quantity' => 95,
                'low_stock_threshold' => 30,
                'category_id' => $categoryIds['Electronics'],
            ],
            // HOME & GARDEN
            [
                'name' => 'Stainless Steel Water Bottle',
                'sku' => 'HOME-001',
                'price' => 59900,
                'cost_price' => 25000,
                'stock_quantity' => 200,
                'low_stock_threshold' => 50,
                'category_id' => $categoryIds['Home & Garden'],
            ],
            [
                'name' => 'Ceramic Coffee Mug Set (6pc)',
                'sku' => 'HOME-002',
                'price' => 89900,
                'cost_price' => 35000,
                'stock_quantity' => 8,  // LOW STOCK ITEM - ALERT
                'low_stock_threshold' => 15,
                'category_id' => $categoryIds['Home & Garden'],
            ],
            // SPORTS & OUTDOORS
            [
                'name' => 'Yoga Mat Non-Slip',
                'sku' => 'SPORT-001',
                'price' => 69900,
                'cost_price' => 28000,
                'stock_quantity' => 100,
                'low_stock_threshold' => 20,
                'category_id' => $categoryIds['Sports & Outdoors'],
            ],
            // ACCESSORIES
            [
                'name' => 'Leather Wallet',
                'sku' => 'ACC-001',
                'price' => 89900,
                'cost_price' => 36000,
                'stock_quantity' => 5,  // LOW STOCK ITEM - ALERT
                'low_stock_threshold' => 20,
                'category_id' => $categoryIds['Accessories'],
            ],
        ];

        foreach ($products as $productData) {
            Product::firstOrCreate(
                ['sku' => $productData['sku'], 'store_id' => $store->id],
                array_merge($productData, ['store_id' => $store->id])
            );
        }
        $this->command->info('✅ Products Created: ' . count($products) . ' items in inventory');

        // ========== 5. CREATE SHIFTS ==========
        $productsForSales = Product::where('store_id', $store->id)->get();

        // Morning shift (Cashier) - Last 5 days
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);

            // Morning Shift - Cashier
            $morningShift = Shift::firstOrCreate(
                [
                    'store_id' => $store->id,
                    'user_id' => $cashier->id,
                    'start_time' => $date->copy()->setTime(6, 0),
                ],
                [
                    'end_time' => $date->copy()->setTime(14, 0),
                    'starting_cash' => 50000,
                    'cash_sales' => rand(300000, 600000),
                    'expenses' => rand(5000, 15000),
                    'expected_cash' => 0,
                    'actual_cash' => 0,
                    'difference' => 0,
                    'status' => 'closed',
                ]
            );
            // Calculate cash reconciliation
            $cashSales = $morningShift->cash_sales;
            $expectedCash = $morningShift->starting_cash + $cashSales;
            $actualCash = $expectedCash + rand(-5000, 5000);
            $morningShift->update([
                'expected_cash' => $expectedCash,
                'actual_cash' => $actualCash,
                'difference' => $actualCash - $expectedCash,
            ]);

            // Evening Shift - Admin
            $eveningShift = Shift::firstOrCreate(
                [
                    'store_id' => $store->id,
                    'user_id' => $admin->id,
                    'start_time' => $date->copy()->setTime(14, 0),
                ],
                [
                    'end_time' => $date->copy()->setTime(22, 0),
                    'starting_cash' => 75000,
                    'cash_sales' => rand(400000, 800000),
                    'expenses' => rand(10000, 25000),
                    'expected_cash' => 0,
                    'actual_cash' => 0,
                    'difference' => 0,
                    'status' => 'closed',
                ]
            );
            // Calculate cash reconciliation
            $cashSales = $eveningShift->cash_sales;
            $expectedCash = $eveningShift->starting_cash + $cashSales;
            $actualCash = $expectedCash + rand(-5000, 5000);
            $eveningShift->update([
                'expected_cash' => $expectedCash,
                'actual_cash' => $actualCash,
                'difference' => $actualCash - $expectedCash,
            ]);
        }
        $this->command->info('✅ Shifts Created: 12 shifts with detailed cash reconciliation');

        // ========== 6. CREATE SALES WITH ITEMS ==========
        $transactionCount = 0;
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $startHour = 6;
            $endHour = 22;

            // Create 15-25 transactions per day
            for ($t = 0; $t < rand(15, 25); $t++) {
                $hour = rand($startHour, $endHour - 1);
                $minute = rand(0, 59);
                $transactionTime = $date->copy()->setTime($hour, $minute);

                // Choose transaction type
                $paymentMethods = ['cash', 'debit_card', 'credit_card', 'gcash'];
                $paymentMethod = $paymentMethods[array_rand($paymentMethods)];

                $sale = Sale::create([
                    'store_id' => $store->id,
                    'invoice_number' => 'INV-' . strtoupper(uniqid()),
                    'cashier_id' => $cashier->id,
                    'total_amount' => 0,
                    'discount_amount' => rand(0, 1) ? rand(1000, 5000) : 0,
                    'payment_method' => $paymentMethod,
                    'payment_reference' => in_array($paymentMethod, ['debit_card', 'credit_card', 'gcash'])
                        ? 'REF-' . rand(100000, 999999)
                        : null,
                    'is_senior' => rand(0, 1) ? true : false,
                    'cash_given' => 0,
                    'change' => 0,
                    'status' => 'completed',
                    'transaction_date' => $transactionTime,
                    'created_at' => $transactionTime,
                    'updated_at' => $transactionTime,
                ]);

                $total = 0;
                $itemCount = rand(1, 5);

                // Add 1-5 items per transaction
                for ($j = 0; $j < $itemCount; $j++) {
                    $product = $productsForSales->random();
                    $quantity = rand(1, 3);
                    $unitPrice = $product->price;
                    $subtotal = $unitPrice * $quantity;

                    SaleItem::create([
                        'store_id' => $store->id,
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                        'created_at' => $transactionTime,
                        'updated_at' => $transactionTime,
                    ]);

                    $total += $subtotal;

                    // Decrement stock
                    if ($product->stock_quantity > $quantity) {
                        $product->decrement('stock_quantity', $quantity);
                    }
                }

                // Update sale with total
                $total -= $sale->discount_amount;
                if ($sale->is_senior) {
                    $total = (int) ($total * 0.80); // 20% senior discount
                }

                $sale->update(['total_amount' => $total]);

                // Calculate cash given and change for cash transactions
                if ($paymentMethod === 'cash') {
                    $cashGiven = ceil($total / 10000) * 10000; // Round up to nearest 1000
                    $change = $cashGiven - $total;
                    $sale->update([
                        'cash_given' => $cashGiven,
                        'change' => $change,
                    ]);
                }

                $transactionCount++;
            }
        }
        $this->command->info('✅ Sales Transactions Created: ' . $transactionCount . ' transactions with items');

        // ========== SUMMARY ==========
        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('🎉 DEMO DATA SEEDING COMPLETED SUCCESSFULLY!');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('');
        $this->command->info('📊 DEMO CREDENTIALS:');
        $this->command->info('  👨‍💻 Developer:    dev@email.com / password');
        $this->command->info('  👔 Admin:       admin@email.com / password123');
        $this->command->info('  💳 Cashier:     cashier@email.com / cashier123');
        $this->command->info('');
        $this->command->info('🏪 STORE DATA:');
        $this->command->info('  Store Name:    ' . $store->name);
        $this->command->info('  Store Address: ' . $store->address);
        $this->command->info('  Phone:        ' . $store->phone);
        $this->command->info('');
        $this->command->info('📦 INVENTORY:');
        $this->command->info('  Categories:   ' . count($categories));
        $this->command->info('  Products:     ' . $productsForSales->count());
        $this->command->info('');
        $this->command->info('👥 STAFF:');
        $this->command->info('  Admin Staff:  1 Manager');
        $this->command->info('  Cashiers:     1 Cashier');
        $this->command->info('');
        $this->command->info('💰 TRANSACTIONS:');
        $this->command->info('  Shifts:       12 (6 days × 2 shifts)');
        $this->command->info('  Sales:        ' . $transactionCount . ' transactions');
        $this->command->info('  Days Covered: Last 6 days');
        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════════════════════════');
    }
}
