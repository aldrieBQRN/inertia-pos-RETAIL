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

        $terminal = \App\Models\Terminal::firstOrCreate(
            ['store_id' => $store->id, 'code' => 'REG-01'],
            ['name' => 'Main Counter (Register 1)', 'is_active' => true]
        );

        // Generate shifts for the last 5 days
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);

            // Create a morning shift for the Cashier
            $this->createShift($store->id, $cashier->id, $terminal->id, $date->copy()->setTime(8, 0), $date->copy()->setTime(16, 0));

            // Create an evening shift for the Admin
            $this->createShift($store->id, $admin->id, $terminal->id, $date->copy()->setTime(16, 0), $date->copy()->setTime(23, 0));
        }
    }

    private function createShift($storeId, $userId, $terminalId, $start, $end)
    {
        $startingCash = 1000.00;
        $cashSales = rand(5000, 15000);
        $expectedCash = $startingCash + $cashSales;

        $actualCash = $expectedCash + (rand(-50, 50));
        $difference = $actualCash - $expectedCash;

        Shift::create([
            'store_id' => $storeId,
            'user_id' => $userId,
            'terminal_id' => $terminalId,
            'start_time' => $start,
            'end_time' => $end,
            'starting_cash' => $startingCash,
            'expected_opening_cash' => $startingCash,
            'opening_discrepancy' => 0,
            'cash_sales' => $cashSales,
            'cash_in' => 0,
            'cash_out' => 0,
            'expected_cash' => $expectedCash,
            'actual_cash' => $actualCash,
            'difference' => $difference,
            'status' => 'closed',
            'opening_notes' => 'Shift verified & drawer opened',
            'closing_notes' => 'End of shift drawer count matched',
        ]);
    }
}
