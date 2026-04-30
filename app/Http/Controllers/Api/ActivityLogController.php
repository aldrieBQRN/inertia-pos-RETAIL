<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    /**
     * Display a listing of activity logs for the current store.
     */
    public function index(Request $request)
    {
        // Only super admins can view activity logs
        if (Auth::user()->role !== 'super_admin') {
            abort(403, 'Unauthorized - Super Admin access required');
        }

        // Super admin views ALL activity logs (no store filtering)
        $query = ActivityLog::query();

        // Filter by action
        if ($request->action) {
            $query->byAction($request->action);
        }

        // Filter by user
        if ($request->user_id) {
            $query->byUser($request->user_id);
        }

        // Filter by category
        if ($request->category) {
            $query->byCategory($request->category);
        }

        // Filter by model type
        if ($request->model_type) {
            $query->where('model_type', $request->model_type);
        }

        // Filter by date range (from)
        if ($request->from_date) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        // Filter by date range (to)
        if ($request->to_date) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        // Search in description, user name, and account number
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($builder) use ($search) {
                $builder->where('description', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('account_number', 'like', "%{$search}%");
                    });
            });
        }

        // Get all users for filter dropdown
        $users = \App\Models\User::select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        // Category summary for the current filtered result set
        $categorySummary = (clone $query)
            ->get(['action', 'model_type'])
            ->map(function ($log) {
                return ActivityLog::resolveCategory($log->action, $log->model_type);
            })
            ->countBy()
            ->toArray();

        // Get paginated results with user relation for table display
        $logs = $query
            ->with([
                'user:id,name,role,account_number,store_id',
                'user.store:id,name',
            ])
            ->latest('created_at')
            ->paginate(25);

        // Get list of unique actions for filter
        $actions = ActivityLog::query()
            ->distinct()
            ->pluck('action')
            ->sort()
            ->values();

        // Available log categories
        $categories = ActivityLog::availableCategories();

        // Get list of unique model types
        $modelTypes = ActivityLog::query()
            ->distinct()
            ->pluck('model_type')
            ->sort()
            ->values();

        return Inertia::render('Developer/ActivityLogs', [
            'logs' => $logs,
            'users' => $users,
            'actions' => $actions,
            'categories' => $categories,
            'categorySummary' => $categorySummary,
            'modelTypes' => $modelTypes,
            'filters' => $request->only(['action', 'category', 'user_id', 'model_type', 'from_date', 'to_date', 'search']),
        ]);
    }

    /**
     * Show detailed information about a specific activity log entry.
     */
    public function show($id)
    {
        // Only super admins can view activity logs
        if (Auth::user()->role !== 'super_admin') {
            abort(403, 'Unauthorized - Super Admin access required');
        }

        $log = ActivityLog::findOrFail($id);

        $log->load('user', 'store');

        return response()->json($log);
    }

    /**
     * Export activity logs as CSV.
     */
    public function export(Request $request)
    {
        // Only super admins can export activity logs
        if (Auth::user()->role !== 'super_admin') {
            abort(403, 'Unauthorized - Super Admin access required');
        }

        $query = ActivityLog::query();

        if ($request->action) {
            $query->byAction($request->action);
        }
        if ($request->user_id) {
            $query->byUser($request->user_id);
        }
        if ($request->category) {
            $query->byCategory($request->category);
        }
        if ($request->model_type) {
            $query->where('model_type', $request->model_type);
        }
        if ($request->from_date) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->to_date) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $logs = $query->latest('created_at')->get();

        // Create CSV headers
        $csv = "Timestamp,User,Action,Model Type,Model ID,Description,IP Address\n";

        foreach ($logs as $log) {
            $user = $log->user->name ?? 'Unknown';
            $csv .= "\"{$log->created_at}\",\"{$user}\",\"{$log->action}\",\"{$log->model_type}\",\"{$log->model_id}\",\"{$log->description}\",\"{$log->ip_address}\"\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="activity_logs_' . date('Y-m-d_H-i-s') . '.csv"',
        ]);
    }

    /**
     * Get activity summary statistics.
     */
    public function summary()
    {
        // Only super admins can view activity logs
        if (Auth::user()->role !== 'super_admin') {
            abort(403, 'Unauthorized - Super Admin access required');
        }

        $thirtyDaysAgo = now()->subDays(30);

        $summary = [
            'total_logs' => ActivityLog::query()->count(),
            'logs_last_30_days' => ActivityLog::query()->where('created_at', '>=', $thirtyDaysAgo)->count(),
            'logs_today' => ActivityLog::query()->whereDate('created_at', today())->count(),
            'logs_by_category' => ActivityLog::query()
                ->get()
                ->groupBy(fn($log) => $log->category)
                ->map->count(),
            'actions_by_type' => ActivityLog::query()
                ->select('action', DB::raw('count(*) as count'))
                ->groupBy('action')
                ->pluck('count', 'action'),
            'most_active_users' => ActivityLog::query()
                ->select('user_id', DB::raw('count(*) as count'))
                ->with('user:id,name')
                ->groupBy('user_id')
                ->orderByRaw('count desc')
                ->limit(5)
                ->get(),
            'recent_critical_logs' => ActivityLog::query()
                ->whereIn('action', ['create', 'delete', 'approve', 'reject'])
                ->latest('created_at')
                ->limit(10)
                ->get(),
        ];

        return response()->json($summary);
    }
}
