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
use App\Models\Terminal;
use App\Models\CashMovement;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🎬 Starting Clean Demo Data Seeding...');

        // ========== 1. CLEAN DEMO SPECIFIC DATA ==========
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
        Schema::enableForeignKeyConstraints();
        $this->command->info('🧹 Previous retail demo tables cleared.');

        // ========== 2. CREATE OR RETRIEVE STORE ==========
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

        // ========== 3. CREATE USERS ==========
        // DEVELOPER / SUPER ADMIN
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

        // CASHIER 1
        $cashier1 = User::firstOrCreate(
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
        $this->command->info('✅ Cashier 1: cashier@email.com / password');

        // CASHIER 2
        $cashier2 = User::firstOrCreate(
            ['email' => 'maria@email.com'],
            [
                'name' => 'Maria Santos',
                'password' => Hash::make('password'),
                'role' => 'cashier',
                'is_admin' => false,
                'store_id' => $store->id,
                'account_number' => 'CSR-002',
                'phone_number' => '+63 918 456 7890',
                'address' => '321 Market Ave',
                'city' => 'Taguig',
                'province' => 'NCR',
                'country' => 'Philippines',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info('✅ Cashier 2: maria@email.com / password');

        // CASHIER 3
        $cashier3 = User::firstOrCreate(
            ['email' => 'carlos@email.com'],
            [
                'name' => 'Carlos Reyes',
                'password' => Hash::make('password'),
                'role' => 'cashier',
                'is_admin' => false,
                'store_id' => $store->id,
                'account_number' => 'CSR-003',
                'phone_number' => '+63 919 567 8901',
                'address' => '555 Boulevard Rd',
                'city' => 'Pasig',
                'province' => 'NCR',
                'country' => 'Philippines',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info('✅ Cashier 3: carlos@email.com / password');

        // ========== 4. CREATE CATEGORIES ==========
        $categories = [
            'Clothing & Apparel' => '#3B82F6',
            'Footwear' => '#10B981',
            'Bags & Luggage' => '#F59E0B',
            'Accessories' => '#8B5CF6',
            'Beauty & Cosmetics' => '#EC4899',
            'Electronics & Gadgets' => '#06B6D4',
            'Home & Living' => '#84CC16',
            'Sports & Fitness' => '#F97316',
        ];

        $categoryIds = [];
        foreach ($categories as $name => $color) {
            $cat = Category::create([
                'name' => $name,
                'color' => $color,
                'store_id' => $store->id,
            ]);
            $categoryIds[$name] = $cat->id;
        }
        $this->command->info('✅ Categories Created: ' . count($categories));

        // ========== 5. CREATE PRODUCTS (RETAIL INVENTORY) ==========
        $products = [
            // Clothing & Apparel
            [
                'name' => 'Cotton Crewneck T-Shirt',
                'sku' => 'TSH-001',
                'price' => 49900,
                'wholesale_price' => 39900,
                'cost_price' => 20000,
                'stock_quantity' => 120,
                'low_stock_threshold' => 15,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            [
                'name' => 'Slim-Fit Denim Jeans',
                'sku' => 'JNS-001',
                'price' => 129900,
                'wholesale_price' => 109900,
                'cost_price' => 55000,
                'stock_quantity' => 65,
                'low_stock_threshold' => 10,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            [
                'name' => 'Classic Polo Shirt',
                'sku' => 'POL-001',
                'price' => 79900,
                'wholesale_price' => 64900,
                'cost_price' => 32000,
                'stock_quantity' => 85,
                'low_stock_threshold' => 15,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            [
                'name' => 'Fleece Zip Hoodie',
                'sku' => 'HOD-001',
                'price' => 149900,
                'wholesale_price' => 124900,
                'cost_price' => 65000,
                'stock_quantity' => 40,
                'low_stock_threshold' => 8,
                'category_id' => $categoryIds['Clothing & Apparel'],
            ],
            // Footwear
            [
                'name' => 'Canvas Low-Top Sneakers',
                'sku' => 'SNK-001',
                'price' => 189900,
                'wholesale_price' => 159900,
                'cost_price' => 80000,
                'stock_quantity' => 35,
                'low_stock_threshold' => 5,
                'category_id' => $categoryIds['Footwear'],
            ],
            [
                'name' => 'Slip-On Loafers',
                'sku' => 'LFR-001',
                'price' => 219900,
                'wholesale_price' => 179900,
                'cost_price' => 95000,
                'stock_quantity' => 20,
                'low_stock_threshold' => 5,
                'category_id' => $categoryIds['Footwear'],
            ],
            [
                'name' => 'Comfort Flip-Flops',
                'sku' => 'FLP-001',
                'price' => 29900,
                'wholesale_price' => 22900,
                'cost_price' => 10000,
                'stock_quantity' => 150,
                'low_stock_threshold' => 20,
                'category_id' => $categoryIds['Footwear'],
            ],
            // Bags & Luggage
            [
                'name' => 'Waterproof Laptop Backpack',
                'sku' => 'BAG-001',
                'price' => 169900,
                'wholesale_price' => 139900,
                'cost_price' => 70000,
                'stock_quantity' => 50,
                'low_stock_threshold' => 10,
                'category_id' => $categoryIds['Bags & Luggage'],
            ],
            [
                'name' => 'Crossbody Canvas Bag',
                'sku' => 'BAG-002',
                'price' => 69900,
                'wholesale_price' => 54900,
                'cost_price' => 28000,
                'stock_quantity' => 60,
                'low_stock_threshold' => 12,
                'category_id' => $categoryIds['Bags & Luggage'],
            ],
            // Accessories
            [
                'name' => 'Polarized Sunglasses',
                'sku' => 'SNG-001',
                'price' => 59900,
                'wholesale_price' => 47900,
                'cost_price' => 20000,
                'stock_quantity' => 75,
                'low_stock_threshold' => 15,
                'category_id' => $categoryIds['Accessories'],
            ],
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
            // Electronics & Gadgets
            [
                'name' => 'Wireless Bluetooth Earbuds',
                'sku' => 'ELEC-001',
                'price' => 189900,
                'wholesale_price' => 159900,
                'cost_price' => 80000,
                'stock_quantity' => 75,
                'low_stock_threshold' => 20,
                'category_id' => $categoryIds['Electronics & Gadgets'],
            ],
            [
                'name' => 'Fast Charging Power Bank 20000mAh',
                'sku' => 'ELEC-002',
                'price' => 129900,
                'wholesale_price' => 99900,
                'cost_price' => 50000,
                'stock_quantity' => 40,
                'low_stock_threshold' => 10,
                'category_id' => $categoryIds['Electronics & Gadgets'],
            ],
            // Beauty & Cosmetics
            [
                'name' => 'Organic Matte Lipstick Set',
                'sku' => 'COS-001',
                'price' => 59900,
                'wholesale_price' => 45000,
                'cost_price' => 22000,
                'stock_quantity' => 80,
                'low_stock_threshold' => 15,
                'category_id' => $categoryIds['Beauty & Cosmetics'],
            ],
            // Sports & Fitness
            [
                'name' => 'Stainless Steel Water Bottle 1L',
                'sku' => 'SPT-001',
                'price' => 45000,
                'wholesale_price' => 35000,
                'cost_price' => 18000,
                'stock_quantity' => 90,
                'low_stock_threshold' => 15,
                'category_id' => $categoryIds['Sports & Fitness'],
            ],
        ];

        foreach ($products as $productData) {
            Product::create(array_merge($productData, ['store_id' => $store->id]));
        }
        $this->command->info('✅ Products Created: ' . count($products) . ' items with wholesale prices in inventory');

        // ========== 6. CREATE SHIFTS AND SALES TRANSACTIONS ==========
        $productsForSales = Product::where('store_id', $store->id)->get();
        $cashiersList = [$cashier1, $cashier2, $cashier3];
        $terminalsList = [$mainTerminal, $expressTerminal];

        // Seed 14 shifts across 7 days for multiple cashiers & terminals
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);

            foreach ($cashiersList as $cIdx => $activeCashier) {
                // Alternate terminals and cashier assignments
                $terminal = $terminalsList[$cIdx % count($terminalsList)];
                
                // Morning shift vs Afternoon shift
                $startHour = ($cIdx === 0) ? 8 : (($cIdx === 1) ? 12 : 9);
                $endHour = $startHour + 8;

                $startDateTime = $date->copy()->setTime($startHour, 0);
                $endDateTime = $date->copy()->setTime($endHour, 0);

                $startingCash = 50000; // P500.00 float

                // Create Shift
                $shift = Shift::create([
                    'store_id' => $store->id,
                    'user_id' => $activeCashier->id,
                    'terminal_id' => $terminal->id,
                    'start_time' => $startDateTime,
                    'end_time' => $endDateTime,
                    'starting_cash' => $startingCash,
                    'expected_opening_cash' => $startingCash,
                    'opening_discrepancy' => 0,
                    'cash_sales' => 0,
                    'cash_in' => 0,
                    'cash_out' => 0,
                    'expenses' => 0,
                    'expected_cash' => 0,
                    'actual_cash' => 0,
                    'difference' => 0,
                    'status' => 'closed',
                    'opening_notes' => 'Opening float verified on ' . $terminal->name,
                    'closing_notes' => 'End of shift reconciliation completed.',
                ]);

                // Create Cash Drawer Movements (Mid-shift adjustments)
                $cashInAmount = 0;
                $cashOutAmount = 0;

                // 30% chance of float top-up
                if (rand(1, 3) === 1) {
                    $topupAmt = 20000; // P200.00
                    CashMovement::create([
                        'store_id' => $store->id,
                        'user_id' => $activeCashier->id,
                        'shift_id' => $shift->id,
                        'terminal_id' => $terminal->id,
                        'type' => 'cash_in',
                        'amount' => $topupAmt,
                        'reason' => 'Mid-day small change float top-up',
                        'created_at' => $startDateTime->copy()->addHours(2),
                        'updated_at' => $startDateTime->copy()->addHours(2),
                    ]);
                    $cashInAmount += $topupAmt;
                }

                // 40% chance of cash drop / expense
                if (rand(1, 5) <= 2) {
                    $dropAmt = 15000; // P150.00
                    CashMovement::create([
                        'store_id' => $store->id,
                        'user_id' => $activeCashier->id,
                        'shift_id' => $shift->id,
                        'terminal_id' => $terminal->id,
                        'type' => 'cash_out',
                        'amount' => $dropAmt,
                        'reason' => 'Store cleaning & supplies petty cash',
                        'created_at' => $startDateTime->copy()->addHours(4),
                        'updated_at' => $startDateTime->copy()->addHours(4),
                    ]);
                    $cashOutAmount += $dropAmt;
                }

                // Create transactions for this shift
                $cashSalesTotal = 0;
                $transactionCount = rand(6, 12);

                for ($t = 0; $t < $transactionCount; $t++) {
                    $txMinutes = rand(15, 450);
                    $transactionTime = $startDateTime->copy()->addMinutes($txMinutes);
                    $paymentMethods = ['cash', 'cash', 'debit_card', 'credit_card', 'gcash', 'maya'];
                    $paymentMethod = $paymentMethods[array_rand($paymentMethods)];
                    $isWholesale = (rand(1, 5) === 1); // 20% chance of wholesale transaction

                    $sale = Sale::create([
                        'store_id' => $store->id,
                        'invoice_number' => 'INV-' . strtoupper(uniqid()),
                        'cashier_id' => $activeCashier->id,
                        'terminal_id' => $terminal->id,
                        'total_amount' => 0,
                        'discount_amount' => rand(1, 8) === 1 ? rand(5000, 15000) : 0, // 12% chance of discount
                        'payment_method' => $paymentMethod,
                        'payment_reference' => in_array($paymentMethod, ['debit_card', 'credit_card', 'gcash', 'maya'])
                            ? 'REF-' . rand(100000, 999999)
                            : null,
                        'is_senior' => rand(1, 15) === 1, // ~7% senior discount
                        'cash_given' => 0,
                        'change' => 0,
                        'status' => (rand(1, 25) === 1) ? 'void' : 'completed', // rare void
                        'transaction_date' => $transactionTime,
                        'created_at' => $transactionTime,
                        'updated_at' => $transactionTime,
                    ]);

                    $total = 0;
                    $itemCount = rand(1, 4);

                    for ($j = 0; $j < $itemCount; $j++) {
                        $product = $productsForSales->random();
                        $quantity = rand(1, 3);
                        
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

                        if ($sale->status === 'completed' && $product->stock_quantity > $quantity) {
                            $product->decrement('stock_quantity', $quantity);
                        }
                    }

                    // Apply discounts
                    $total -= $sale->discount_amount;
                    if ($sale->is_senior) {
                        $total = (int) ($total * 0.80);
                    }
                    if ($total < 0) $total = 0;

                    $sale->update(['total_amount' => $total]);

                    if ($sale->status === 'completed' && $paymentMethod === 'cash') {
                        $cashGiven = ceil($total / 10000) * 10000;
                        if ($cashGiven < $total) $cashGiven = $total;
                        $change = $cashGiven - $total;
                        $sale->update([
                            'cash_given' => $cashGiven,
                            'change' => $change,
                        ]);
                        $cashSalesTotal += $total;
                    }
                }

                // Update shift statistics with cash in / cash out / cash sales
                $expectedCash = $startingCash + $cashSalesTotal + $cashInAmount - $cashOutAmount;
                $minorJitter = rand(-150, 150); // small random drawer discrepancy
                $actualCash = $expectedCash + $minorJitter;

                $shift->update([
                    'cash_sales' => $cashSalesTotal,
                    'cash_in' => $cashInAmount,
                    'cash_out' => $cashOutAmount,
                    'expenses' => $cashOutAmount,
                    'expected_cash' => $expectedCash,
                    'actual_cash' => $actualCash,
                    'difference' => $actualCash - $expectedCash,
                ]);
            }
        }

        $this->command->info('✅ Multi-cashier shift & sales transaction history seeded successfully.');

        // ========== SUMMARY ==========
        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('🎉 SEEDING COMPLETED SUCCESSFULLY!');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('');
        $this->command->info('📊 USER CREDENTIALS:');
        $this->command->info('  👨‍💻 Developer:    dev@email.com / password');
        $this->command->info('  👔 Admin:       admin@email.com / password');
        $this->command->info('  💳 Cashier 1:   cashier@email.com / password (John Cashier)');
        $this->command->info('  💳 Cashier 2:   maria@email.com / password (Maria Santos)');
        $this->command->info('  💳 Cashier 3:   carlos@email.com / password (Carlos Reyes)');
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
