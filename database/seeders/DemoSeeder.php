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
use App\Models\Terminal;
use App\Models\CashMovement;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🎬 Starting Clean Demo Data Seeding...');

        // ========== 1. CLEAN EXISTING TABLES ==========
        Schema::disableForeignKeyConstraints();
        if (Schema::hasTable('cash_movements')) {
            CashMovement::truncate();
        }
        SaleItem::truncate();
        Sale::truncate();
        Shift::truncate();
        if (Schema::hasTable('terminals')) {
            Terminal::truncate();
        }
        Product::truncate();
        Category::truncate();
        User::truncate();
        Store::truncate();
        Schema::enableForeignKeyConstraints();
        $this->command->info('🧹 Existing tables cleared.');

        // ========== 2. CREATE STORE ==========
        $store = Store::create([
            'name' => 'Metro Retail Hub',
            'address' => '456 Shopping Center, BGC, Taguig City, Philippines',
            'phone' => '+63 2 8765 4321',
            'status' => true,
            'logo_path' => null,
            'plan_id' => Plan::where('name', 'Monthly Starter')->first()?->id ?? 1,
            'subscription_ends_at' => now()->addMonths(1),
        ]);
        $this->command->info('✅ Store Created: ' . $store->name);

        // ========== 2.1 CREATE DEFAULT TERMINALS ==========
        $mainTerminal = Terminal::create([
            'store_id' => $store->id,
            'name' => 'Main Counter (Register 1)',
            'code' => 'REG-01',
            'is_active' => true,
            'notes' => 'Primary checkout lane',
        ]);
        $expressTerminal = Terminal::create([
            'store_id' => $store->id,
            'name' => 'Express Lane (Register 2)',
            'code' => 'REG-02',
            'is_active' => true,
            'notes' => 'Secondary checkout station',
        ]);
        $this->command->info('✅ Terminals Created: REG-01 & REG-02');

        // ========== 3. CREATE USERS (ONLY ONE OF EACH) ==========
        // DEVELOPER / SUPER ADMIN
        $dev = User::create([
            'name' => 'System Developer',
            'email' => 'dev@email.com',
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
        ]);
        $this->command->info('✅ Developer: dev@email.com / password');

        // ADMIN USER
        $admin = User::create([
            'name' => 'Store Manager',
            'email' => 'admin@email.com',
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
        ]);
        $this->command->info('✅ Admin: admin@email.com / password');

        // CASHIER USER
        $cashier = User::create([
            'name' => 'John Cashier',
            'email' => 'cashier@email.com',
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
        ]);
        $this->command->info('✅ Cashier: cashier@email.com / password');

        // ========== 4. CREATE CATEGORIES ==========
        $categories = [
            'Clothing & Apparel' => '#3B82F6',
            'Electronics' => '#8B5CF6',
            'Home & Garden' => '#10B981',
            'Sports & Outdoors' => '#F59E0B',
            'Accessories' => '#EC4899',
        ];

        $categoryIds = [];
        foreach ($categories as $name => $color) {
            $category = Category::create([
                'name' => $name,
                'store_id' => $store->id,
                'color' => $color
            ]);
            $categoryIds[$name] = $category->id;
        }
        $this->command->info('✅ Categories Created: ' . implode(', ', array_keys($categories)));

        // ========== 5. CREATE PRODUCTS WITH INVENTORY AND WHOLESALE PRICE ==========
        $products = [
            // CLOTHING & APPAREL
            [
                'name' => 'Cotton T-Shirt (Unisex)',
                'sku' => 'CLOTH-001',
                'price' => 49900, // ₱499
                'wholesale_price' => 39900, // ₱399
                'cost_price' => 20000,
                'stock_quantity' => 250,
                'low_stock_threshold' => 50,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            [
                'name' => 'Denim Jeans (Blue)',
                'sku' => 'CLOTH-002',
                'price' => 149900,
                'wholesale_price' => 129900,
                'cost_price' => 60000,
                'stock_quantity' => 120,
                'low_stock_threshold' => 30,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            [
                'name' => 'Sports Running Shoes',
                'sku' => 'CLOTH-003',
                'price' => 349900,
                'wholesale_price' => 299900,
                'cost_price' => 140000,
                'stock_quantity' => 85,
                'low_stock_threshold' => 25,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            [
                'name' => 'Winter Jacket',
                'sku' => 'CLOTH-004',
                'price' => 599900,
                'wholesale_price' => 499900,
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
                'wholesale_price' => 159900,
                'cost_price' => 80000,
                'stock_quantity' => 75,
                'low_stock_threshold' => 20,
                'category_id' => $categoryIds['Electronics'],
            ],
            [
                'name' => 'USB-C Fast Charging Cable',
                'sku' => 'ELEC-002',
                'price' => 29900,
                'wholesale_price' => 19900,
                'cost_price' => 10000,
                'stock_quantity' => 300,
                'low_stock_threshold' => 100,
                'category_id' => $categoryIds['Electronics'],
            ],
            [
                'name' => 'Portable Power Bank 20000mAh',
                'sku' => 'ELEC-003',
                'price' => 99900,
                'wholesale_price' => 79900,
                'cost_price' => 40000,
                'stock_quantity' => 110,
                'low_stock_threshold' => 25,
                'category_id' => $categoryIds['Electronics'],
            ],
            [
                'name' => 'LED USB Desk Lamp',
                'sku' => 'ELEC-004',
                'price' => 79900,
                'wholesale_price' => 59900,
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
                'wholesale_price' => 45900,
                'cost_price' => 25000,
                'stock_quantity' => 200,
                'low_stock_threshold' => 50,
                'category_id' => $categoryIds['Home & Garden'],
            ],
            [
                'name' => 'Ceramic Coffee Mug Set (6pc)',
                'sku' => 'HOME-002',
                'price' => 89900,
                'wholesale_price' => 69900,
                'cost_price' => 35000,
                'stock_quantity' => 18,
                'low_stock_threshold' => 15,
                'category_id' => $categoryIds['Home & Garden'],
            ],
            // SPORTS & OUTDOORS
            [
                'name' => 'Yoga Mat Non-Slip',
                'sku' => 'SPORT-001',
                'price' => 69900,
                'wholesale_price' => 49900,
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
                'wholesale_price' => 74900,
                'cost_price' => 36000,
                'stock_quantity' => 45,
                'low_stock_threshold' => 20,
                'category_id' => $categoryIds['Accessories'],
            ],
        ];

        foreach ($products as $productData) {
            Product::create(array_merge($productData, ['store_id' => $store->id]));
        }
        $this->command->info('✅ Products Created: ' . count($products) . ' items with wholesale prices in inventory');

        // ========== 6. CREATE SHIFTS AND SALES TRANSACTIONS ==========
        $productsForSales = Product::where('store_id', $store->id)->get();

        // Seed 6 shifts (last 3 days)
        for ($i = 3; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);

            // Shift - Cashier
            $shift = Shift::create([
                'store_id' => $store->id,
                'user_id' => $cashier->id,
                'terminal_id' => $mainTerminal->id,
                'start_time' => $date->copy()->setTime(8, 0),
                'end_time' => $date->copy()->setTime(17, 0),
                'starting_cash' => 50000,
                'expected_opening_cash' => 50000,
                'opening_discrepancy' => 0,
                'cash_sales' => 0,
                'cash_in' => 0,
                'cash_out' => 0,
                'expenses' => rand(500, 1500),
                'expected_cash' => 0,
                'actual_cash' => 0,
                'difference' => 0,
                'status' => 'closed',
            ]);

            // Create some transactions for this shift
            $cashSalesTotal = 0;
            $transactionCount = rand(5, 10);

            for ($t = 0; $t < $transactionCount; $t++) {
                $transactionTime = $date->copy()->setTime(rand(9, 16), rand(0, 59));
                $paymentMethods = ['cash', 'debit_card', 'credit_card', 'gcash'];
                $paymentMethod = $paymentMethods[array_rand($paymentMethods)];
                $isWholesale = (rand(1, 5) === 1); // 20% chance of wholesale transaction

                $sale = Sale::create([
                    'store_id' => $store->id,
                    'invoice_number' => 'INV-' . strtoupper(uniqid()),
                    'cashier_id' => $cashier->id,
                    'terminal_id' => $mainTerminal->id,
                    'total_amount' => 0,
                    'discount_amount' => rand(1, 10) === 1 ? rand(5000, 15000) : 0, // 10% chance of discount
                    'payment_method' => $paymentMethod,
                    'payment_reference' => in_array($paymentMethod, ['debit_card', 'credit_card', 'gcash'])
                        ? 'REF-' . rand(100000, 999999)
                        : null,
                    'is_senior' => rand(1, 20) === 1, // 5% chance of senior discount
                    'cash_given' => 0,
                    'change' => 0,
                    'status' => 'completed',
                    'transaction_date' => $transactionTime,
                    'created_at' => $transactionTime,
                    'updated_at' => $transactionTime,
                ]);

                $total = 0;
                $itemCount = rand(1, 4);

                for ($j = 0; $j < $itemCount; $j++) {
                    $product = $productsForSales->random();
                    $quantity = rand(1, 3);
                    
                    // Use wholesale_price if wholesale flag is active, otherwise standard price
                    $unitPrice = ($isWholesale && $product->wholesale_price !== null) ? $product->wholesale_price : $product->price;
                    $subtotal = $unitPrice * $quantity;

                    SaleItem::create([
                        'store_id' => $store->id,
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                        'custom_name' => null,
                        'created_at' => $transactionTime,
                        'updated_at' => $transactionTime,
                    ]);

                    $total += $subtotal;

                    // Decrement stock
                    if ($product->stock_quantity > $quantity) {
                        $product->decrement('stock_quantity', $quantity);
                    }
                }

                // Apply discounts
                $total -= $sale->discount_amount;
                if ($sale->is_senior) {
                    $total = (int) ($total * 0.80); // 20% senior discount
                }
                if ($total < 0) $total = 0;

                $sale->update(['total_amount' => $total]);

                if ($paymentMethod === 'cash') {
                    $cashGiven = ceil($total / 10000) * 10000;
                    $change = $cashGiven - $total;
                    $sale->update([
                        'cash_given' => $cashGiven,
                        'change' => $change,
                    ]);
                    $cashSalesTotal += $total;
                }
            }

            // Update shift statistics
            $expectedCash = $shift->starting_cash + $cashSalesTotal - $shift->expenses;
            $actualCash = $expectedCash + rand(-100, 100); // minor difference
            $shift->update([
                'cash_sales' => $cashSalesTotal,
                'expected_cash' => $expectedCash,
                'actual_cash' => $actualCash,
                'difference' => $actualCash - $expectedCash,
            ]);
        }

        $this->command->info('✅ Shift and sales transaction history seeded successfully.');

        // ========== SUMMARY ==========
        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('🎉 SEEDING COMPLETED SUCCESSFULLY!');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('');
        $this->command->info('📊 USER CREDENTIALS:');
        $this->command->info('  👨‍💻 Developer:    dev@email.com / password');
        $this->command->info('  👔 Admin:       admin@email.com / password');
        $this->command->info('  💳 Cashier:     cashier@email.com / password');
        $this->command->info('');
        $this->command->info('🏪 STORE DATA:');
        $this->command->info('  Store Name:    ' . $store->name);
        $this->command->info('  Store Address: ' . $store->address);
        $this->command->info('');
        $this->command->info('📦 INVENTORY:');
        $this->command->info('  Categories:   ' . count($categories));
        $this->command->info('  Products:     ' . $productsForSales->count());
        $this->command->info('═══════════════════════════════════════════════════════════════');
    }
}
