<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Product;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Handles dashboard analytics and data visualization for the POS system.
 */
class DashboardController extends Controller
{
    /**
     * DASHBOARD: Fast, lightweight data locked to "Today" and recent trends.
     */
    public function index(Request $request)
    {
        $storeId = $request->user()->store_id;

        $today = Carbon::today();
        $endOfToday = Carbon::today()->endOfDay();
        $yesterday = Carbon::yesterday();

        // KPI Cards (Today)
        $todaySales = Sale::where('store_id', $storeId)->whereBetween('created_at', [$today, $endOfToday])->sum('total_amount');
        $todayOrders = Sale::where('store_id', $storeId)->whereBetween('created_at', [$today, $endOfToday])->count();
        $averageOrderValue = $todayOrders > 0 ? $todaySales / $todayOrders : 0;

        // Today's Profit: actual sold price minus cost price, including custom items (cost_price = 0), minus discounts
        $todayItemProfit = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.store_id', $storeId)
            ->whereBetween('sales.created_at', [$today, $endOfToday])
            ->sum(DB::raw('(sale_items.unit_price - COALESCE(products.cost_price, 0)) * sale_items.quantity'));

        $todayDiscounts = Sale::where('store_id', $storeId)
            ->whereBetween('created_at', [$today, $endOfToday])
            ->sum('discount_amount');

        $todayProfit = $todayItemProfit - $todayDiscounts;

        // Yesterday's stats for growth calculations
        $yesterdaySales = Sale::where('store_id', $storeId)->whereDate('created_at', $yesterday)->sum('total_amount');
        $yesterdayOrders = Sale::where('store_id', $storeId)->whereDate('created_at', $yesterday)->count();
        $yesterdayAverageOrderValue = $yesterdayOrders > 0 ? $yesterdaySales / $yesterdayOrders : 0;

        $yesterdayItemProfit = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.store_id', $storeId)
            ->whereDate('sales.created_at', $yesterday)
            ->sum(DB::raw('(sale_items.unit_price - COALESCE(products.cost_price, 0)) * sale_items.quantity'));

        $yesterdayDiscounts = Sale::where('store_id', $storeId)
            ->whereDate('created_at', $yesterday)
            ->sum('discount_amount');

        $yesterdayProfit = $yesterdayItemProfit - $yesterdayDiscounts;

        // Growth Helpers
        $calculateGrowth = function ($current, $previous) {
            if ($previous > 0) {
                return (($current - $previous) / $previous) * 100;
            } elseif ($previous < 0) {
                return (($current - $previous) / abs($previous)) * 100;
            } else {
                return $current > 0 ? 100.0 : ($current < 0 ? -100.0 : 0.0);
            }
        };

        $salesGrowth = $calculateGrowth($todaySales, $yesterdaySales);
        $profitGrowth = $calculateGrowth($todayProfit, $yesterdayProfit);
        $ordersGrowth = $calculateGrowth($todayOrders, $yesterdayOrders);
        $aovGrowth = $calculateGrowth($averageOrderValue, $yesterdayAverageOrderValue);

        // Low Stock
        $lowStock = Product::where('store_id', $storeId)->where('is_active', true)->where('stock_quantity', '<', 10)->limit(5)->get();

        // 7-Day Trend Chart
        $trendStart = Carbon::now()->subDays(6)->startOfDay();
        $rawChartData = Sale::select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total_amount) as total'))
            ->where('store_id', $storeId)
            ->whereBetween('created_at', [$trendStart, $endOfToday])
            ->groupBy('date')->orderBy('date', 'ASC')->get()->keyBy('date');

        $chartData = [];
        $period = \Carbon\CarbonPeriod::create($trendStart, $endOfToday);
        foreach ($period as $date) {
            $dateKey = $date->format('Y-m-d');
            $chartData[] = [
                'date' => $date->format('M d'),
                'sales' => isset($rawChartData[$dateKey]) ? $rawChartData[$dateKey]->total / 100 : 0
            ];
        }

