<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\Sale;
use App\Models\User;
use App\Mail\EndOfShiftMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Manages cashier shift lifecycles, including continuous operations
 * and Z-Read reporting data.
 */
class ShiftController extends Controller
{
    public function index(Request $request)
    {
        $query = Shift::with('user')->orderBy('created_at', 'desc');

        if ($request->filled('start_date')) {
            $query->whereDate('start_time', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('start_time', '<=', $request->end_date);
        }
        if ($request->filled('search')) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%");
            });
        }

        // FIXED: Return un-paginated results for the frontend Hybrid Engine and PDF export
        if ($request->has('all')) {
            return $query->get();
        }

        return $query->paginate(10);
    }

    /**
     * Retrieve aggregated report data for a specific shift.
     * Accurately calculates all digital payment methods for historical Z-Reads
     * so the "View Details" action modal displays them perfectly.
     */
    public function data($id)
    {
        $shift = Shift::with('user')->findOrFail($id);

        // Fetch all sales belonging to this specific shift timeframe
        $sales = Sale::where('cashier_id', $shift->user_id)
            ->where('status', 'completed')
            ->whereBetween('created_at', [$shift->start_time, $shift->end_time ?? now()])
            ->get();

        return response()->json([
            'staff_name'        => $shift->user->name,
            'start_time'        => $shift->start_time,
            'end_time'          => $shift->end_time ?? now(),
            'start'             => $shift->start_time->format('m/d/Y h:i A'),
            'end'               => $shift->end_time ? $shift->end_time->format('m/d/Y h:i A') : 'ACTIVE',
            'printed_at'        => now()->format('m/d/Y h:i A'),
            'starting_cash'     => $shift->starting_cash,
            // Calculate the exact breakdown for the Action View Modal
            'cash_sales'        => $sales->where('payment_method', 'cash')->sum('total_amount') / 100,
            'gcash_sales'       => $sales->where('payment_method', 'gcash')->sum('total_amount') / 100,
            'maya_sales'        => $sales->where('payment_method', 'maya')->sum('total_amount') / 100,
            'credit_card_sales' => $sales->where('payment_method', 'credit_card')->sum('total_amount') / 100,
            'debit_card_sales'  => $sales->where('payment_method', 'debit_card')->sum('total_amount') / 100,
            'expenses'          => $shift->expenses ?? 0,
            'ending_cash'       => $shift->actual_cash ?? 0,
            'actual_cash'       => $shift->actual_cash ?? 0,
            'expected_cash'     => $shift->expected_cash ?? 0,
            'difference'        => $shift->difference ?? 0,
        ]);
    }

    public function check(Request $request)
    {
        return response()->json([
            'id' => 999999,
            'user_id' => Auth::id(),
            'status' => 'open',
            'user' => Auth::user()
        ]);
    }

    public function start(Request $request)
    {
        return response()->json(['message' => 'Shifts are now continuous. No manual start required.']);
    }

    public function close(Request $request)
    {
        $request->validate([
            'actual_cash' => 'required|numeric|min:0',
            'expenses'    => 'nullable|numeric|min:0'
        ]);

        return DB::transaction(function () use ($request) {
            $lastShift = Shift::where('status', 'closed')->latest('end_time')->first();
            $startTime = $lastShift ? $lastShift->end_time : '2000-01-01 00:00:00';
            $startingCash = $lastShift ? $lastShift->actual_cash : 0;

            // 1. Calculate Cash Sales (For Drawer Math)
            $cashSales = Sale::where('payment_method', 'cash')
                ->where('status', 'completed')
                ->where('created_at', '>=', $startTime)
                ->sum('total_amount') / 100;

            // 2. Calculate Digital/Card Sales (For Gross Sales Breakdown)
            $gcashSales = Sale::where('payment_method', 'gcash')->where('status', 'completed')->where('created_at', '>=', $startTime)->sum('total_amount') / 100;
            $mayaSales = Sale::where('payment_method', 'maya')->where('status', 'completed')->where('created_at', '>=', $startTime)->sum('total_amount') / 100;
            $creditCardSales = Sale::where('payment_method', 'credit_card')->where('status', 'completed')->where('created_at', '>=', $startTime)->sum('total_amount') / 100;
            $debitCardSales = Sale::where('payment_method', 'debit_card')->where('status', 'completed')->where('created_at', '>=', $startTime)->sum('total_amount') / 100;

            $expenses = $request->expenses ?? 0;
            $actualCash = $request->actual_cash;
            $expectedCash = $startingCash + $cashSales - $expenses;
            $difference = $actualCash - $expectedCash;

            $shift = Shift::create([
                'user_id'       => Auth::id(),
                'start_time'    => $startTime,
                'end_time'      => now(),
                'starting_cash' => $startingCash,
                'cash_sales'    => $cashSales,
                'expenses'      => $expenses,
                'expected_cash' => $expectedCash,
                'actual_cash'   => $actualCash,
                'difference'    => $difference,
                'status'        => 'closed'
            ]);

            // Append all digital sales to the response object dynamically
            $shift->gcash_sales = $gcashSales;
            $shift->maya_sales = $mayaSales;
            $shift->credit_card_sales = $creditCardSales;
            $shift->debit_card_sales = $debitCardSales;
            $shift->load('user');

            $admins = User::where('store_id', Auth::user()->store_id)->where('role', 'admin')->get();
            foreach ($admins as $admin) {
                Mail::to($admin->email)->send(new EndOfShiftMail($shift));
            }

            return response()->json($shift);
        });
    }
}
