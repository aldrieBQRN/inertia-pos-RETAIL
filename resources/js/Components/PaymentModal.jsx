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
            <div className="bg-white w-full max-w-sm h-auto max-h-[85vh] sm:max-h-[90vh] rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in">

                {/* Modal Header */}
                <div className="bg-slate-50 px-4 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Checkout</h2>
                    <button onClick={onClose} className="p-1.5 bg-slate-200 rounded-full text-slate-600 hover:bg-rose-100 hover:text-rose-600 transition-colors shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar flex flex-col">

                    {/* Grand Total Display */}
                    <div className="text-center mb-5 shrink-0">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Total Amount Due</div>
                        <div className="text-4xl md:text-5xl font-black text-[#1B3B6A] tracking-tighter font-mono">{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>

                    {/* PRIMARY CATEGORY BUTTONS */}
                    <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 shrink-0">

                        {/* Cash Button */}
                        <button
                            type="button"
                            onClick={() => handleCategorySelect('cash')}
                            className={`flex flex-col items-center justify-center py-3 md:py-4 rounded-lg border-2 transition-all duration-200 gap-1 md:gap-2 shadow-sm
                                ${category === 'cash' ? 'border-[#1B3B6A] bg-[#1B3B6A]/10 text-[#1B3B6A] font-extrabold transform scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 md:w-7 md:h-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-bold text-[10px] md:text-xs uppercase tracking-wider">{showFKeys ? "Cash (F1)" : "Cash"}</span>
                        </button>

                        {/* E-Wallet Button */}
                        <button
                            type="button"
                            onClick={() => handleCategorySelect('ewallet')}
                            className={`flex flex-col items-center justify-center py-3 md:py-4 rounded-lg border-2 transition-all duration-200 gap-1 md:gap-2 shadow-sm
                                ${category === 'ewallet' ? 'border-[#1B3B6A] bg-[#1B3B6A]/10 text-[#1B3B6A] font-extrabold transform scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 md:w-7 md:h-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                            </svg>
                            <span className="font-bold text-[10px] md:text-xs uppercase tracking-wider">{showFKeys ? "E-Wallet (F2)" : "E-Wallet"}</span>
                        </button>

                        {/* Card Button */}
                        <button
                            type="button"
                            onClick={() => handleCategorySelect('card')}
                            className={`flex flex-col items-center justify-center py-3 md:py-4 rounded-lg border-2 transition-all duration-200 gap-1 md:gap-2 shadow-sm
                                ${category === 'card' ? 'border-[#1B3B6A] bg-[#1B3B6A]/10 text-[#1B3B6A] font-extrabold transform scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 md:w-7 md:h-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                            </svg>
                            <span className="font-bold text-[10px] md:text-xs uppercase tracking-wider">{showFKeys ? "Card (F7)" : "Card"}</span>
                        </button>
                    </div>

                    {/* E-WALLET SUB-MENU */}
                    {category === 'ewallet' && (
                        <div className="grid grid-cols-2 gap-3 mb-4 animate-in slide-in-from-top-2 duration-200">
                            <button
                                type="button"
                                onClick={() => setMethod('gcash')}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-lg border-2 transition-all duration-200 gap-1 shadow-sm
                                    ${method === 'gcash' ? 'border-[#1B3B6A] bg-[#1B3B6A]/10 text-[#1B3B6A] font-extrabold' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                                <span className="font-black text-[11px] uppercase tracking-wider">{showFKeys ? "GCash (F3)" : "GCash"}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('maya')}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-lg border-2 transition-all duration-200 gap-1 shadow-sm
                                    ${method === 'maya' ? 'border-[#1B3B6A] bg-[#1B3B6A]/10 text-[#1B3B6A] font-extrabold' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                                <span className="font-black text-[11px] uppercase tracking-wider">{showFKeys ? "Maya (F4)" : "Maya"}</span>
                            </button>
                        </div>
                    )}

                    {/* CARD SUB-MENU */}
                    {category === 'card' && (
                        <div className="grid grid-cols-2 gap-3 mb-4 animate-in slide-in-from-top-2 duration-200">
                            <button
                                type="button"
                                onClick={() => setMethod('credit_card')}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-lg border-2 transition-all duration-200 gap-1 shadow-sm
                                    ${method === 'credit_card' ? 'border-[#1B3B6A] bg-[#1B3B6A]/10 text-[#1B3B6A] font-extrabold' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                                <span className="font-black text-[10px] md:text-[11px] uppercase tracking-wider">{showFKeys ? "Credit (F8)" : "Credit"}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('debit_card')}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-lg border-2 transition-all duration-200 gap-1 shadow-sm
                                    ${method === 'debit_card' ? 'border-[#1B3B6A] bg-[#1B3B6A]/10 text-[#1B3B6A] font-extrabold' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                                <span className="font-black text-[10px] md:text-[11px] uppercase tracking-wider">{showFKeys ? "Debit (F9)" : "Debit"}</span>
                            </button>
                        </div>
                    )}

                    {/* Method-Specific Input Fields */}
                    <div className="space-y-4 shrink-0">
                        {category === 'cash' ? (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-inner">
                                <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Cash Received</label>
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        autoFocus
                                        onFocus={(e) => e.target.select()}
                                        className="w-full px-4 py-3 text-xl font-black text-slate-900 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] shadow-sm font-mono"
                                        value={cashGiven}
                                        onChange={handleCashChange}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className={`mt-3 p-3 rounded-lg flex justify-between items-center shadow-sm border ${change >= 0 ? 'bg-slate-100 border-slate-300 text-[#1B3B6A]' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                    <span className="font-black text-[10px] md:text-xs uppercase tracking-wider">Change Due</span>
                                    <span className="text-xl font-black font-mono">{change >= 0 ? change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-inner animate-in fade-in duration-300">
                                <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                    {category === 'card' ? 'Terminal Reference' : 'Payment Reference'}
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoFocus
                                    className="w-full px-4 py-3 text-base font-black text-slate-900 font-mono tracking-widest border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] shadow-sm"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder={getReferencePlaceholder()}
                                />
                            </div>
                        )}
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col gap-2 mt-5 pb-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleManualSubmit}
                            disabled={isProcessing}
                            className={`w-full py-4 text-white font-black text-sm uppercase tracking-widest rounded-lg shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                                ${isProcessing ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-[#1B3B6A] hover:bg-[#142d52]'}`}
                        >
                            {isProcessing ? <>Processing...</> : <>Confirm Payment<span className="hidden md:inline"> (Enter)</span></>}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="w-full py-3 bg-white text-slate-700 border border-slate-300 font-black text-sm uppercase tracking-widest rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            Cancel<span className="hidden md:inline"> (Esc)</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}