        // Recent Sales
        $recentSales = Sale::with(['items.product', 'cashier'])
            ->where('store_id', $storeId)
            ->latest()
            ->limit(5)
            ->get();

        return response()->json([
            'today_sales' => $todaySales / 100,
            'sales_growth' => $salesGrowth !== null ? round($salesGrowth, 1) : null,
            'today_profit' => $todayProfit / 100,
            'profit_growth' => $profitGrowth !== null ? round($profitGrowth, 1) : null,
            'today_orders' => $todayOrders,
            'orders_growth' => $ordersGrowth !== null ? round($ordersGrowth, 1) : null,
            'average_order_value' => $averageOrderValue / 100,
            'aov_growth' => $aovGrowth !== null ? round($aovGrowth, 1) : null,
            'low_stock' => $lowStock,
            'chart_data' => $chartData,
            'recent_sales' => $recentSales,
        ]);
    }

    /**
     * REPORTS: Heavy data processing, custom date ranges, and deep analytics.
     */
    public function reports(Request $request)
    {
        $storeId = $request->user()->store_id;

        // Default to Current Month if no dates provided
        $startDate = $request->has('start_date') && $request->start_date
            ? Carbon::parse($request->start_date)->startOfDay()
            : Carbon::now()->startOfMonth();

        $endDate = $request->has('end_date') && $request->end_date
            ? Carbon::parse($request->end_date)->endOfDay()
            : Carbon::now()->endOfDay();

        // KPI Totals for Period
        $totalSales = Sale::where('store_id', $storeId)->whereBetween('created_at', [$startDate, $endDate])->sum('total_amount');
        $totalOrders = Sale::where('store_id', $storeId)->whereBetween('created_at', [$startDate, $endDate])->count();
        $averageOrderValue = $totalOrders > 0 ? $totalSales / $totalOrders : 0;

        // Period Profit: actual sold price minus cost price, including custom items (cost_price = 0), minus discounts
        $totalItemProfit = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.store_id', $storeId)
            ->whereBetween('sales.created_at', [$startDate, $endDate])
            ->sum(DB::raw('(sale_items.unit_price - COALESCE(products.cost_price, 0)) * sale_items.quantity'));

        $totalDiscounts = Sale::where('store_id', $storeId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('discount_amount');

        $totalProfit = $totalItemProfit - $totalDiscounts;

        // Period-over-Period Growth Calculations
        $daysDiff = $startDate->diffInDays($endDate) + 1;
        $prevStartDate = $startDate->copy()->subDays($daysDiff);
        $prevEndDate = $endDate->copy()->subDays($daysDiff);

        $prevSales = Sale::where('store_id', $storeId)->whereBetween('created_at', [$prevStartDate, $prevEndDate])->sum('total_amount');
        $prevOrders = Sale::where('store_id', $storeId)->whereBetween('created_at', [$prevStartDate, $prevEndDate])->count();
        $prevAverageOrderValue = $prevOrders > 0 ? $prevSales / $prevOrders : 0;

        $prevItemProfit = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.store_id', $storeId)
            ->whereBetween('sales.created_at', [$prevStartDate, $prevEndDate])
            ->sum(DB::raw('(sale_items.unit_price - COALESCE(products.cost_price, 0)) * sale_items.quantity'));

        $prevDiscounts = Sale::where('store_id', $storeId)
            ->whereBetween('created_at', [$prevStartDate, $prevEndDate])
            ->sum('discount_amount');

        $prevProfit = $prevItemProfit - $prevDiscounts;

        $calculateGrowth = function ($current, $previous) {
            if ($previous > 0) {
                return (($current - $previous) / $previous) * 100;
            } elseif ($previous < 0) {
                return (($current - $previous) / abs($previous)) * 100;
            } else {
                return null;
            }
        };

        $salesGrowth = $calculateGrowth($totalSales, $prevSales);
        $profitGrowth = $calculateGrowth($totalProfit, $prevProfit);
        $ordersGrowth = $calculateGrowth($totalOrders, $prevOrders);
        $aovGrowth = $calculateGrowth($averageOrderValue, $prevAverageOrderValue);



        // Chart Trend
        $rawChartData = Sale::select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total_amount) as total'))
            ->where('store_id', $storeId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy('date')->orderBy('date', 'ASC')->get()->keyBy('date');

        $chartData = [];
        $period = \Carbon\CarbonPeriod::create($startDate, $endDate);
        foreach ($period as $date) {
            $dateKey = $date->format('Y-m-d');
            $chartData[] = [
                'date' => $date->format('M d'),
                'sales' => isset($rawChartData[$dateKey]) ? $rawChartData[$dateKey]->total / 100 : 0
            ];
        }

        // Peak Hours
        $peakHoursData = Sale::select(DB::raw('HOUR(created_at) as hour'), DB::raw('COUNT(*) as count'))
            ->where('store_id', $storeId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy('hour')->orderBy('hour')->get()->map(function ($item) {
                return ['hour' => Carbon::createFromTime($item->hour)->format('g A'), 'count' => $item->count];
            });

        // Peak Days Analysis
        $peakDaysRaw = Sale::select(
            DB::raw('DAYOFWEEK(created_at) as day_index'),
            DB::raw('DAYNAME(created_at) as day_name'),
            DB::raw('COUNT(*) as count')
        )
            ->where('store_id', $storeId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy('day_index', 'day_name')
            ->orderBy('day_index')
            ->get();

        $peakDaysData = $peakDaysRaw->map(function ($item) {
            return ['day' => substr($item->day_name, 0, 3), 'count' => $item->count];
        });

        // NEW: Peak Months Analysis
        $peakMonthsRaw = Sale::select(
            DB::raw('MONTH(created_at) as month_index'),
            DB::raw('MONTHNAME(created_at) as month_name'),
            DB::raw('COUNT(*) as count')
        )
            ->where('store_id', $storeId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy('month_index', 'month_name')
            ->orderBy('month_index')
            ->get();

        $peakMonthsData = $peakMonthsRaw->map(function ($item) {
            return ['month' => substr($item->month_name, 0, 3), 'count' => $item->count];
        });

        // Payment Methods
        $paymentMethods = Sale::select('payment_method', DB::raw('count(*) as count'))
            ->where('store_id', $storeId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy('payment_method')->get();

        // Categories
        $salesByCategory = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.store_id', $storeId)
            ->whereBetween('sales.created_at', [$startDate, $endDate])
            ->select('categories.name', DB::raw('SUM(sale_items.quantity) as value'))
            ->groupBy('categories.name')->get()->map(function ($item) {
                return ['name' => $item->name ?? 'Uncategorized', 'value' => (int) $item->value];
            });

        // Top Products
        $topProducts = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.store_id', $storeId)
            ->whereBetween('sales.created_at', [$startDate, $endDate])
            ->select('products.name', DB::raw('sum(sale_items.quantity) as sold'))
            ->groupBy('products.name')->orderByDesc('sold')->limit(5)->get();

        return response()->json([
            'total_sales' => $totalSales / 100,
            'total_profit' => $totalProfit / 100,
            'total_orders' => $totalOrders,
            'average_order_value' => $averageOrderValue / 100,
            'sales_growth' => $salesGrowth !== null ? round($salesGrowth, 1) : null,
            'profit_growth' => $profitGrowth !== null ? round($profitGrowth, 1) : null,
            'orders_growth' => $ordersGrowth !== null ? round($ordersGrowth, 1) : null,
            'aov_growth' => $aovGrowth !== null ? round($aovGrowth, 1) : null,

            'chart_data' => $chartData,
            'peak_hours' => $peakHoursData,
            'peak_days' => $peakDaysData,
            'peak_months' => $peakMonthsData, // Added to response
            'payment_methods' => $paymentMethods,
            'sales_by_category' => $salesByCategory,
            'top_products' => $topProducts,
        ]);
    }
}
