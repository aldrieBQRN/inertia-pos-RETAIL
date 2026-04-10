<?php

namespace Database\Seeders;

use App\Models\Shift;
use App\Models\User;
use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ShiftSeeder extends Seeder
{
    public function run(): void
    {
        $store = Store::first();
        if (!$store) return;

        // Fetch users belonging to this specific store
        $admin = User::where('store_id', $store->id)->where('role', 'admin')->first();
        $cashier = User::where('store_id', $store->id)->where('role', 'cashier')->first();

        if (!$admin || !$cashier) return;

        // Generate shifts for the last 5 days
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);

            // Create a morning shift for the Cashier
            $this->createShift($store->id, $cashier->id, $date->copy()->setTime(8, 0), $date->copy()->setTime(16, 0));

            // Create an evening shift for the Admin
            $this->createShift($store->id, $admin->id, $date->copy()->setTime(16, 0), $date->copy()->setTime(23, 0));
        }
    }

    private function createShift($storeId, $userId, $start, $end)
    {
        $startingCash = 1000.00;
        $cashSales = rand(5000, 15000);
        $expectedCash = $startingCash + $cashSales;

        $actualCash = $expectedCash + (rand(-50, 50));
        $difference = $actualCash - $expectedCash;

        Shift::create([
            'store_id' => $storeId, // Injected for multi-tenancy
            'user_id' => $userId,
            'start_time' => $start,
            'end_time' => $end,
            'starting_cash' => $startingCash,
            'cash_sales' => $cashSales,
            'expected_cash' => $expectedCash,
            'actual_cash' => $actualCash,
            'difference' => $difference,
            'status' => 'closed',
        ]);
    }
}
