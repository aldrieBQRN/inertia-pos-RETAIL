<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\CashMovement;
use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Shift;
use App\Models\Store;
use App\Models\Terminal;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BranchSeeder extends Seeder
{
    /**
     * Run the database seeds for multi-branch demonstration.
     */
    public function run(): void
    {
        $this->command->info('🏢 Seeding Multi-Branch and Store Locations...');

        $plan = Plan::first() ?? Plan::create([
            'name'            => 'Monthly Starter',
            'duration_months' => 1,
            'price'           => 499.00,
            'is_active'       => true,
        ]);

        // 1. Ensure Tenant Owner (Admin) exists
        $admin = User::firstOrCreate(
            ['email' => 'admin@email.com'],
            [
                'name'              => 'Store Manager (Admin)',
                'password'          => Hash::make('password'),
                'role'              => 'admin',
                'is_admin'          => true,
                'account_number'    => 'ADM-001',
                'phone_number'      => '+63 917 234 5678',
                'address'           => '123 Main Street',
                'city'              => 'Manila',
                'province'          => 'NCR',
                'country'           => 'Philippines',
                'email_verified_at' => now(),
                'is_active'         => true,
            ]
        );

        // 2. Branch 1: Primary BGC Main (Use existing Store 1 or create)
        $branch1 = Store::find(1);
        if ($branch1) {
            $branch1->update([
                'name'                 => 'Metro Retail Hub (BGC Main)',
                'owner_id'             => $admin->id,
                'address'              => '456 Commercial Avenue, BGC, Taguig City, Philippines',
                'phone'                => '+63 2 8765 4321',
                'status'               => true,
                'plan_id'              => $plan->id,
                'subscription_ends_at' => Carbon::now()->addMonths(6),
            ]);
        } else {
            $branch1 = Store::create([
                'name'                 => 'Metro Retail Hub (BGC Main)',
                'owner_id'             => $admin->id,
                'address'              => '456 Commercial Avenue, BGC, Taguig City, Philippines',
                'phone'                => '+63 2 8765 4321',
                'status'               => true,
                'plan_id'              => $plan->id,
                'subscription_ends_at' => Carbon::now()->addMonths(6),
            ]);
        }

        // Clean up duplicate empty store 2 if present
        $emptyStore2 = Store::where('id', 2)->where('name', 'Metro Retail Hub (BGC Main)')->first();
        if ($emptyStore2 && $emptyStore2->id !== $branch1->id && Product::where('store_id', 2)->count() === 0) {
            $emptyStore2->delete();
        }

        $admin->update(['store_id' => $branch1->id]);

        // 3. Branch 2: Makati Ayala
        $branch2 = Store::updateOrCreate(
            ['name' => 'Metro Retail Hub (Makati Ayala)'],
            [
                'owner_id'             => $admin->id,
                'address'              => 'Unit 102, Ayala Triangle Gardens, Makati City, Philippines',
                'phone'                => '+63 2 8123 4567',
                'status'               => true,
                'plan_id'              => $plan->id,
                'subscription_ends_at' => Carbon::now()->addMonths(6),
            ]
        );

        // 4. Branch 3: Cebu IT Park
        $branch3 = Store::updateOrCreate(
            ['name' => 'Metro Retail Hub (Cebu IT Park)'],
            [
                'owner_id'             => $admin->id,
                'address'              => 'Tower 2, Cebu IT Park, Lahug, Cebu City, Philippines',
                'phone'                => '+63 32 234 5678',
                'status'               => true,
                'plan_id'              => $plan->id,
                'subscription_ends_at' => Carbon::now()->addMonths(6),
            ]
        );

        // 5. Link Admin to all 3 branches in pivot table
        $branches = [$branch1, $branch2, $branch3];
        foreach ($branches as $index => $b) {
            DB::table('store_user')->updateOrInsert(
                ['user_id' => $admin->id, 'store_id' => $b->id],
                [
                    'role'       => 'admin',
                    'is_primary' => $index === 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // -------------------------------------------------------------
        // 6. BRANCH 2 (MAKATI AYALA): Staff, Terminals, Products, Sales, Shifts
        // -------------------------------------------------------------
        $adminMakati = User::updateOrCreate(
            ['email' => 'admin.makati@email.com'],
            [
                'name'              => 'Marco Valenzuela (Makati Admin)',
                'password'          => Hash::make('password'),
                'role'              => 'admin',
                'is_admin'          => true,
                'store_id'          => $branch2->id,
                'account_number'    => 'ADM-MKT-01',
                'phone_number'      => '+63 917 111 2233',
                'address'           => 'Ayala Ave, Makati',
                'city'              => 'Makati',
                'province'          => 'NCR',
                'country'           => 'Philippines',
                'email_verified_at' => now(),
                'is_active'         => true,
            ]
        );

        DB::table('store_user')->updateOrInsert(
            ['user_id' => $adminMakati->id, 'store_id' => $branch2->id],
            ['role' => 'admin', 'is_primary' => true, 'created_at' => now(), 'updated_at' => now()]
        );

        $cashierMakati = User::updateOrCreate(
            ['email' => 'cashier.makati@email.com'],
            [
                'name'              => 'Sofia Ramirez (Makati)',
                'password'          => Hash::make('password'),
                'role'              => 'cashier',
                'is_admin'          => false,
                'store_id'          => $branch2->id,
                'account_number'    => 'CSR-MKT-01',
                'phone_number'      => '+63 917 888 1234',
                'address'           => 'Ayala Ave, Makati',
                'city'              => 'Makati',
                'province'          => 'NCR',
                'country'           => 'Philippines',
                'email_verified_at' => now(),
                'is_active'         => true,
            ]
        );

        DB::table('store_user')->updateOrInsert(
            ['user_id' => $cashierMakati->id, 'store_id' => $branch2->id],
            ['role' => 'cashier', 'is_primary' => true, 'created_at' => now(), 'updated_at' => now()]
        );

        $mktTerm1 = Terminal::firstOrCreate(
            ['store_id' => $branch2->id, 'code' => 'MKT-01'],
            ['name' => 'Makati Counter 1', 'is_active' => true, 'notes' => 'Makati flagship register']
        );
        $mktTerm2 = Terminal::firstOrCreate(
            ['store_id' => $branch2->id, 'code' => 'MKT-02'],
            ['name' => 'Makati Express Lane', 'is_active' => true, 'notes' => 'Quick pay register']
        );

        $makatiCategories = [
            ['name' => 'Specialty Coffee', 'color' => '#8B5CF6'],
            ['name' => 'Gourmet Pastries', 'color' => '#F59E0B'],
            ['name' => 'Artisan Sandwiches', 'color' => '#10B981'],
            ['name' => 'Cold Beverages', 'color' => '#06B6D4'],
        ];

        $makatiCatModels = [];
        foreach ($makatiCategories as $cat) {
            $makatiCatModels[$cat['name']] = Category::firstOrCreate(
                ['store_id' => $branch2->id, 'name' => $cat['name']],
                ['color' => $cat['color']]
            );
        }

        $makatiProductsData = [
            ['name' => 'Caramel Macchiato (Large)', 'sku' => 'MKT-COF-001', 'price' => 19500, 'cost_price' => 7500, 'stock' => 85, 'cat' => 'Specialty Coffee'],
            ['name' => 'Spanish Latte (Iced)', 'sku' => 'MKT-COF-002', 'price' => 18000, 'cost_price' => 6500, 'stock' => 120, 'cat' => 'Specialty Coffee'],
            ['name' => 'Butter Croissant', 'sku' => 'MKT-PAS-001', 'price' => 12000, 'cost_price' => 4500, 'stock' => 45, 'cat' => 'Gourmet Pastries'],
            ['name' => 'Pain Au Chocolat', 'sku' => 'MKT-PAS-002', 'price' => 14000, 'cost_price' => 5500, 'stock' => 30, 'cat' => 'Gourmet Pastries'],
            ['name' => 'Roast Beef Panini', 'sku' => 'MKT-SAN-001', 'price' => 26000, 'cost_price' => 11000, 'stock' => 25, 'cat' => 'Artisan Sandwiches'],
            ['name' => 'Smoked Salmon Bagel', 'sku' => 'MKT-SAN-002', 'price' => 29000, 'cost_price' => 13000, 'stock' => 18, 'cat' => 'Artisan Sandwiches'],
            ['name' => 'Matcha Berry Cooler', 'sku' => 'MKT-BEV-001', 'price' => 17500, 'cost_price' => 6000, 'stock' => 60, 'cat' => 'Cold Beverages'],
        ];

        $makatiProductModels = [];
        foreach ($makatiProductsData as $prod) {
            $makatiProductModels[] = Product::firstOrCreate(
                ['store_id' => $branch2->id, 'sku' => $prod['sku']],
                [
                    'name'                => $prod['name'],
                    'category_id'         => $makatiCatModels[$prod['cat']]->id,
                    'price'               => $prod['price'],
                    'cost_price'          => $prod['cost_price'],
                    'wholesale_price'     => $prod['price'],
                    'stock_quantity'      => $prod['stock'],
                    'low_stock_threshold' => 10,
                    'is_active'           => true,
                ]
            );
        }

        // Seed Historical Shifts & Sales for Makati (Past 5 days + Today's Open Shift)
        $this->seedBranchTransactionsAndShifts(
            $branch2,
            $cashierMakati,
            $mktTerm1,
            collect($makatiProductModels),
            'MKT'
        );

        // -------------------------------------------------------------
        // 7. BRANCH 3 (CEBU IT PARK): Staff, Terminals, Products, Sales, Shifts
        // -------------------------------------------------------------
        $adminCebu = User::updateOrCreate(
            ['email' => 'admin.cebu@email.com'],
            [
                'name'              => 'Gabriel Montes (Cebu Admin)',
                'password'          => Hash::make('password'),
                'role'              => 'admin',
                'is_admin'          => true,
                'store_id'          => $branch3->id,
                'account_number'    => 'ADM-CEB-01',
                'phone_number'      => '+63 932 111 4321',
                'address'           => 'Salinas Drive, Lahug',
                'city'              => 'Cebu City',
                'province'          => 'Cebu',
                'country'           => 'Philippines',
                'email_verified_at' => now(),
                'is_active'         => true,
            ]
        );

        DB::table('store_user')->updateOrInsert(
            ['user_id' => $adminCebu->id, 'store_id' => $branch3->id],
            ['role' => 'admin', 'is_primary' => true, 'created_at' => now(), 'updated_at' => now()]
        );

        $cashierCebu = User::updateOrCreate(
            ['email' => 'cashier.cebu@email.com'],
            [
                'name'              => 'Leo Fernandez (Cebu)',
                'password'          => Hash::make('password'),
                'role'              => 'cashier',
                'is_admin'          => false,
                'store_id'          => $branch3->id,
                'account_number'    => 'CSR-CEB-01',
                'phone_number'      => '+63 932 999 5678',
                'address'           => 'Salinas Drive, Lahug',
                'city'              => 'Cebu City',
                'province'          => 'Cebu',
                'country'           => 'Philippines',
                'email_verified_at' => now(),
                'is_active'         => true,
            ]
        );

        DB::table('store_user')->updateOrInsert(
            ['user_id' => $cashierCebu->id, 'store_id' => $branch3->id],
            ['role' => 'cashier', 'is_primary' => true, 'created_at' => now(), 'updated_at' => now()]
        );

        $cebuTerm1 = Terminal::firstOrCreate(
            ['store_id' => $branch3->id, 'code' => 'CEB-01'],
            ['name' => 'Cebu Counter 1', 'is_active' => true, 'notes' => 'IT Park main lane']
        );

        $cebuCategories = [
            ['name' => 'Local Delicacies', 'color' => '#F97316'],
            ['name' => 'Fresh Smoothies', 'color' => '#EC4899'],
            ['name' => 'Rice Meals', 'color' => '#EAB308'],
        ];

        $cebuCatModels = [];
        foreach ($cebuCategories as $cat) {
            $cebuCatModels[$cat['name']] = Category::firstOrCreate(
                ['store_id' => $branch3->id, 'name' => $cat['name']],
                ['color' => $cat['color']]
            );
        }

        $cebuProductsData = [
            ['name' => 'Cebu Lechon Belly Meal', 'sku' => 'CEB-RCE-001', 'price' => 22000, 'cost_price' => 9500, 'stock' => 50, 'cat' => 'Rice Meals'],
            ['name' => 'Chorizo de Cebu Rice Bowl', 'sku' => 'CEB-RCE-002', 'price' => 16500, 'cost_price' => 6500, 'stock' => 70, 'cat' => 'Rice Meals'],
            ['name' => 'Dried Mango Tart Pack', 'sku' => 'CEB-LOC-001', 'price' => 15000, 'cost_price' => 6000, 'stock' => 90, 'cat' => 'Local Delicacies'],
            ['name' => 'Mango Graham Shake (16oz)', 'sku' => 'CEB-SMO-001', 'price' => 13500, 'cost_price' => 4500, 'stock' => 110, 'cat' => 'Fresh Smoothies'],
        ];

        $cebuProductModels = [];
        foreach ($cebuProductsData as $prod) {
            $cebuProductModels[] = Product::firstOrCreate(
                ['store_id' => $branch3->id, 'sku' => $prod['sku']],
                [
                    'name'                => $prod['name'],
                    'category_id'         => $cebuCatModels[$prod['cat']]->id,
                    'price'               => $prod['price'],
                    'cost_price'          => $prod['cost_price'],
                    'wholesale_price'     => $prod['price'],
                    'stock_quantity'      => $prod['stock'],
                    'low_stock_threshold' => 10,
                    'is_active'           => true,
                ]
            );
        }

        // Seed Historical Shifts & Sales for Cebu (Past 5 days + Today's Open Shift)
        $this->seedBranchTransactionsAndShifts(
            $branch3,
            $cashierCebu,
            $cebuTerm1,
            collect($cebuProductModels),
            'CEB'
        );

        $this->command->info('✅ Multi-Branch Seeding Complete! 3 Distinct Branches Configured with Full Transaction Records.');
    }

    /**
     * Helper to seed realistic shifts, cash movements, and sales for a specific branch.
     */
    private function seedBranchTransactionsAndShifts(Store $store, User $cashier, Terminal $terminal, $products, string $codePrefix)
    {
        if ($products->isEmpty()) return;

        // Clean previous transactions for this branch if re-running
        SaleItem::where('store_id', $store->id)->delete();
        Sale::where('store_id', $store->id)->delete();
        CashMovement::where('store_id', $store->id)->delete();
        Shift::where('store_id', $store->id)->delete();

        // Create 4 past closed shifts + 1 active open shift today
        for ($daysAgo = 4; $daysAgo >= 0; $daysAgo--) {
            $isOpenToday = ($daysAgo === 0);
            $shiftStart = Carbon::today()->subDays($daysAgo)->setHour(8)->setMinute(0);
            $shiftEnd = $isOpenToday ? null : $shiftStart->copy()->addHours(8);

            $startingCash = 3000.00;

            $shift = Shift::create([
                'store_id'              => $store->id,
                'user_id'               => $cashier->id,
                'terminal_id'           => $terminal->id,
                'start_time'            => $shiftStart,
                'end_time'              => $shiftEnd,
                'expected_opening_cash' => $startingCash,
                'starting_cash'         => $startingCash,
                'opening_discrepancy'   => 0,
                'opening_notes'         => 'Standard morning shift float count',
                'cash_sales'            => 0,
                'cash_in'               => 500.00,
                'cash_out'              => 250.00,
                'expenses'              => 250.00,
                'expected_cash'         => $startingCash,
                'actual_cash'           => $isOpenToday ? 0 : ($startingCash + 500 - 250),
                'difference'            => 0,
                'closing_notes'         => $isOpenToday ? null : 'All cash reconciled smoothly with zero discrepancies.',
                'status'                => $isOpenToday ? 'open' : 'closed',
                'created_at'            => $shiftStart,
                'updated_at'            => $isOpenToday ? now() : $shiftEnd,
            ]);

            // Cash In (Float Top-up)
            CashMovement::create([
                'store_id'    => $store->id,
                'user_id'     => $cashier->id,
                'shift_id'    => $shift->id,
                'terminal_id' => $terminal->id,
                'type'        => 'float_topup',
                'amount'      => 500.00,
                'reason'      => 'Additional small bill change from safe',
                'created_at'  => $shiftStart->copy()->addHour(1),
                'updated_at'  => $shiftStart->copy()->addHour(1),
            ]);

            // Cash Out (Store Expense)
            CashMovement::create([
                'store_id'    => $store->id,
                'user_id'     => $cashier->id,
                'shift_id'    => $shift->id,
                'terminal_id' => $terminal->id,
                'type'        => 'expense',
                'amount'      => 250.00,
                'reason'      => 'Store cleaning supplies reimbursement',
                'created_at'  => $shiftStart->copy()->addHours(3),
                'updated_at'  => $shiftStart->copy()->addHours(3),
            ]);

            // Generate 8-15 sales for this shift
            $numSales = rand(8, 14);
            $totalCashSales = 0;

            for ($s = 1; $s <= $numSales; $s++) {
                $saleTime = $shiftStart->copy()->addMinutes(rand(30, 420));
                if ($saleTime->gt(now())) continue;

                $paymentMethods = ['cash', 'cash', 'gcash', 'maya', 'credit_card'];
                $method = $paymentMethods[array_rand($paymentMethods)];
                $invNo = 'INV-' . $codePrefix . '-' . $saleTime->format('Ymd') . '-' . strtoupper(Str::random(6));

                $sale = Sale::create([
                    'store_id'          => $store->id,
                    'invoice_number'    => $invNo,
                    'cashier_id'        => $cashier->id,
                    'terminal_id'       => $terminal->id,
                    'total_amount'      => 0,
                    'discount_amount'   => rand(1, 8) === 1 ? 2000 : 0, // ₱20 discount
                    'payment_method'    => $method,
                    'payment_reference' => $method !== 'cash' ? 'REF-' . rand(1000000, 9999999) : null,
                    'is_senior'         => rand(1, 12) === 1,
                    'cash_given'        => 0,
                    'change'            => 0,
                    'status'            => 'completed',
                    'transaction_date'  => $saleTime,
                    'created_at'        => $saleTime,
                    'updated_at'        => $saleTime,
                ]);

                $totalAmount = 0;
                $numItems = rand(1, 3);

                for ($itemIdx = 0; $itemIdx < $numItems; $itemIdx++) {
                    $prod = $products->random();
                    $qty = rand(1, 2);
                    $lineSubtotal = $prod->price * $qty;

                    SaleItem::create([
                        'store_id'   => $store->id,
                        'sale_id'    => $sale->id,
                        'product_id' => $prod->id,
                        'quantity'   => $qty,
                        'unit_price' => $prod->price,
                        'subtotal'   => $lineSubtotal,
                        'created_at' => $saleTime,
                        'updated_at' => $saleTime,
                    ]);

                    $totalAmount += $lineSubtotal;
                }

                $finalAmount = max(0, $totalAmount - $sale->discount_amount);
                if ($sale->is_senior) {
                    $finalAmount = (int) ($finalAmount * 0.80);
                }

                $cashGiven = $method === 'cash' ? (ceil($finalAmount / 5000) * 5000) : 0;
                if ($cashGiven < $finalAmount && $method === 'cash') $cashGiven = $finalAmount;
                $change = $method === 'cash' ? ($cashGiven - $finalAmount) : 0;

                $sale->update([
                    'total_amount' => $finalAmount,
                    'cash_given'   => $cashGiven,
                    'change'       => $change,
                ]);

                if ($method === 'cash') {
                    $totalCashSales += ($finalAmount / 100);
                }
            }

            // Update shift expected cash
            $expectedCash = $startingCash + $totalCashSales + 500 - 250;
            $shift->update([
                'cash_sales'    => $totalCashSales,
                'expected_cash' => $expectedCash,
                'actual_cash'   => $isOpenToday ? $expectedCash : ($expectedCash + rand(-10, 10)),
            ]);

            // Seed Activity Log
            ActivityLog::create([
                'store_id'     => $store->id,
                'user_id'      => $cashier->id,
                'action'       => $isOpenToday ? 'shift.open' : 'shift.close',
                'model_type'   => 'Shift',
                'model_id'     => $shift->id,
                'description'  => $isOpenToday ? "Shift #{$shift->id} opened on {$terminal->name}" : "Shift #{$shift->id} closed with ₱" . number_format($shift->actual_cash, 2),
                'ip_address'   => '127.0.0.1',
                'user_agent'   => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'created_at'   => $isOpenToday ? $shiftStart : $shiftEnd,
                'updated_at'   => $isOpenToday ? $shiftStart : $shiftEnd,
            ]);
        }
    }
}
