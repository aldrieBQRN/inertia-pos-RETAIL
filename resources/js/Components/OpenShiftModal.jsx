import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function OpenShiftModal({ isOpen, onClose, onShiftOpened, shiftInfo, terminal }) {
    const [startingCash, setStartingCash] = useState('');
    const [openingNotes, setOpeningNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const expectedCash = shiftInfo?.expected_opening_cash ?? 0;
    const recentMovements = shiftInfo?.recent_movements || [];
    const lastShift = shiftInfo?.last_shift;

    useEffect(() => {
        if (isOpen) {
            // Pre-fill starting cash with the calculated expected opening cash
            setStartingCash(expectedCash.toFixed(2));
            setOpeningNotes('');
        }
    }, [isOpen, expectedCash]);

    if (!isOpen) return null;

    const enteredAmount = parseFloat(startingCash) || 0;
    const discrepancy = enteredAmount - expectedCash;
    const hasDiscrepancy = Math.abs(discrepancy) > 0.01;

    const formatCurrency = (val) => {
        return Number(val || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const handleQuickPreset = (amount) => {
        setStartingCash(Number(amount).toFixed(2));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (enteredAmount < 0) {
            Swal.fire('Invalid Amount', 'Starting float cannot be negative.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/shift/open', {
                starting_cash: enteredAmount,
                opening_notes: openingNotes,
                terminal_id: terminal?.id || null
            });

            Swal.fire({
                icon: 'success',
                title: 'Shift Opened',
                text: `Starting float of ₱${formatCurrency(enteredAmount)} recorded for ${terminal?.name || 'Register'}.`,
                timer: 1800,
                showConfirmButton: false
            });

            if (onShiftOpened) {
                onShiftOpened(response.data.shift);
            }
            window.dispatchEvent(new CustomEvent('shift-refresh'));
            if (onClose) {
                onClose();
            }
        } catch (error) {
            console.error('Failed to open shift:', error);
            const msg = error.response?.data?.message || 'Failed to open shift. Please try again.';
            Swal.fire('Error', msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity animate-in fade-in duration-200">
            {/* Clickable backdrop */}
            <div className="fixed inset-0" onClick={onClose}></div>

            {/* Modal Box */}
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
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-black text-base tracking-tight text-white">Open Work Shift</h3>
                            <p className="text-xs text-white/80 font-medium mt-0.5">Verify drawer float before selling</p>
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

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 bg-white">
                    
                    {/* Expected Float & Recent Movement Card */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2.5">
                        {terminal && (
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Register / Lane</span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#1B3B6A]/10 text-[#1B3B6A]">
                                    🖥️ {terminal.name} {terminal.code ? `(${terminal.code})` : ''}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Calculated Cash Drawer Balance</span>
                            <span className="font-black text-[#1B3B6A] text-sm">₱{formatCurrency(expectedCash)}</span>
                        </div>

                        {lastShift && (
                            <div className="text-[11px] text-gray-500 flex justify-between items-center border-t border-gray-200/60 pt-2">
                                <span>Previous Shift Close:</span>
                                <span className="font-semibold text-gray-700">₱{formatCurrency(lastShift.actual_cash)} ({lastShift.cashier || 'Staff'}{lastShift.terminal ? ` · ${lastShift.terminal}` : ''})</span>
                            </div>
                        )}

                        {recentMovements.length > 0 && (
                            <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 space-y-1.5">
                                <div className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                    </svg>
                                    Intermediate Cash Movements Detected
                                </div>
                                <div className="space-y-1 text-[11px] text-amber-900">
                                    {recentMovements.map((m, idx) => (
                                        <div key={idx} className="flex justify-between items-center">
                                            <span>• {m.reason || (m.type === 'owner_draw' ? 'Owner Withdrawal' : m.type)}:</span>
                                            <span className="font-bold">{m.type.includes('out') || m.type === 'owner_draw' || m.type === 'safe_drop' ? '-' : '+'}₱{formatCurrency(m.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Starting Cash Input */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                            Counted Physical Starting Cash <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-black text-base">₱</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={startingCash}
                                onChange={(e) => setStartingCash(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 bg-white border-2 border-gray-200 focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/20 rounded-2xl font-black text-lg text-gray-900 transition-all outline-none"
                            />
                        </div>

                        {/* Quick Float Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Presets:</span>
                            {[500, 1000, 2000, 3000, 5000].map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => handleQuickPreset(amt)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all cursor-pointer"
                                >
                                    ₱{amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Handover Discrepancy Alert */}
                    {hasDiscrepancy && (
                        <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                            discrepancy < 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                        }`}>
                            <div className="flex justify-between items-center font-bold">
                                <span>Opening Handover Variance:</span>
                                <span className="font-black text-sm">{discrepancy > 0 ? '+' : ''}₱{formatCurrency(discrepancy)}</span>
                            </div>
                            <p className="text-[11px] opacity-90 leading-relaxed">
                                {discrepancy < 0 
                                    ? "⚠️ Physical count is less than expected. This difference will be recorded as an Opening Handover Discrepancy and will NOT be deducted from your sales accountability."
                                    : "ℹ️ Physical count is higher than expected. This excess float is recorded as an Opening Overage."}
                            </p>
                        </div>
                    )}

                    {/* Opening Notes (Required if discrepancy exists) */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                            Opening Notes {hasDiscrepancy && <span className="text-rose-500 font-normal">(Explain reason for variance)</span>}
                        </label>
                        <textarea
                            rows={2}
                            value={openingNotes}
                            onChange={(e) => setOpeningNotes(e.target.value)}
                            placeholder={hasDiscrepancy ? "e.g., Missing ₱500 from previous shift handover..." : "Optional shift handover notes..."}
                            className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-[#1B3B6A] rounded-xl text-xs text-gray-800 transition-all outline-none resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-[#1B3B6A] hover:bg-[#142E54] active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    <span>Opening Shift...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                    </svg>
                                    <span>Start Work Shift (₱{formatCurrency(enteredAmount)})</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
