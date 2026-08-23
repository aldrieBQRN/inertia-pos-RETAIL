import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import usePrinterStore from '@/Stores/usePrinterStore';

export default function CashMovementModal({ isOpen, onClose, onMovementRecorded, settings, user }) {
    const [movementType, setMovementType] = useState('cash_out');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [selectedTarget, setSelectedTarget] = useState(''); // 'shift:123' | 'terminal:1'
    const [activeShifts, setActiveShifts] = useState([]);
    const [terminals, setTerminals] = useState([]);
    const [cashierShift, setCashierShift] = useState(null);
    const [loadingTargets, setLoadingTargets] = useState(false);
    const [loading, setLoading] = useState(false);
    const { printCashMovementSlip } = usePrinterStore();

    const scrollContainerRef = useRef(null);
    const reasonContainerRef = useRef(null);
    const highlightedItemRef = useRef(null);

    useEffect(() => {
        if (showSuggestions && scrollContainerRef.current) {
            setTimeout(() => {
                scrollContainerRef.current?.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }, 60);
        }
    }, [showSuggestions]);

    useEffect(() => {
        if (highlightedIndex >= 0 && highlightedItemRef.current) {
            highlightedItemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [highlightedIndex]);

    useEffect(() => {
        if (isOpen) {
            if (user?.is_admin) {
                setLoadingTargets(true);
                Promise.all([
                    axios.get('/api/shifts/active'),
                    axios.get('/api/terminals')
                ])
                    .then(([shiftRes, termRes]) => {
                        const shifts = shiftRes.data || [];
                        const terms = termRes.data || [];
                        setActiveShifts(shifts);
                        setTerminals(terms);

                        if (shifts.length > 0) {
                            setSelectedTarget(`shift:${shifts[0].id}`);
                        } else if (terms.length > 0) {
                            setSelectedTarget(`terminal:${terms[0].id}`);
                        }
                    })
                    .catch((err) => {
                        console.error("Failed to load targets for cash movement:", err);
                    })
                    .finally(() => {
                        setLoadingTargets(false);
                    });
            } else {
                const terminalId = localStorage.getItem('pos_terminal_id');
                axios.get('/api/shift/current', { params: { terminal_id: terminalId } })
                    .then((res) => {
                        if (res.data?.has_active_shift) {
                            setCashierShift(res.data);
                        }
                    })
                    .catch(console.error);
            }
        }
    }, [isOpen, user?.is_admin]);

    if (!isOpen) return null;

    const enteredAmount = parseFloat(amount) || 0;

    const formatCurrency = (val) => {
        return Number(val || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Determine current available balance based on selected target
    let availableDrawerBalance = 0;
    let targetLabel = 'Drawer';

    if (user?.is_admin) {
        if (selectedTarget.startsWith('shift:')) {
            const sId = parseInt(selectedTarget.replace('shift:', ''));
            const matchedShift = activeShifts.find(s => s.id === sId);
            if (matchedShift) {
                availableDrawerBalance = parseFloat(matchedShift.current_drawer_cash ?? matchedShift.starting_cash ?? 0);
                targetLabel = `${matchedShift.user?.name || 'Cashier'}'s Drawer (Shift #${matchedShift.id})`;
            }
        } else if (selectedTarget.startsWith('terminal:')) {
            const tId = parseInt(selectedTarget.replace('terminal:', ''));
            const matchedTerm = terminals.find(t => t.id === tId);
            if (matchedTerm) {
                availableDrawerBalance = parseFloat(matchedTerm.current_drawer_cash ?? 0);
                targetLabel = `${matchedTerm.name} Drawer`;
            }
        }
    } else {
        availableDrawerBalance = parseFloat(cashierShift?.running_expected_cash ?? cashierShift?.starting_cash ?? 0);
        targetLabel = 'Your Active Cash Drawer';
    }

    const isDeduction = ['cash_out', 'owner_draw', 'safe_drop', 'expense'].includes(movementType);
    const isOverLimit = isDeduction && enteredAmount > availableDrawerBalance;

    const typeOptions = [
        { id: 'cash_out', label: 'Cash Out / Expense', desc: 'Petty cash for store supplies or operating expenses' },
        { id: 'owner_draw', label: 'Owner Withdrawal', desc: 'Cash taken out of register by store owner' },
        { id: 'safe_drop', label: 'Safe Drop', desc: 'Excess sales cash transferred to store safe' },
        { id: 'cash_in', label: 'Cash In / Deposit', desc: 'Adding cash to drawer from external source' },
        { id: 'float_topup', label: 'Float Top-up', desc: 'Adding extra change coins and small bills' },
    ];

    const quickReasons = {
        cash_out: [
            'Store Cleaning & Sanitation Supplies',
            'Petty Cash Operational Payout',
            'Staff Meal Allowance / Lunch Payout',
            'Courier / Delivery Service Fee',
            'Electricity & Utility Bill Payment',
            'Drinking Water & Dispenser Refill',
            'Office Supplies, Receipts & Paper Rolls',
            'Emergency Maintenance & Store Repairs',
            'Garbage & Waste Collection Fee',
            'Transportation / Fuel Allowance',
            'Store Packaging & Plastic Bags Purchase',
            'Security & Equipment Maintenance'
        ],
        owner_draw: [
            'Owner Personal Cash Withdrawal',
            'Emergency Owner Cash Pickup',
            'Supplier Direct Cash Payment',
            'Inventory Restock Purchase',
            'Owner Weekly Remittance',
            'Partner Dividend / Profit Draw',
            'Executive Business Travel Expense',
            'Cash Vault Storage Transfer'
        ],
        safe_drop: [
            'Mid-day Excess Cash Drop',
            'High Denomination Bill Pull (₱1000/₱500)',
            'Peak Hour Register De-clutter',
            'Shift Handover Safe Drop',
            'End-of-Day Register Sweep'
        ],
        cash_in: [
            'Change Fund Morning Deposit',
            'External Capital Cash Injection',
            'Returned Unused Petty Cash',
            'Customer Refund Reversal Return',
            'Supplier Cash Refund / Rebate',
            'Returned Delivery Cash Advance'
        ],
        float_topup: [
            'Added ₱1, ₱5, ₱10, ₱20 Coin Rolls',
            'Added ₱20, ₱50, ₱100 Small Bills',
            'Emergency Coin Change Fund Refill',
            'Register Float Replenishment',
            'Weekend Change Buffer Fund'
        ],
    };

    const currentSuggestions = quickReasons[movementType] || [];
    const filteredSuggestions = currentSuggestions.filter(s =>
        !reason.trim() || s.toLowerCase().includes(reason.toLowerCase().trim())
    );

    const handleReasonKeyDown = (e) => {
        if (!showSuggestions || filteredSuggestions.length === 0) {
            if (e.key === 'ArrowDown') {
                setShowSuggestions(true);
                setHighlightedIndex(0);
                e.preventDefault();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev < filteredSuggestions.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev > 0 ? prev - 1 : filteredSuggestions.length - 1
            );
        } else if (e.key === 'Enter') {
            if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
                e.preventDefault();
                setReason(filteredSuggestions[highlightedIndex]);
                setShowSuggestions(false);
                setHighlightedIndex(-1);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setHighlightedIndex(-1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (enteredAmount <= 0) {
            Swal.fire('Invalid Amount', 'Please enter an amount greater than zero.', 'warning');
            return;
        }

        if (isOverLimit) {
            Swal.fire({
                icon: 'warning',
                title: 'Insufficient Drawer Funds',
                text: `Cannot deduct ₱${formatCurrency(enteredAmount)}. Current available cash in ${targetLabel} is only ₱${formatCurrency(availableDrawerBalance)}.`
            });
            return;
        }

        if (!reason.trim()) {
            Swal.fire('Reason Required', 'Please provide a reason or description for this cash movement.', 'warning');
            return;
        }

        setLoading(true);

        let targetShiftId = null;
        let targetTerminalId = null;

        if (user?.is_admin) {
            if (selectedTarget.startsWith('shift:')) {
                targetShiftId = selectedTarget.replace('shift:', '');
            } else if (selectedTarget.startsWith('terminal:')) {
                targetTerminalId = selectedTarget.replace('terminal:', '');
            }
        }

        try {
            const response = await axios.post('/api/shift/cash-movement', {
                type: movementType,
                amount: enteredAmount,
                reason: reason.trim(),
                shift_id: targetShiftId,
                terminal_id: targetTerminalId
            });

            const savedMovement = response.data.movement;

            Swal.fire({
                icon: 'success',
                title: 'Movement Recorded',
                text: `₱${formatCurrency(enteredAmount)} successfully logged.`,
                showCancelButton: true,
                confirmButtonColor: '#1B3B6A',
                confirmButtonText: 'Print Voucher Slip',
                cancelButtonText: 'Done',
                timer: 4000
            }).then((res) => {
                if (res.isConfirmed) {
                    printCashMovementSlip(savedMovement, settings, user);
                }
            });

            if (onMovementRecorded) {
                onMovementRecorded(savedMovement);
            }
            window.dispatchEvent(new CustomEvent('shift-refresh'));
            onClose();
        } catch (error) {
            console.error('Failed to log cash movement:', error);
            const msg = error.response?.data?.message || 'Failed to record cash movement.';
            Swal.fire('Error', msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={onClose}></div>

            <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 border border-gray-100 animate-in zoom-in-95 duration-200">
                
                {/* Mobile Pull Bar */}
                <div className="sm:hidden flex justify-center pt-3 pb-1 bg-[#1B3B6A] w-full shrink-0 cursor-pointer" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="px-6 py-4 bg-[#1B3B6A] text-white flex justify-between items-center shrink-0 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-black text-base tracking-tight text-white">Cash In / Cash Out</h3>
                            <p className="text-xs text-white/80 font-medium mt-0.5">Record non-sales drawer adjustments</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form with Fixed Sticky Footer */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    
                    {/* Scrollable Form Body with Auto-adjusting padding for suggestions */}
                    <div 
                        ref={scrollContainerRef}
                        className={`flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 transition-all duration-200 ${showSuggestions && filteredSuggestions.length > 0 ? 'pb-56' : 'pb-6'}`}
                    >
                        
                        {/* Admin Target Shift / Terminal Selector */}
                        {user?.is_admin && (
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                                        Target Cashier / Register
                                    </label>
                                    <span className="text-[11px] font-bold text-[#1B3B6A] bg-[#EFF4F9] border border-[#CBD7E6]/60 px-2 py-0.5 rounded-lg">
                                        Available: ₱{formatCurrency(availableDrawerBalance)}
                                    </span>
                                </div>
                                <select
                                    value={selectedTarget}
                                    onChange={(e) => setSelectedTarget(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/10 transition-all cursor-pointer"
                                >
                                    {activeShifts.length > 0 && (
                                        <optgroup label="Active Cashier Shifts">
                                            {activeShifts.map((shift) => (
                                                <option key={`shift-${shift.id}`} value={`shift:${shift.id}`}>
                                                    Active: {shift.user?.name || 'Cashier'} {shift.terminal ? `(${shift.terminal.name})` : ''} · Shift #{shift.id} (Drawer: ₱{formatCurrency(shift.current_drawer_cash ?? shift.starting_cash)})
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}

                                    {terminals.length > 0 && (
                                        <optgroup label="Physical Registers (Between Shifts)">
                                            {terminals.map((term) => (
                                                <option key={`term-${term.id}`} value={`terminal:${term.id}`}>
                                                    {term.name} {term.code ? `(${term.code})` : ''} — Register Drawer (Drawer: ₱{formatCurrency(term.current_drawer_cash)})
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <p className="text-[10px] text-slate-500 italic">
                                    {selectedTarget.startsWith('shift:') 
                                        ? 'Movement will be directly deducted/added to this active cashier shift.' 
                                        : 'Movement will be audited when the next cashier opens a shift on this specific register.'}
                                </p>
                            </div>
                        )}

                        {/* Movement Type Selector */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                                Movement Type
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {typeOptions.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                            setMovementType(t.id);
                                            setReason('');
                                        }}
                                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                            movementType === t.id
                                                ? 'border-[#1B3B6A] bg-[#EFF4F9] shadow-xs'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <div>
                                            <span className={`font-black text-xs block ${movementType === t.id ? 'text-[#1B3B6A]' : 'text-gray-800'}`}>
                                                {t.label}
                                            </span>
                                            <span className="text-[11px] text-gray-500 block leading-tight">
                                                {t.desc}
                                            </span>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                            movementType === t.id ? 'border-[#1B3B6A] bg-[#1B3B6A]' : 'border-gray-300'
                                        }`}>
                                            {movementType === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount Input with Drawer Balance Check */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Amount <span className="text-rose-500">*</span>
                                </label>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                    isOverLimit 
                                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                }`}>
                                    Available in Drawer: ₱{formatCurrency(availableDrawerBalance)}
                                </span>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-black text-base">₱</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className={`w-full pl-8 pr-4 py-3 bg-white border-2 rounded-2xl font-black text-lg transition-all outline-none ${
                                        isOverLimit
                                            ? 'border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                                            : 'border-gray-200 text-gray-900 focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/20'
                                    }`}
                                />
                            </div>

                            {/* Insufficient Funds Warning Banner */}
                            {isOverLimit && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in duration-150">
                                    <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <span className="font-bold block">Insufficient Drawer Funds</span>
                                        <span className="text-[11px] text-rose-700 leading-tight block mt-0.5">
                                            Cannot deduct ₱{formatCurrency(enteredAmount)}. {targetLabel} has only ₱{formatCurrency(availableDrawerBalance)} available.
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Reason Input with Interactive Autocomplete Suggestions */}
                        <div className="space-y-1.5 relative">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Reason / Description <span className="text-rose-500">*</span>
                                </label>
                                {showSuggestions && filteredSuggestions.length > 0 && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        Use <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[9px] font-mono">↑</kbd> <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[9px] font-mono">↓</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[9px] font-mono">Enter</kbd>
                                    </span>
                                )}
                            </div>
                            
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={reason}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                                    onKeyDown={handleReasonKeyDown}
                                    onChange={(e) => {
                                        setReason(e.target.value);
                                        setShowSuggestions(true);
                                        setHighlightedIndex(0);
                                    }}
                                    placeholder="Type reason or press down arrow for suggestions..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-[#1B3B6A] focus:bg-white rounded-xl text-xs text-gray-800 transition-all outline-none"
                                    autoComplete="off"
                                />

                                {/* Floating Suggestions Dropdown */}
                                {showSuggestions && filteredSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto custom-scrollbar divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                            <span>Suggestions ({filteredSuggestions.length})</span>
                                            <span className="text-[9px] font-normal text-slate-400">Arrow keys to select</span>
                                        </div>
                                        {filteredSuggestions.map((item, idx) => {
                                            const isHighlighted = highlightedIndex === idx;
                                            return (
                                                <button
                                                    key={idx}
                                                    ref={isHighlighted ? highlightedItemRef : null}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setReason(item);
                                                        setShowSuggestions(false);
                                                        setHighlightedIndex(-1);
                                                    }}
                                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                                    className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between group cursor-pointer ${
                                                        isHighlighted
                                                            ? 'bg-[#EFF4F9] text-[#1B3B6A] font-bold border-l-4 border-[#1B3B6A] pl-2.5'
                                                            : 'text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <span>{item}</span>
                                                    <span className={`text-[10px] ${isHighlighted ? 'text-[#1B3B6A] font-bold' : 'text-slate-400 group-hover:text-slate-600'} font-medium`}>
                                                        {isHighlighted ? 'Press Enter' : 'Select'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Fixed Sticky Bottom Action Footer */}
                    <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2 shrink-0 shadow-2xs">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-3 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white rounded-xl transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || isOverLimit}
                            className={`flex-1 py-3 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                                isOverLimit
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                                    : 'bg-[#1B3B6A] hover:bg-[#142E54] active:scale-[0.98] text-white cursor-pointer disabled:opacity-50'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    <span>Recording Movement...</span>
                                </>
                            ) : isOverLimit ? (
                                <span>Insufficient Drawer Balance</span>
                            ) : (
                                <span>Record {typeOptions.find(t => t.id === movementType)?.label}</span>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>,
        document.body
    );
}
