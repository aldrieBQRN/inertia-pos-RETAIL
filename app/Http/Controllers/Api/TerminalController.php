<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Terminal;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TerminalController extends Controller
{
    /**
     * List all registers/terminals for the authenticated store.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $terminals = Terminal::where('store_id', $user->store_id)
            ->with(['activeShift.user'])
            ->orderBy('name', 'asc')
            ->get();

        // If no terminals exist yet, automatically generate a default "Register 1"
        if ($terminals->isEmpty()) {
            $default = Terminal::create([
                'store_id'  => $user->store_id,
                'name'      => 'Register 1',
                'code'      => 'REG-01',
                'is_active' => true,
                'notes'     => 'Main checkout counter'
            ]);
            $terminals = Terminal::where('store_id', $user->store_id)
                ->with(['activeShift.user'])
                ->get();
        }

        foreach ($terminals as $term) {
            if ($term->activeShift) {
                $shift = $term->activeShift;
                $sales = \App\Models\Sale::where('cashier_id', $shift->user_id)
                    ->where('status', 'completed')
                    ->where('created_at', '>=', $shift->start_time)
                    ->get();
                $cashSales = (float) $sales->where('payment_method', 'cash')->sum('total_amount') / 100;
                $cashIn = (float) \App\Models\CashMovement::where('shift_id', $shift->id)->whereIn('type', ['cash_in', 'float_topup'])->sum('amount');
                $cashOut = (float) \App\Models\CashMovement::where('shift_id', $shift->id)->whereIn('type', ['cash_out', 'owner_draw', 'safe_drop', 'expense'])->sum('amount');
                $term->current_drawer_cash = max(0, (float) $shift->starting_cash + $cashSales + $cashIn - $cashOut - (float) ($shift->expenses ?? 0));
            } else {
                $lastShift = Shift::where('store_id', $user->store_id)
                    ->where('status', 'closed')
                    ->where('terminal_id', $term->id)
                    ->latest('end_time')
                    ->first();
                $lastClosingCash = $lastShift ? (float) $lastShift->actual_cash : 0.00;
                $lastClosedTime = $lastShift && $lastShift->end_time ? $lastShift->end_time : \Carbon\Carbon::parse('2000-01-01 00:00:00');

                $movements = \App\Models\CashMovement::where('store_id', $user->store_id)
                    ->where('terminal_id', $term->id)
                    ->where('created_at', '>=', $lastClosedTime)
                    ->get();
                $in = (float) $movements->whereIn('type', ['cash_in', 'float_topup'])->sum('amount');
                $out = (float) $movements->whereIn('type', ['cash_out', 'owner_draw', 'safe_drop', 'expense'])->sum('amount');
                $term->current_drawer_cash = max(0, $lastClosingCash + $in - $out);
            }
        }

        return response()->json($terminals);
    }

    /**
     * Create a new POS register/terminal.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'  => 'required|string|max:100',
            'code'  => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:255',
        ]);

        $user = Auth::user();

        $terminal = Terminal::create([
            'store_id'  => $user->store_id,
            'name'      => $request->name,
            'code'      => $request->code ?: ('REG-0' . (Terminal::where('store_id', $user->store_id)->count() + 1)),
            'is_active' => true,
            'notes'     => $request->notes,
        ]);

        return response()->json([
            'message'  => 'Register created successfully.',
            'terminal' => $terminal
        ], 201);
    }

    /**
     * Update an existing terminal.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'name'      => 'required|string|max:100',
            'code'      => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'notes'     => 'nullable|string|max:255',
        ]);

        $user = Auth::user();
        $terminal = Terminal::where('store_id', $user->store_id)->findOrFail($id);

        $terminal->update([
            'name'      => $request->name,
            'code'      => $request->code ?: $terminal->code,
            'is_active' => $request->has('is_active') ? $request->is_active : $terminal->is_active,
            'notes'     => $request->notes,
        ]);

        return response()->json([
            'message'  => 'Register updated successfully.',
            'terminal' => $terminal
        ]);
    }

    /**
     * Delete or deactivate a terminal.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $terminal = Terminal::where('store_id', $user->store_id)->findOrFail($id);

        $activeShift = Shift::where('terminal_id', $terminal->id)
            ->where('status', 'open')
            ->first();

        if ($activeShift) {
            return response()->json([
                'message' => 'Cannot delete a register with an active work shift. Please close the shift first.'
            ], 422);
        }

        $terminal->delete();

        return response()->json([
            'message' => 'Register deleted successfully.'
        ]);
    }
}
