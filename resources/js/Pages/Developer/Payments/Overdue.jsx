import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Overdue({ auth, stores, filters = {} }) {
    const [search, setSearch] = useState(filters.search || '');
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

    // --- SEARCH DEBOUNCE (NO PAGE REFRESH) ---
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        const timer = setTimeout(() => {
            router.get(route('developer.payments.overdue'),
                { search: search || undefined },
                {
                    preserveState: true,
                    replace: true,
                    preserveScroll: true,
                    only: ['stores', 'filters']
                }
            );
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    // --- HANDLERS ---
    const handleSendNotice = (store) => {
        Swal.fire({
            title: 'Send Final Notice?',
            text: `This will email a secure payment link to ${store.users?.[0]?.email || 'the owner'}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, Send Notice',
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Sending Notice',
                    html: 'Please wait while we notify the owner...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); },
                });
                router.post(route('developer.stores.remind', store.id), {}, {
                    onSuccess: () => Swal.fire('Sent!', 'Final notice has been delivered.', 'success'),
                    onError: () => Swal.close()
                });
            }
        });
    };

    const handleSuspend = (store) => {
        Swal.fire({
            title: 'Suspend Store?',
            text: `This will lock out ${store.name} and email ${store.users?.[0]?.email || 'the owner'} a suspension notice.`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#000000',
            cancelButtonColor: '#d1d5db',
            confirmButtonText: 'Yes, Suspend Now',
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Suspending Store',
                    html: 'Locking system and notifying owner...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); },
                });
                router.post(route('developer.stores.suspend', store.id), {}, {
                    onSuccess: () => Swal.fire('Suspended!', 'The store is locked and the email was sent.', 'success'),
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
            a.download = 'overdue-collections.pdf';
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

    const getDaysOverdue = (dateString) => {
        const diff = new Date() - new Date(dateString);
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-red-600 uppercase tracking-widest">
                Overdue Collections
            </h2>}
        >
            <Head title="Overdue Payments" />

            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* SEARCH & EXPORT HEADER */}
                    <div className="flex flex-col xl:flex-row flex-wrap justify-between items-start xl:items-center gap-4 mb-6">

                        <div className="flex flex-col lg:flex-row flex-wrap items-center gap-3 w-full xl:w-auto flex-1">
                            {/* Search Input */}
                            <div className="relative w-full lg:min-w-[350px] group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by Store, Admin, or Email..."
                                    className="block w-full pl-11 pr-4 py-3 border-gray-200 rounded-none sm:rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-medium shadow-sm"
                                />
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
                                    <svg className="animate-spin h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export PDF
                                </>
                            )}
                        </button>
                    </div>

                    {stores.data.length === 0 ? (
                        /* EMPTY STATE */
                        <div className="bg-white p-20 rounded-none sm:rounded-xl text-center border-2 border-dashed border-gray-200 animate-in fade-in duration-300 border-y sm:border-y-0 w-full">
                            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest italic">All Accounts Paid</h3>
                            <p className="text-gray-400 text-xs mt-1">There are no overdue tenants currently in the system.</p>
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                                >
                                    Clear Search Filter
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* --- DESKTOP VIEW (Table) --- */}
                            <div className="hidden lg:block bg-white rounded-none sm:rounded-xl shadow-sm border border-y sm:border-y-0 border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Overdue By</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Store & Administrator</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount Due</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {stores.data.map(s => {
                                            const days = getDaysOverdue(s.subscription_ends_at);

                                            return (
                                                <tr key={s.id} className={`transition-colors group ${s.status ? 'hover:bg-red-50/30' : 'bg-gray-50 opacity-90'}`}>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className={`w-12 h-12 mx-auto rounded-none sm:rounded-lg flex flex-col items-center justify-center border-2 shadow-sm ${s.status ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-200 border-gray-300 text-gray-500'}`}>
                                                            <span className="font-black text-lg leading-none">{days}</span>
                                                            <span className="text-[8px] font-black uppercase">Days</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={`font-black text-sm leading-tight transition-colors ${s.status ? 'text-gray-900 group-hover:text-red-600' : 'text-gray-500'}`}>{s.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                                                            {s.users?.[0]?.name || 'Unknown'} • <span className="lowercase normal-case">{s.users?.[0]?.email || 'N/A'}</span>
                                                        </div>
                                                        <div className={`text-[10px] font-medium mt-1 ${s.status ? 'text-red-500' : 'text-gray-400'}`}>
                                                            Expired: <span className="font-bold">{new Date(s.subscription_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {s.status ? (
                                                            <span className="px-3 py-1 rounded-none sm:rounded-full text-[9px] font-black bg-orange-50 text-orange-600 border border-orange-100 uppercase tracking-widest shadow-sm">
                                                                Active (Grace Period)
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 rounded-none sm:rounded-full text-[9px] font-black bg-gray-200 text-gray-600 border border-gray-300 uppercase tracking-widest shadow-sm">
                                                                Suspended
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black tracking-tighter text-sm">
                                                        <div className={s.status ? 'text-gray-900' : 'text-gray-400'}>
                                                            ₱{parseFloat(s.plan?.price || 0).toLocaleString()}
                                                        </div>
                                                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{s.plan?.name}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {s.status ? (
                                                                <button
                                                                    onClick={() => handleSuspend(s)}
                                                                    className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-md transition-all active:scale-95"
                                                                >
                                                                    Suspend
                                                                </button>
                                                            ) : (
                                                                <div className="px-4 py-2 rounded-none sm:rounded-lg text-[10px] font-black text-red-700 bg-red-100 border border-red-200 uppercase tracking-widest cursor-not-allowed">
                                                                    Locked
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => handleSendNotice(s)}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 ${s.status ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-100' : 'bg-gray-400 text-white hover:bg-gray-500 shadow-gray-100'}`}
                                                            >
                                                                Notice
                                                            </button>
                                                        </div>
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
                                    const days = getDaysOverdue(s.subscription_ends_at);

                                    return (
                                        <div key={s.id} className={`p-6 rounded-none sm:rounded-xl border-y sm:border-y-0 border shadow-sm space-y-4 animate-in slide-in-from-bottom-4 duration-300 ${s.status ? 'bg-white border-red-100' : 'bg-gray-50 border-gray-200 opacity-90'}`}>

                                            <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0">
                                                    <h3 className={`font-black text-lg leading-tight truncate ${s.status ? 'text-gray-900' : 'text-gray-500'}`}>{s.name}</h3>
                                                    <p className={`font-black text-sm tracking-tighter mt-1 ${s.status ? 'text-red-600' : 'text-gray-400'}`}>₱{parseFloat(s.plan?.price || 0).toLocaleString()}</p>
                                                </div>
                                                <div className={`shrink-0 w-12 h-12 rounded-none sm:rounded-lg flex flex-col items-center justify-center border-2 shadow-sm ${s.status ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-200 border-gray-300 text-gray-500'}`}>
                                                    <span className="font-black text-lg leading-none">{days}</span>
                                                    <span className="text-[8px] font-black uppercase">Days</span>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-4 rounded-none sm:rounded-lg space-y-2 text-[10px] font-bold border border-gray-200/60">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 uppercase tracking-widest">Admin:</span>
                                                    <span className="text-gray-900 truncate ml-2">{s.users?.[0]?.name || 'Unknown'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 uppercase tracking-widest">Status:</span>
                                                    {s.status ? (
                                                        <span className="text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded-none sm:rounded-lg border border-orange-100">Active (Grace)</span>
                                                    ) : (
                                                        <span className="text-gray-600 uppercase bg-gray-200 px-2 py-0.5 rounded-none sm:rounded-lg border border-gray-300">Suspended</span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                                                    <span className="text-gray-400 uppercase tracking-widest">Expired On:</span>
                                                    <span className="text-red-600 text-right">
                                                        {new Date(s.subscription_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {s.status ? (
                                                    <button
                                                        onClick={() => handleSuspend(s)}
                                                        className="bg-gray-900 text-white px-4 py-2 rounded-none sm:rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-md transition-all active:scale-95"
                                                    >
                                                        Suspend
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 py-3 bg-red-100 text-red-700 border border-red-200 rounded-none sm:rounded-lg text-[10px] font-black uppercase tracking-widest text-center cursor-not-allowed">
                                                        Locked
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => handleSendNotice(s)}
                                                    className={`flex-1 py-3 rounded-none sm:rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 ${s.status ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-100' : 'bg-gray-400 text-white hover:bg-gray-500 shadow-gray-100'}`}
                                                >
                                                    Send Notice
                                                </button>
                                            </div>
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
                                                        ? 'bg-red-600 text-white border-red-600 shadow-md'
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