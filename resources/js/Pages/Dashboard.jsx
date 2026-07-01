import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard({ auth }) {
    const user = auth?.user;

    const [stats, setStats] = useState({
        today_sales: 0,
        sales_growth: null,
        today_profit: 0,
        profit_growth: null,
        today_orders: 0,
        orders_growth: null,
        average_order_value: 0,
        aov_growth: null,
        low_stock: [],
        chart_data: [],
        recent_sales: [],
    });

    const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const isPolling = useRef(false);

    const fetchStats = async () => {
        try {
            const response = await axios.get('/api/dashboard');
            setStats(response.data);
        } catch (error) {
            console.error("Dashboard data retrieval error:", error);
        } finally {
            setLoading(false);
            setHasLoaded(true);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Real-time polling is still active! Updates every 5 seconds invisibly.
    useEffect(() => {
        const interval = setInterval(async () => {
            if (isPolling.current) return;
            isPolling.current = true;
            try {
                await fetchStats();
            } finally {
                isPolling.current = false;
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const hasTrendData = stats.chart_data && stats.chart_data.some(d => d.sales > 0);

    const formatCurrency = (cents) => {
        return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatNumber = (num) => {
        return num.toLocaleString('en-US');
    };

    const formatCurrencyDirect = (amount) => {
        return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getPaymentBadgeStyle = (method) => {
        switch(method) {
            case 'gcash': return 'bg-blue-100 text-blue-700';
            case 'maya': return 'bg-green-100 text-green-700';
            case 'credit_card': return 'bg-purple-100 text-purple-700';
            case 'debit_card': return 'bg-indigo-100 text-indigo-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const formatPaymentName = (method) => {
        if (!method) return 'Unknown';
        if (method === 'credit_card') return 'Credit';
        if (method === 'debit_card') return 'Debit';
        return method;
    };

    if (loading && !hasLoaded) return (
        <AuthenticatedLayout user={user} header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">Dashboard</h2>}>
            <DashboardSkeleton />
        </AuthenticatedLayout>
    );

    return (
        <AuthenticatedLayout user={user} header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">Dashboard</h2>}>
            <Head title="Dashboard" />

            <div className="py-0 sm:py-8 lg:py-12 bg-gray-100 sm:bg-[#FAFAFA] min-h-[calc(100vh-65px)] sm:min-h-screen">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 space-y-2 sm:space-y-6 animate-in fade-in sm:slide-in-from-bottom-4 duration-500 pb-10 sm:pb-0">

                    {/* KPI SCORECARDS (Locked to Today) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 px-2 sm:px-0 pt-4 sm:pt-0">
                        <StatCard
                            title="Today's Revenue"
                            value={`₱${formatCurrencyDirect(stats.today_sales)}`}
                            trend={stats.sales_growth}
                            color="blue"
                            icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <StatCard title="Net Profit" value={`₱${formatCurrencyDirect(stats.today_profit)}`} trend={stats.profit_growth} subtext="Today's Earnings" color="green"
                            icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
                        <StatCard title="Transactions" value={formatNumber(stats.today_orders)} trend={stats.orders_growth} subtext="Today's Count" color="purple"
                            icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
                        <StatCard title="Avg Ticket" value={`₱${formatCurrencyDirect(stats.average_order_value)}`} trend={stats.aov_growth} subtext="Per customer today" color="orange"
                            icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-6 px-0 sm:px-0">
                        {/* Sales Volume Trend (Last 7 Days) */}
                        <div className="lg:col-span-2 bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 flex flex-col h-[350px] sm:h-auto">
                            <h3 className="text-[15px] sm:text-lg font-bold text-gray-800 mb-4 tracking-tight">Sales Trend (Last 7 Days)</h3>
                            <div className="flex-1 w-full -ml-4 sm:ml-0 min-h-[250px]">
                                {!hasTrendData ? <NoData /> : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₱${val}`} tick={{ fontSize: 11, fill: '#9CA3AF' }} width={50} />
                                            <Tooltip formatter={(val) => `₱${val}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Critical Low Stock Alert - Made height dynamic for mobile */}
                        <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 sm:border-l-4 sm:border-l-orange-500 flex flex-col relative overflow-hidden h-auto">
                            <div className="sm:hidden absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>

                            {/* UPDATED HEADER: Clean Text Link instead of Button */}
                            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100 sm:border-none pb-4 sm:pb-4 shrink-0">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    <h3 className="text-[15px] sm:text-lg font-bold text-gray-800 tracking-tight">Inventory Alerts</h3>
                                </div>
                                <Link
                                    href="/inventory" // Adjust to your actual inventory route
                                    className="text-xs font-bold uppercase tracking-wider text-orange-600 hover:text-orange-700 hover:underline transition-colors"
                                >
                                    Manage
                                </Link>
                            </div>

                            {/* Removed forced scrollbar classes so it expands naturally */}
                            <ul className="sm:px-6 divide-y divide-gray-50 sm:divide-none pb-4">
                                {stats.low_stock.length === 0 ? (
                                    <li className="text-emerald-600 text-sm font-bold px-5 sm:px-0 py-4 bg-emerald-50/50 sm:bg-transparent flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                        Stock levels are healthy.
                                    </li>
                                ) : stats.low_stock.map((item) => (
                                    <li key={item.id} className="flex justify-between items-center text-sm px-5 sm:px-4 py-3 sm:bg-orange-50/50 sm:rounded-md mb-2">
                                        <span className="text-gray-800 font-semibold truncate pr-4">{item.name}</span>
                                        <span className="bg-orange-100 text-orange-800 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0 shadow-sm border border-orange-200/50">{item.stock_quantity} left</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Live Recent Transactions Feed */}
                    <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 overflow-hidden flex flex-col h-auto mx-0">
                        {/* UPDATED HEADER: Clean Text Link instead of Button */}
                        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-white sm:bg-gray-50/50 flex justify-between items-center">
                            <h3 className="text-[15px] sm:text-lg font-bold text-gray-800 tracking-tight">
                                Recent Transactions
                            </h3>
                            <Link
                                href="/transactions"
                                className="text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                            >
                                View All
                            </Link>
                        </div>

                        {/* Desktop Data Table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-400 tracking-widest sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3">Invoice #</th>
                                        <th className="px-6 py-3">Date & Time</th>
                                        <th className="px-6 py-3">Method</th>
                                        <th className="px-6 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stats.recent_sales.length === 0 ? (
                                        <tr><td colSpan="4" className="py-8"><NoData /></td></tr>
                                    ) : (
                                        stats.recent_sales.map((sale) => (
                                            <tr key={sale.id} className="hover:bg-gray-50 transition-colors cursor-default">
                                                <td className="px-6 py-3.5 font-bold text-gray-900 font-mono">{sale.invoice_number}</td>
                                                <td className="px-6 py-3.5 text-xs font-medium text-gray-500">{new Date(sale.created_at).toLocaleString()}</td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest ${getPaymentBadgeStyle(sale.payment_method)}`}>
                                                        {formatPaymentName(sale.payment_method)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 font-black text-emerald-600 text-right">₱{formatCurrency(sale.total_amount)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile-optimized Transaction Cards */}
                        <div className="sm:hidden divide-y divide-gray-100 h-auto">
                            {stats.recent_sales.length === 0 ? <div className="py-8"><NoData /></div> : stats.recent_sales.map((sale) => (
                                <div key={sale.id} className="px-5 py-3.5 flex justify-between items-center bg-white">
                                    <div>
                                        <div className="font-bold text-gray-900 font-mono text-sm">{sale.invoice_number}</div>
                                        <div className="text-[10px] font-semibold text-gray-400 mt-0.5 tracking-wide">{new Date(sale.created_at).toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-emerald-600 text-base">₱{formatCurrency(sale.total_amount)}</div>
                                        <div className="mt-1 flex justify-end">
                                            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest ${getPaymentBadgeStyle(sale.payment_method)}`}>
                                                {formatPaymentName(sale.payment_method)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function NoData() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-xs sm:text-sm font-semibold opacity-60 uppercase tracking-widest">No data available.</p>
        </div>
    );
}

function DashboardSkeleton() {
    const PulseBlock = ({ className }) => <div className={`animate-pulse bg-gray-200/70 rounded ${className || ''}`} />;
    return (
        <div className="py-0 sm:py-8 lg:py-12 bg-gray-100 sm:bg-[#FAFAFA] min-h-[calc(100vh-65px)] sm:min-h-screen pb-10 sm:pb-0">
            <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 space-y-2 sm:space-y-6 pt-4 sm:pt-0">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 px-2 sm:px-0">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={`sk-kpi-${idx}`} className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between animate-pulse">
                            <div className="flex-1"><PulseBlock className="h-3 w-16 mb-3" /><PulseBlock className="h-8 w-24 mb-3" /><PulseBlock className="h-2 w-16" /></div>
                            <PulseBlock className="h-12 w-12 rounded-lg" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-6 px-0 sm:px-0">
                    <div className="lg:col-span-2 bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 animate-pulse h-[350px]">
                        <PulseBlock className="h-5 w-56 mb-6" /><PulseBlock className="h-60 w-full" />
                    </div>
                    <div className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 animate-pulse h-[350px]">
                        <PulseBlock className="h-5 w-56 mb-6" /><PulseBlock className="h-60 w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color, subtext, trend }) {
    const bgColors = {
        blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
        green: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
        purple: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100',
        orange: 'bg-orange-50 text-orange-600 ring-1 ring-orange-100'
    };
    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-transform hover:scale-[1.02] gap-3 sm:gap-0">
            <div className="flex-1 order-2 sm:order-1">
                <div className="text-gray-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest">{title}</div>
                <div className="text-xl sm:text-3xl font-black text-gray-900 mt-0.5 sm:mt-1 tracking-tight">{value}</div>
                {trend !== undefined && trend !== null && (
                    <div className={`text-[10px] sm:text-xs font-bold mt-1 flex items-center ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs Yesterday
                    </div>
                )}
                {subtext && <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">{subtext}</div>}
            </div>
            <div className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl shrink-0 order-1 sm:order-2 ${bgColors[color]}`}>{icon}</div>
        </div>
    );
}