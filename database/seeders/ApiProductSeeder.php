<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Shift;
use App\Models\Store;
use App\Models\Terminal;
use App\Models\User;
use App\Models\CashMovement;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ApiProductSeeder extends Seeder
{
    /**
     * Category colors for vibrant POS UI display.
     */
    private array $categoryColors = [
        'Groceries'           => '#10B981',
        'Beauty'              => '#EC4899',
        'Fragrances'          => '#8B5CF6',
        'Furniture'           => '#F59E0B',
        'Home Decoration'     => '#06B6D4',
        'Kitchen Accessories' => '#F97316',
        'Laptops'             => '#3B82F6',
        'Smartphones'         => '#6366F1',
        'Mobile Accessories'  => '#14B8A6',
        'Mens Shirts'         => '#64748B',
        'Mens Shoes'          => '#78716C',
        'Mens Watches'        => '#0EA5E9',
        'Womens Bags'         => '#D946EF',
        'Womens Dresses'      => '#F43F5E',
        'Womens Jewellery'    => '#EAB308',
        'Womens Shoes'        => '#A855F7',
        'Womens Watches'      => '#EC4899',
        'Sports Accessories'  => '#22C55E',
        'Sunglasses'          => '#0284C7',
        'Skin Care'           => '#FB7185',
        'Motorcycle'          => '#475569',
        'Vehicle'             => '#334155',
        'Tops'                => '#E11D48',
    ];

    public function run(): void
    {
        $this->command->info('🧹 Cleaning existing products, categories, sales, and shifts...');
        Schema::disableForeignKeyConstraints();
        SaleItem::truncate();
        Sale::truncate();
        Shift::truncate();
        if (Schema::hasTable('cash_movements')) {
            CashMovement::truncate();
        }
        Product::truncate();
        Category::truncate();
        Schema::enableForeignKeyConstraints();
        $this->command->info('✨ Product and transactional tables cleaned successfully.');

        // 1. Ensure storage directory exists
        Storage::disk('public')->makeDirectory('products');

        // 2. Ensure Primary Store exists (Inertia POS / Single Tenant Store)
        $store = Store::first();
        if (!$store) {
            $store = Store::create([
                'name' => 'Inertia POS',
                'address' => '456 Commercial Avenue, Taguig City, Philippines',
                'phone' => '+63 2 8765 4321',
                'status' => true,
            ]);
            $this->command->info('🏪 Created primary store: ' . $store->name);
        } else {
            $store->update(['name' => 'Inertia POS']);
        }

        // 3. Ensure Terminals exist (3 POS Checkout Registers)
        $terminalsData = [
            ['code' => 'REG-01', 'name' => 'Main Counter (Register 1)', 'notes' => 'Primary checkout lane'],
            ['code' => 'REG-02', 'name' => 'Express Lane (Register 2)', 'notes' => 'Quick checkout basket counter'],
            ['code' => 'REG-03', 'name' => 'Self-Service & Deli (Register 3)', 'notes' => 'Bulk & wholesale express counter'],
        ];

        $terminals = [];
        foreach ($terminalsData as $tData) {
            $terminals[] = Terminal::firstOrCreate(
                ['store_id' => $store->id, 'code' => $tData['code']],
                array_merge($tData, ['store_id' => $store->id, 'is_active' => true])
            );
        }
        $this->command->info('✅ Terminals Created: ' . implode(', ', array_column($terminalsData, 'code')));

        // 4. Ensure Developer, Admin, and all 4 Cashiers exist
        $dev = User::updateOrCreate(
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

        $admin = User::updateOrCreate(
            ['email' => 'admin@email.com'],
            [
                'name' => 'Store Manager (Admin)',
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

        $cashier1 = User::updateOrCreate(
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

        $cashier2 = User::updateOrCreate(
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

        $cashier3 = User::updateOrCreate(
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

        $cashier4 = User::updateOrCreate(
            ['email' => 'elena@email.com'],
            [
                'name' => 'Elena Gomez',
                'password' => Hash::make('password'),
                'role' => 'cashier',
                'is_admin' => false,
                'store_id' => $store->id,
                'account_number' => 'CSR-004',
                'phone_number' => '+63 920 678 9012',
                'address' => '88 Sunshine Ave',
                'city' => 'Mandaluyong',
                'province' => 'NCR',
                'country' => 'Philippines',
                'email_verified_at' => now(),
            ]
        );

        $allCashiers = [$cashier1, $cashier2, $cashier3, $cashier4];
        $this->command->info('👥 Cashiers Active: John, Maria, Carlos, Elena & Admin');

        // 5. Fetch 100 Products from DummyJSON API
        $this->command->info('🌐 Connecting to DummyJSON API to fetch live catalog with photos...');
        try {
            $response = Http::timeout(45)->get('https://dummyjson.com/products', [
                'limit' => 100,
                'select' => 'id,title,description,category,price,discountPercentage,stock,sku,thumbnail,images',
            ]);
        } catch (\Exception $e) {
            $this->command->error('❌ API Request failed: ' . $e->getMessage());
            return;
        }

        if (!$response->successful()) {
            $this->command->error('❌ Failed to fetch products from DummyJSON API (HTTP ' . $response->status() . ')');
            return;
        }

        $apiProducts = $response->json('products') ?? [];
        $this->command->info('📦 Received ' . count($apiProducts) . ' products from API. Downloading images & populating DB...');

        $createdProducts = collect();
        $seededCategories = [];

        $imageManager = \Intervention\Image\ImageManager::gd();

        foreach ($apiProducts as $index => $item) {
            // Normalize Category Name
            $rawCat = str_replace('-', ' ', $item['category'] ?? 'General');
            $catName = ucwords($rawCat);

            if (!isset($seededCategories[$catName])) {
                $color = $this->categoryColors[$catName] ?? '#3B82F6';
                $category = Category::firstOrCreate(
                    ['store_id' => $store->id, 'name' => $catName],
                    ['color' => $color]
                );
                $seededCategories[$catName] = $category->id;
            }
            $categoryId = $seededCategories[$catName];

            // Download product thumbnail image & compress to WebP
            $imagePath = null;
            $imageUrl = $item['thumbnail'] ?? (!empty($item['images']) ? $item['images'][0] : null);

            if ($imageUrl) {
                try {
                    $slug = Str::slug($item['title']);
                    $filename = 'products/' . $slug . '-' . substr(md5($imageUrl), 0, 8) . '.webp';
                    $publicTarget = public_path('storage/' . $filename);

                    // Ensure target public directory exists
                    $publicDir = dirname($publicTarget);
                    if (!is_dir($publicDir)) {
                        @mkdir($publicDir, 0775, true);
                    }

                    if (file_exists($publicTarget)) {
                        $imagePath = '/storage/' . $filename;
                    } else {
                        $imgResponse = Http::timeout(12)->get($imageUrl);
                        if ($imgResponse->successful()) {
                            $rawBytes = $imgResponse->body();
                            // Compress to WebP with 80 quality & max 1200 width
                            $imgInstance = $imageManager->read($rawBytes);
                            $compressedWebp = (string) $imgInstance->scaleDown(width: 1200)->toWebp(quality: 80);

                            // Store in storage/app/public
                            Storage::disk('public')->put($filename, $compressedWebp);
                            // Mirror directly into public/storage
                            @file_put_contents($publicTarget, $compressedWebp);

                            $imagePath = '/storage/' . $filename;
                        }
                    }
                } catch (\Exception $e) {
                    $this->command->warn("  ⚠️ Could not download/compress image for {$item['title']}, saving without photo.");
                }
            }

            // Convert prices into cents
            $retailPriceCents = (int) round(($item['price'] ?? 10) * 100);
            $wholesalePriceCents = (int) round($retailPriceCents * 0.90);
            $costPriceCents = (int) round($retailPriceCents * 0.70);

            $sku = !empty($item['sku'])
                ? $item['sku']
                : (strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $catName), 0, 3)) . '-' . rand(1000, 9999));

            // Create or update Product
            $product = Product::updateOrCreate(
                [
                    'store_id' => $store->id,
                    'sku' => $sku,
                ],
                [
                    'name' => $item['title'],
                    'description' => $item['description'] ?? null,
                    'price' => $retailPriceCents,
                    'wholesale_price' => $wholesalePriceCents,
                    'cost_price' => $costPriceCents,
                    'stock_quantity' => $item['stock'] ?? rand(30, 150),
                    'low_stock_threshold' => 10,
                    'category_id' => $categoryId,
                    'image_path' => $imagePath,
                    'is_active' => true,
                ]
            );

            $createdProducts->push($product);
            $imgStatus = $imagePath ? '🖼️ [WebP]' : '⚪ [No Image]';
            $this->command->info(sprintf('  [%02d/%02d] %s %s - ₱%.2f', $index + 1, count($apiProducts), $imgStatus, $product->name, $product->price / 100));
        }

        $this->command->info('✅ ' . $createdProducts->count() . ' Products & Images successfully imported!');

        // 6. Seed Multi-Cashier Shifts and Transactions across all cashiers
        $this->command->info('🕒 Seeding multi-day shifts & live transactions for ALL 4 cashiers...');
        $totalShifts = 0;
        $totalSalesCount = 0;

        for ($day = 13; $day >= 0; $day--) {
            $shiftDate = Carbon::today()->subDays($day);
            $isLiveToday = ($day === 0);

            // Assign each cashier a terminal and shift
            foreach ($allCashiers as $cIndex => $cashierUser) {
                $assignedTerminal = $terminals[$cIndex % count($terminals)];
                
                // Shift schedules: Morning (8 AM) or Afternoon (2 PM)
                $startHour = ($cIndex % 2 === 0) ? 8 : 14;
                $shiftStart = $shiftDate->copy()->setTime($startHour, 0);
                $shiftEnd = $shiftDate->copy()->setTime($startHour + 8, 0);

                // Keep John's current day shift OPEN so live POS testing works out-of-the-box
                $isOpenShift = $isLiveToday && ($cIndex === 0);
                $startingCash = 2000.00;

                $shift = Shift::create([
                    'store_id' => $store->id,
                    'user_id' => $cashierUser->id,
                    'terminal_id' => $assignedTerminal->id,
                    'start_time' => $shiftStart,
                    'end_time' => $isOpenShift ? null : $shiftEnd,
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
                    'status' => $isOpenShift ? 'open' : 'closed',
                    'opening_notes' => 'Shift opened at ' . $assignedTerminal->name,
                    'closing_notes' => $isOpenShift ? null : 'Cash drawer reconciled successfully.',
                ]);
                $totalShifts++;

                // Cash Movements: Mid-day cash drawer additions or safe drops
                $cashIn = 0;
                $cashOut = 0;
                if (rand(1, 10) <= 5 && Schema::hasTable('cash_movements')) {
                    $topup = rand(1, 2) * 50000; // ₱500 - ₱1,000 in cents
                    CashMovement::create([
                        'store_id' => $store->id,
                        'user_id' => $cashierUser->id,
                        'shift_id' => $shift->id,
                        'terminal_id' => $assignedTerminal->id,
                        'type' => 'cash_in',
                        'amount' => $topup,
                        'reason' => 'Coin & Small bill change float addition',
                        'created_at' => $shiftStart->copy()->addHours(2),
                        'updated_at' => $shiftStart->copy()->addHours(2),
                    ]);
                    $cashIn += ($topup / 100);
                }

                if (rand(1, 10) <= 4 && Schema::hasTable('cash_movements')) {
                    $drop = rand(2, 5) * 100000; // ₱2,000 - ₱5,000 in cents
                    CashMovement::create([
                        'store_id' => $store->id,
                        'user_id' => $cashierUser->id,
                        'shift_id' => $shift->id,
                        'terminal_id' => $assignedTerminal->id,
                        'type' => 'cash_out',
                        'amount' => $drop,
                        'reason' => 'Mid-day cash drawer drop to back-office vault',
                        'created_at' => $shiftStart->copy()->addHours(4),
                        'updated_at' => $shiftStart->copy()->addHours(4),
                    ]);
                    $cashOut += ($drop / 100);
                }

                // 7. Seed Transactions for this Cashier's Shift
                $shiftCashSales = 0;
                $txCount = rand(10, 18);

                for ($t = 0; $t < $txCount; $t++) {
                    $txTime = $shiftStart->copy()->addMinutes(rand(10, 460));
                    if ($txTime->gt(now())) {
                        continue;
                    }

                    $paymentMethods = ['cash', 'cash', 'cash', 'gcash', 'maya', 'credit_card', 'debit_card'];
                    $method = $paymentMethods[array_rand($paymentMethods)];
                    $isWholesale = (rand(1, 7) === 1);

                    $sale = Sale::create([
                        'store_id' => $store->id,
                        'invoice_number' => 'INV-' . strtoupper(uniqid()),
                        'cashier_id' => $cashierUser->id,
                        'terminal_id' => $assignedTerminal->id,
                        'total_amount' => 0,
                        'discount_amount' => (rand(1, 8) === 1) ? rand(2000, 15000) : 0,
                        'payment_method' => $method,
                        'payment_reference' => in_array($method, ['gcash', 'maya', 'credit_card', 'debit_card']) ? 'REF-' . rand(1000000, 9999999) : null,
                        'is_senior' => (rand(1, 10) === 1),
                        'cash_given' => 0,
                        'change' => 0,
                        'status' => 'completed',
                        'transaction_date' => $txTime,
                        'created_at' => $txTime,
                        'updated_at' => $txTime,
                    ]);

                    $totalSaleAmt = 0;
                    $itemCount = rand(1, 5);

                    for ($i = 0; $i < $itemCount; $i++) {
                        $prod = $createdProducts->random();
                        $qty = rand(1, 4);
                        $uPrice = ($isWholesale && $prod->wholesale_price) ? $prod->wholesale_price : $prod->price;
                        $lineSubtotal = $uPrice * $qty;

                        SaleItem::create([
                            'store_id' => $store->id,
                            'sale_id' => $sale->id,
                            'product_id' => $prod->id,
                            'quantity' => $qty,
                            'unit_price' => $uPrice,
                            'subtotal' => $lineSubtotal,
                            'created_at' => $txTime,
                            'updated_at' => $txTime,
                        ]);

                        $totalSaleAmt += $lineSubtotal;

                        if ($prod->stock_quantity > $qty) {
                            $prod->decrement('stock_quantity', $qty);
                        }
                    }

                    // Apply discounts
                    $totalSaleAmt -= $sale->discount_amount;
                    if ($sale->is_senior) {
                        $totalSaleAmt = (int) ($totalSaleAmt * 0.80);
                    }
                    if ($totalSaleAmt < 0) $totalSaleAmt = 0;

                    $sale->update(['total_amount' => $totalSaleAmt]);
                    $totalSalesCount++;

                    if ($method === 'cash') {
                        $cashGiven = ceil($totalSaleAmt / 10000) * 10000;
                        if ($cashGiven < $totalSaleAmt) $cashGiven = $totalSaleAmt;
                        $sale->update([
                            'cash_given' => $cashGiven,
                            'change' => $cashGiven - $totalSaleAmt,
                        ]);
                        $shiftCashSales += ($totalSaleAmt / 100);
                    }
                }

                // Update shift cash totals
                $expectedCash = $startingCash + $shiftCashSales + $cashIn - $cashOut;
                $shift->update([
                    'cash_sales' => $shiftCashSales,
                    'cash_in' => $cashIn,
                    'cash_out' => $cashOut,
                    'expenses' => $cashOut,
                    'expected_cash' => $expectedCash,
                    'actual_cash' => $isOpenShift ? $expectedCash : ($expectedCash + rand(-20, 20)),
                    'difference' => $isOpenShift ? 0 : rand(-20, 20),
                ]);
            }
        }

        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('🎉 API POPULATE & POS SEEDING COMPLETED!');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('  📦 Products Imported:   ' . $createdProducts->count() . ' items (with WebP pictures)');
        $this->command->info('  🏷️  Categories Created:   ' . count($seededCategories) . ' departments');
        $this->command->info('  👥 Cashiers Seeded:     4 Cashiers (John, Maria, Carlos, Elena)');
        $this->command->info('  🕒 Shifts Seeded:       ' . $totalShifts . ' shifts across 14 days');
        $this->command->info('  💳 Total Transactions:  ' . $totalSalesCount . ' sales with line items');
        $this->command->info('═══════════════════════════════════════════════════════════════');
    }
}
