import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    PieChart,
    Pie,
    Cell
} from 'recharts';

export default function Dashboard({ auth }) {
    const user = auth?.user;

    const [period, setPeriod] = useState('today_hourly');
    const [stats, setStats] = useState({
        kpi: {
            today_sales: 0,
            sales_growth: null,
            today_profit: 0,
            profit_growth: null,
            profit_margin: 0,
            today_orders: 0,
            orders_growth: null,
            average_order_value: 0,
            aov_growth: null,
        },
        chart_data: [],
        period: 'today_hourly',
        active_shift: null,
        payment_methods: [],
        inventory_alerts: {
            out_of_stock: [],
            low_stock: [],
            out_of_stock_count: 0,
            low_stock_count: 0,
            total_active: 0,
        },
        top_products: [],
        recent_transactions: [],
        recent_activities: [],
        meta: {
            store_name: 'POS Retail Store',
            formatted_time: '',
        }
    });

    const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isPolling = useRef(false);

    const fetchStats = async (selectedPeriod = period, isManual = false) => {
        if (isManual) setIsRefreshing(true);
        try {
            const response = await axios.get('/api/dashboard', {
                params: { period: selectedPeriod }
            });
            setStats(response.data);
        } catch (error) {
            console.error("Dashboard data retrieval error:", error);
        } finally {
            setLoading(false);
            setHasLoaded(true);
            if (isManual) {
                setTimeout(() => setIsRefreshing(false), 400);
            }
        }
    };

    // Initial Load & Period change
    useEffect(() => {
        fetchStats(period);
    }, [period]);

    // Real-time silent background polling every 10 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            if (isPolling.current) return;
            isPolling.current = true;
            try {
                await fetchStats(period, false);
            } finally {
                isPolling.current = false;
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [period]);

    const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatNumber = (num) => {
        return (num || 0).toLocaleString('en-US');
    };

    const getPaymentBadgeStyle = (method) => {
        const m = (method || '').toLowerCase();
        switch (m) {
            case 'cash':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
            case 'gcash':
                return 'bg-blue-50 text-blue-700 border-blue-200/70';
            case 'maya':
            case 'paymaya':
                return 'bg-teal-50 text-teal-800 border-teal-300/70';
            case 'card':
            case 'credit_card':
                return 'bg-purple-50 text-purple-700 border-purple-200/70';
            case 'debit_card':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200/70';
            case 'bank_transfer':
                return 'bg-sky-50 text-sky-700 border-sky-200/70';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200/70';
        }
    };

    const formatPaymentName = (method) => {
        if (!method) return 'Cash';
        const m = method.toLowerCase();
        if (m === 'cash') return 'Cash';
        if (m === 'gcash') return 'GCash';
        if (m === 'maya' || m === 'paymaya') return 'Maya';
        if (m === 'card' || m === 'credit_card') return 'Credit Card';
        if (m === 'debit_card') return 'Debit Card';
        if (m === 'bank_transfer') return 'Bank Transfer';
        return method.charAt(0).toUpperCase() + method.slice(1);
    };

    // Color tokens for Payment Method Donut chart
    const PAYMENT_COLORS = {
        cash: '#10B981',
        gcash: '#3B82F6',
        maya: '#14B8A6',
        credit_card: '#8B5CF6',
        debit_card: '#6366F1',
        bank_transfer: '#0EA5E9',
        other: '#94A3B8'
    };

    const hasChartData = stats.chart_data && stats.chart_data.some(d => d.sales > 0 || d.profit > 0);

    if (loading && !hasLoaded) {
        return (
            <AuthenticatedLayout
                user={user}
                header={
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <h2 className="font-bold text-lg sm:text-xl text-gray-900 tracking-tight">Executive Dashboard</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Real-time store performance, cash drawer reconciliation, inventory alerts, and live activity monitoring
                            </p>
                        </div>
                    </div>
                }
            >
                <DashboardSkeleton />
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            user={user}
            header={
                <div>
                    <h2 className="font-bold text-lg sm:text-xl text-gray-900 tracking-tight">Executive Dashboard</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Real-time store performance, cash drawer reconciliation, inventory alerts, and live activity monitoring
                    </p>
                </div>
            }
        >
            <Head title="Executive Dashboard" />

            <div className="py-3 sm:py-8 bg-gray-50/80 min-h-0 sm:min-h-[calc(100vh-140px)] max-w-full overflow-x-clip text-gray-900 antialiased">
                <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* ========================================================================= */}
                    {/* 1. EXECUTIVE KPI METRIC STRIP (4 CARDS) - MATCHING USER/INVENTORY DESIGN */}
                    {/* ========================================================================= */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                        
                        {/* KPI 1: Today's Revenue */}
                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="space-y-0.5 sm:space-y-1">
                                    <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Revenue</p>
                                    <h3 className="text-base sm:text-2xl font-bold text-gray-900 tracking-tight">₱{formatCurrency(stats.kpi?.today_sales)}</h3>
                                </div>
                                <div className="p-2 sm:p-2.5 bg-[#EFF4F9] text-[#1B3A69] rounded-xl ring-1 ring-[#CBD7E6] shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs text-gray-500 font-semibold">
                                <span>vs Yesterday</span>
                                {stats.kpi?.sales_growth !== null ? (
                                    <span className={`font-bold flex items-center gap-0.5 ${stats.kpi.sales_growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {stats.kpi.sales_growth >= 0 ? '↑' : '↓'} {Math.abs(stats.kpi.sales_growth)}%
                                    </span>
                                ) : (
                                    <span className="font-bold text-gray-400">Baseline</span>
                                )}
                            </div>
                        </div>

                        {/* KPI 2: Today's Net Profit */}
                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="space-y-0.5 sm:space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Profit</p>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                            {stats.kpi?.profit_margin || 0}% Margin
                                        </span>
                                    </div>
                                    <h3 className="text-base sm:text-2xl font-bold text-emerald-700 tracking-tight">₱{formatCurrency(stats.kpi?.today_profit)}</h3>
                                </div>
                                <div className="p-2 sm:p-2.5 bg-emerald-100/70 text-emerald-700 rounded-xl ring-1 ring-emerald-200 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                                    </svg>
                                </div>
                            </div>
                            <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs text-gray-500 font-semibold">
                                <span>vs Yesterday</span>
                                {stats.kpi?.profit_growth !== null ? (
                                    <span className={`font-bold flex items-center gap-0.5 ${stats.kpi.profit_growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {stats.kpi.profit_growth >= 0 ? '↑' : '↓'} {Math.abs(stats.kpi.profit_growth)}%
                                    </span>
                                ) : (
                                    <span className="font-bold text-gray-400">Baseline</span>
                                )}
                            </div>
                        </div>

                        {/* KPI 3: Today's Orders Count */}
                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="space-y-0.5 sm:space-y-1">
                                    <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Completed Orders</p>
                                    <h3 className="text-base sm:text-2xl font-bold text-gray-900 tracking-tight">{formatNumber(stats.kpi?.today_orders)}</h3>
                                </div>
                                <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl ring-1 ring-indigo-200 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs text-gray-500 font-semibold">
                                <span>vs Yesterday</span>
                                {stats.kpi?.orders_growth !== null ? (
                                    <span className={`font-bold flex items-center gap-0.5 ${stats.kpi.orders_growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {stats.kpi.orders_growth >= 0 ? '↑' : '↓'} {Math.abs(stats.kpi.orders_growth)}%
                                    </span>
                                ) : (
                                    <span className="font-bold text-gray-400">Baseline</span>
                                )}
                            </div>
                        </div>

                        {/* KPI 4: Average Order Value (AOV) */}
                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="space-y-0.5 sm:space-y-1">
                                    <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Ticket (AOV)</p>
                                    <h3 className="text-base sm:text-2xl font-bold text-gray-900 tracking-tight">₱{formatCurrency(stats.kpi?.average_order_value)}</h3>
                                </div>
                                <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-xl ring-1 ring-amber-200 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs text-gray-500 font-semibold">
                                <span>vs Yesterday</span>
                                {stats.kpi?.aov_growth !== null ? (
                                    <span className={`font-bold flex items-center gap-0.5 ${stats.kpi.aov_growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {stats.kpi.aov_growth >= 0 ? '↑' : '↓'} {Math.abs(stats.kpi.aov_growth)}%
                                    </span>
                                ) : (
                                    <span className="font-bold text-gray-400">Baseline</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 2. ROW 1: SALES PERFORMANCE & LIVE CASH / SHIFT MONITOR                   */}
                    {/* ========================================================================= */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                        
                        {/* Sales Performance Chart (8 Cols) */}
                        <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                                        Sales & Profit Velocity
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">Real-time revenue stream and profit margins</p>
                                </div>

                                {/* Period Switcher */}
                                <div className="inline-flex bg-gray-100 p-0.5 rounded-xl border border-gray-200 shrink-0 self-start sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setPeriod('today_hourly')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            period === 'today_hourly' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Today (Hourly)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPeriod('last_7_days')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            period === 'last_7_days' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Last 7 Days
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPeriod('this_month')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            period === 'this_month' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        This Month
                                    </button>
                                </div>
                            </div>

                            {/* Chart Container */}
                            <div className="h-64 sm:h-72 w-full">
                                {!hasChartData ? (
                                    <NoData message="No sales recorded for this period yet." />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="dashSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#1B3A69" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#1B3A69" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="dashProfit" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={8} />
                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₱${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} tick={{ fontSize: 10, fill: '#64748B' }} width={48} />
                                            <Tooltip
                                                content={({ active, payload, label }) => {
                                                    if (active && payload && payload.length) {
                                                        const pData = payload[0].payload;
                                                        return (
                                                            <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100 text-xs space-y-1.5 z-50">
                                                                <p className="font-bold text-gray-900 border-b border-gray-100 pb-1">{label}</p>
                                                                <div className="flex items-center justify-between gap-4 text-gray-700">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <span className="w-2 h-2 rounded-full bg-[#1B3A69]"></span> Revenue:
                                                                    </span>
                                                                    <span className="font-bold text-gray-900">₱{formatCurrency(pData.sales)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-4 text-gray-700">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Profit:
                                                                    </span>
                                                                    <span className="font-bold text-emerald-600">₱{formatCurrency(pData.profit)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-4 text-gray-500 pt-0.5 text-xs">
                                                                    <span>Orders:</span>
                                                                    <span className="font-semibold text-gray-700">{pData.orders}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Area type="monotone" name="Revenue" dataKey="sales" stroke="#1B3A69" strokeWidth={2.5} fillOpacity={1} fill="url(#dashSales)" />
                                            <Area type="monotone" name="Profit" dataKey="profit" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#dashProfit)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Chart Legend Footer */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5 font-semibold text-xs">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#1B3A69]"></span> Gross Revenue
                                    </span>
                                    <span className="flex items-center gap-1.5 font-semibold text-xs">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Net Profit
                                    </span>
                                </div>
                                <span className="text-xs text-gray-400 font-medium">Real-time sync</span>
                            </div>
                        </div>

                        {/* Current Shift / Cash Drawer Status (4 Cols) */}
                        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                                        Live Cash & Shift Status
                                    </h3>
                                </div>
                                <Link
                                    href="/shifts"
                                    className="text-xs font-bold text-[#1B3A69] hover:underline uppercase tracking-wider cursor-pointer"
                                >
                                    History
                                </Link>
                            </div>

                            {stats.active_shift ? (
                                <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                                    
                                    {/* Cashier & Register Header */}
                                    <div className="flex items-center justify-between bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-[#EFF4F9] text-[#1B3A69] font-bold text-xs flex items-center justify-center border border-[#CBD7E6]">
                                                {stats.active_shift.cashier_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">{stats.active_shift.cashier_name}</p>
                                                <p className="text-xs text-gray-400 font-medium">{stats.active_shift.terminal_name}</p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                            On Duty
                                        </span>
                                    </div>

                                    {/* Cash Drawer Metrics Breakdown */}
                                    <div className="space-y-2 text-xs sm:text-sm">
                                        <div className="flex justify-between items-center py-1 border-b border-gray-100/80">
                                            <span className="text-gray-500 font-medium">Opening Float:</span>
                                            <span className="font-bold text-gray-800">₱{formatCurrency(stats.active_shift.starting_cash)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-gray-100/80">
                                            <span className="text-gray-500 font-medium">Cash Sales:</span>
                                            <span className="font-bold text-emerald-600">+₱{formatCurrency(stats.active_shift.cash_sales)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-gray-100/80">
                                            <span className="text-gray-500 font-medium">Cash In (Float Top-up):</span>
                                            <span className="font-bold text-blue-600">+₱{formatCurrency(stats.active_shift.cash_in)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-gray-100/80">
                                            <span className="text-gray-500 font-medium">Cash Out / Drops:</span>
                                            <span className="font-bold text-rose-600">-₱{formatCurrency(stats.active_shift.cash_out + stats.active_shift.expenses)}</span>
                                        </div>
                                    </div>

                                    {/* Highlight: Expected Drawer Cash */}
                                    <div className="p-3.5 rounded-xl bg-[#EFF4F9] border border-[#CBD7E6]">
                                        <p className="text-xs font-bold uppercase tracking-wider text-[#1B3A69]">Expected In Drawer</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight mt-0.5">₱{formatCurrency(stats.active_shift.expected_cash)}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 flex-1">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/80">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">No Shift Currently Open</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Cash register is currently off-duty.</p>
                                    </div>
                                    <Link
                                        href="/pos"
                                        className="px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#1B3A69] hover:bg-[#142E54] text-white transition-all shadow-xs active:scale-95 cursor-pointer"
                                    >
                                        Start Shift in POS
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 3. ROW 2: PAYMENT METHOD SUMMARY & INVENTORY ATTENTION CENTER             */}
                    {/* ========================================================================= */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                        
                        {/* Payment Breakdown (5 Cols) */}
                        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                                    Today's Payment Channels
                                </h3>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">Breakdown of today's settled transactions</p>
                            </div>

                            {stats.payment_methods.length === 0 ? (
                                <div className="py-10"><NoData message="No payments collected today." /></div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center flex-1">
                                    
                                    {/* Donut Chart (5 Cols) */}
                                    <div className="sm:col-span-5 h-40 w-full flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.payment_methods}
                                                    dataKey="total"
                                                    nameKey="method"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={36}
                                                    outerRadius={56}
                                                    paddingAngle={3}
                                                >
                                                    {stats.payment_methods.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.method] || PAYMENT_COLORS.other} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(val, name, props) => [`₱${formatCurrency(val)} (${props.payload.percentage}%)`, formatPaymentName(name)]}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Channels List (7 Cols) */}
                                    <div className="sm:col-span-7 space-y-2">
                                        {stats.payment_methods.map((pm, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs sm:text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[pm.method] || PAYMENT_COLORS.other }}></span>
                                                    <span className="font-bold text-gray-800">{formatPaymentName(pm.method)}</span>
                                                    <span className="text-xs text-gray-400">({pm.count})</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-gray-900">₱{formatCurrency(pm.total)}</span>
                                                    <span className="text-xs text-gray-500 font-bold ml-1.5">{pm.percentage}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                                <span>Multi-channel reconciliation</span>
                                <Link href="/transactions" className="font-bold text-[#1B3A69] hover:underline cursor-pointer">View Transactions</Link>
                            </div>
                        </div>

                        {/* Inventory Attention Alerts (7 Cols) */}
                        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                                            Inventory Attention Center
                                        </h3>
                                        {(stats.inventory_alerts?.out_of_stock_count > 0 || stats.inventory_alerts?.low_stock_count > 0) && (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80">
                                                {stats.inventory_alerts.out_of_stock_count + stats.inventory_alerts.low_stock_count} Alerts
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">Products requiring restocking or attention</p>
                                </div>
                            </div>

                            {/* Alert Items List */}
                            <div className="space-y-2 flex-1">
                                {stats.inventory_alerts?.out_of_stock.length === 0 && stats.inventory_alerts?.low_stock.length === 0 ? (
                                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-xs font-bold text-emerald-800">All product stock levels are healthy</p>
                                        <p className="text-xs text-emerald-600">No depleted or critically low items detected.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {/* Out of stock items */}
                                        {stats.inventory_alerts?.out_of_stock.map((item) => (
                                            <div key={`oos-${item.id}`} className="py-2.5 flex items-center justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-xs sm:text-sm text-gray-900 truncate">{item.name}</span>
                                                        <span className="text-xs text-gray-400 font-mono">#{item.sku}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-400">{item.category_name} · ₱{formatCurrency(item.price)}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                                                        0 Out of Stock
                                                    </span>
                                                    <Link
                                                        href="/inventory"
                                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 shadow-xs active:scale-95 transition-all cursor-pointer"
                                                    >
                                                        Restock
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Low stock items */}
                                        {stats.inventory_alerts?.low_stock.map((item) => (
                                            <div key={`low-${item.id}`} className="py-2.5 flex items-center justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-xs sm:text-sm text-gray-900 truncate">{item.name}</span>
                                                        <span className="text-xs text-gray-400 font-mono">#{item.sku}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-400">{item.category_name} · ₱{formatCurrency(item.price)}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                                        {item.stock_quantity} left
                                                    </span>
                                                    <Link
                                                        href="/inventory"
                                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 shadow-xs active:scale-95 transition-all cursor-pointer"
                                                    >
                                                        Restock
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                                <span>Total Active Catalog: <strong>{stats.inventory_alerts?.total_active || 0}</strong> products</span>
                                <Link href="/inventory" className="font-bold text-[#1B3A69] hover:underline cursor-pointer">View Full Inventory</Link>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 4. ROW 3: TOP PRODUCTS, RECENT TRANSACTIONS & SYSTEM ACTIVITY AUDIT       */}
                    {/* ========================================================================= */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                        
                        {/* 1. Top-Selling Products Today (4 Cols) */}
                        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                                    Top Moving Products Today
                                </h3>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">Best sellers ranked by volume</p>
                            </div>

                            <div className="space-y-2.5 flex-1">
                                {stats.top_products.length === 0 ? (
                                    <div className="py-8"><NoData message="No items sold yet today." /></div>
                                ) : (
                                    stats.top_products.slice(0, 5).map((p, idx) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs sm:text-sm">
                                            <div className="min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                        #{idx + 1}
                                                    </span>
                                                    <span className="font-bold text-gray-900 truncate">{p.name}</span>
                                                </div>
                                                <p className="text-xs text-gray-400">{p.category_name} {p.sku ? `· #${p.sku}` : ''}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-bold text-xs sm:text-sm text-gray-900">
                                                    ₱{formatCurrency(p.total_revenue)}
                                                </p>
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200/70">
                                                    {p.units_sold} Sold
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                                <span>Ranked by units sold</span>
                                <Link href="/reports" className="font-bold text-[#1B3A69] hover:underline cursor-pointer">Full Analytics</Link>
                            </div>
                        </div>

                        {/* 2. Today's Recent Transactions (4 Cols) */}
                        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                                    Recent Transactions
                                </h3>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">Today's live checkout stream</p>
                            </div>

                            <div className="space-y-2.5 flex-1">
                                {stats.recent_transactions.length === 0 ? (
                                    <div className="py-8"><NoData message="No transactions recorded today." /></div>
                                ) : (
                                    stats.recent_transactions.slice(0, 5).map((sale) => (
                                        <div key={sale.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs sm:text-sm">
                                            <div className="min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`font-mono font-bold ${sale.status === 'void' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                                        {sale.invoice_number}
                                                    </span>
                                                    {sale.status === 'void' && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-100 text-rose-700">Void</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400">{sale.time_formatted} · {sale.cashier_name} ({sale.items_count} items)</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`font-bold text-xs sm:text-sm ${sale.status === 'void' ? 'line-through text-gray-400' : 'text-emerald-600'}`}>
                                                    ₱{formatCurrency(sale.total_amount)}
                                                </p>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getPaymentBadgeStyle(sale.payment_method)}`}>
                                                    {formatPaymentName(sale.payment_method)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                                <span>Recent 5 checkouts</span>
                                <Link href="/transactions" className="font-bold text-[#1B3A69] hover:underline cursor-pointer">Full Log</Link>
                            </div>
                        </div>

                        {/* 3. Recent Activity & Audit Trail (4 Cols) */}
                        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                                        System Activity Trail
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">Recent cashier, shift, & store events</p>
                                </div>
                            </div>

                            <div className="space-y-2.5 flex-1">
                                {stats.recent_activities.length === 0 ? (
                                    <div className="py-8"><NoData message="No recent system activities." /></div>
                                ) : (
                                    stats.recent_activities.slice(0, 5).map((act) => (
                                        <div key={act.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1 text-xs sm:text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-gray-800 text-xs sm:text-sm">{act.user_name}</span>
                                                <span className="text-xs text-gray-400">{act.time_ago}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-snug line-clamp-2">{act.description}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 font-medium flex items-center justify-between">
                                <span>Audit & compliance log</span>
                                <Link href="/reports" className="font-bold text-[#1B3A69] hover:underline cursor-pointer">Deep Audit</Link>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}

// -----------------------------------------------------------------------------
// HELPER COMPONENTS: NoData, DashboardSkeleton
// -----------------------------------------------------------------------------

function NoData({ message = 'No data available.' }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8 space-y-1 text-center">
            <svg className="w-8 h-8 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xs font-semibold text-gray-400">{message}</p>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="py-3 sm:py-8 bg-gray-50/80 min-h-0 sm:min-h-[calc(100vh-140px)] max-w-full overflow-x-clip">
            <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-200/70 shadow-2xs animate-pulse h-28" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                    <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs animate-pulse h-80" />
                    <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs animate-pulse h-80" />
                </div>
            </div>
        </div>
    );
}