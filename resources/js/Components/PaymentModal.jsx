import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

/**
 * PaymentModal Component
 * Grouped UI: Main category (Cash, E-Wallet, Card) -> Sub-method
 */
export default function PaymentModal({ total, onClose, onConfirm, isProcessing, showFKeys = true, enableShortcuts = true }) {
    // Top-level category: 'cash', 'ewallet', 'card'
    const [category, setCategory] = useState('cash');

    // The exact method sent to DB
    const [method, setMethod] = useState('cash');

    const [cashGiven, setCashGiven] = useState(() => total ? total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    const [reference, setReference] = useState('');
    const [change, setChange] = useState(0);

    /**
     * Handle category switching and reset sub-methods safely
     */
    const handleCategorySelect = (newCategory) => {
        setCategory(newCategory);
        if (newCategory === 'cash') setMethod('cash');
        if (newCategory === 'ewallet') setMethod('gcash'); // Default e-wallet
        if (newCategory === 'card') setMethod('credit_card'); // Default card
    };

    /**
     * Auto calculate change
     */
    useEffect(() => {
        if (category === 'cash') {
            const cleanGiven = parseFloat(String(cashGiven).replace(/,/g, '')) || 0;
            setChange(cleanGiven - total);
        }
    }, [cashGiven, total, category]);

    // Global KeyDown listener active only when PaymentModal is mounted (open)
    useEffect(() => {
        const handleModalKeyDown = (e) => {
            const isFKey = e.key?.match(/^F[1-9]$|^F1[0-2]$/);

            // If F-keys shortcuts are disabled, do not intercept or execute them
            const shortcutsEnabled = enableShortcuts && localStorage.getItem('pos_enable_shortcuts') !== 'false';
            if (isFKey && !shortcutsEnabled) {
                return;
            }

            if (e.key === 'F1') {
                e.preventDefault();
                handleCategorySelect('cash');
            } else if (e.key === 'F2') {
                e.preventDefault();
                handleCategorySelect('ewallet');
            } else if (e.key === 'F7') {
                e.preventDefault();
                handleCategorySelect('card');
            } else if (e.key === 'F3' && category === 'ewallet') {
                e.preventDefault();
                setMethod('gcash');
            } else if (e.key === 'F4' && category === 'ewallet') {
                e.preventDefault();
                setMethod('maya');
            } else if (e.key === 'F8' && category === 'card') {
                e.preventDefault();
                setMethod('credit_card');
            } else if (e.key === 'F9' && category === 'card') {
                e.preventDefault();
                setMethod('debit_card');
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleManualSubmit();
            }
        };

        window.addEventListener('keydown', handleModalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleModalKeyDown);
        };
    }, [category, method, cashGiven, reference, total, onClose, onConfirm, enableShortcuts]);

    const handleCashChange = (e) => {
        let inputVal = e.target.value;
        // Strip everything except digits and a single decimal point
        let cleanVal = inputVal.replace(/[^0-9.]/g, '');
        const parts = cleanVal.split('.');
        if (parts.length > 2) {
            cleanVal = parts[0] + '.' + parts.slice(1).join('');
        }

        let formattedVal = '';
        if (cleanVal !== '') {
            const integerPart = parts[0];
            const decimalPart = parts[1];
            const formattedInteger = integerPart ? Number(integerPart).toLocaleString('en-US') : '0';
            formattedVal = formattedInteger + (cleanVal.includes('.') ? '.' + (decimalPart || '') : '');
        }

        setCashGiven(formattedVal);
    };



    /**
     * Validates input details based on the selected payment method
     */
    const handleManualSubmit = () => {
        if (category === 'cash') {
            const cleanGivenString = String(cashGiven).replace(/,/g, '');
            const given = parseFloat(cleanGivenString);
            if (isNaN(given) || !cleanGivenString) {
                Swal.fire({ icon: 'warning', title: 'Enter Cash Amount', text: 'Please enter the amount received.', timer: 2000, showConfirmButton: false });
                return;
            }
            if (given < total) {
                Swal.fire({ icon: 'error', title: 'Insufficient Cash', text: `Additional ${Math.abs(change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} is required.`, timer: 2000, showConfirmButton: false });
                return;
            }
        }

        if (category === 'ewallet' || category === 'card') {
            if (!reference.trim()) {
                Swal.fire({ icon: 'warning', title: 'Missing Reference', text: 'Please enter the payment or terminal reference number.', timer: 2000, showConfirmButton: false });
                return;
            }
        }

        onConfirm({
            method: method,
            cashGiven: category === 'cash' ? parseFloat(String(cashGiven).replace(/,/g, '')) : null,
            reference: category !== 'cash' ? reference : null
        });
    };

    // Helper to format the placeholder text nicely
    const getReferencePlaceholder = () => {
        if (method === 'credit_card') return 'Credit Card Approval Code...';
        if (method === 'debit_card') return 'Debit/BancNet Terminal Ref...';
        return `${method.toUpperCase()} Reference No...`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity">
            <div className="bg-white w-full max-w-sm h-auto max-h-[85vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200/90 flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in">

                {/* Modal Header */}
                <div className="bg-white px-5 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#EFF4F9] text-[#1B3B6A] border border-[#CBD7E6] flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900 tracking-tight">Checkout Payment</h2>
                            <p className="text-[11px] font-semibold text-gray-400">Select payment channel & finalize</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-colors shadow-2xs"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col bg-white">

                    {/* Grand Total Display */}
                    <div className="text-center mb-5 p-4 rounded-2xl bg-[#EFF4F9] border border-[#CBD7E6] shrink-0">
                        <div className="text-[10px] text-[#1B3B6A] uppercase tracking-widest font-black mb-0.5">Total Amount Due</div>
                        <div className="text-3xl sm:text-4xl font-black text-[#1B3B6A] tracking-tight font-mono">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>

                    {/* PRIMARY CATEGORY BUTTONS */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-4 shrink-0">

                        {/* Cash Button */}
                        <button
                            type="button"
                            onClick={() => handleCategorySelect('cash')}
                            className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 gap-1.5 shadow-2xs cursor-pointer active:scale-95
                                ${category === 'cash' ? 'border-[#1B3B6A] bg-[#EFF4F9] text-[#1B3B6A] font-black ring-1 ring-[#1B3B6A]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-bold text-[10px] sm:text-xs uppercase tracking-wider">{showFKeys ? "Cash (F1)" : "Cash"}</span>
                        </button>

                        {/* E-Wallet Button */}
                        <button
                            type="button"
                            onClick={() => handleCategorySelect('ewallet')}
                            className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 gap-1.5 shadow-2xs cursor-pointer active:scale-95
                                ${category === 'ewallet' ? 'border-[#1B3B6A] bg-[#EFF4F9] text-[#1B3B6A] font-black ring-1 ring-[#1B3B6A]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                            </svg>
                            <span className="font-bold text-[10px] sm:text-xs uppercase tracking-wider">{showFKeys ? "E-Wallet (F2)" : "E-Wallet"}</span>
                        </button>

                        {/* Card Button */}
                        <button
                            type="button"
                            onClick={() => handleCategorySelect('card')}
                            className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 gap-1.5 shadow-2xs cursor-pointer active:scale-95
                                ${category === 'card' ? 'border-[#1B3B6A] bg-[#EFF4F9] text-[#1B3B6A] font-black ring-1 ring-[#1B3B6A]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                            </svg>
                            <span className="font-bold text-[10px] sm:text-xs uppercase tracking-wider">{showFKeys ? "Card (F7)" : "Card"}</span>
                        </button>
                    </div>

                    {/* E-WALLET SUB-MENU */}
                    {category === 'ewallet' && (
                        <div className="grid grid-cols-2 gap-2.5 mb-4 animate-in slide-in-from-top-2 duration-200">
                            <button
                                type="button"
                                onClick={() => setMethod('gcash')}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all duration-200 gap-1 shadow-2xs cursor-pointer active:scale-95
                                    ${method === 'gcash' ? 'border-blue-600 bg-blue-50 text-blue-700 font-black' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="font-black text-xs uppercase tracking-wider">{showFKeys ? "GCash (F3)" : "GCash"}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('maya')}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all duration-200 gap-1 shadow-2xs cursor-pointer active:scale-95
                                    ${method === 'maya' ? 'border-teal-600 bg-teal-50 text-teal-800 font-black' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="font-black text-xs uppercase tracking-wider">{showFKeys ? "Maya (F4)" : "Maya"}</span>
                            </button>
                        </div>
                    )}

                    {/* CARD SUB-MENU */}
                    {category === 'card' && (
                        <div className="grid grid-cols-2 gap-2.5 mb-4 animate-in slide-in-from-top-2 duration-200">
                            <button
                                type="button"
                                onClick={() => setMethod('credit_card')}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all duration-200 gap-1 shadow-2xs cursor-pointer active:scale-95
                                    ${method === 'credit_card' ? 'border-purple-600 bg-purple-50 text-purple-700 font-black' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="font-black text-xs uppercase tracking-wider">{showFKeys ? "Credit (F8)" : "Credit Card"}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('debit_card')}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all duration-200 gap-1 shadow-2xs cursor-pointer active:scale-95
                                    ${method === 'debit_card' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-black' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="font-black text-xs uppercase tracking-wider">{showFKeys ? "Debit (F9)" : "Debit Card"}</span>
                            </button>
                        </div>
                    )}

                    {/* Method-Specific Input Fields */}
                    <div className="space-y-3 shrink-0">
                        {category === 'cash' ? (
                            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Cash Received (₱)</label>
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        autoFocus
                                        onFocus={(e) => e.target.select()}
                                        className="w-full px-4 py-2.5 text-xl font-black text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B3B6A]/20 focus:border-[#1B3B6A] shadow-2xs font-mono transition-all"
                                        value={cashGiven}
                                        onChange={handleCashChange}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className={`mt-3 p-3 rounded-xl flex justify-between items-center shadow-2xs border ${change >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                    <span className="font-black text-[10px] uppercase tracking-wider">{change >= 0 ? 'Change Due' : 'Shortage'}</span>
                                    <span className="text-xl font-black font-mono">₱{change >= 0 ? change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.abs(change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs animate-in fade-in duration-300">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                    {category === 'card' ? 'Terminal Reference / Auth Code' : 'Payment Reference Number'}
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoFocus
                                    className="w-full px-4 py-2.5 text-sm font-black text-gray-900 font-mono tracking-wider border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B3B6A]/20 focus:border-[#1B3B6A] shadow-2xs transition-all"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder={getReferencePlaceholder()}
                                />
                            </div>
                        )}
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col gap-2 mt-5 pb-1 shrink-0">
                        <button
                            type="button"
                            onClick={handleManualSubmit}
                            disabled={isProcessing}
                            className={`w-full py-3.5 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer
                                ${isProcessing ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-[#1B3B6A] hover:bg-[#142E54]'}`}
                        >
                            {isProcessing ? <>Processing Payment...</> : <>Confirm Settlement<span className="hidden md:inline"> (Enter)</span></>}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="w-full py-2.5 bg-white text-gray-700 border border-gray-200 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-50 transition-all active:scale-95 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                        >
                            Cancel<span className="hidden md:inline"> (Esc)</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}