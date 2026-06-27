import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import useCartStore from '@/Stores/useCartStore';
import usePrinterStore from '@/Stores/usePrinterStore';
import PaymentModal from './PaymentModal';
import Swal from 'sweetalert2';

/**
 * CartSidebar Component
 * Manages the active shopping cart UI, including quantity adjustments,
 * order saving, and the final checkout orchestration.
 */
export default function CartSidebar({
    settings,
    showPaymentModal,
    setShowPaymentModal,
    onClose,
    onPrintReceipt,
    onRecallClick,
    onEditItemQty,
    disabled = false
}) {
    // --- STORE SELECTORS ---
    const cart = useCartStore((state) => state.cart);
    const addToCart = useCartStore((state) => state.addToCart);
    const removeFromCart = useCartStore((state) => state.removeFromCart);
    const setCart = useCartStore((state) => state.setCart); // Used for full item removal
    const clearCart = useCartStore((state) => state.clearCart);
    const toggleSenior = useCartStore((state) => state.toggleSenior);
    const isSenior = useCartStore((state) => state.isSenior);
    const getComputations = useCartStore((state) => state.getComputations);

    // --- PRINTER STORE ---
    const openCashDrawer = usePrinterStore((state) => state.openCashDrawer);

    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastTransactionId, setLastTransactionId] = useState(null);
    const [hoveredItemId, setHoveredItemId] = useState(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const cartBottomRef = useRef(null);

    useEffect(() => {
        if (cartBottomRef.current) {
            cartBottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [cart]);

    useEffect(() => {
        const handleResetNav = () => {
            setFocusedIndex(-1);
        };
        window.addEventListener('reset-cart-nav', handleResetNav);
        return () => window.removeEventListener('reset-cart-nav', handleResetNav);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore keypresses if disabled or modal is open
            if (disabled || showPaymentModal || showSuccessModal) return;

            // Ignore if typing in input/textarea (except F-keys)
            const isFKey = e.key.match(/^F[1-9]$|^F1[0-2]$/);
            if (isFKey) {
                e.preventDefault();
            }

            if (!isFKey && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                return;
            }

            // 1. Toggling/Activating Cart Navigation with F6
            if (e.key === 'F6') {
                if (cart.length > 0) {
                    setFocusedIndex(prev => {
                        const next = prev === -1 ? 0 : -1;
                        if (next !== -1) {
                            // Close category dropdown
                            window.dispatchEvent(new CustomEvent('close-category-dropdown'));
                            // Reset catalog product highlight selection
                            window.dispatchEvent(new CustomEvent('reset-catalog-nav'));
                            // Blur search input if focused to free arrow keys
                            if (document.activeElement && typeof document.activeElement.blur === 'function') {
                                document.activeElement.blur();
                            }
                        }
                        return next;
                    });
                }
                return;
            }

            // 2. If Cart Navigation is active
            if (focusedIndex !== -1) {
                const selectedItem = cart[focusedIndex];

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setFocusedIndex(prev => Math.min(prev + 1, cart.length - 1));
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setFocusedIndex(prev => Math.max(prev - 1, 0));
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setFocusedIndex(-1);
                    return;
                }

                if (selectedItem) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        return;
                    }
                    if (e.key === '+' || e.key === 'Add' || e.key === '=' || e.code === 'NumpadAdd' || e.code === 'Equal') {
                        e.preventDefault();
                        handleIncreaseQty(selectedItem);
                        return;
                    }
                    if (e.key === '-' || e.key === 'Subtract' || e.code === 'NumpadSubtract' || e.code === 'Minus') {
                        e.preventDefault();
                        removeFromCart(selectedItem.id);
                        if (selectedItem.quantity === 1) {
                            if (cart.length <= 1) {
                                setFocusedIndex(-1);
                            } else if (focusedIndex >= cart.length - 1) {
                                setFocusedIndex(cart.length - 2);
                            }
                        }
                        return;
                    }
                    if (e.key === 'Backspace' || e.key === 'Delete' || e.code === 'Backspace' || e.code === 'Delete') {
                        e.preventDefault();
                        handleRemoveEntireItem(selectedItem);
                        return;
                    }
                }
            }

            // 3. Fallback: Hover shortcuts (only if cart navigation is NOT active)
            if (focusedIndex === -1 && hoveredItemId) {
                const hoveredItem = cart.find(item => item.id === hoveredItemId);
                if (!hoveredItem) return;

                if (e.key === '+' || e.key === 'Add' || e.key === '=' || e.code === 'NumpadAdd' || e.code === 'Equal') {
                    e.preventDefault();
                    handleIncreaseQty(hoveredItem);
                } else if (e.key === '-' || e.key === 'Subtract' || e.code === 'NumpadSubtract' || e.code === 'Minus') {
                    e.preventDefault();
                    removeFromCart(hoveredItem.id);
                } else if (e.key === 'Backspace' || e.key === 'Delete' || e.code === 'Backspace' || e.code === 'Delete') {
                    e.preventDefault();
                    handleRemoveEntireItem(hoveredItem);
                    setHoveredItemId(null);
                }
            }

            if (e.key === 'F8') {
                if (cart.length > 0) {
                    handleSaveOrder();
                }
            } else if (e.key === 'F9') {
                toggleSenior();
            } else if (e.key === 'F10') {
                if (cart.length > 0) {
                    handleClearCart();
                }
            } else if (e.key === 'F11') {
                openCashDrawer();
            } else if (e.key === 'F12') {
                if (cart.length > 0) {
                    setShowPaymentModal(true);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusedIndex, hoveredItemId, cart, showPaymentModal, showSuccessModal, onEditItemQty, disabled]);

    // Format currency for display
    const formatPrice = (cents) => `${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Safely execute computations
    const { subtotal, discount, total } = getComputations ? getComputations() : { subtotal: 0, discount: 0, total: 0 };

    // Calculate TOTAL quantity of all items in the cart
    const totalItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

    /**
     * Increments item quantity after validating against available stock.
     */
    const handleIncreaseQty = (item) => {
        if (item.quantity >= item.stock_quantity) {
            Swal.fire({
                icon: 'error',
                title: 'Limit Reached',
                text: `Only ${item.stock_quantity} stocks remaining!`,
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 2000,
                background: '#FEF2F2',
                color: '#991B1B'
            });
            return;
        }
        addToCart(item);
    };

    /**
     * Removes a specific item entirely from the cart, regardless of its quantity.
     */
    const handleRemoveEntireItem = (itemToRemove) => {
        const indexToRemove = cart.findIndex(item => item.id === itemToRemove.id);
        const updatedCart = cart.filter(item => item.id !== itemToRemove.id);
        setCart(updatedCart);

        // Keep highlight active if navigation mode is active
        if (focusedIndex !== -1) {
            if (updatedCart.length === 0) {
                setFocusedIndex(-1);
            } else if (focusedIndex === indexToRemove) {
                if (indexToRemove >= updatedCart.length) {
                    setFocusedIndex(updatedCart.length - 1);
                }
            } else if (indexToRemove < focusedIndex) {
                setFocusedIndex(prev => prev - 1);
            }
        }
    };

    /**
     * Clears all items from the current cart with a user confirmation.
     */
    const handleClearCart = async () => {
        if (cart.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Cart is already empty!',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 2000,
                background: '#EFF6FF',
                color: '#1E3A8A'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Clear Cart?',
            text: "Remove all items from the current order?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, clear it!'
        });

        if (result.isConfirmed) {
            clearCart();
        }
    };

    /**
     * Parks the current order into the 'Held Orders' table for later retrieval.
     */
    const handleSaveOrder = async () => {
        if (cart.length === 0) return;

        const { value: note } = await Swal.fire({
            title: 'Save Order',
            input: 'text',
            inputLabel: 'Reference Note (Optional)',
            inputPlaceholder: 'e.g. Table 5 or Customer Name',
            showCancelButton: true,
            confirmButtonText: 'Save Order',
            confirmButtonColor: '#f59e0b'
        });

        if (note !== undefined) {
            try {
                await axios.post('/api/held-orders', {
                    cart: cart,
                    total: total,
                    note: note || `Order #${Math.floor(Math.random() * 1000)}`
                });

                clearCart();
                Swal.fire({
                    icon: 'success',
                    title: 'Order Saved',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 1500
                });

                if (onClose) onClose();
            } catch (error) {
                Swal.fire('Error', 'Failed to save order', 'error');
            }
        }
    };

    /**
     * Finalizes the transaction by sending cart and payment data to the backend.
     */
    const handleFinalizePayment = async (paymentDetails) => {
        setIsProcessing(true);
        try {
            const totalInUnits = total / 100;
            const cashGiven = paymentDetails.cashGiven ? parseFloat(paymentDetails.cashGiven) : 0;
            const change = paymentDetails.method === 'cash' ? (cashGiven - totalInUnits) : 0;

            const response = await axios.post('/api/checkout', {
                cart: cart.map(item => {
                    const isCustom = typeof item.id === 'string' && item.id.startsWith('custom-');
                    return {
                        id: isCustom ? null : item.id,
                        quantity: item.quantity,
                        name: isCustom ? item.name : undefined,
                        price: item.price / 100
                    };
                }),
                payment_method: paymentDetails.method,
                reference: paymentDetails.reference,
                is_senior: isSenior,
                cash_given: cashGiven,
                change: change
            });

            if (response.data.success) {
                setLastTransactionId(response.data.sale_id);
                setShowPaymentModal(false);
                clearCart();
                setShowSuccessModal(true);
            }
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || "Transaction failed", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNewOrder = () => {
        setShowSuccessModal(false);
        setLastTransactionId(null);
        if (onClose) onClose();
    };

    return (
        <>
            <div className="flex flex-col h-full relative bg-white">
                {/* HEADER */}
                <div className="px-3 py-2 md:px-3 md:py-2.5 flex justify-between items-center border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-1 md:gap-1.5">
                        {onClose && (
                            <button onClick={onClose} className="md:hidden p-1 -ml-1 text-gray-500 hover:bg-gray-100 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                        )}
                        <div>
                            <h2 className="text-base md:text-lg font-black text-gray-900 tracking-tight">
                                Current Order (F6)
                            </h2>
                            <span className="text-[10px] md:text-xs font-semibold text-gray-500">
                                {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-1.5">
                        {/* Recall Button */}
                        <button onClick={onRecallClick} disabled={disabled} className="px-3 h-[46px] bg-white text-blue-600 hover:bg-blue-50 rounded-md transition-all border border-blue-200 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed" title="Recall (F7)">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>Recall (F7)</span>
                        </button>

                        {/* Clear Cart Button */}
                        <button onClick={handleClearCart} disabled={disabled} className="px-3 h-[46px] bg-white text-red-600 hover:bg-red-50 rounded-md transition-all border border-red-200 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed" title="Clear Cart (F10)">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                            <span>Clear (F10)</span>
                        </button>

                        {/* Senior Discount Button */}
                        <button onClick={toggleSenior} disabled={disabled} className={`px-3 h-[46px] rounded-md transition-all border flex items-center gap-1.5 text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed ${isSenior ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50'}`} title="Discount (F9)">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                            <span>Discount (F9)</span>
                        </button>
                    </div>
                </div>
                {/* SUB-HEADER: COLUMN HEADERS ONLY */}
                <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-200 shrink-0">
                    {/* COLUMNS HEADERS */}
                    <div className="grid grid-cols-[90px_1fr_100px_110px] gap-2 text-xs font-black uppercase tracking-wider text-gray-500 font-mono">
                        <div className="text-center">Qty</div>
                        <div className="pl-4">Description</div>
                        <div className="text-right">Price</div>
                        <div className="text-right">Amount</div>
                    </div>
                </div>

                {/* CART ITEMS LIST */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 pb-10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 md:w-12 md:h-12 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                            <p className="text-xs md:text-sm font-medium text-gray-400">Cart is empty</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {cart.map((item, index) => (
                                <div 
                                    key={item.id} 
                                    onMouseEnter={() => setHoveredItemId(item.id)}
                                    onMouseLeave={() => setHoveredItemId(prev => prev === item.id ? null : prev)}
                                    onClick={() => {
                                        if (disabled) return;
                                        window.dispatchEvent(new CustomEvent('close-category-dropdown'));
                                        window.dispatchEvent(new CustomEvent('reset-catalog-nav'));
                                    }}
                                    className={`grid grid-cols-[90px_1fr_100px_110px] gap-2 px-3 py-3 items-center border-b border-gray-100 hover:bg-gray-50 transition-colors text-base font-bold group cursor-pointer ${focusedIndex === index ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/40' : ''}`}
                                >
                                    {/* QTY Column with Hover Controls */}
                                    <div className="flex items-center justify-between h-6 select-none relative w-full">
                                         <button
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 removeFromCart(item.id);
                                             }}
                                             disabled={disabled}
                                             className={`w-6 h-6 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-850 rounded-full flex items-center justify-center transition-all shrink-0 font-mono text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${focusedIndex === index ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}
                                             title="Decrease"
                                         >
                                            -
                                        </button>
                                        <span className="flex-1 text-center font-extrabold text-gray-800 font-mono text-base">
                                            {item.quantity}
                                        </span>
                                        <button
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleIncreaseQty(item);
                                             }}
                                             disabled={disabled}
                                             className={`w-6 h-6 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-855 rounded-full flex items-center justify-center transition-all shrink-0 font-mono text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${focusedIndex === index ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}
                                             title="Increase"
                                         >
                                            +
                                        </button>
                                    </div>

                                    {/* DESCRIPTION Column */}
                                    <div className="min-w-0 pl-4 pr-1 flex items-center justify-between">
                                        <span className="font-extrabold text-gray-800 truncate leading-tight block select-none" title={item.name}>
                                            {item.name}
                                        </span>
                                         <button 
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleRemoveEntireItem(item);
                                             }}
                                             disabled={disabled}
                                             className={`text-gray-400 hover:text-red-500 p-0.5 rounded transition-all shrink-0 ml-1 opacity-100 disabled:opacity-30 disabled:cursor-not-allowed ${focusedIndex === index ? 'md:opacity-100' : 'md:opacity-0 md:group-hover:opacity-100'}`}
                                             title="Delete"
                                         >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    {/* PRICE Column */}
                                    <div className="text-right text-gray-655 font-mono font-semibold text-base">
                                        {formatPrice(item.price)}
                                    </div>

                                    {/* AMOUNT Column */}
                                    <div className="text-right text-gray-900 font-mono font-extrabold text-base">
                                        {formatPrice(item.price * item.quantity)}
                                    </div>
                                </div>
                            ))}
                            {/* Auto-scroll anchor */}
                            <div ref={cartBottomRef} />
                        </div>
                    )}
                </div>

                {/* FOOTER TOTALS & ACTIONS */}
                <div className="border-t p-3 md:p-4 bg-gray-50 border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                    <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between text-sm text-gray-500 font-bold">
                            <span>Cash Sales (Subtotal)</span>
                            <span className="font-mono">{formatPrice(subtotal)}</span>
                        </div>
                        {isSenior && (
                            <div className="flex justify-between text-sm text-green-600 font-bold">
                                <span>Less: Senior/PWD (20%)</span>
                                <span className="font-mono">-{formatPrice(discount)}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-end mb-3 md:mb-4">
                        <span className="text-sm md:text-base text-gray-655 font-bold">Total Amount</span>
                        <span className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight font-mono">{formatPrice(total)}</span>
                    </div>

                    {/* ACTIONS */}
                    <div className="grid grid-cols-3 gap-2 md:gap-2.5">
                        <button
                            onClick={() => handleSaveOrder()}
                            disabled={disabled || cart.length === 0}
                            className="w-full py-2.5 md:py-3.5 rounded-lg bg-orange-100 text-orange-600 font-extrabold text-[11px] sm:text-xs md:text-sm lg:text-base hover:bg-orange-200 active:bg-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
                        >
                            Save (F8)
                        </button>
                        <button
                            onClick={openCashDrawer}
                            disabled={disabled}
                            className="w-full py-2.5 md:py-3.5 rounded-lg bg-zinc-100 text-zinc-700 font-extrabold text-[11px] sm:text-xs md:text-sm lg:text-base hover:bg-zinc-200 border border-zinc-300 hover:border-zinc-400 active:bg-zinc-300 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Drawer (F11)
                        </button>
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={disabled || cart.length === 0}
                            className="w-full py-2.5 md:py-3.5 rounded-lg bg-green-600 text-white font-extrabold text-[11px] sm:text-xs md:text-sm lg:text-base shadow-lg hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            Checkout (F12)
                        </button>
                    </div>
                </div>
            </div>

            {/* PAYMENT MODAL PORTAL */}
            {showPaymentModal && typeof document !== 'undefined' && createPortal(
                <PaymentModal
                    total={total / 100}
                    onClose={() => setShowPaymentModal(false)}
                    onConfirm={handleFinalizePayment}
                    isProcessing={isProcessing}
                />,
                document.body
            )}

            {/* SUCCESS MODAL PORTAL */}
           {showSuccessModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden text-center p-6 flex flex-col items-center">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
                            <svg className="w-8 h-8 md:w-10 md:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>

                        <h2 className="text-xl md:text-2xl font-extrabold text-gray-800 mb-2">Payment Successful!</h2>

                        <div className="w-full space-y-2 md:space-y-3 mt-4 md:mt-6">
                            <button
                                onClick={() => onPrintReceipt(lastTransactionId)}
                                className="w-full py-2.5 md:py-3.5 bg-blue-600 text-white font-bold rounded-md md:rounded-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                Print Receipt
                            </button>

                            <button
                                onClick={handleNewOrder}
                                className="w-full py-2.5 md:py-3.5 border border-gray-300 text-gray-700 font-bold rounded-md md:rounded-lg hover:bg-gray-50 active:scale-95 transition-all text-sm md:text-base"
                            >
                                New Order
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}