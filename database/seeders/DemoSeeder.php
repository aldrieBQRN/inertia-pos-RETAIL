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
        $this->command->info('🎬 Starting Comprehensive Supermarket & Grocery Demo Seeding...');

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
                'address' => '456 Commercial Avenue, BGC, Taguig City, Philippines',
                'phone' => '+63 2 8765 4321',
                'status' => true,
                'logo_path' => null,
                'plan_id' => Plan::where('name', 'Monthly Starter')->first()?->id ?? 1,
                'subscription_ends_at' => now()->addMonths(1),
            ]
        );
        $this->command->info('✅ Store Created/Linked: ' . $store->name);

        // ========== 2.1 CREATE CHECKOUT TERMINALS ==========
        $terminals = [
            [
                'name' => 'Main Counter (Register 1)',
                'code' => 'REG-01',
                'is_active' => true,
                'notes' => 'Primary grocery checkout lane & conveyor counter',
            ],
            [
                'name' => 'Express Lane (Register 2)',
                'code' => 'REG-02',
                'is_active' => true,
                'notes' => 'Basket & express checkout station (10 items or less)',
            ],
            [
                'name' => 'Self-Service & Deli (Register 3)',
                'code' => 'REG-03',
                'is_active' => true,
                'notes' => 'Fresh goods, bakery & deli counter checkout',
            ],
        ];

        $terminalModels = [];
        foreach ($terminals as $tData) {
            $tModel = Terminal::firstOrCreate(
                ['store_id' => $store->id, 'code' => $tData['code']],
                array_merge($tData, ['store_id' => $store->id])
            );
            $terminalModels[] = $tModel;
        }
        $this->command->info('✅ Terminals Created: ' . implode(', ', array_column($terminals, 'code')));

        // ========== 3. CREATE USERS (STAFF & CASHIERS) ==========
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

        // ADMIN / STORE MANAGER
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
        $this->command->info('✅ Admin: admin@email.com / password');

        // CASHIER 1
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
        $this->command->info('✅ Cashier 1: cashier@email.com / password');

        // CASHIER 2
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
        $this->command->info('✅ Cashier 2: maria@email.com / password');

        // CASHIER 3
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
        $this->command->info('✅ Cashier 3: carlos@email.com / password');

        // CASHIER 4
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
        $this->command->info('✅ Cashier 4: elena@email.com / password');

        // ========== 4. CREATE GROCERY & SUPERMARKET CATEGORIES ==========
        $categories = [
            'Fresh Produce & Fruits' => '#10B981',
            'Meat & Poultry' => '#EF4444',
            'Seafood & Fish' => '#06B6D4',
            'Dairy, Eggs & Cheese' => '#F59E0B',
            'Bakery & Bread' => '#D97706',
            'Pantry & Canned Goods' => '#8B5CF6',
            'Snacks & Confectionery' => '#EC4899',
            'Beverages & Juices' => '#3B82F6',
            'Frozen Foods' => '#0284C7',
            'Household & Cleaning' => '#64748B',
            'Personal Care & Hygiene' => '#14B8A6',
            'Baby & Pet Essentials' => '#A855F7',
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
        $this->command->info('✅ Categories Created: ' . count($categories) . ' Grocery Departments');

        // ========== 5. MASSIVE GROCERY PRODUCT CATALOG (PRICES IN CENTAVOS) ==========
        $products = [
            // Fresh Produce & Fruits
            ['name' => 'Fuji Red Apples (1kg Bag)', 'sku' => 'PRD-001', 'price' => 18000, 'wholesale_price' => 15000, 'cost_price' => 11000, 'stock_quantity' => 120, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Fresh Produce & Fruits']],
            ['name' => 'Cavendish Bananas (1kg)', 'sku' => 'PRD-002', 'price' => 8500, 'wholesale_price' => 7000, 'cost_price' => 5000, 'stock_quantity' => 150, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Fresh Produce & Fruits']],
            ['name' => 'Fresh Carrots (1kg Pack)', 'sku' => 'PRD-003', 'price' => 9500, 'wholesale_price' => 8000, 'cost_price' => 5500, 'stock_quantity' => 90, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Fresh Produce & Fruits']],
            ['name' => 'Russet Baking Potatoes (2kg Bag)', 'sku' => 'PRD-004', 'price' => 16500, 'wholesale_price' => 14000, 'cost_price' => 9500, 'stock_quantity' => 80, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Fresh Produce & Fruits']],
            ['name' => 'Organic Fresh Broccoli Crown', 'sku' => 'PRD-005', 'price' => 12000, 'wholesale_price' => 10000, 'cost_price' => 7000, 'stock_quantity' => 45, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Fresh Produce & Fruits']],
            ['name' => 'Sweet Seedless Watermelon (Whole)', 'sku' => 'PRD-006', 'price' => 28000, 'wholesale_price' => 24000, 'cost_price' => 17000, 'stock_quantity' => 35, 'low_stock_threshold' => 8, 'category_id' => $categoryIds['Fresh Produce & Fruits']],
            ['name' => 'Red Onions Fresh (1kg Mesh)', 'sku' => 'PRD-007', 'price' => 11000, 'wholesale_price' => 9000, 'cost_price' => 6000, 'stock_quantity' => 140, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Fresh Produce & Fruits']],
            ['name' => 'Native Garlic Bulbs (500g)', 'sku' => 'PRD-008', 'price' => 8000, 'wholesale_price' => 6500, 'cost_price' => 4500, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Fresh Produce & Fruits']],

            // Meat & Poultry
            ['name' => 'Fresh Chicken Breast Fillet (1kg)', 'sku' => 'MEA-001', 'price' => 29500, 'wholesale_price' => 26000, 'cost_price' => 19000, 'stock_quantity' => 60, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Meat & Poultry']],
            ['name' => 'Choice Lean Ground Beef 90/10 (1kg)', 'sku' => 'MEA-002', 'price' => 42000, 'wholesale_price' => 38000, 'cost_price' => 29000, 'stock_quantity' => 50, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Meat & Poultry']],
            ['name' => 'Premium Pork Belly Liempo Cut (1kg)', 'sku' => 'MEA-003', 'price' => 36500, 'wholesale_price' => 33000, 'cost_price' => 25000, 'stock_quantity' => 70, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Meat & Poultry']],
            ['name' => 'Smoked Jumbo Hotdog (1kg Pack)', 'sku' => 'MEA-004', 'price' => 24000, 'wholesale_price' => 21000, 'cost_price' => 15000, 'stock_quantity' => 85, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Meat & Poultry']],
            ['name' => 'Premium Sweet Ham Slices (500g)', 'sku' => 'MEA-005', 'price' => 17500, 'wholesale_price' => 15000, 'cost_price' => 11000, 'stock_quantity' => 65, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Meat & Poultry']],

            // Seafood & Fish
            ['name' => 'Norwegian Salmon Fillet Fresh (500g)', 'sku' => 'SEA-001', 'price' => 58000, 'wholesale_price' => 52000, 'cost_price' => 39000, 'stock_quantity' => 30, 'low_stock_threshold' => 8, 'category_id' => $categoryIds['Seafood & Fish']],
            ['name' => 'White Shrimp Head-on (1kg)', 'sku' => 'SEA-002', 'price' => 48000, 'wholesale_price' => 43000, 'cost_price' => 32000, 'stock_quantity' => 40, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Seafood & Fish']],
            ['name' => 'Fresh Cleaned Squid Rings (500g)', 'sku' => 'SEA-003', 'price' => 26000, 'wholesale_price' => 22500, 'cost_price' => 16000, 'stock_quantity' => 45, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Seafood & Fish']],
            ['name' => 'Bangus Milkfish Deboned (Pack of 2)', 'sku' => 'SEA-004', 'price' => 23000, 'wholesale_price' => 19500, 'cost_price' => 14000, 'stock_quantity' => 55, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Seafood & Fish']],

            // Dairy, Eggs & Cheese
            ['name' => 'Farm Fresh Large Brown Eggs (Tray of 30)', 'sku' => 'DAR-001', 'price' => 27000, 'wholesale_price' => 24000, 'cost_price' => 18000, 'stock_quantity' => 100, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Dairy, Eggs & Cheese']],
            ['name' => 'Whole Fresh Cream Milk 100% (1 Liter)', 'sku' => 'DAR-002', 'price' => 11500, 'wholesale_price' => 9800, 'cost_price' => 7500, 'stock_quantity' => 160, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Dairy, Eggs & Cheese']],
            ['name' => 'Cheddar Block Cheese Melt & Slice (500g)', 'sku' => 'DAR-003', 'price' => 19500, 'wholesale_price' => 17000, 'cost_price' => 12500, 'stock_quantity' => 75, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Dairy, Eggs & Cheese']],
            ['name' => 'Pure Salted Creamery Butter (225g)', 'sku' => 'DAR-004', 'price' => 13500, 'wholesale_price' => 11500, 'cost_price' => 8500, 'stock_quantity' => 90, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Dairy, Eggs & Cheese']],
            ['name' => 'Greek Style Plain Yogurt (500g Tub)', 'sku' => 'DAR-005', 'price' => 16000, 'wholesale_price' => 13800, 'cost_price' => 10500, 'stock_quantity' => 50, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Dairy, Eggs & Cheese']],

            // Bakery & Bread
            ['name' => 'Artisan Whole Wheat Sliced Loaf (600g)', 'sku' => 'BAK-001', 'price' => 9500, 'wholesale_price' => 8000, 'cost_price' => 5500, 'stock_quantity' => 60, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Bakery & Bread']],
            ['name' => 'Classic Soft Butter Pandesal (12 pcs)', 'sku' => 'BAK-002', 'price' => 6500, 'wholesale_price' => 5000, 'cost_price' => 3200, 'stock_quantity' => 80, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Bakery & Bread']],
            ['name' => 'French Baguette Baked Daily', 'sku' => 'BAK-003', 'price' => 8500, 'wholesale_price' => 7000, 'cost_price' => 4500, 'stock_quantity' => 40, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Bakery & Bread']],
            ['name' => 'Assorted Mini Croissants (Box of 6)', 'sku' => 'BAK-004', 'price' => 16500, 'wholesale_price' => 14000, 'cost_price' => 9500, 'stock_quantity' => 35, 'low_stock_threshold' => 8, 'category_id' => $categoryIds['Bakery & Bread']],

            // Pantry & Canned Goods
            ['name' => 'Premium Jasmine Fragrant Rice (5kg Bag)', 'sku' => 'PAN-001', 'price' => 32000, 'wholesale_price' => 29000, 'cost_price' => 23500, 'stock_quantity' => 180, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Pantry & Canned Goods']],
            ['name' => 'Extra Virgin Olive Oil Cold Pressed (750ml)', 'sku' => 'PAN-002', 'price' => 48500, 'wholesale_price' => 42000, 'cost_price' => 31000, 'stock_quantity' => 45, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Pantry & Canned Goods']],
            ['name' => 'Chunk Tuna in Olive Oil (185g Can)', 'sku' => 'PAN-003', 'price' => 5800, 'wholesale_price' => 4800, 'cost_price' => 3400, 'stock_quantity' => 250, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Pantry & Canned Goods']],
            ['name' => 'Classic Corned Beef Chunky (260g Can)', 'sku' => 'PAN-004', 'price' => 8900, 'wholesale_price' => 7600, 'cost_price' => 5400, 'stock_quantity' => 200, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Pantry & Canned Goods']],
            ['name' => 'Italian Spaghetti Pasta Durum Wheat (1kg)', 'sku' => 'PAN-005', 'price' => 9800, 'wholesale_price' => 8200, 'cost_price' => 5800, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Pantry & Canned Goods']],
            ['name' => 'Rich Tomato & Basil Pasta Sauce (680g Jar)', 'sku' => 'PAN-006', 'price' => 12500, 'wholesale_price' => 10500, 'cost_price' => 7200, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Pantry & Canned Goods']],
            ['name' => 'Refined Pure White Sugar (1kg Pack)', 'sku' => 'PAN-007', 'price' => 7800, 'wholesale_price' => 6500, 'cost_price' => 4800, 'stock_quantity' => 160, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Pantry & Canned Goods']],
            ['name' => 'Iodized Fine Table Salt (1kg Pack)', 'sku' => 'PAN-008', 'price' => 3500, 'wholesale_price' => 2800, 'cost_price' => 1800, 'stock_quantity' => 220, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Pantry & Canned Goods']],

            // Snacks & Confectionery
            ['name' => 'Sea Salted Potato Crisps (170g Large)', 'sku' => 'SNK-001', 'price' => 13500, 'wholesale_price' => 11500, 'cost_price' => 7800, 'stock_quantity' => 130, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Snacks & Confectionery']],
            ['name' => 'Tortilla Nacho Cheese Corn Chips (200g)', 'sku' => 'SNK-002', 'price' => 14500, 'wholesale_price' => 12000, 'cost_price' => 8400, 'stock_quantity' => 115, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Snacks & Confectionery']],
            ['name' => 'Swiss Dark Chocolate 72% Cocoa (100g Bar)', 'sku' => 'SNK-003', 'price' => 15500, 'wholesale_price' => 13000, 'cost_price' => 9200, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Snacks & Confectionery']],
            ['name' => 'Butter Chocolate Chip Cookies (Pack of 12)', 'sku' => 'SNK-004', 'price' => 12000, 'wholesale_price' => 10000, 'cost_price' => 6800, 'stock_quantity' => 95, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Snacks & Confectionery']],
            ['name' => 'Roasted Salted Mixed Nuts Deluxe (250g Jar)', 'sku' => 'SNK-005', 'price' => 24500, 'wholesale_price' => 21000, 'cost_price' => 15000, 'stock_quantity' => 60, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Snacks & Confectionery']],

            // Beverages & Juices
            ['name' => 'Sparkling Mineral Water (1.5L Bottle)', 'sku' => 'BEV-001', 'price' => 6500, 'wholesale_price' => 5200, 'cost_price' => 3200, 'stock_quantity' => 200, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Beverages & Juices']],
            ['name' => '100% Pure Squeezed Orange Juice (1 Liter)', 'sku' => 'BEV-002', 'price' => 16500, 'wholesale_price' => 14000, 'cost_price' => 10200, 'stock_quantity' => 85, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Beverages & Juices']],
            ['name' => 'Classic Cola Soft Drink (1.5L PET)', 'sku' => 'BEV-003', 'price' => 7500, 'wholesale_price' => 6200, 'cost_price' => 4300, 'stock_quantity' => 190, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Beverages & Juices']],
            ['name' => 'Cold Brewed Roasted Black Coffee (500ml)', 'sku' => 'BEV-004', 'price' => 9500, 'wholesale_price' => 8000, 'cost_price' => 5200, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Beverages & Juices']],
            ['name' => 'Refreshing Lemon Iced Tea Mix (1kg Pouch)', 'sku' => 'BEV-005', 'price' => 18500, 'wholesale_price' => 16000, 'cost_price' => 11500, 'stock_quantity' => 75, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Beverages & Juices']],

            // Frozen Foods
            ['name' => 'Crispy Golden French Fries (1kg Bag)', 'sku' => 'FRZ-001', 'price' => 16500, 'wholesale_price' => 14000, 'cost_price' => 9800, 'stock_quantity' => 95, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Frozen Foods']],
            ['name' => 'Pork & Shrimp Siomai Dimsum (20 pcs Pack)', 'sku' => 'FRZ-002', 'price' => 19500, 'wholesale_price' => 17000, 'cost_price' => 12000, 'stock_quantity' => 80, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Frozen Foods']],
            ['name' => 'All-Meat Pepperoni Frozen Pizza (12-inch)', 'sku' => 'FRZ-003', 'price' => 32000, 'wholesale_price' => 28000, 'cost_price' => 20500, 'stock_quantity' => 40, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Frozen Foods']],
            ['name' => 'Creamy Vanilla Bean Ice Cream (1.5L Tub)', 'sku' => 'FRZ-004', 'price' => 26500, 'wholesale_price' => 23000, 'cost_price' => 16800, 'stock_quantity' => 55, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Frozen Foods']],

            // Household & Cleaning
            ['name' => 'Concentrated Liquid Laundry Detergent (2L)', 'sku' => 'HOU-001', 'price' => 34500, 'wholesale_price' => 30000, 'cost_price' => 22000, 'stock_quantity' => 85, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Household & Cleaning']],
            ['name' => 'Antibacterial Citrus Dishwashing Liquid (1L)', 'sku' => 'HOU-002', 'price' => 13500, 'wholesale_price' => 11000, 'cost_price' => 7500, 'stock_quantity' => 130, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Household & Cleaning']],
            ['name' => '2-Ply Premium Bathroom Tissue (12 Rolls)', 'sku' => 'HOU-003', 'price' => 21000, 'wholesale_price' => 18000, 'cost_price' => 13200, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Household & Cleaning']],
            ['name' => 'Multi-Surface Disinfectant Spray (500ml)', 'sku' => 'HOU-004', 'price' => 18500, 'wholesale_price' => 16000, 'cost_price' => 11500, 'stock_quantity' => 70, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Household & Cleaning']],

            // Personal Care & Hygiene
            ['name' => 'Antibacterial Moisture Body Wash (800ml)', 'sku' => 'PER-001', 'price' => 26500, 'wholesale_price' => 23000, 'cost_price' => 16500, 'stock_quantity' => 75, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Personal Care & Hygiene']],
            ['name' => 'Damage Repair Daily Shampoo (650ml Pump)', 'sku' => 'PER-002', 'price' => 28500, 'wholesale_price' => 25000, 'cost_price' => 18000, 'stock_quantity' => 65, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Personal Care & Hygiene']],
            ['name' => 'Total Care Anticavity Fluoride Toothpaste (150g)', 'sku' => 'PER-003', 'price' => 11500, 'wholesale_price' => 9500, 'cost_price' => 6800, 'stock_quantity' => 160, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Personal Care & Hygiene']],
            ['name' => 'Alcohol-Free Fresh Hand Sanitizer (250ml)', 'sku' => 'PER-004', 'price' => 8500, 'wholesale_price' => 7000, 'cost_price' => 4500, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Personal Care & Hygiene']],

            // Baby & Pet Essentials
            ['name' => 'Ultra Absorbent Baby Diapers Tape (Pack of 36)', 'sku' => 'BBY-001', 'price' => 38000, 'wholesale_price' => 33500, 'cost_price' => 25500, 'stock_quantity' => 60, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Baby & Pet Essentials']],
            ['name' => 'Hypoallergenic Fragrance-Free Baby Wipes (80s)', 'sku' => 'BBY-002', 'price' => 8500, 'wholesale_price' => 7000, 'cost_price' => 4800, 'stock_quantity' => 150, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Baby & Pet Essentials']],
            ['name' => 'Nutritious Adult Dry Dog Food Beef (3kg Bag)', 'sku' => 'PET-001', 'price' => 39500, 'wholesale_price' => 34500, 'cost_price' => 26000, 'stock_quantity' => 45, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Baby & Pet Essentials']],
            ['name' => 'Gourmet Canned Cat Food Tuna in Jelly (85g)', 'sku' => 'PET-002', 'price' => 4500, 'wholesale_price' => 3600, 'cost_price' => 2500, 'stock_quantity' => 200, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Baby & Pet Essentials']],
        ];

        foreach ($products as $productData) {
            Product::create(array_merge($productData, ['store_id' => $store->id]));
        }
        $this->command->info('✅ Grocery Products Created: ' . count($products) . ' active SKUs in supermarket inventory');

        // ========== 6. CREATE EXTENSIVE MULTI-CASHIER SHIFTS & TRANSACTIONS ==========
        $productsForSales = Product::where('store_id', $store->id)->get();
        $cashiersList = [$cashier1, $cashier2, $cashier3, $cashier4];

        // Seed 14 days of realistic grocery sales transactions and shifts for all cashiers
        $totalSalesSeeded = 0;
        $totalShiftsSeeded = 0;

        for ($day = 13; $day >= 0; $day--) {
            $date = Carbon::now()->subDays($day);

            foreach ($cashiersList as $cIdx => $activeCashier) {
                // Assign each cashier to a designated register lane
                $terminal = $terminalModels[$cIdx % count($terminalModels)];

                // Vary shifts: Morning (07:00-15:00), Mid (11:00-19:00), Evening (14:00-22:00)
                $shiftSchedule = [
                    ['start' => 7, 'end' => 15],
                    ['start' => 9, 'end' => 17],
                    ['start' => 11, 'end' => 19],
                    ['start' => 14, 'end' => 22],
                ][$cIdx % 4];

                $startDateTime = $date->copy()->setTime($shiftSchedule['start'], rand(0, 5));
                $endDateTime = $date->copy()->setTime($shiftSchedule['end'], rand(0, 5));

                $startingCash = 50000; // P500.00 base float

                // Create closed shift record (or open shift if it's the current day for the active cashier)
                $isCurrentLiveShift = ($day === 0 && $cIdx === 0);
                $shiftStatus = $isCurrentLiveShift ? 'open' : 'closed';

                $shift = Shift::create([
                    'store_id' => $store->id,
                    'user_id' => $activeCashier->id,
                    'terminal_id' => $terminal->id,
                    'start_time' => $startDateTime,
                    'end_time' => $isCurrentLiveShift ? null : $endDateTime,
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
                    'status' => $shiftStatus,
                    'opening_notes' => 'Shift verified on ' . $terminal->name . ' (' . $terminal->code . ')',
                    'closing_notes' => $isCurrentLiveShift ? null : 'Cash drawer reconciled & verified by store manager.',
                ]);
                $totalShiftsSeeded++;

                // Cash drawer movements (Mid-shift float top-ups or petty cash / safe drops)
                $cashInAmount = 0;
                $cashOutAmount = 0;

                // 40% chance of small change float addition
                if (rand(1, 10) <= 4) {
                    $topupAmt = rand(1, 3) * 10000; // ₱100 - ₱300
                    CashMovement::create([
                        'store_id' => $store->id,
                        'user_id' => $activeCashier->id,
                        'shift_id' => $shift->id,
                        'terminal_id' => $terminal->id,
                        'type' => 'cash_in',
                        'amount' => $topupAmt,
                        'reason' => 'Small change coin / bill float replenishment',
                        'created_at' => $startDateTime->copy()->addHours(2),
                        'updated_at' => $startDateTime->copy()->addHours(2),
                    ]);
                    $cashInAmount += $topupAmt;
                }

                // 50% chance of safe drop / excess cash clearing
                if (rand(1, 10) <= 5) {
                    $dropAmt = rand(1, 2) * 15000; // ₱150 - ₱300
                    CashMovement::create([
                        'store_id' => $store->id,
                        'user_id' => $activeCashier->id,
                        'shift_id' => $shift->id,
                        'terminal_id' => $terminal->id,
                        'type' => 'cash_out',
                        'amount' => $dropAmt,
                        'reason' => 'Mid-day cash drawer drop to back-office vault',
                        'created_at' => $startDateTime->copy()->addHours(4),
                        'updated_at' => $startDateTime->copy()->addHours(4),
                    ]);
                    $cashOutAmount += $dropAmt;
                }

                // Create grocery transactions for this shift
                $cashSalesTotal = 0;
                $transactionCount = rand(10, 18); // Supermarket basket volume

                for ($t = 0; $t < $transactionCount; $t++) {
                    $txOffsetMinutes = rand(10, 460);
                    $transactionTime = $startDateTime->copy()->addMinutes($txOffsetMinutes);

                    // Skip transactions past current time
                    if ($transactionTime->gt(now())) {
                        continue;
                    }

                    $paymentChannels = ['cash', 'cash', 'cash', 'gcash', 'maya', 'debit_card', 'credit_card'];
                    $paymentMethod = $paymentChannels[array_rand($paymentChannels)];
                    $isWholesale = (rand(1, 10) === 1); // 10% wholesale bulk transactions

                    $sale = Sale::create([
                        'store_id' => $store->id,
                        'invoice_number' => 'INV-' . strtoupper(uniqid()),
                        'cashier_id' => $activeCashier->id,
                        'terminal_id' => $terminal->id,
                        'total_amount' => 0,
                        'discount_amount' => rand(1, 8) === 1 ? rand(5000, 20000) : 0, // Store promo discount
                        'payment_method' => $paymentMethod,
                        'payment_reference' => in_array($paymentMethod, ['debit_card', 'credit_card', 'gcash', 'maya'])
                            ? 'REF-' . rand(1000000, 9999999)
                            : null,
                        'is_senior' => rand(1, 12) === 1, // ~8% senior/PWD discount
                        'cash_given' => 0,
                        'change' => 0,
                        'status' => (rand(1, 35) === 1) ? 'void' : 'completed',
                        'transaction_date' => $transactionTime,
                        'created_at' => $transactionTime,
                        'updated_at' => $transactionTime,
                    ]);
                    $totalSalesSeeded++;

                    $total = 0;
                    $itemCount = rand(2, 6); // Realistic grocery basket: 2 to 6 unique products

                    for ($j = 0; $j < $itemCount; $j++) {
                        $product = $productsForSales->random();
                        $quantity = rand(1, 4);

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
                        $total = (int) ($total * 0.80); // 20% senior discount
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

                // Update shift financial summary
                $expectedCash = $startingCash + $cashSalesTotal + $cashInAmount - $cashOutAmount;
                $drawerVariance = rand(-200, 200); // Small realistic cashier discrepancy
                $actualCash = $expectedCash + $drawerVariance;

                $shift->update([
                    'cash_sales' => $cashSalesTotal,
                    'cash_in' => $cashInAmount,
                    'cash_out' => $cashOutAmount,
                    'expenses' => $cashOutAmount,
                    'expected_cash' => $expectedCash,
                    'actual_cash' => $isCurrentLiveShift ? $expectedCash : $actualCash,
                    'difference' => $isCurrentLiveShift ? 0 : ($actualCash - $expectedCash),
                ]);
            }
        }

        $this->command->info("✅ Seeded {$totalShiftsSeeded} shifts and {$totalSalesSeeded} grocery transactions across all cashiers!");

        // ========== SUMMARY ==========
        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('🎉 GROCERY & SUPERMARKET SEEDING COMPLETED!');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('');
        $this->command->info('📊 USER CREDENTIALS:');
        $this->command->info('  👨‍💻 Developer:    dev@email.com / password');
        $this->command->info('  👔 Admin:       admin@email.com / password (Store Manager)');
        $this->command->info('  💳 Cashier 1:   cashier@email.com / password (John Cashier - REG-01)');
        $this->command->info('  💳 Cashier 2:   maria@email.com / password (Maria Santos - REG-02)');
        $this->command->info('  💳 Cashier 3:   carlos@email.com / password (Carlos Reyes - REG-03)');
        $this->command->info('  💳 Cashier 4:   elena@email.com / password (Elena Gomez - REG-01)');
        $this->command->info('');
        $this->command->info('🏪 STORE & HARDWARE:');
        $this->command->info('  Store Name:    ' . $store->name);
        $this->command->info('  Terminals:     ' . count($terminalModels) . ' Active POS Checkout Lanes');
        $this->command->info('');
        $this->command->info('📦 INVENTORY & AUDIT:');
        $this->command->info('  Departments:   ' . count($categories));
        $this->command->info('  Products:      ' . $productsForSales->count() . ' Grocery SKUs with Wholesale Pricing');
        $this->command->info('  Total Shifts:  ' . $totalShiftsSeeded);
        $this->command->info('  Total Sales:   ' . $totalSalesSeeded);
        $this->command->info('═══════════════════════════════════════════════════════════════');
    }
}
