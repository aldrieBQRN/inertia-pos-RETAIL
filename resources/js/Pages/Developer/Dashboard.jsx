import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Dashboard({ auth, stats }) {
    // Safely fallback stats in case the backend hasn't loaded them all yet
    const safeStats = {
        monthly_revenue: stats.monthly_revenue || stats.mrr || 0,
        all_time_revenue: stats.all_time_revenue || 0,
        active_stores: stats.active_stores || 0,
        suspended_stores: stats.suspended_stores || 0,
        pending: stats.pending_payments || stats.pending_approvals || 0,
        overdue: stats.overdue_stores || 0,
        upcoming: stats.upcoming_renewals || 0,
    };

    const totalStores = safeStats.active_stores + safeStats.suspended_stores;
    const activePercentage = totalStores > 0 ? Math.round((safeStats.active_stores / totalStores) * 100) : 0;
    const suspendedPercentage = totalStores > 0 ? Math.round((safeStats.suspended_stores / totalStores) * 100) : 0;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 uppercase tracking-widest truncate">Developer Overview</h2>}
        >
            <Head title="Super Admin Dashboard" />

            <div className="pb-24 sm:pb-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 space-y-4 sm:space-y-6 lg:space-y-8 py-4 sm:py-6 lg:py-12">

                    {/* TOP ROW: The Big Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">

                        {/* MONTHLY REVENUE CARD */}
                        <div className="bg-gray-900 p-4 sm:p-6 lg:p-8 rounded-none sm:rounded-xl shadow-lg relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500 h-auto min-h-fit border-y sm:border-0">
                            <div className="absolute top-0 right-0 p-4 sm:p-6 lg:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-gray-400 font-black text-[9px] sm:text-xs lg:text-sm uppercase tracking-widest mb-0.5 sm:mb-1">Monthly Revenue</h3>
                                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter truncate break-words">
                                    ₱{parseFloat(safeStats.monthly_revenue).toLocaleString()}
                                </div>
                                <p className="text-green-400 text-[9px] sm:text-xs lg:text-sm font-bold mt-1 sm:mt-2 flex items-center gap-1 uppercase tracking-wider">
                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    <span className="whitespace-normal">Current Month</span>
                                </p>
                            </div>
                        </div>

                        {/* ALL-TIME REVENUE CARD */}
                        <div className="bg-blue-600 p-4 sm:p-6 lg:p-8 rounded-none sm:rounded-xl shadow-lg shadow-blue-200/50 relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 h-auto min-h-fit border-y sm:border-0">
                            <div className="absolute top-0 right-0 p-4 sm:p-6 lg:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-blue-200 font-black text-[9px] sm:text-xs lg:text-sm uppercase tracking-widest mb-0.5 sm:mb-1">All-Time Revenue</h3>
                                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter mt-1 sm:mt-2 break-words">
                                    ₱{parseFloat(safeStats.all_time_revenue).toLocaleString()}
                                </div>
                                <p className="text-blue-100 text-[9px] sm:text-xs lg:text-sm font-bold mt-2 sm:mt-3 uppercase tracking-wider">
                                    Total Processing
                                </p>
                            </div>
                        </div>

                        {/* ACTIVE STORES CARD */}
                        <div className="bg-white border-y sm:border border-gray-100 p-4 sm:p-6 lg:p-8 rounded-none sm:rounded-xl shadow-sm flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 h-auto min-h-fit">
                            <h3 className="text-gray-400 font-black text-[9px] sm:text-xs lg:text-sm uppercase tracking-widest mb-0.5 sm:mb-1">Platform Tenants</h3>
                            <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter">
                                    {safeStats.active_stores}
                                </div>
                                {safeStats.suspended_stores > 0 && (
                                    <div className="text-[8px] sm:text-xs lg:text-sm font-bold text-red-500 mb-1 sm:mb-2 uppercase tracking-widest whitespace-nowrap">
                                        +{safeStats.suspended_stores}
                                    </div>
                                )}
                            </div>
                            <Link href={route('developer.tenants')} className="text-blue-600 text-[9px] sm:text-xs lg:text-sm font-bold mt-2 sm:mt-3 hover:text-blue-800 active:text-blue-900 transition-colors inline-flex items-center gap-1 uppercase tracking-wider w-max rounded-lg p-1 hover:bg-blue-50">
                                Manage <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </Link>
                        </div>
                    </div>

                    {/* ACTION CENTER: The "Finance Four" Quick Links */}
                    <div className="pt-2 sm:pt-4 lg:pt-6">
                        <h3 className="text-gray-900 font-black text-sm sm:text-base lg:text-lg mb-2 sm:mb-3 lg:mb-4 uppercase tracking-widest px-1">Finance Actions</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-5">

                            {/* PENDING APPROVALS */}
                            <Link href={route('developer.payments.pending')} className="bg-white p-3 sm:p-4 lg:p-6 rounded-none sm:rounded-lg lg:rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 active:bg-orange-100/50 transition-all group relative flex flex-col items-center text-center min-h-24 sm:min-h-28 justify-center">
                                {safeStats.pending > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-orange-500 text-white text-[8px] sm:text-[10px] font-black shadow-sm">
                                        {safeStats.pending}
                                    </span>
                                )}
                                <div className="bg-orange-50 w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-none sm:rounded-lg flex items-center justify-center text-orange-500 mb-2 sm:mb-3 group-hover:scale-110 transition-transform flex-shrink-0">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h4 className="font-black text-xs sm:text-sm lg:text-base text-gray-900">Pending</h4>
                                <p className="text-[8px] sm:text-[9px] lg:text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1 whitespace-nowrap">Approvals</p>
                            </Link>

                            {/* OVERDUE */}
                            <Link href={route('developer.payments.overdue')} className="bg-white p-3 sm:p-4 lg:p-6 rounded-none sm:rounded-lg lg:rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50/30 active:bg-red-100/50 transition-all group relative flex flex-col items-center text-center min-h-24 sm:min-h-28 justify-center">
                                {safeStats.overdue > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-red-600 text-white text-[8px] sm:text-[10px] font-black shadow-sm animate-pulse">
                                        {safeStats.overdue}
                                    </span>
                                )}
                                <div className="bg-red-50 w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-none sm:rounded-lg flex items-center justify-center text-red-600 mb-2 sm:mb-3 group-hover:scale-110 transition-transform flex-shrink-0">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h4 className="font-black text-xs sm:text-sm lg:text-base text-gray-900">Overdue</h4>
                                <p className="text-[8px] sm:text-[9px] lg:text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1 whitespace-nowrap">Stores</p>
                            </Link>

                            {/* UPCOMING */}
                            <Link href={route('developer.payments.upcoming')} className="bg-white p-3 sm:p-4 lg:p-6 rounded-none sm:rounded-lg lg:rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 active:bg-blue-100/50 transition-all group relative flex flex-col items-center text-center min-h-24 sm:min-h-28 justify-center">
                                {safeStats.upcoming > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-blue-600 text-white text-[8px] sm:text-[10px] font-black shadow-sm">
                                        {safeStats.upcoming}
                                    </span>
                                )}
                                <div className="bg-blue-50 w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-none sm:rounded-lg flex items-center justify-center text-blue-600 mb-2 sm:mb-3 group-hover:scale-110 transition-transform flex-shrink-0">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <h4 className="font-black text-xs sm:text-sm lg:text-base text-gray-900">Upcoming</h4>
                                <p className="text-[8px] sm:text-[9px] lg:text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1 whitespace-nowrap">Renewals</p>
                            </Link>

                            {/* HISTORY */}
                            <Link href={route('developer.payments.history')} className="bg-white p-3 sm:p-4 lg:p-6 rounded-none sm:rounded-lg lg:rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50/50 active:bg-gray-100/50 transition-all group flex flex-col items-center text-center min-h-24 sm:min-h-28 justify-center">
                                <div className="bg-gray-100 w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-none sm:rounded-lg flex items-center justify-center text-gray-600 mb-2 sm:mb-3 group-hover:scale-110 transition-transform flex-shrink-0">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                </div>
                                <h4 className="font-black text-xs sm:text-sm lg:text-base text-gray-900">History</h4>
                                <p className="text-[8px] sm:text-[9px] lg:text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1 whitespace-nowrap">Payment Log</p>
                            </Link>

                        </div>
                    </div>

                    {/* NEW ROW: Platform Health & System Controls */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 pt-2 sm:pt-4 lg:pt-6">

                        {/* PLATFORM HEALTH & USAGE */}
                        <div className="lg:col-span-2 bg-white p-4 sm:p-6 lg:p-8 rounded-none sm:rounded-xl border-y sm:border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="text-gray-900 font-black text-sm sm:text-base lg:text-lg mb-1 uppercase tracking-widest">Platform Health</h3>
                                <p className="text-[9px] sm:text-xs text-gray-400 font-medium mb-4 sm:mb-6 lg:mb-8">System capacity and tenant metrics.</p>

                                <div className="space-y-4 sm:space-y-6">
                                    {/* Tenant Distribution */}
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-[8px] sm:text-xs font-black text-gray-500 uppercase tracking-widest">Tenant Distribution</span>
                                            <span className="text-[9px] sm:text-xs font-bold text-gray-900">{activePercentage}% Active</span>
                                        </div>
                                        <div className="w-full bg-red-100 rounded-full h-2 sm:h-2.5 flex overflow-hidden">
                                            <div className="bg-green-500 h-full transition-all duration-1000 ease-out" style={{ width: `${activePercentage}%` }}></div>
                                            <div className="bg-red-500 h-full transition-all duration-1000 ease-out" style={{ width: `${suspendedPercentage}%` }}></div>
                                        </div>
                                        <div className="flex justify-between mt-2 text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase">
                                            <span>{safeStats.active_stores} Active</span>
                                            <span>{safeStats.suspended_stores} Suspended</span>
                                        </div>
                                    </div>

                                    {/* Mock System Uptime */}
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-[8px] sm:text-xs font-black text-gray-500 uppercase tracking-widest">Server Uptime (30D)</span>
                                            <span className="text-[9px] sm:text-xs font-bold text-green-500">99.98%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 sm:h-2.5">
                                            <div className="bg-blue-500 h-full rounded-full w-[99.98%]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
                                    </span>
                                    All Systems OK
                                </span>
                            </div>
                        </div>

                        {/* SYSTEM CONTROLS / SHORTCUTS */}
                        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-none sm:rounded-xl border-y sm:border border-gray-100 shadow-sm">
                            <h3 className="text-gray-900 font-black text-sm sm:text-base lg:text-lg mb-1 uppercase tracking-widest">System Controls</h3>
                            <p className="text-[9px] sm:text-xs text-gray-400 font-medium mb-4 sm:mb-6">Quick access to configuration.</p>

                            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                                <Link href={route('developer.broadcasts')} className="flex items-center justify-between p-2.5 sm:p-3 lg:p-4 rounded-none sm:rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 active:bg-blue-100/30 transition-all group min-h-16 sm:min-h-auto">
                                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
                                        <div className="bg-blue-100 text-blue-600 p-2 sm:p-2.5 rounded-none sm:rounded-lg group-hover:scale-110 transition-transform flex-shrink-0">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-5 lg:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-xs sm:text-sm lg:text-base text-gray-900 truncate">Broadcasts</h4>
                                            <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">Send Alerts</p>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                </Link>

                                <Link href={route('developer.billing')} className="flex items-center justify-between p-2.5 sm:p-3 lg:p-4 rounded-none sm:rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 active:bg-blue-100/30 transition-all group min-h-16 sm:min-h-auto">
                                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
                                        <div className="bg-indigo-100 text-indigo-600 p-2 sm:p-2.5 rounded-none sm:rounded-lg group-hover:scale-110 transition-transform flex-shrink-0">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-5 lg:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-xs sm:text-sm lg:text-base text-gray-900 truncate">Pricing</h4>
                                            <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">Subscriptions</p>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                </Link>

                                <Link href={route('developer.system.info')} className="flex items-center justify-between p-2.5 sm:p-3 lg:p-4 rounded-none sm:rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 active:bg-blue-100/30 transition-all group min-h-16 sm:min-h-auto">
                                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
                                        <div className="bg-gray-100 text-gray-600 p-2 sm:p-2.5 rounded-none sm:rounded-lg group-hover:scale-110 transition-transform flex-shrink-0">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-5 lg:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-xs sm:text-sm lg:text-base text-gray-900 truncate">Settings</h4>
                                            <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">Global Config</p>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                </Link>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}