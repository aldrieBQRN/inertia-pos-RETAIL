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
        $this->command->info('🎬 Starting Comprehensive Filipino Supermarket & Grocery Demo Seeding...');

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
            ['name' => 'Inertia POS'],
            [
                'address' => '456 Commercial Avenue, BGC, Taguig City, Philippines',
                'phone' => '+63 2 8765 4321',
                'status' => true,
                'logo_path' => null,
                'plan_id' => Plan::where('name', 'Monthly Starter')->first()?->id ?? 1,
                'subscription_ends_at' => now()->addMonths(6),
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
                'notes' => 'Fresh goods, bakery & sari-sari wholesale counter checkout',
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

        // ========== 4. CREATE POPULAR FILIPINO GROCERY CATEGORIES ==========
        $categories = [
            'Dairy, Milk & Eggs' => '#F59E0B',
            'Canned Goods & Instant Meals' => '#EF4444',
            'Rice, Noodles & Pasta' => '#D97706',
            'Coffee, Tea & Choco Drinks' => '#8B5CF6',
            'Beverages, Sodas & Water' => '#3B82F6',
            'Snacks, Biscuits & Chips' => '#EC4899',
            'Condiments, Sauces & Spices' => '#F97316',
            'Frozen Foods & Processed Meats' => '#06B6D4',
            'Fresh Meat, Poultry & Fish' => '#E11D48',
            'Fresh Produce & Vegetables' => '#10B981',
            'Bakery & Bread Spread' => '#84CC16',
            'Laundry & Cleaning Supplies' => '#64748B',
            'Personal Care & Toiletries' => '#14B8A6',
            'Baby Care & Pet Needs' => '#A855F7',
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
        $this->command->info('✅ Categories Created: ' . count($categories) . ' Filipino Grocery Departments');

        // ========== 5. MASSIVE REALISTIC FILIPINO GROCERY CATALOG (100+ SKUs) ==========
        $products = [
            // --- DAIRY, MILK & EGGS (Extensive Milk Selections) ---
            ['name' => 'Bear Brand Fortified Powdered Milk Drink (900g)', 'sku' => 'MLK-001', 'price' => 38500, 'wholesale_price' => 36500, 'cost_price' => 32000, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Bear Brand Fortified Powdered Milk Drink (300g)', 'sku' => 'MLK-002', 'price' => 13500, 'wholesale_price' => 12500, 'cost_price' => 10500, 'stock_quantity' => 180, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Bear Brand Sterilized Milk Drink (1L Tetra)', 'sku' => 'MLK-003', 'price' => 9800, 'wholesale_price' => 8800, 'cost_price' => 7400, 'stock_quantity' => 120, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Alaska Fortified Evaporated Milk (370ml Can)', 'sku' => 'MLK-004', 'price' => 4500, 'wholesale_price' => 4000, 'cost_price' => 3300, 'stock_quantity' => 220, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Alaska Sweetened Condensed Milk (300ml Can)', 'sku' => 'MLK-005', 'price' => 6200, 'wholesale_price' => 5500, 'cost_price' => 4700, 'stock_quantity' => 200, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Alaska Fresh UHT Milk 100% (1 Liter)', 'sku' => 'MLK-006', 'price' => 9500, 'wholesale_price' => 8600, 'cost_price' => 7200, 'stock_quantity' => 150, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Nestle Carnation Evaporated Creamer (370ml)', 'sku' => 'MLK-007', 'price' => 4800, 'wholesale_price' => 4200, 'cost_price' => 3500, 'stock_quantity' => 160, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Nestle All-Purpose Cream Original (250ml Tetra)', 'sku' => 'MLK-008', 'price' => 7500, 'wholesale_price' => 6800, 'cost_price' => 5600, 'stock_quantity' => 190, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Cowhead Pure Fresh Whole Milk (1 Liter)', 'sku' => 'MLK-009', 'price' => 11000, 'wholesale_price' => 9800, 'cost_price' => 8200, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Magnolia Fresh Milk Original (1 Liter)', 'sku' => 'MLK-010', 'price' => 10500, 'wholesale_price' => 9400, 'cost_price' => 7900, 'stock_quantity' => 130, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Magnolia Cheezee Quickmelt Block (165g)', 'sku' => 'MLK-011', 'price' => 6500, 'wholesale_price' => 5800, 'cost_price' => 4800, 'stock_quantity' => 100, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Eden Cheese Block Melt & Spread (160g)', 'sku' => 'MLK-012', 'price' => 6200, 'wholesale_price' => 5600, 'cost_price' => 4600, 'stock_quantity' => 170, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Eden Melt Sarap Pasteurized Cheese (430g)', 'sku' => 'MLK-013', 'price' => 16500, 'wholesale_price' => 14800, 'cost_price' => 12500, 'stock_quantity' => 85, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Dari Creme Salted Table Margarine (200g)', 'sku' => 'MLK-014', 'price' => 6800, 'wholesale_price' => 6000, 'cost_price' => 5000, 'stock_quantity' => 120, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Anchor Pure Salted Butter Block (227g)', 'sku' => 'MLK-015', 'price' => 17500, 'wholesale_price' => 15500, 'cost_price' => 13000, 'stock_quantity' => 70, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Fresh Farm Brown Eggs Large (Tray of 30)', 'sku' => 'MLK-016', 'price' => 28500, 'wholesale_price' => 26000, 'cost_price' => 21500, 'stock_quantity' => 90, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],
            ['name' => 'Fresh Farm White Eggs Medium (Pack of 12)', 'sku' => 'MLK-017', 'price' => 12000, 'wholesale_price' => 10500, 'cost_price' => 8500, 'stock_quantity' => 110, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Dairy, Milk & Eggs']],

            // --- CANNED GOODS & INSTANT MEALS ---
            ['name' => 'Purefoods Corned Beef Classic (210g Can)', 'sku' => 'CAN-001', 'price' => 9800, 'wholesale_price' => 8900, 'cost_price' => 7400, 'stock_quantity' => 250, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Argentina Corned Beef Regular (150g Can)', 'sku' => 'CAN-002', 'price' => 4500, 'wholesale_price' => 3900, 'cost_price' => 3200, 'stock_quantity' => 280, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Highlands Gold Corned Beef (260g Premium Can)', 'sku' => 'CAN-003', 'price' => 12500, 'wholesale_price' => 11000, 'cost_price' => 9200, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Century Tuna Flakes in Oil (155g Easy-Open)', 'sku' => 'CAN-004', 'price' => 4200, 'wholesale_price' => 3700, 'cost_price' => 3000, 'stock_quantity' => 300, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Century Tuna Flakes Hot & Spicy (155g Can)', 'sku' => 'CAN-005', 'price' => 4200, 'wholesale_price' => 3700, 'cost_price' => 3000, 'stock_quantity' => 280, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'San Marino Corned Tuna (150g Can)', 'sku' => 'CAN-006', 'price' => 4600, 'wholesale_price' => 4000, 'cost_price' => 3300, 'stock_quantity' => 220, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Mega Sardines in Tomato Sauce with Chili (155g)', 'sku' => 'CAN-007', 'price' => 2600, 'wholesale_price' => 2250, 'cost_price' => 1800, 'stock_quantity' => 350, 'low_stock_threshold' => 60, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => '555 Sardines in Tomato Sauce Green (155g)', 'sku' => 'CAN-008', 'price' => 2400, 'wholesale_price' => 2100, 'cost_price' => 1700, 'stock_quantity' => 320, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Ligo Sardines in Tomato Sauce Red (155g)', 'sku' => 'CAN-009', 'price' => 2700, 'wholesale_price' => 2350, 'cost_price' => 1900, 'stock_quantity' => 260, 'low_stock_threshold' => 45, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Spam Luncheon Meat Classic (340g Can)', 'sku' => 'CAN-010', 'price' => 22500, 'wholesale_price' => 20500, 'cost_price' => 17500, 'stock_quantity' => 95, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Maling Pork Luncheon Meat (397g Can)', 'sku' => 'CAN-011', 'price' => 13500, 'wholesale_price' => 12000, 'cost_price' => 9800, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Hunt’s Pork & Beans in Rich Tomato Sauce (230g)', 'sku' => 'CAN-012', 'price' => 4500, 'wholesale_price' => 3900, 'cost_price' => 3200, 'stock_quantity' => 180, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Jolly Whole Kernel Golden Sweet Corn (425g)', 'sku' => 'CAN-013', 'price' => 5200, 'wholesale_price' => 4600, 'cost_price' => 3700, 'stock_quantity' => 160, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],
            ['name' => 'Jolly Whole Mushrooms in Brine (400g Can)', 'sku' => 'CAN-014', 'price' => 5800, 'wholesale_price' => 5100, 'cost_price' => 4100, 'stock_quantity' => 130, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Canned Goods & Instant Meals']],

            // --- RICE, NOODLES & PASTA ---
            ['name' => 'Dinorado Special Fragrant Rice (5kg Bag)', 'sku' => 'RIC-001', 'price' => 31000, 'wholesale_price' => 28500, 'cost_price' => 24000, 'stock_quantity' => 150, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Sinandomeng Premium White Rice (5kg Bag)', 'sku' => 'RIC-002', 'price' => 27500, 'wholesale_price' => 25000, 'cost_price' => 21000, 'stock_quantity' => 180, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Jasmine Supreme Whole Grain Rice (10kg Sack)', 'sku' => 'RIC-003', 'price' => 59000, 'wholesale_price' => 54000, 'cost_price' => 46000, 'stock_quantity' => 90, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Lucky Me! Pancit Canton Kalamansi (80g)', 'sku' => 'RIC-004', 'price' => 1600, 'wholesale_price' => 1400, 'cost_price' => 1150, 'stock_quantity' => 450, 'low_stock_threshold' => 80, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Lucky Me! Pancit Canton Original (80g)', 'sku' => 'RIC-005', 'price' => 1600, 'wholesale_price' => 1400, 'cost_price' => 1150, 'stock_quantity' => 400, 'low_stock_threshold' => 80, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Lucky Me! Pancit Canton Sweet & Spicy (80g)', 'sku' => 'RIC-006', 'price' => 1600, 'wholesale_price' => 1400, 'cost_price' => 1150, 'stock_quantity' => 420, 'low_stock_threshold' => 80, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Lucky Me! Pancit Canton Extra Hot Chili (80g)', 'sku' => 'RIC-007', 'price' => 1600, 'wholesale_price' => 1400, 'cost_price' => 1150, 'stock_quantity' => 380, 'low_stock_threshold' => 80, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Lucky Me! Instant Mami Chicken (55g Pouch)', 'sku' => 'RIC-008', 'price' => 1400, 'wholesale_price' => 1250, 'cost_price' => 1000, 'stock_quantity' => 350, 'low_stock_threshold' => 60, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Lucky Me! Instant Mami Beef (55g Pouch)', 'sku' => 'RIC-009', 'price' => 1400, 'wholesale_price' => 1250, 'cost_price' => 1000, 'stock_quantity' => 320, 'low_stock_threshold' => 60, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Nissin Cup Noodles Seafood Flavor (40g Cup)', 'sku' => 'RIC-010', 'price' => 3200, 'wholesale_price' => 2800, 'cost_price' => 2250, 'stock_quantity' => 200, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Royal Spaghetti Pasta No. 1 (1kg Pack)', 'sku' => 'RIC-011', 'price' => 9500, 'wholesale_price' => 8500, 'cost_price' => 6900, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Del Monte Filipino Style Spaghetti Sauce (900g Pouch)', 'sku' => 'RIC-012', 'price' => 9800, 'wholesale_price' => 8800, 'cost_price' => 7200, 'stock_quantity' => 160, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Del Monte Sweet Style Spaghetti Sauce (900g Pouch)', 'sku' => 'RIC-013', 'price' => 9800, 'wholesale_price' => 8800, 'cost_price' => 7200, 'stock_quantity' => 150, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Super Q Special Bihon Noodles (500g Pack)', 'sku' => 'RIC-014', 'price' => 5800, 'wholesale_price' => 5000, 'cost_price' => 4100, 'stock_quantity' => 120, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],
            ['name' => 'Excellent Special Canton Noodles (500g Pack)', 'sku' => 'RIC-015', 'price' => 6200, 'wholesale_price' => 5400, 'cost_price' => 4400, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Rice, Noodles & Pasta']],

            // --- COFFEE, TEA & CHOCO DRINKS ---
            ['name' => 'Nescafe Classic Instant Pure Coffee (200g Jar)', 'sku' => 'COF-001', 'price' => 21000, 'wholesale_price' => 19000, 'cost_price' => 15800, 'stock_quantity' => 85, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Nescafe Classic Instant Pure Coffee (100g Pouch)', 'sku' => 'COF-002', 'price' => 9800, 'wholesale_price' => 8800, 'cost_price' => 7200, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Nescafe 3-in-1 Original Coffee Twin Pack (10s)', 'sku' => 'COF-003', 'price' => 12500, 'wholesale_price' => 11200, 'cost_price' => 9200, 'stock_quantity' => 180, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Kopiko Blanca 3-in-1 Creamy Coffee Twin Pack (10s)', 'sku' => 'COF-004', 'price' => 13000, 'wholesale_price' => 11800, 'cost_price' => 9600, 'stock_quantity' => 220, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Kopiko Black 3-in-1 Strong Coffee Twin Pack (10s)', 'sku' => 'COF-005', 'price' => 12500, 'wholesale_price' => 11200, 'cost_price' => 9200, 'stock_quantity' => 190, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Kopiko Brown 3-in-1 Caramel Coffee Twin Pack (10s)', 'sku' => 'COF-006', 'price' => 12500, 'wholesale_price' => 11200, 'cost_price' => 9200, 'stock_quantity' => 210, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Great Taste White Coffee Mix Twin Pack (10s)', 'sku' => 'COF-007', 'price' => 12000, 'wholesale_price' => 10800, 'cost_price' => 8800, 'stock_quantity' => 200, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Nestle Coffee-Mate Non-Dairy Creamer (450g Pouch)', 'sku' => 'COF-008', 'price' => 14500, 'wholesale_price' => 13000, 'cost_price' => 10800, 'stock_quantity' => 130, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Milo Activ-Go Chocolate Malt Powder (1kg Pouch)', 'sku' => 'COF-009', 'price' => 28500, 'wholesale_price' => 26000, 'cost_price' => 22000, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Milo Activ-Go Chocolate Malt Powder (300g)', 'sku' => 'COF-010', 'price' => 10500, 'wholesale_price' => 9400, 'cost_price' => 7800, 'stock_quantity' => 160, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Swiss Miss Chocolate Milk Mix Marshmallow (Box of 8)', 'sku' => 'COF-011', 'price' => 18500, 'wholesale_price' => 16500, 'cost_price' => 13800, 'stock_quantity' => 75, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],
            ['name' => 'Lipton Yellow Label Black Tea Bags (Box of 25s)', 'sku' => 'COF-012', 'price' => 11500, 'wholesale_price' => 10200, 'cost_price' => 8400, 'stock_quantity' => 80, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Coffee, Tea & Choco Drinks']],

            // --- BEVERAGES, SODAS & WATER ---
            ['name' => 'Coca-Cola Regular 1.5L PET Bottle', 'sku' => 'BEV-001', 'price' => 7800, 'wholesale_price' => 6900, 'cost_price' => 5400, 'stock_quantity' => 260, 'low_stock_threshold' => 45, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'Coca-Cola Zero Sugar 1.5L PET Bottle', 'sku' => 'BEV-002', 'price' => 7800, 'wholesale_price' => 6900, 'cost_price' => 5400, 'stock_quantity' => 180, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'Sprite Lemon-Lime Soda 1.5L PET Bottle', 'sku' => 'BEV-003', 'price' => 7800, 'wholesale_price' => 6900, 'cost_price' => 5400, 'stock_quantity' => 190, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'Royal Tru-Orange Soda 1.5L PET Bottle', 'sku' => 'BEV-004', 'price' => 7800, 'wholesale_price' => 6900, 'cost_price' => 5400, 'stock_quantity' => 210, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'Nature’s Spring Purified Drinking Water (1L)', 'sku' => 'BEV-005', 'price' => 2800, 'wholesale_price' => 2300, 'cost_price' => 1600, 'stock_quantity' => 300, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'Wilkins Distilled Pure Water (1 Liter)', 'sku' => 'BEV-006', 'price' => 3600, 'wholesale_price' => 3000, 'cost_price' => 2200, 'stock_quantity' => 240, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'Wilkins Pure Distilled Water (6 Liters Bottle)', 'sku' => 'BEV-007', 'price' => 10500, 'wholesale_price' => 9200, 'cost_price' => 7200, 'stock_quantity' => 80, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'Tang Powdered Orange Juice Mix (Pack of 12s)', 'sku' => 'BEV-008', 'price' => 24000, 'wholesale_price' => 21500, 'cost_price' => 17500, 'stock_quantity' => 120, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'Tang Powdered Mango Juice Mix (Pack of 12s)', 'sku' => 'BEV-009', 'price' => 24000, 'wholesale_price' => 21500, 'cost_price' => 17500, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'Nestea Iced Tea Lemon Powder Mix (25g x 10s)', 'sku' => 'BEV-010', 'price' => 19500, 'wholesale_price' => 17500, 'cost_price' => 14200, 'stock_quantity' => 130, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'C2 Green Tea Apple Flavor (500ml Bottle)', 'sku' => 'BEV-011', 'price' => 3200, 'wholesale_price' => 2700, 'cost_price' => 2100, 'stock_quantity' => 200, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Beverages, Sodas & Water']],
            ['name' => 'Gatorade Sports Drink Blue Bolt (500ml)', 'sku' => 'BEV-012', 'price' => 4800, 'wholesale_price' => 4200, 'cost_price' => 3300, 'stock_quantity' => 150, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Beverages, Sodas & Water']],

            // --- SNACKS, BISCUITS & CHIPS ---
            ['name' => 'Piattos Cheese Flavored Potato Crisps (85g)', 'sku' => 'SNK-001', 'price' => 4200, 'wholesale_price' => 3700, 'cost_price' => 3000, 'stock_quantity' => 250, 'low_stock_threshold' => 45, 'category_id' => $categoryIds['Snacks, Biscuits & Chips']],
            ['name' => 'Piattos Sour Cream & Onion Crisps (85g)', 'sku' => 'SNK-002', 'price' => 4200, 'wholesale_price' => 3700, 'cost_price' => 3000, 'stock_quantity' => 220, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Snacks, Biscuits & Chips']],
            ['name' => 'Nova Multigrain Snacks Country Cheddar (78g)', 'sku' => 'SNK-003', 'price' => 4200, 'wholesale_price' => 3700, 'cost_price' => 3000, 'stock_quantity' => 200, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Snacks, Biscuits & Chips']],
            ['name' => 'Chippy Barbecue Flavored Corn Chips (110g)', 'sku' => 'SNK-004', 'price' => 3800, 'wholesale_price' => 3300, 'cost_price' => 2600, 'stock_quantity' => 280, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Snacks, Biscuits & Chips']],
            ['name' => 'V-Cut Spicy Barbecue Ridged Chips (85g)', 'sku' => 'SNK-005', 'price' => 4200, 'wholesale_price' => 3700, 'cost_price' => 3000, 'stock_quantity' => 190, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Snacks, Biscuits & Chips']],
            ['name' => 'SkyFlakes Crackers Original (Box of 24s)', 'sku' => 'SNK-006', 'price' => 16500, 'wholesale_price' => 14800, 'cost_price' => 12200, 'stock_quantity' => 160, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Snacks, Biscuits & Chips']],
            ['name' => 'Fita Crackers Original Classic (Box of 24s)', 'sku' => 'SNK-007', 'price' => 17000, 'wholesale_price' => 15200, 'cost_price' => 12600, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Snacks, Biscuits & Chips']],
            ['name' => 'Rebisco Sandwich Choco Crackers (10s Pack)', 'sku' => 'SNK-008', 'price' => 7500, 'wholesale_price' => 6600, 'cost_price' => 5400, 'stock_quantity' => 180, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Snacks, Biscuits & Chips']],
            ['name' => 'Oishi Prawn Crackers Spicy Flavor (90g)', 'sku' => 'SNK-009', 'price' => 3600, 'wholesale_price' => 3100, 'cost_price' => 2400, 'stock_quantity' => 230, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Snacks, Biscuits & Chips']],
            ['name' => 'Oreo Chocolate Sandwich Cookies Vanilla (120g)', 'sku' => 'SNK-010', 'price' => 5500, 'wholesale_price' => 4800, 'cost_price' => 3900, 'stock_quantity' => 190, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Snacks, Biscuits & Chips']],

            // --- CONDIMENTS, SAUCES & SPICES ---
            ['name' => 'Datu Puti Soy Sauce Toyo (1 Liter PET)', 'sku' => 'CND-001', 'price' => 4800, 'wholesale_price' => 4200, 'cost_price' => 3300, 'stock_quantity' => 260, 'low_stock_threshold' => 45, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Datu Puti White Vinegar Suka (1 Liter PET)', 'sku' => 'CND-002', 'price' => 4200, 'wholesale_price' => 3700, 'cost_price' => 2900, 'stock_quantity' => 280, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Silver Swan Soy Sauce (1 Liter Bottle)', 'sku' => 'CND-003', 'price' => 4900, 'wholesale_price' => 4300, 'cost_price' => 3400, 'stock_quantity' => 240, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Silver Swan Cane Vinegar (1 Liter Bottle)', 'sku' => 'CND-004', 'price' => 4300, 'wholesale_price' => 3800, 'cost_price' => 3000, 'stock_quantity' => 230, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Mang Tomas All-Around Sarsa Sauce (330g)', 'sku' => 'CND-005', 'price' => 3800, 'wholesale_price' => 3300, 'cost_price' => 2600, 'stock_quantity' => 210, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'UFC Tamis Anghang Banana Catsup (550g Pouch)', 'sku' => 'CND-006', 'price' => 4200, 'wholesale_price' => 3700, 'cost_price' => 2900, 'stock_quantity' => 220, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Mama Sita’s Oyster Sauce Special (405g Bottle)', 'sku' => 'CND-007', 'price' => 7800, 'wholesale_price' => 6900, 'cost_price' => 5600, 'stock_quantity' => 130, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Knorr Sinigang sa Sampalok Original (44g x 6s)', 'sku' => 'CND-008', 'price' => 11500, 'wholesale_price' => 10200, 'cost_price' => 8400, 'stock_quantity' => 280, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Knorr Chicken Broth Cubes (60g Box of 6s)', 'sku' => 'CND-009', 'price' => 4200, 'wholesale_price' => 3700, 'cost_price' => 3000, 'stock_quantity' => 300, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Knorr Pork Broth Cubes (60g Box of 6s)', 'sku' => 'CND-010', 'price' => 4200, 'wholesale_price' => 3700, 'cost_price' => 3000, 'stock_quantity' => 290, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Golden Fiesta Pure Cooking Palm Oil (1 Liter Pouch)', 'sku' => 'CND-011', 'price' => 9200, 'wholesale_price' => 8300, 'cost_price' => 6800, 'stock_quantity' => 170, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Refined Pure White Sugar (1kg Pack)', 'sku' => 'CND-012', 'price' => 7800, 'wholesale_price' => 6800, 'cost_price' => 5400, 'stock_quantity' => 220, 'low_stock_threshold' => 40, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Washed Brown Cane Sugar (1kg Pack)', 'sku' => 'CND-013', 'price' => 7200, 'wholesale_price' => 6300, 'cost_price' => 4900, 'stock_quantity' => 200, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],
            ['name' => 'Iodized Fine Table Salt (1kg Pack)', 'sku' => 'CND-014', 'price' => 3200, 'wholesale_price' => 2600, 'cost_price' => 1800, 'stock_quantity' => 280, 'low_stock_threshold' => 50, 'category_id' => $categoryIds['Condiments, Sauces & Spices']],

            // --- FROZEN FOODS & PROCESSED MEATS ---
            ['name' => 'Purefoods Tender Juicy Hotdog Jumbo (1kg Pack)', 'sku' => 'FRZ-001', 'price' => 25500, 'wholesale_price' => 23500, 'cost_price' => 19500, 'stock_quantity' => 95, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Frozen Foods & Processed Meats']],
            ['name' => 'Purefoods Tender Juicy Hotdog Regular (500g Pack)', 'sku' => 'FRZ-002', 'price' => 13500, 'wholesale_price' => 12200, 'cost_price' => 10200, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Frozen Foods & Processed Meats']],
            ['name' => 'CDO Funtastyk Sweet Ham (500g Pack)', 'sku' => 'FRZ-003', 'price' => 16500, 'wholesale_price' => 14800, 'cost_price' => 12200, 'stock_quantity' => 80, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Frozen Foods & Processed Meats']],
            ['name' => 'CDO Funtastyk Young Pork Tocino (450g Pack)', 'sku' => 'FRZ-004', 'price' => 15500, 'wholesale_price' => 13900, 'cost_price' => 11500, 'stock_quantity' => 90, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Frozen Foods & Processed Meats']],
            ['name' => 'Pampanga’s Best Original Pork Tocino (450g)', 'sku' => 'FRZ-005', 'price' => 17500, 'wholesale_price' => 15800, 'cost_price' => 13200, 'stock_quantity' => 85, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Frozen Foods & Processed Meats']],
            ['name' => 'Pampanga’s Best Skinless Longganisa (500g Pack)', 'sku' => 'FRZ-006', 'price' => 16000, 'wholesale_price' => 14400, 'cost_price' => 12000, 'stock_quantity' => 75, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Frozen Foods & Processed Meats']],
            ['name' => 'Selecta Super Thick Chocolate Ice Cream (1.4L Tub)', 'sku' => 'FRZ-007', 'price' => 26500, 'wholesale_price' => 24000, 'cost_price' => 19800, 'stock_quantity' => 60, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Frozen Foods & Processed Meats']],
            ['name' => 'Selecta Super Thick Vanilla Ice Cream (1.4L Tub)', 'sku' => 'FRZ-008', 'price' => 26500, 'wholesale_price' => 24000, 'cost_price' => 19800, 'stock_quantity' => 55, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Frozen Foods & Processed Meats']],
            ['name' => 'Crispy Crinkle Cut French Fries (1kg Bag)', 'sku' => 'FRZ-009', 'price' => 17500, 'wholesale_price' => 15500, 'cost_price' => 12400, 'stock_quantity' => 70, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Frozen Foods & Processed Meats']],

            // --- FRESH MEAT, POULTRY & FISH ---
            ['name' => 'Magnolia Fresh Chicken Whole (approx 1.2kg)', 'sku' => 'MEA-001', 'price' => 24000, 'wholesale_price' => 21500, 'cost_price' => 17500, 'stock_quantity' => 65, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Fresh Meat, Poultry & Fish']],
            ['name' => 'Fresh Chicken Breast Fillet Boneless (1kg)', 'sku' => 'MEA-002', 'price' => 29500, 'wholesale_price' => 26500, 'cost_price' => 21000, 'stock_quantity' => 55, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Fresh Meat, Poultry & Fish']],
            ['name' => 'Fresh Pork Belly Liempo Cut (1kg)', 'sku' => 'MEA-003', 'price' => 37000, 'wholesale_price' => 33500, 'cost_price' => 27500, 'stock_quantity' => 70, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Fresh Meat, Poultry & Fish']],
            ['name' => 'Fresh Pork Kasim Shoulder Cubes (1kg)', 'sku' => 'MEA-004', 'price' => 32000, 'wholesale_price' => 29000, 'cost_price' => 24000, 'stock_quantity' => 60, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Fresh Meat, Poultry & Fish']],
            ['name' => 'Choice Lean Ground Beef 90/10 (1kg)', 'sku' => 'MEA-005', 'price' => 43000, 'wholesale_price' => 39000, 'cost_price' => 31500, 'stock_quantity' => 45, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Fresh Meat, Poultry & Fish']],
            ['name' => 'Fresh Bangus Milkfish Deboned & Marinated (Pack of 2)', 'sku' => 'MEA-006', 'price' => 24500, 'wholesale_price' => 21800, 'cost_price' => 17500, 'stock_quantity' => 50, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Fresh Meat, Poultry & Fish']],
            ['name' => 'Fresh White Tilapia Cleaned (1kg)', 'sku' => 'MEA-007', 'price' => 19500, 'wholesale_price' => 17000, 'cost_price' => 13500, 'stock_quantity' => 60, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Fresh Meat, Poultry & Fish']],

            // --- FRESH PRODUCE & VEGETABLES ---
            ['name' => 'Cavendish Yellow Bananas Fresh (1kg)', 'sku' => 'PRD-001', 'price' => 8500, 'wholesale_price' => 7200, 'cost_price' => 5200, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Fresh Produce & Vegetables']],
            ['name' => 'Fuji Crisp Red Apples (Pack of 4s)', 'sku' => 'PRD-002', 'price' => 12000, 'wholesale_price' => 10200, 'cost_price' => 7600, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Fresh Produce & Vegetables']],
            ['name' => 'Fresh Red Onions Sibuyas (1kg Mesh Bag)', 'sku' => 'PRD-003', 'price' => 12500, 'wholesale_price' => 10500, 'cost_price' => 8000, 'stock_quantity' => 130, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Fresh Produce & Vegetables']],
            ['name' => 'Native White Garlic Bawang (500g Mesh)', 'sku' => 'PRD-004', 'price' => 8500, 'wholesale_price' => 7000, 'cost_price' => 5000, 'stock_quantity' => 120, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Fresh Produce & Vegetables']],
            ['name' => 'Fresh Red Tomatoes Kamatis (1kg Pack)', 'sku' => 'PRD-005', 'price' => 9500, 'wholesale_price' => 7800, 'cost_price' => 5800, 'stock_quantity' => 90, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Fresh Produce & Vegetables']],
            ['name' => 'Fresh Mountain Carrots (1kg Pack)', 'sku' => 'PRD-006', 'price' => 9800, 'wholesale_price' => 8200, 'cost_price' => 6000, 'stock_quantity' => 95, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Fresh Produce & Vegetables']],
            ['name' => 'Benguet Fresh Potatoes (1kg Mesh)', 'sku' => 'PRD-007', 'price' => 11000, 'wholesale_price' => 9200, 'cost_price' => 6900, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Fresh Produce & Vegetables']],
            ['name' => 'Kalamansi Fresh Native Citrus (500g Pack)', 'sku' => 'PRD-008', 'price' => 5500, 'wholesale_price' => 4500, 'cost_price' => 3200, 'stock_quantity' => 100, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Fresh Produce & Vegetables']],

            // --- BAKERY & BREAD SPREAD ---
            ['name' => 'Gardenia Classic White Bread Sliced (600g Loaf)', 'sku' => 'BAK-001', 'price' => 8500, 'wholesale_price' => 7600, 'cost_price' => 6300, 'stock_quantity' => 90, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Bakery & Bread Spread']],
            ['name' => 'Gardenia High Fiber Whole Wheat Bread (600g)', 'sku' => 'BAK-002', 'price' => 9500, 'wholesale_price' => 8500, 'cost_price' => 7100, 'stock_quantity' => 70, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Bakery & Bread Spread']],
            ['name' => 'Monde Special Butter Coconut Mamon (Pack of 6s)', 'sku' => 'BAK-003', 'price' => 9200, 'wholesale_price' => 8100, 'cost_price' => 6600, 'stock_quantity' => 85, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Bakery & Bread Spread']],
            ['name' => 'Nutella Hazelnut Spread with Cocoa (350g Jar)', 'sku' => 'BAK-004', 'price' => 24500, 'wholesale_price' => 22000, 'cost_price' => 18500, 'stock_quantity' => 60, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Bakery & Bread Spread']],
            ['name' => 'Skippy Creamy Peanut Butter (462g Jar)', 'sku' => 'BAK-005', 'price' => 21000, 'wholesale_price' => 18800, 'cost_price' => 15600, 'stock_quantity' => 70, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Bakery & Bread Spread']],
            ['name' => 'Lady’s Choice Real Mayonnaise (470ml Jar)', 'sku' => 'BAK-006', 'price' => 16500, 'wholesale_price' => 14800, 'cost_price' => 12200, 'stock_quantity' => 95, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Bakery & Bread Spread']],
            ['name' => 'Lady’s Choice Sandwich Spread (470ml Jar)', 'sku' => 'BAK-007', 'price' => 16000, 'wholesale_price' => 14200, 'cost_price' => 11800, 'stock_quantity' => 100, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Bakery & Bread Spread']],

            // --- LAUNDRY & CLEANING SUPPLIES ---
            ['name' => 'Ariel Sunrise Fresh Powder Detergent (1.32kg)', 'sku' => 'HOU-001', 'price' => 24500, 'wholesale_price' => 22000, 'cost_price' => 18500, 'stock_quantity' => 110, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Laundry & Cleaning Supplies']],
            ['name' => 'Surf Cherry Blossom Powder Detergent (2.1kg Jumbo)', 'sku' => 'HOU-002', 'price' => 22500, 'wholesale_price' => 20000, 'cost_price' => 16800, 'stock_quantity' => 130, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Laundry & Cleaning Supplies']],
            ['name' => 'Downy Sunrise Fresh Fabric Conditioner (1.4L Refill)', 'sku' => 'HOU-003', 'price' => 23500, 'wholesale_price' => 21000, 'cost_price' => 17400, 'stock_quantity' => 120, 'low_stock_threshold' => 20, 'category_id' => $categoryIds['Laundry & Cleaning Supplies']],
            ['name' => 'Joy Expert Antibacterial Dishwashing Liquid (790ml)', 'sku' => 'HOU-004', 'price' => 14500, 'wholesale_price' => 12800, 'cost_price' => 10500, 'stock_quantity' => 160, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Laundry & Cleaning Supplies']],
            ['name' => 'Zonrox Original Bleach Disinfectant (1 Liter Bottle)', 'sku' => 'HOU-005', 'price' => 5800, 'wholesale_price' => 5000, 'cost_price' => 4000, 'stock_quantity' => 180, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Laundry & Cleaning Supplies']],
            ['name' => 'Sanicare 2-Ply Bathroom Tissue Pure Pulp (12 Rolls)', 'sku' => 'HOU-006', 'price' => 21500, 'wholesale_price' => 19000, 'cost_price' => 15500, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Laundry & Cleaning Supplies']],

            // --- PERSONAL CARE & TOILETRIES ---
            ['name' => 'Head & Shoulders Cool Menthol Anti-Dandruff (650ml Pump)', 'sku' => 'PER-001', 'price' => 39500, 'wholesale_price' => 35500, 'cost_price' => 29500, 'stock_quantity' => 75, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Personal Care & Toiletries']],
            ['name' => 'Sunsilk Smooth & Manageable Pink Shampoo (650ml Pump)', 'sku' => 'PER-002', 'price' => 36500, 'wholesale_price' => 33000, 'cost_price' => 27000, 'stock_quantity' => 80, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Personal Care & Toiletries']],
            ['name' => 'Colgate Total 12-Hour Protection Toothpaste (150g)', 'sku' => 'PER-003', 'price' => 12500, 'wholesale_price' => 11000, 'cost_price' => 8900, 'stock_quantity' => 180, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Personal Care & Toiletries']],
            ['name' => 'Close Up Ever Fresh Red Hot Gel Toothpaste (145ml)', 'sku' => 'PER-004', 'price' => 11500, 'wholesale_price' => 10000, 'cost_price' => 8200, 'stock_quantity' => 160, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Personal Care & Toiletries']],
            ['name' => 'Safeguard Pure White Antibacterial Bar Soap (130g x 3s)', 'sku' => 'PER-005', 'price' => 14500, 'wholesale_price' => 12800, 'cost_price' => 10500, 'stock_quantity' => 170, 'low_stock_threshold' => 30, 'category_id' => $categoryIds['Personal Care & Toiletries']],
            ['name' => 'Green Cross 70% Isopropyl Alcohol with Moisturizer (500ml)', 'sku' => 'PER-006', 'price' => 8500, 'wholesale_price' => 7400, 'cost_price' => 5900, 'stock_quantity' => 190, 'low_stock_threshold' => 35, 'category_id' => $categoryIds['Personal Care & Toiletries']],
            ['name' => 'Rexona Men Ice Cool Roll-On Deodorant (50ml)', 'sku' => 'PER-007', 'price' => 13500, 'wholesale_price' => 12000, 'cost_price' => 9800, 'stock_quantity' => 90, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Personal Care & Toiletries']],
            ['name' => 'Rexona Women Shower Clean Roll-On Deodorant (50ml)', 'sku' => 'PER-008', 'price' => 13500, 'wholesale_price' => 12000, 'cost_price' => 9800, 'stock_quantity' => 95, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Personal Care & Toiletries']],

            // --- BABY CARE & PET NEEDS ---
            ['name' => 'Pampers Baby Dry Diapers Tape Large (Pack of 36s)', 'sku' => 'BBY-001', 'price' => 39500, 'wholesale_price' => 35500, 'cost_price' => 29500, 'stock_quantity' => 65, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Baby Care & Pet Needs']],
            ['name' => 'Huggies Dry Pants Diapers Extra Large (Pack of 32s)', 'sku' => 'BBY-002', 'price' => 38000, 'wholesale_price' => 34000, 'cost_price' => 28000, 'stock_quantity' => 70, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Baby Care & Pet Needs']],
            ['name' => 'Johnson’s Baby Powder Blossom (300g Bottle)', 'sku' => 'BBY-003', 'price' => 15500, 'wholesale_price' => 13800, 'cost_price' => 11200, 'stock_quantity' => 90, 'low_stock_threshold' => 18, 'category_id' => $categoryIds['Baby Care & Pet Needs']],
            ['name' => 'Johnson’s Baby Bath Milk + Rice Gentle Wash (500ml)', 'sku' => 'BBY-004', 'price' => 26500, 'wholesale_price' => 23500, 'cost_price' => 19200, 'stock_quantity' => 60, 'low_stock_threshold' => 12, 'category_id' => $categoryIds['Baby Care & Pet Needs']],
            ['name' => 'Unilove Fragrance-Free Gentle Baby Wipes (80 Sheets x 3s)', 'sku' => 'BBY-005', 'price' => 17500, 'wholesale_price' => 15200, 'cost_price' => 12200, 'stock_quantity' => 140, 'low_stock_threshold' => 25, 'category_id' => $categoryIds['Baby Care & Pet Needs']],
            ['name' => 'Pedigree Adult Dry Dog Food Beef & Veg (3kg Bag)', 'sku' => 'PET-001', 'price' => 41500, 'wholesale_price' => 37000, 'cost_price' => 30500, 'stock_quantity' => 45, 'low_stock_threshold' => 10, 'category_id' => $categoryIds['Baby Care & Pet Needs']],
            ['name' => 'Whiskas Adult Ocean Fish Wet Cat Food (85g Pouch x 6s)', 'sku' => 'PET-002', 'price' => 22500, 'wholesale_price' => 19800, 'cost_price' => 15800, 'stock_quantity' => 80, 'low_stock_threshold' => 15, 'category_id' => $categoryIds['Baby Care & Pet Needs']],
        ];

        foreach ($products as $productData) {
            Product::create(array_merge($productData, ['store_id' => $store->id]));
        }
        $this->command->info('✅ Filipino Grocery Products Created: ' . count($products) . ' SKUs in supermarket inventory');

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
                $transactionCount = rand(12, 20); // Supermarket basket volume

                for ($t = 0; $t < $transactionCount; $t++) {
                    $txOffsetMinutes = rand(10, 460);
                    $transactionTime = $startDateTime->copy()->addMinutes($txOffsetMinutes);

                    // Skip transactions past current time
                    if ($transactionTime->gt(now())) {
                        continue;
                    }

                    $paymentChannels = ['cash', 'cash', 'cash', 'gcash', 'maya', 'debit_card', 'credit_card'];
                    $paymentMethod = $paymentChannels[array_rand($paymentChannels)];
                    $isWholesale = (rand(1, 8) === 1); // Sari-sari bulk buyer

                    $sale = Sale::create([
                        'store_id' => $store->id,
                        'invoice_number' => 'INV-' . strtoupper(uniqid()),
                        'cashier_id' => $activeCashier->id,
                        'terminal_id' => $terminal->id,
                        'total_amount' => 0,
                        'discount_amount' => rand(1, 8) === 1 ? rand(2000, 15000) : 0,
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
                    $itemCount = rand(2, 6); // 2 to 6 grocery items

                    for ($j = 0; $j < $itemCount; $j++) {
                        $product = $productsForSales->random();
                        $quantity = rand(1, 5);

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
        $this->command->info('🎉 FILIPINO GROCERY & SUPERMARKET SEEDING COMPLETED!');
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
        $this->command->info('  Products:      ' . $productsForSales->count() . ' Filipino Grocery SKUs');
        $this->command->info('  Total Shifts:  ' . $totalShiftsSeeded);
        $this->command->info('  Total Sales:   ' . $totalSalesSeeded);
        $this->command->info('═══════════════════════════════════════════════════════════════');
    }
}
