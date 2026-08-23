import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import axios from 'axios';
import Swal from 'sweetalert2';
import usePrinterStore from '@/Stores/usePrinterStore';

export default function ShiftModal({ isOpen, settings, onClose, onShiftCompleted }) {
    const [amount, setAmount] = useState('');
    const [expenses, setExpenses] = useState('');
    const [closingNotes, setClosingNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [summary, setSummary] = useState(null);

    const printZRead = usePrinterStore((state) => state.printZRead);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setExpenses('');
            setClosingNotes('');
            setSummary(null);
            setIsLoggingOut(false);
        }
    }, [isOpen]);

    const formatCurrency = (val) => Number(val || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const handleFinalDone = () => {
        setIsLoggingOut(true);
        router.post('/logout', {}, {
            onSuccess: () => {
                if (onShiftCompleted) onShiftCompleted(null);
                onClose();
            },
            onError: () => {
                setIsLoggingOut(false);
                Swal.fire('Error', 'Failed to log out cleanly.', 'error');
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const enteredActual = parseFloat(amount);
        if (isNaN(enteredActual) || enteredActual < 0) {
            Swal.fire('Invalid Count', 'Please enter a valid actual cash count.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                actual_cash: enteredActual,
                expenses: parseFloat(expenses || 0),
                closing_notes: closingNotes.trim()
            };

            const res = await axios.post('/api/shift/close', payload);
            setSummary(res.data);
            if (onShiftCompleted) {
                onShiftCompleted(res.data);
            }
            window.dispatchEvent(new CustomEvent('shift-refresh'));
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Something went wrong while closing shift.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
            {/* Clickable backdrop to close */}
            <div className="absolute inset-0" onClick={onClose}></div>

            {/* Modal Container */}
            <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 border border-gray-100 animate-in zoom-in-95 duration-200">

                {/* Mobile Drag Handle Indicator */}
                <div className="sm:hidden flex justify-center pt-3 pb-1 bg-[#1B3B6A] w-full shrink-0 cursor-pointer" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
                </div>

                <div className="px-6 py-4.5 text-white flex justify-between items-center bg-[#1B3B6A] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight">{summary ? 'Z-Read Audit Summary' : 'Close Work Shift'}</h2>
                            <p className="text-xs text-white/70 font-medium">{summary ? `Shift #${summary.id} Closed` : 'Reconcile drawer cash before logout'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar bg-white">
                    {summary ? (
                        <div className="space-y-4 pb-4 sm:pb-0">
                            {/* DRAWER RECONCILIATION */}
                            <div className="bg-gray-50 p-5 rounded-2xl space-y-2.5 border border-gray-100 text-xs sm:text-sm shadow-inner">
                                <div className="text-[10px] uppercase font-black text-gray-400 tracking-widest pb-1 border-b border-gray-200/60">
                                    Cash Drawer Reconciliation
                                </div>

                                <div className="flex justify-between items-center text-gray-600">
                                    <span className="font-medium">Starting Cash Float</span>
                                    <span className="font-bold text-gray-800">₱{formatCurrency(summary.starting_cash)}</span>
                                </div>

                                <div className="flex justify-between items-center text-emerald-600">
                                    <span className="font-medium">+ Cash Sales Collected</span>
                                    <span className="font-black">+₱{formatCurrency(summary.cash_sales)}</span>
                                </div>

                                {Number(summary.cash_in || 0) > 0 && (
                                    <div className="flex justify-between items-center text-emerald-600">
                                        <span className="font-medium">+ Cash In / Float Top-up</span>
                                        <span className="font-black">+₱{formatCurrency(summary.cash_in)}</span>
                                    </div>
                                )}

                                {Number(summary.cash_out || 0) > 0 && (
                                    <div className="flex justify-between items-center text-rose-500">
                                        <span className="font-medium">- Cash Out / Owner Draw</span>
                                        <span className="font-black">-₱{formatCurrency(summary.cash_out)}</span>
                                    </div>
                                )}

                                {Number(summary.expenses || 0) > 0 && (
                                    <div className="flex justify-between items-center text-rose-500">
                                        <span className="font-medium">- Store Expenses / Payouts</span>
                                        <span className="font-black">-₱{formatCurrency(summary.expenses)}</span>
                                    </div>
                                )}

                                <div className="border-t border-dashed border-gray-300 my-1"></div>

                                <div className="flex justify-between items-center font-bold text-gray-800">
                                    <span>Expected in Drawer</span>
                                    <span className="font-black text-gray-900">₱{formatCurrency(summary.expected_cash)}</span>
                                </div>

                                <div className="flex justify-between items-center font-black text-[#1B3B6A]">
                                    <span>Actual Count Turnover</span>
                                    <span className="font-black text-base">₱{formatCurrency(summary.actual_cash)}</span>
                                </div>
                            </div>

                            {/* DISCREPANCY HERO BOX */}
                            <div className={`p-4 rounded-2xl text-center border shadow-xs ${
                                Math.abs(Number(summary.difference || 0)) < 0.01 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                    : Number(summary.difference || 0) > 0 
                                        ? 'bg-[#EFF4F9] text-[#1B3B6A] border-[#CBD7E6]' 
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-75 mb-1">
                                    {Math.abs(Number(summary.difference || 0)) < 0.01 
                                        ? 'Cash Drawer Status' 
                                        : (Number(summary.difference || 0) > 0 ? 'Cash Drawer Overage' : 'Cash Drawer Shortage')}
                                </div>
                                <div className="text-2xl sm:text-3xl font-black tracking-tight">
                                    {Math.abs(Number(summary.difference || 0)) < 0.01 
                                        ? 'BALANCED (0.00)' 
                                        : `${Number(summary.difference || 0) > 0 ? '+' : '-'}₱${formatCurrency(Math.abs(Number(summary.difference || 0)))}`}
                                </div>
                            </div>

                            {/* GROSS SALES BREAKDOWN */}
                            <div className="bg-gray-50 p-4.5 rounded-2xl space-y-2 border border-gray-100 text-xs shadow-inner">
                                <div className="flex justify-between items-center pb-1 border-b border-gray-200/60">
                                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Gross Sales by Channel</span>
                                    <span className="text-[10px] font-bold text-gray-500">{summary.transactions_count || 0} Checkouts</span>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex justify-between items-center text-gray-700">
                                        <span>Cash Sales</span>
                                        <span className="font-bold">₱{formatCurrency(summary.cash_sales)}</span>
                                    </div>
                                    {Number(summary.gcash_sales || 0) > 0 && (
                                        <div className="flex justify-between items-center text-blue-600">
                                            <span>GCash</span>
                                            <span className="font-bold">+₱{formatCurrency(summary.gcash_sales)}</span>
                                        </div>
                                    )}
                                    {Number(summary.maya_sales || 0) > 0 && (
                                        <div className="flex justify-between items-center text-emerald-700">
                                            <span>Maya</span>
                                            <span className="font-bold">+₱{formatCurrency(summary.maya_sales)}</span>
                                        </div>
                                    )}
                                    {Number(summary.credit_card_sales || 0) > 0 && (
                                        <div className="flex justify-between items-center text-purple-600">
                                            <span>Credit Card</span>
                                            <span className="font-bold">+₱{formatCurrency(summary.credit_card_sales)}</span>
                                        </div>
                                    )}
                                    {Number(summary.debit_card_sales || 0) > 0 && (
                                        <div className="flex justify-between items-center text-indigo-600">
                                            <span>Debit / BancNet</span>
                                            <span className="font-bold">+₱{formatCurrency(summary.debit_card_sales)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="border-t border-dashed border-gray-300 my-1 pt-1.5 flex justify-between items-center font-black text-sm text-gray-900">
                                    <span>Total Gross Sales</span>
                                    <span>₱{formatCurrency(summary.total_sales || (
                                        Number(summary.cash_sales || 0) +
                                        Number(summary.gcash_sales || 0) +
                                        Number(summary.maya_sales || 0) +
                                        Number(summary.credit_card_sales || 0) +
                                        Number(summary.debit_card_sales || 0)
                                    ))}</span>
                                </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="grid gap-2.5 pt-2">
                                <button
                                    onClick={() => printZRead(summary, settings)}
                                    className="w-full py-3.5 bg-[#1B3B6A] hover:bg-[#142E54] text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.04-.37-2.12-.37-3.229 0-6.075 4.925-11 11-11s11 4.925 11 11c0 1.109-.13 2.189-.37 3.229M3.75 19.5h16.5m-15-4.5h13.5m-13.5 0a3.375 3.375 0 01-3.375-3.375V6.75A3.375 3.375 0 015.625 3.375h12.75a3.375 3.375 0 013.375 3.375v4.875a3.375 3.375 0 01-3.375 3.375" /></svg>
                                    <span>Print Thermal Z-Read</span>
                                </button>

                                <button
                                    onClick={handleFinalDone}
                                    disabled={isLoggingOut}
                                    className="w-full py-3 border-2 border-[#CBD7E6] text-[#1B3B6A] bg-[#EFF4F9] hover:bg-[#CBD7E6]/40 font-black text-sm rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isLoggingOut ? 'Logging out...' : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                                            <span>Finish & Logout</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                                    Step 1: Counted Physical Cash <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xl">₱</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        autoFocus
                                        className="w-full pl-9 pr-4 py-3 text-2xl font-black border-2 border-gray-200 rounded-2xl text-center text-gray-900 focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/20 transition-all bg-gray-50 focus:bg-white outline-none"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                                    Step 2: Total Unlogged Expenses <span className="text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">₱</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full pl-9 pr-4 py-2.5 text-lg font-black border-2 border-gray-200 rounded-2xl text-center text-gray-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all bg-gray-50 focus:bg-white outline-none"
                                        placeholder="0.00"
                                        value={expenses}
                                        onChange={(e) => setExpenses(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                                    Step 3: Closing Notes / Handover Comments
                                </label>
                                <textarea
                                    rows={2}
                                    value={closingNotes}
                                    onChange={(e) => setClosingNotes(e.target.value)}
                                    placeholder="Optional end-of-shift notes..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-[#1B3B6A] rounded-xl text-xs text-gray-800 transition-all outline-none resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !amount}
                                className={`w-full mt-2 py-3.5 text-white font-black text-sm rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer ${
                                    loading || !amount ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-[#1B3B6A] hover:bg-[#142E54]'
                                }`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Reconciling & Closing Shift...</span>
                                    </div>
                                ) : (
                                    'Finalize & Close Shift'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}