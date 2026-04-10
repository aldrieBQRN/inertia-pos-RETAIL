import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import useCartStore from '@/Stores/useCartStore';
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
    onRecallClick
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

    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastTransactionId, setLastTransactionId] = useState(null);

    // Format currency for display
    const formatPrice = (cents) => `₱${(cents / 100).toFixed(2)}`;

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
        // We filter out the item entirely and update the cart state
        const updatedCart = cart.filter(item => item.id !== itemToRemove.id);
        setCart(updatedCart);
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
                cart: cart.map(item => ({ id: item.id, quantity: item.quantity })),
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
                <div className="px-3 py-3 md:px-4 md:py-4 mb-1 md:mb-2 flex justify-between items-center border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-1 md:gap-2">
                        {onClose && (
                            <button onClick={onClose} className="md:hidden p-1.5 -ml-1 text-gray-500 hover:bg-gray-100 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                        )}
                        <div>
                            <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">Current Order</h2>
                            <span className="text-xs md:text-sm font-medium text-gray-500">{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}</span>
                        </div>
                    </div>

                    <div className="flex gap-1 md:gap-2">
                        {/* Recall Button */}
                        <button onClick={onRecallClick} className="p-1.5 md:p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Recall Order">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>

                        {/* Clear Cart Button */}
                        <button onClick={handleClearCart} className="p-1.5 md:p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Clear Cart">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>

                        {/* Senior Discount Button */}
                        <button onClick={toggleSenior} className={`p-1.5 md:p-2 rounded-lg transition-colors border ${isSenior ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`} title="Toggle PWD/Senior Discount">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                        </button>
                    </div>
                </div>

                {/* CART ITEMS LIST */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 pb-10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 md:w-16 md:h-16 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                            <p className="text-sm md:text-base font-medium text-gray-400">Cart is empty</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {cart.map((item) => (
                                <div key={item.id} className="bg-white border-b border-gray-100 p-2.5 md:p-4 hover:bg-gray-50 transition-colors flex flex-col gap-2 md:gap-3 group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col pr-2 md:pr-3">
                                            <h4 className="font-bold text-gray-800 text-sm md:text-base leading-tight">{item.name}</h4>
                                            <span className="text-xs md:text-sm text-gray-400 mt-0.5 md:mt-1 font-medium">{formatPrice(item.price)} each</span>
                                        </div>
                                        <span className="font-bold text-base md:text-lg text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                                    </div>

                                    <div className="flex justify-between items-center mt-0.5 md:mt-1">
                                        {/* Quantity Pill Controls */}
                                        <div className="flex items-center bg-white rounded-md border border-gray-200 h-8 md:h-9 shadow-sm">
                                            <button onClick={() => removeFromCart(item.id)} className="w-8 md:w-10 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 rounded-l-md transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 md:w-3.5 md:h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                                            </button>
                                            <div className="w-8 md:w-10 text-center font-bold text-sm md:text-base text-gray-800 select-none bg-gray-50 h-full flex items-center justify-center border-x border-gray-200">{item.quantity}</div>
                                            <button onClick={() => handleIncreaseQty(item)} className="w-8 md:w-10 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 rounded-r-md transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 md:w-3.5 md:h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                            </button>
                                        </div>

                                        {/* Full Remove Item Button */}
                                        <button
                                            onClick={() => handleRemoveEntireItem(item)}
                                            className="p-1 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Remove Item"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOOTER TOTALS & ACTIONS */}
                <div className="border-t p-3 md:p-4 bg-gray-50 border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                    {isSenior && (
                        <div className="space-y-1 mb-2 md:mb-3">
                            <div className="flex justify-between text-xs md:text-sm text-gray-500"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                            <div className="flex justify-between text-xs md:text-sm text-green-600 font-medium"><span>Less: Senior/PWD (20%)</span><span>-{formatPrice(discount)}</span></div>
                        </div>
                    )}

                    <div className="flex justify-between items-end mb-3 md:mb-4">
                        <span className="text-sm md:text-base text-gray-600 font-bold">Total Amount</span>
                        <span className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{formatPrice(total)}</span>
                    </div>

                    {/* ACTIONS */}
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <button
                            onClick={() => handleSaveOrder()}
                            disabled={cart.length === 0}
                            className="w-full py-3 md:py-3 rounded-lg md:rounded-lg bg-orange-100 text-orange-600 font-bold text-sm md:text-base hover:bg-orange-200 active:bg-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
                        >
                            Save
                        </button>
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={cart.length === 0}
                            className="w-full py-3 md:py-3 rounded-lg md:rounded-lg bg-green-600 text-white font-bold text-sm md:text-base shadow-lg hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            Checkout
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