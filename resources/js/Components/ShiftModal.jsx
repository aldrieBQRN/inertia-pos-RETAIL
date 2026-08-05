import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import axios from 'axios';
import Swal from 'sweetalert2';
import usePrinterStore from '@/Stores/usePrinterStore';

export default function ShiftModal({ isOpen, settings, onClose, onShiftCompleted }) {
    const [amount, setAmount] = useState('');
    const [expenses, setExpenses] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [summary, setSummary] = useState(null);

    const printZRead = usePrinterStore((state) => state.printZRead);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setExpenses('');
            setSummary(null);
            setIsLoggingOut(false);
        }
    }, [isOpen]);

    const formatCurrency = (val) => parseFloat(val || 0).toLocaleString('en-PH', {
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
        setLoading(true);
        try {
            const payload = {
                actual_cash: parseFloat(amount),
                expenses: parseFloat(expenses || 0)
            };

            const res = await axios.post('/api/shift/close', payload);
            setSummary(res.data);
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Something went wrong.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
            {/* Clickable backdrop to close */}
            <div className="absolute inset-0" onClick={onClose}></div>

            {/* Modal Container: Bottom sheet on mobile, centered rounded box on desktop */}
            <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

                {/* Mobile Drag Handle Indicator */}
                <div className="sm:hidden flex justify-center pt-4 pb-2 bg-[#1B3B6A] w-full shrink-0" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
                </div>

                <div className="px-6 py-5 border-b text-white flex justify-between items-center bg-[#1B3B6A] shrink-0">
                    <h2 className="text-xl font-black tracking-tight">{summary ? 'Z-Read Summary' : 'Close Shift'}</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full hidden sm:block">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar bg-white">
                    {summary ? (
                        <div className="space-y-4 pb-4 sm:pb-0">

                            <div className="bg-gray-50 p-5 rounded-lg space-y-3 border border-gray-100 text-sm shadow-inner">
                                {/* DRAWER MATH */}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Starting Cash</span>
                                    <span className="font-bold text-gray-800">₱{formatCurrency(summary.starting_cash)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Cash Sales</span>
                                    <span className="font-bold text-green-600">+₱{formatCurrency(summary.cash_sales)}</span>
                                </div>

                                {summary.expenses > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 font-medium">Less: Expenses</span>
                                        <span className="font-bold text-red-500">-₱{formatCurrency(summary.expenses)}</span>
                                    </div>
                                )}

                                <div className="border-t border-dashed border-gray-300 my-2"></div>

                                <div className="flex justify-between items-center font-black text-[15px]">
                                    <span className="text-gray-800">Expected in Drawer</span>
                                    <span className="text-gray-900">₱{formatCurrency(summary.expected_cash)}</span>
                                </div>
                                <div className="flex justify-between items-center font-black text-[15px] text-[#1B3B6A]">
                                    <span>Actual Count</span>
                                    <span>₱{formatCurrency(summary.actual_cash)}</span>
                                </div>

                                {/* GROSS SALES BREAKDOWN */}
                                <div className="border-t border-gray-200 my-3"></div>
                                <div className="space-y-1.5">
                                    <div className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2">Non-Cash Sales</div>

                                    {summary.gcash_sales > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium">GCash</span>
                                            <span className="font-bold text-blue-600">+₱{formatCurrency(summary.gcash_sales)}</span>
                                        </div>
                                    )}
                                    {summary.maya_sales > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium">Maya</span>
                                            <span className="font-bold text-green-600">+₱{formatCurrency(summary.maya_sales)}</span>
                                        </div>
                                    )}
                                    {summary.credit_card_sales > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium">Credit Card</span>
                                            <span className="font-bold text-purple-600">+₱{formatCurrency(summary.credit_card_sales)}</span>
                                        </div>
                                    )}
                                    {summary.debit_card_sales > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium">Debit/BancNet</span>
                                            <span className="font-bold text-indigo-600">+₱{formatCurrency(summary.debit_card_sales)}</span>
                                        </div>
                                    )}
                                    {(!summary.gcash_sales && !summary.maya_sales && !summary.credit_card_sales && !summary.debit_card_sales) && (
                                        <div className="text-xs text-gray-400 italic">No digital sales recorded.</div>
                                    )}
                                </div>

                                <div className="border-t border-dashed border-gray-300 my-2"></div>
                                <div className="flex justify-between items-center font-black text-base">
                                    <span className="text-gray-900">Total Gross Sales</span>
                                    <span className="text-gray-900">₱{formatCurrency(
                                        Number(summary.cash_sales) +
                                        Number(summary.gcash_sales || 0) +
                                        Number(summary.maya_sales || 0) +
                                        Number(summary.credit_card_sales || 0) +
                                        Number(summary.debit_card_sales || 0)
                                    )}</span>
                                </div>
                            </div>

                            <div className={`p-4 rounded-lg text-center border shadow-sm ${Math.abs(summary.difference) < 0.01 ? 'bg-green-50 text-green-700 border-green-100' : summary.difference > 0 ? 'bg-[#EFF4F9] text-[#1B3B6A] border-[#CBD7E6]' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                                    {Math.abs(summary.difference) < 0.01 ? 'Drawer Status' : (summary.difference > 0 ? 'Drawer Overage' : 'Drawer Shortage')}
                                </div>
                                <div className="text-3xl font-black tracking-tight">
                                    {Math.abs(summary.difference) < 0.01 ? 'BALANCED' : `₱${Math.abs(summary.difference).toFixed(2)}`}
                                </div>
                            </div>

                            <div className="grid gap-3 pt-2">
                                <button
                                    onClick={() => printZRead(summary, settings)}
                                    className="w-full py-4 bg-[#1B3B6A] hover:bg-[#142E54] text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                    Print Z-Read Report
                                </button>

                                <button
                                    onClick={handleFinalDone}
                                    disabled={isLoggingOut}
                                    className={`w-full flex items-center justify-center gap-2 py-4 border-2 font-bold rounded-lg transition-all active:scale-[0.98] ${isLoggingOut ? 'border-gray-100 text-gray-400 bg-gray-50 cursor-not-allowed' : 'border-[#CBD7E6] text-[#1B3B6A] bg-[#EFF4F9] hover:bg-[#CBD7E6]/40'}`}
                                >
                                    {isLoggingOut ? 'Logging out...' : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                                            Logout
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-2 pb-6 sm:pb-4">
                            <div>
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-2">
                                    Step 1: Drawer Cash Count
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-2xl group-focus-within:text-[#1B3B6A] transition-colors">₱</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        autoFocus
                                        className="w-full pl-14 pr-6 py-4 text-3xl font-black border-2 border-gray-100 rounded-lg text-center text-gray-900 focus:border-[#1B3B6A] focus:ring-0 transition-all bg-gray-50 focus:bg-white outline-none"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-2">
                                    Step 2: Total Expenses <span className="text-gray-400 opacity-70">(Optional)</span>
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-xl group-focus-within:text-red-500 transition-colors">₱</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full pl-12 pr-6 py-3.5 text-2xl font-black border-2 border-gray-100 rounded-lg text-center text-gray-900 focus:border-red-500 focus:ring-0 transition-all bg-gray-50 focus:bg-white outline-none"
                                        placeholder="0.00"
                                        value={expenses}
                                        onChange={(e) => setExpenses(e.target.value)}
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2 pl-2 font-medium">Money taken out of the drawer for store expenses.</p>
                            </div>

                            <button type="submit" disabled={loading || !amount} className={`w-full mt-2 py-4 text-white font-black text-lg rounded-lg sm:rounded-lg shadow-md transition-all active:scale-[0.98] ${loading || !amount ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-[#1B3B6A] hover:bg-[#142E54]'}`}>
                                {loading ? 'Processing...' : 'Finalize & Close Shift'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}