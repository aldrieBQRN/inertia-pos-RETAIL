import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';

const renderPaymentMethodBadge = (method) => {
    const m = method?.toLowerCase();
    if (m === 'gcash') {
        return (
            <span className="inline-flex items-center justify-center bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter select-none leading-none shrink-0 font-mono ml-2">
                GCash
            </span>
        );
    }
    if (m === 'maya') {
        return (
            <span className="inline-flex items-center justify-center bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter select-none leading-none shrink-0 font-mono ml-2">
                Maya
            </span>
        );
    }
    return null;
};

export default function Pending({ auth, payments }) {
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // --- REAL-TIME POLLING (5 SECONDS) ---
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['payments'],
                preserveScroll: true,
                preserveState: true
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // --- FILTER LOGIC ---
    const filteredPayments = payments.data.filter(p =>
        p.store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reference_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const rejectionReasons = {
        'Receipt image is blurry or unreadable.': 'Blurry/Unreadable Receipt',
        'Reference Number mismatch.': 'Ref Number Mismatch',
        'Incorrect amount paid for selected plan.': 'Wrong Amount Paid',
        'GCash/Bank account name does not match sender.': 'Account Name Mismatch',
        'Duplicate receipt submission detected.': 'Duplicate Submission',
        'Other': 'Other (Specify below...)'
    };

    const showLoading = (title) => {
        Swal.fire({
            title: title,
            html: 'Please wait while we process the request...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
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
            a.download = 'pending-payments.pdf';
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

    // --- APPROVAL HANDLER ---
    const handleApprove = (payment) => {
        Swal.fire({
            title: 'Confirm Approval',
            text: `Approve ₱${parseFloat(payment.amount).toLocaleString()} for ${payment.store.name}?`,
            icon: 'success',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Yes, Approve & Notify',
        }).then((result) => {
            if (result.isConfirmed) {
                showLoading('Approving Subscription');
                router.post(route('developer.payments.approve', payment.id), {}, {
                    onSuccess: () => Swal.fire('Approved!', 'Subscription extended and owner notified.', 'success'),
                    onError: () => Swal.close(),
                });
            }
        });
    };

    // --- REJECTION HANDLER (Dual Field Alert) ---
    const handleReject = (payment) => {
        Swal.fire({
            title: 'Reject Payment',
            icon: 'warning',
            html: `
                <div class="text-left space-y-4">
                    <div>
                        <label class="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Primary Reason</label>
                        <select id="reject-dropdown" class="swal2-select w-full m-0 rounded-lg border-gray-200 text-sm font-bold shadow-sm">
                            <option value="">-- Select Reason --</option>
                            ${Object.entries(rejectionReasons).map(([val, label]) => `<option value="${val}">${label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mt-4">
                        <label class="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Additional Details / Custom Reason</label>
                        <textarea id="reject-custom" class="swal2-textarea w-full m-0 rounded-lg border-gray-200 text-sm p-3 h-24 shadow-sm" placeholder="Provide specific details for the tenant..."></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Reject & Notify',
            preConfirm: () => {
                const dropdown = document.getElementById('reject-dropdown').value;
                const custom = document.getElementById('reject-custom').value;
                if (!dropdown) { Swal.showValidationMessage('Please select a primary reason'); return false; }
                if (dropdown === 'Other' && !custom.trim()) { Swal.showValidationMessage('Please specify the reason'); return false; }
                return custom.trim() ? `${dropdown}: ${custom.trim()}` : dropdown;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                showLoading('Rejecting Payment');
                router.post(route('developer.payments.reject', payment.id), {
                    reason: result.value
                }, {
                    onSuccess: () => Swal.fire('Rejected', 'Owner has been notified.', 'info'),
                    onError: () => Swal.close(),
                });
            }
        });
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 uppercase tracking-widest">Pending Approvals</h2>}>
            <Head title="Pending Approvals" />

            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* TOP ACTION BAR: SEARCH + EXPORT */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="w-full md:w-96 relative group">
                            <input
                                type="text"
                                placeholder="Search store, admin, or reference..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-none sm:rounded-lg border-gray-200 py-3 pl-10 text-sm focus:ring-blue-500 shadow-sm transition-all"
                            />
                            <svg className="w-4 h-4 absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* EXPORT PENDING LIST (PDF) */}
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-none sm:rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    Export Pending List (PDF)
                                </>
                            )}
                        </button>
                    </div>

                    {payments.data.length === 0 ? (
                        /* GLOBAL EMPTY STATE */
                        <div className="bg-white p-20 rounded-none sm:rounded-xl text-center border-2 border-dashed border-gray-200 border-y sm:border-y-0 w-full">
                            <h3 className="text-gray-400 font-bold italic uppercase tracking-widest text-xs">No pending approvals in queue</h3>
                        </div>
                    ) : (
                        <>
                            {/* --- DESKTOP VIEW (Table) --- */}
                            <div className="hidden lg:block bg-white rounded-none sm:rounded-xl shadow-sm border border-y sm:border-y-0 border-gray-100 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Receipt</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Store & Admin</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Plan</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredPayments.length > 0 ? (
                                            filteredPayments.map(p => (
                                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group/row">
                                                    <td className="px-6 py-4 text-center">
                                                        <img
                                                            onClick={() => setSelectedReceipt(p.receipt_path)}
                                                            src={`/storage/${p.receipt_path}`}
                                                            className="h-14 w-14 object-cover rounded-none sm:rounded-lg cursor-zoom-in border-2 border-white shadow-sm hover:scale-105 transition-transform mx-auto"
                                                        />
                                                    </td>
                                                     <td className="px-6 py-4">
                                                         <div className="font-black text-gray-900 text-sm leading-tight">{p.store.name}</div>
                                                         <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{p.full_name}</div>
                                                         <div className="flex items-center gap-1.5 mt-0.5">
                                                             <span className="text-[9px] font-mono text-blue-600">Ref: {p.reference_number}</span>
                                                             {renderPaymentMethodBadge(p.payment_method)}
                                                         </div>
                                                     </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-[10px]">
                                                            <span className="font-bold text-gray-400 italic line-through">{p.store.plan?.name}</span>
                                                            <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                            <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-none sm:rounded-lg border border-blue-100 uppercase">{p.plan?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-black text-gray-900 tracking-tighter text-sm">₱{parseFloat(p.amount).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleReject(p)} className="p-2 text-red-500 hover:bg-red-50 rounded-none sm:rounded-lg transition-colors" title="Reject Payment">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                            <button onClick={() => handleApprove(p)} className="bg-green-600 text-white px-5 py-2 rounded-none sm:rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-100 transition-all">
                                                                Approve
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            /* SEARCH EMPTY STATE IN TABLE */
                                            <tr>
                                                <td colSpan="5" className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <svg className="w-12 h-12 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                        <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest italic">No matching payments found</h3>
                                                        <button onClick={() => setSearchTerm('')} className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">Clear Search Filter</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* --- MOBILE/TABLET VIEW (Cards) --- */}
                            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredPayments.length > 0 ? (
                                    filteredPayments.map(p => (
                                        <div key={p.id} className="bg-white p-6 rounded-none sm:rounded-xl border border-y sm:border-y-0 border-gray-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-4">
                                                <img onClick={() => setSelectedReceipt(p.receipt_path)} src={`/storage/${p.receipt_path}`} className="h-20 w-20 object-cover rounded-none sm:rounded-lg cursor-zoom-in shadow-sm border border-gray-50" />
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-lg text-gray-900 leading-tight truncate">{p.store.name}</h3>
                                                    <p className="text-[10px] font-black text-blue-600 uppercase mt-1 tracking-widest">₱{parseFloat(p.amount).toLocaleString()}</p>
                                                </div>
                                            </div>

                                            {/* Responsive Info Block */}
                                            <div className="bg-gray-50 p-4 rounded-none sm:rounded-lg space-y-2 text-[10px] font-bold">
                                                <div className="flex justify-between items-center"><span className="text-gray-400 uppercase tracking-widest">Admin:</span> <span className="text-gray-900">{p.full_name}</span></div>
                                                 <div className="flex justify-between items-center">
                                                     <span className="text-gray-400 uppercase tracking-widest">Reference:</span>
                                                     <span className="flex items-center gap-1.5">
                                                         <span className="font-mono text-blue-600 px-2 py-0.5 bg-blue-50/50 rounded">{p.reference_number}</span>
                                                         {renderPaymentMethodBadge(p.payment_method)}
                                                     </span>
                                                 </div>
                                                <div className="pt-2 border-t border-gray-200">
                                                    <span className="text-gray-400 uppercase tracking-widest block mb-1">Targeting Plan:</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-400 line-through">{p.store.plan?.name}</span>
                                                        <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                        <span className="text-blue-600 uppercase bg-white px-2 py-0.5 rounded-none sm:rounded-lg border border-blue-100">{p.plan?.name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button onClick={() => handleReject(p)} className="flex-1 py-3 bg-red-50 text-red-600 rounded-none sm:rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-100">Reject</button>
                                                <button onClick={() => handleApprove(p)} className="flex-1 py-3 bg-green-600 text-white rounded-none sm:rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100">Approve</button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white p-12 rounded-none sm:rounded-xl border border-y sm:border-y-0 border-gray-100 text-center col-span-full">
                                        <p className="text-gray-400 font-black text-xs uppercase tracking-widest italic">No search results found</p>
                                    </div>
                                )}
                            </div>

                            {/* PAGINATION */}
                            {payments.links.length > 3 && (
                                <div className="flex justify-center items-center gap-1 mt-8 flex-wrap">
                                    {payments.links.map((link, i) => {
                                        const currentIndex = payments.links.findIndex(l => l.active);
                                        const isFirst = i === 0;
                                        const isLast = i === payments.links.length - 1;
                                        const isCurrent = link.active;
                                        const isAdjacent = Math.abs(i - currentIndex) <= 1;
                                        const isNavButton = link.label === '&laquo;' || link.label === '&raquo;';

                                        // Show first, last, current, adjacent pages, and nav buttons
                                        const show = isFirst || isLast || isCurrent || isAdjacent || isNavButton;

                                        if (!show) {
                                            // Show ellipsis between gaps
                                            if (i > 1 && i < currentIndex - 1) {
                                                if (i === 2 && !payments.links[1].active) return <span key={`ellipsis-${i}`} className="px-2 text-gray-400 font-bold">...</span>;
                                            }
                                            if (i < payments.links.length - 2 && i > currentIndex + 1) {
                                                if (i === currentIndex + 2) return <span key={`ellipsis-${i}`} className="px-2 text-gray-400 font-bold">...</span>;
                                            }
                                            return null;
                                        }

                                        return (
                                            <Link
                                                key={i}
                                                href={link.url || '#'}
                                                className={`px-2 sm:px-4 py-2 text-[10px] font-black rounded-none sm:rounded-lg border transition-all ${
                                                    link.active ? 'bg-gray-900 text-white border-gray-900 shadow-md' : link.url ? 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100' : 'bg-transparent text-gray-300 border-transparent cursor-not-allowed'
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

            {/* LIGHTBOX */}
            {selectedReceipt && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)}></div>
                    <div className="relative max-w-4xl w-full max-h-full flex flex-col items-center">
                        <button onClick={() => setSelectedReceipt(null)} className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold uppercase text-xs">
                            Close Preview <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <img src={`/storage/${selectedReceipt}`} className="max-w-full max-h-[80vh] object-contain rounded-none sm:rounded-lg shadow-2xl border-4 border-white/10" />
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}