import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function History({ auth, history, filters = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    const isMounted = useRef(false);

    // --- REAL-TIME POLLING (5 SECONDS) ---
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['history'], // Only refresh the table data
                preserveScroll: true,
                preserveState: true
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // --- SEARCH & FILTER DEBOUNCE (BUG FIXED) ---
    useEffect(() => {
        // Prevent running on the initial page load
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        const timer = setTimeout(() => {
            router.get(route('developer.payments.history'),
                {
                    // Pass undefined for empty strings so they are removed from the URL
                    search: search || undefined,
                    status: status || undefined,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined
                },
                {
                    preserveState: true,
                    replace: true,
                    preserveScroll: true,
                    // FIX: We must include 'filters' here so Inertia updates the prop!
                    only: ['history', 'filters']
                }
            );
        }, 500);

        return () => clearTimeout(timer);
    }, [search, status, startDate, endDate]);

    const getStatusStyle = (status) => {
        if (status === 'approved') return 'bg-green-100 text-green-700 border-green-200';
        if (status === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
            a.download = 'payment-history.pdf';
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

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 uppercase tracking-widest">Transaction History</h2>}>
            <Head title="Payment History" />

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
                                    placeholder="Search Store, Owner, or Ref..."
                                    className="block w-full pl-11 pr-4 py-3 border-gray-200 rounded-none sm:rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium shadow-sm"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="w-full lg:w-40">
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                    className="block w-full py-3 px-4 border-gray-200 rounded-none sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-black text-gray-600 uppercase tracking-widest shadow-sm cursor-pointer"
                                >
                                    <option value="">All Status</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            {/* Date Range Filters */}
                            <div className="flex w-full lg:w-auto items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full lg:w-auto py-3 px-4 border-gray-200 rounded-none sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-600 shadow-sm"
                                />
                                <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">To</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full lg:w-auto py-3 px-4 border-gray-200 rounded-none sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-600 shadow-sm"
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

                    {history.data.length === 0 ? (
                        /* EMPTY STATE */
                        <div className="bg-white p-20 rounded-none sm:rounded-xl text-center border-2 border-dashed border-gray-200 animate-in fade-in duration-300 border-y sm:border-y-0 w-full">
                            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest italic">No historical records found</h3>
                            {(search || status || startDate || endDate) && (
                                <button
                                    onClick={() => { setSearch(''); setStatus(''); setStartDate(''); setEndDate(''); }}
                                    className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                                >
                                    Clear All Filters
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
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Receipt</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Store & Administrator</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Reference</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Date Processed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {history.data.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-center">
                                                    {p.receipt_path ? (
                                                        <img
                                                            onClick={() => setSelectedReceipt(p.receipt_path)}
                                                            src={`/storage/${p.receipt_path}`}
                                                            className="h-12 w-12 object-cover rounded-none sm:rounded-lg cursor-zoom-in border-2 border-white shadow-sm hover:scale-105 transition-transform mx-auto"
                                                            alt="Receipt"
                                                        />
                                                    ) : (
                                                        <div className="h-12 w-12 rounded-none sm:rounded-lg bg-gray-100 flex items-center justify-center mx-auto border-2 border-white shadow-sm">
                                                            <span className="text-[8px] font-bold text-gray-400">N/A</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(p.status)}`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">{p.store.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                                                        {p.store.users?.[0]?.name || p.full_name} • <span className="lowercase normal-case">{p.store.users?.[0]?.email || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-gray-900 tracking-tighter text-sm">
                                                    ₱{parseFloat(p.amount).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-none sm:rounded-lg inline-block border border-blue-100">
                                                        {p.reference_number}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="text-xs text-gray-900 font-bold">
                                                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                                        {new Date(p.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* --- MOBILE/TABLET VIEW (Cards) --- */}
                            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                                {history.data.map(p => (
                                    <div key={p.id} className="bg-white p-6 rounded-none sm:rounded-xl border border-y sm:border-y-0 border-gray-100 shadow-sm space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex items-center gap-4 min-w-0">
                                                {p.receipt_path ? (
                                                    <img
                                                        onClick={() => setSelectedReceipt(p.receipt_path)}
                                                        src={`/storage/${p.receipt_path}`}
                                                        className="h-16 w-16 object-cover rounded-none sm:rounded-lg cursor-zoom-in shadow-sm border border-gray-50 shrink-0"
                                                        alt="Receipt"
                                                    />
                                                ) : (
                                                    <div className="h-16 w-16 rounded-none sm:rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-50 shadow-sm">
                                                        <span className="text-[10px] font-bold text-gray-400">N/A</span>
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-lg text-gray-900 leading-tight truncate">{p.store.name}</h3>
                                                    <p className="text-blue-600 font-black text-sm tracking-tighter mt-1">₱{parseFloat(p.amount).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <span className={`shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(p.status)}`}>
                                                {p.status}
                                            </span>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-none sm:rounded-lg space-y-2 text-[10px] font-bold border border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 uppercase tracking-widest">Admin:</span>
                                                <span className="text-gray-900 truncate ml-2">{p.store.users?.[0]?.name || p.full_name}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 uppercase tracking-widest">Reference:</span>
                                                <span className="font-mono text-blue-600 px-2 py-0.5 bg-blue-50/50 rounded-none sm:rounded-lg">{p.reference_number}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                                                <span className="text-gray-400 uppercase tracking-widest">Processed On:</span>
                                                <span className="text-gray-900 text-right">
                                                    {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    <span className="block text-[8px] text-gray-400">
                                                        {new Date(p.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* --- PAGINATION --- */}
                            {history.links && history.links.length > 3 && (
                                <div className="mt-8 flex justify-center items-center gap-1 flex-wrap">
                                    {history.links.map((link, i) => {
                                        const currentIndex = history.links.findIndex(l => l.active);
                                        const isFirst = i === 0;
                                        const isLast = i === history.links.length - 1;
                                        const isCurrent = link.active;
                                        const isAdjacent = Math.abs(i - currentIndex) <= 1;
                                        const isNavButton = link.label === '&laquo;' || link.label === '&raquo;';

                                        // Show first, last, current, adjacent pages, and nav buttons
                                        const show = isFirst || isLast || isCurrent || isAdjacent || isNavButton;

                                        if (!show) {
                                            // Show ellipsis between gaps
                                            if (i > 1 && i < currentIndex - 1) {
                                                if (i === 2 && !history.links[1].active) return <span key={`ellipsis-${i}`} className="px-2 text-gray-400 font-bold">...</span>;
                                            }
                                            if (i < history.links.length - 2 && i > currentIndex + 1) {
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

            {/* LIGHTBOX FOR RECEIPT IMAGE */}
            {selectedReceipt && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)}></div>
                    <div className="relative max-w-4xl w-full max-h-full flex flex-col items-center">
                        <button onClick={() => setSelectedReceipt(null)} className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold uppercase text-xs">
                            Close Preview <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <img src={`/storage/${selectedReceipt}`} className="max-w-full max-h-[80vh] object-contain rounded-none sm:rounded-lg shadow-2xl border-4 border-white/10" alt="Full Receipt" />
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}