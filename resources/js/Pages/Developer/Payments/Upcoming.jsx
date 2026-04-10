import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Upcoming({ auth, stores, plans = [], filters = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    // FIX: Force 'days' to be a string so '7' matches the Laravel default exactly
    const [days, setDays] = useState(filters.days ? String(filters.days) : '7');
    const [plan, setPlan] = useState(filters.plan || '');
    const [isExporting, setIsExporting] = useState(false);

    const isMounted = useRef(false);

    // --- REAL-TIME POLLING (5 SECONDS) ---
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['stores'],
                preserveScroll: true,
                preserveState: true
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // --- SEARCH & FILTER DEBOUNCE (NO PAGE REFRESH) ---
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        const timer = setTimeout(() => {
            router.get(route('developer.payments.upcoming'),
                {
                    search: search || undefined,
                    days: days || undefined,
                    plan: plan || undefined
                },
                {
                    preserveState: true,
                    replace: true,
                    preserveScroll: true,
                    only: ['stores', 'filters']
                }
            );
        }, 500);

        return () => clearTimeout(timer);
    }, [search, days, plan]);

    const handleSendReminder = (store) => {
        Swal.fire({
            title: 'Send Bill?',
            text: `Email a renewal link to ${store.name}?`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Yes, Send Now',
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Sending Reminder',
                    html: 'Please wait while we notify the owner...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); },
                });

                router.post(route('developer.stores.remind', store.id), {}, {
                    onSuccess: () => Swal.fire('Sent!', `Reminder link sent to ${store.name}.`, 'success'),
                    onError: () => Swal.close()
                });
            }
        });
    };

    const handleExport = async (e) => {
        e.preventDefault();
        setIsExporting(true);
        try {
            const response = await fetch(route('developer.payments.export'));
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'upcoming-renewals.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const getDaysRemaining = (dateString) => {
        const diff = new Date(dateString) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days <= 0 ? 0 : days;
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 uppercase tracking-widest">Upcoming Renewals</h2>}>
            <Head title="Upcoming Renewals" />

            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* SEARCH & FILTER HEADER */}
                    <div className="flex flex-col xl:flex-row flex-wrap justify-between items-start xl:items-center gap-4 mb-6">

                        <div className="flex flex-col lg:flex-row flex-wrap items-center gap-3 w-full xl:w-auto flex-1">
                            {/* Search Input */}
                            <div className="relative w-full lg:flex-1 lg:min-w-[280px] group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search Store, Owner, or Email..."
                                    className="block w-full pl-11 pr-4 py-3 border-gray-200 rounded-none sm:rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium shadow-sm"
                                />
                            </div>

                            {/* Plan Filter */}
                            <div className="w-full lg:w-40">
                                <select
                                    value={plan}
                                    onChange={e => setPlan(e.target.value)}
                                    className="block w-full py-3 px-4 border-gray-200 rounded-none sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-black text-gray-600 uppercase tracking-widest shadow-sm cursor-pointer"
                                >
                                    <option value="">All Plans</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Days Range Filter */}
                            <div className="w-full lg:w-40">
                                <select
                                    value={days}
                                    onChange={e => setDays(e.target.value)}
                                    className="block w-full py-3 px-4 border-gray-200 rounded-none sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-black text-gray-600 uppercase tracking-widest shadow-sm cursor-pointer"
                                >
                                    <option value="7">Next 7 Days</option>
                                    <option value="30">Next 30 Days</option>
                                    <option value="90">Next 90 Days</option>
                                    <option value="365">Next 12 Months</option>
                                </select>
                            </div>
                        </div>

                        {/* EXPORT BUTTON */}
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full xl:w-auto flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-none sm:rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExporting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export PDF
                                </>
                            )}
                        </button>
                    </div>

                    {stores.data.length === 0 ? (
                        /* EMPTY STATE */
                        <div className="bg-white p-20 rounded-none sm:rounded-xl text-center border-y sm:border-y-0 border-2 border-dashed border-gray-200 animate-in fade-in duration-300">
                            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest italic">No upcoming renewals found</h3>
                            {(search || days !== '7' || plan) && (
                                <button
                                    onClick={() => { setSearch(''); setDays('7'); setPlan(''); }}
                                    className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                                >
                                    Clear All Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* --- DESKTOP VIEW (Table) --- */}
                            <div className="hidden lg:block bg-white rounded-none sm:rounded-xl shadow-sm border-y sm:border-y-0 border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Due In</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Store & Administrator</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Plan</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount Due</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {stores.data.map(s => {
                                            const daysLeft = getDaysRemaining(s.subscription_ends_at);
                                            const isUrgent = daysLeft <= 7;

                                            return (
                                                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-4 text-center">
                                                        <div className={`w-12 h-12 mx-auto rounded-none sm:rounded-lg flex flex-col items-center justify-center border-2 shadow-sm ${isUrgent ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                                            <span className="font-black text-lg leading-none">{daysLeft}</span>
                                                            <span className="text-[8px] font-black uppercase">Days</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-black text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">{s.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                                                            {s.users?.[0]?.name || 'No Owner'} • <span className="lowercase normal-case">{s.users?.[0]?.email || 'N/A'}</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 font-medium mt-1">
                                                            Ends: <span className="font-bold text-gray-700">{new Date(s.subscription_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="px-3 py-1 rounded-none sm:rounded-full text-[9px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-widest shadow-sm">
                                                            {s.plan?.name || 'Unknown Plan'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-gray-900 tracking-tighter text-sm">
                                                        ₱{parseFloat(s.plan?.price || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleSendReminder(s)}
                                                            className="bg-gray-900 text-white px-5 py-2.5 rounded-none sm:rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-md transition-all active:scale-95"
                                                        >
                                                            Send Bill
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* --- MOBILE/TABLET VIEW (Cards) --- */}
                            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stores.data.map(s => {
                                    const daysLeft = getDaysRemaining(s.subscription_ends_at);
                                    const isUrgent = daysLeft <= 7;

                                    return (
                                        <div key={s.id} className="bg-white p-6 rounded-none sm:rounded-xl border-y sm:border-y-0 border border-gray-100 shadow-sm space-y-4 animate-in slide-in-from-bottom-4 duration-300">

                                            <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-lg text-gray-900 leading-tight truncate">{s.name}</h3>
                                                    <p className="text-blue-600 font-black text-sm tracking-tighter mt-1">₱{parseFloat(s.plan?.price || 0).toLocaleString()}</p>
                                                </div>
                                                <div className={`shrink-0 w-12 h-12 rounded-none sm:rounded-lg flex flex-col items-center justify-center border-2 shadow-sm ${isUrgent ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                                    <span className="font-black text-lg leading-none">{daysLeft}</span>
                                                    <span className="text-[8px] font-black uppercase">Days</span>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-4 rounded-none sm:rounded-lg space-y-2 text-[10px] font-bold border border-gray-100">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 uppercase tracking-widest">Admin:</span>
                                                    <span className="text-gray-900 truncate ml-2">{s.users?.[0]?.name || 'No Owner'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 uppercase tracking-widest">Current Plan:</span>
                                                    <span className="text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-none sm:rounded-lg border border-indigo-100">{s.plan?.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                                                    <span className="text-gray-400 uppercase tracking-widest">Due Date:</span>
                                                    <span className="text-gray-900 text-right">
                                                        {new Date(s.subscription_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleSendReminder(s)}
                                                className="w-full py-3 bg-gray-900 text-white rounded-none sm:rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-black transition-all active:scale-95"
                                            >
                                                Send Bill Reminder
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* --- PAGINATION --- */}
                            {stores.links && stores.links.length > 3 && (
                                <div className="mt-8 flex justify-center items-center gap-1 flex-wrap">
                                    {stores.links.map((link, i) => {
                                        const currentIndex = stores.links.findIndex(l => l.active);
                                        const isFirst = i === 0;
                                        const isLast = i === stores.links.length - 1;
                                        const isCurrent = link.active;
                                        const isAdjacent = Math.abs(i - currentIndex) <= 1;
                                        const isNavButton = link.label === '&laquo;' || link.label === '&raquo;';

                                        // Show first, last, current, adjacent pages, and nav buttons
                                        const show = isFirst || isLast || isCurrent || isAdjacent || isNavButton;

                                        if (!show) {
                                            // Show ellipsis between gaps
                                            if (i > 1 && i < currentIndex - 1) {
                                                if (i === 2 && !stores.links[1].active) return <span key={`ellipsis-${i}`} className="px-2 text-gray-400 font-bold">...</span>;
                                            }
                                            if (i < stores.links.length - 2 && i > currentIndex + 1) {
                                                if (i === currentIndex + 2) return <span key={`ellipsis-${i}`} className="px-2 text-gray-400 font-bold">...</span>;
                                            }
                                            return null;
                                        }

                                        return (
                                            <Link
                                                key={i}
                                                href={link.url || '#'}
                                                preserveScroll
                                                className={`px-2 sm:px-4 py-2 text-[10px] font-black rounded-none sm:rounded-lg border transition-all ${
                                                    link.active
                                                        ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                                        : link.url
                                                            ? 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                                                            : 'bg-transparent text-gray-300 border-transparent cursor-not-allowed'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}