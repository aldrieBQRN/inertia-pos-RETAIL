import React, { useState, useEffect, useMemo, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import useCartStore from '@/Stores/useCartStore';
import usePrinterStore from '@/Stores/usePrinterStore';
import CartSidebar from '@/Components/CartSidebar';
import Swal from 'sweetalert2';

/**
 * PosTerminal Component
 */
export default function PosTerminal({ auth, store_settings, settings }) {
    const { props } = usePage();

    // Combine all possible settings sources
    const activeSettings = {
        ...(auth?.user?.store || {}),
        ...(props.store_settings || {}),
        ...(props.settings || {}),
        ...(store_settings || {}),
        ...(settings || {})
    };

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);
    const [heldOrders, setHeldOrders] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const isPolling = useRef(false);

    const cart = useCartStore((state) => state.cart);
    const addToCart = useCartStore((state) => state.addToCart);
    const setCart = useCartStore((state) => state.setCart);
    const getComputations = useCartStore((state) => state.getComputations);
    const printReceipt = usePrinterStore((state) => state.printReceipt);

    const { total } = getComputations ? getComputations() : { total: 0 };

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const [prodRes, catRes] = await Promise.all([
                    axios.get('/api/products?all=true'),
                    axios.get('/api/categories')
                ]);
                setProducts(prodRes.data || []);
                setCategories(catRes.data || []);
            } catch (error) {
                console.error("POS Init Error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();

        const interval = setInterval(async () => {
            if (isPolling.current) return;
            isPolling.current = true;
            try {
                const res = await axios.get('/api/products?all=true');
                setProducts(res.data || []);
            } catch (e) { console.warn("Sync failed."); }
            finally { isPolling.current = false; }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Barcode Listener
    useEffect(() => {
        let barcodeBuffer = '';
        let timeout;
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.target.placeholder?.includes("Search") && e.key === 'Enter') {
                    e.preventDefault();
                    const p = products.find(prod => prod.sku === e.target.value.trim());
                    if (p) { handleAddToCart(p); setSearchQuery(''); }
                }
                return;
            }
            if (e.key !== 'Enter' && e.key !== 'Shift') barcodeBuffer += e.key;
            if (e.key === 'Enter' && barcodeBuffer.length > 2) {
                const p = products.find(prod => prod.sku === barcodeBuffer);
                if (p) { new Audio('/beep.mp3').play().catch(()=>{}); handleAddToCart(p); }
                barcodeBuffer = '';
            }
            clearTimeout(timeout);
            timeout = setTimeout(() => { barcodeBuffer = ''; }, 100);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [products, cart]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handler = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const filteredProducts = useMemo(() => {
        let result = [...products];
        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category_id === selectedCategory);
        } else {
            result.sort((a, b) => (a.category?.name || 'z').localeCompare(b.category?.name || 'z'));
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
        }
        return result;
    }, [products, selectedCategory, searchQuery]);

    const handleAddToCart = (product) => {
        const inCart = cart.find(item => item.id === product.id);
        const cartQty = inCart ? inCart.quantity : 0;

        if (cartQty >= product.stock_quantity) {
            Swal.fire({ icon: 'error', title: 'Out of Stock', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
            return;
        }
        addToCart(product);
    };

    const handlePrintReceipt = async (trxId) => {
        try {
            const res = await axios.get(`/api/transactions/${trxId}`);
            await printReceipt(res.data, activeSettings);
        } catch (err) { console.error("Receipt Print Error:", err); }
    };

    const fetchHeldOrders = async () => {
        try {
            const response = await axios.get('/api/held-orders');
            setHeldOrders(response.data);
            setShowHeldOrdersModal(true);
        } catch (error) { console.error(error); }
    };

    const handleRecallOrder = async (order) => {
        const result = await Swal.fire({ title: 'Recall Order?', text: "Replace current cart?", icon: 'question', showCancelButton: true });
        if (result.isConfirmed) {
            setCart(order.cart_data);
            await axios.delete(`/api/held-orders/${order.id}`);
            setShowHeldOrdersModal(false);
            if (window.innerWidth < 768) setIsMobileCartOpen(true);
        }
    };

    const activeCat = categories.find(c => c.id === selectedCategory);
    const themeColor = activeCat?.color || '#3B82F6';

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="POS Terminal" />

            <div className="flex h-[calc(100vh-65px)] bg-gray-100 overflow-hidden relative">

                {/* LEFT PANEL: PRODUCT LISTING */}
                <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">

                    {/* COMPACT TOOLBAR */}
                    <div className="p-2 md:p-3 bg-white border-b flex gap-2 items-center shadow-sm z-10 shrink-0">
                        <div className="relative">
                            <button
                                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                className={`p-2 rounded-md border border-gray-200 transition-all ${selectedCategory === 'all' ? 'bg-white text-gray-500' : ''}`}
                                style={selectedCategory !== 'all' ? { backgroundColor: `${themeColor}15`, color: themeColor, borderColor: themeColor } : {}}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>
                            </button>
                            {showCategoryDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowCategoryDropdown(false)}></div>
                                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-2xl border border-gray-100 z-50 py-1 animate-fade-in-up max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        <button onClick={() => {setSelectedCategory('all'); setShowCategoryDropdown(false)}} className={`w-full text-left px-4 py-2 text-sm font-bold ${selectedCategory === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>All Categories</button>
                                        {categories.map(c => (
                                            <button key={c.id} onClick={() => {setSelectedCategory(c.id); setShowCategoryDropdown(false)}} className="w-full text-left px-4 py-2 text-sm font-bold flex items-center gap-3 hover:bg-gray-50" style={selectedCategory === c.id ? {color: c.color} : {}}>
                                                <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: c.color}}></span> {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-9 pr-3 py-2 rounded-md bg-white border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>

                        <button
                            onClick={toggleFullScreen}
                            className="p-2 rounded-md border border-gray-200 text-gray-400 hover:bg-gray-50 transition-all active:scale-90"
                        >
                            {isFullScreen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4.5 4.5M9 9H4.5M9 9V4.5M15 9l4.5-4.5M15 9h4.5M15 9V4.5M15 15l4.5 4.5M15 15h4.5M15 15v4.5M9 15l-4.5 4.5M9 15H4.5M9 15v4.5" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" /></svg>
                            )}
                        </button>
                    </div>

                    {/* PRODUCT GRID */}
                    <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar">
                        {isLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
                                {Array.from({ length: 15 }).map((_, i) => (
                                    <div key={i} className="bg-white p-2 md:p-3 rounded-lg border-2 border-gray-100 flex flex-col h-full animate-pulse relative">
                                        <div className="w-full aspect-square bg-gray-50 rounded-md mb-2"></div>
                                        <div className="h-2 bg-gray-100 rounded w-1/2 mb-1"></div>
                                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                                        <div className="mt-auto pt-1 w-full flex justify-between items-center border-t border-gray-50">
                                            <div className="h-2 bg-gray-100 rounded w-8"></div>
                                            <div className="h-3 bg-gray-200 rounded w-10"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-full text-gray-300">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-2 opacity-20"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" /></svg>
                                <p className="text-sm font-bold">No products found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 pb-20 md:pb-4">
                                {filteredProducts.map((p) => {
                                    const catColor = p.category?.color || '#f3f4f6';
                                    const inCart = cart.find(item => item.id === p.id);
                                    const remainingStock = p.stock_quantity - (inCart ? inCart.quantity : 0);

                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => handleAddToCart(p)}
                                            className="bg-white p-2 md:p-3 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 border-2 flex flex-col items-center text-center h-full relative"
                                            style={{ borderColor: p.category ? catColor : '#f3f4f6' }}
                                        >
                                            <div className="w-full aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                                                {p.image_path ? <img src={p.image_path} alt={p.name} className="w-full h-full object-cover mix-blend-multiply" /> : <svg className="w-8 h-8 text-gray-200" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                                {remainingStock <= 0 && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center font-black text-[10px] text-red-600 uppercase">Sold Out</div>}
                                            </div>

                                            {p.category && (
                                                <span className="text-[10px] font-black uppercase tracking-wider mb-0.5 truncate w-full" style={{ color: catColor }}>
                                                    {p.category.name}
                                                </span>
                                            )}

                                            <h3 className="font-bold text-gray-800 text-xs md:text-sm leading-tight mb-1 line-clamp-2">{p.name}</h3>

                                            {/* BARCODE/SKU BADGE */}
                                            {p.sku && (
                                                <div className="mb-1 w-full flex justify-center">
                                                    <span className="text-[10px] text-gray-500 font-mono tracking-widest bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-full">
                                                        {p.sku}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="mt-auto pt-1 w-full flex justify-between items-center border-t border-gray-50">
                                                <span className={`text-[10px] font-black uppercase ${remainingStock < 10 ? 'text-red-500' : 'text-gray-400'}`}>{remainingStock} Left</span>
                                                <span className="font-bold text-gray-900 text-xs md:text-sm">₱{(p.price / 100).toFixed(2)}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: CART SIDEBAR */}
                <div className="hidden md:flex w-[350px] bg-white border-l shadow-xl z-20 flex-col h-full shrink-0">
                    <CartSidebar
                        settings={activeSettings}
                        showPaymentModal={showPaymentModal}
                        setShowPaymentModal={setShowPaymentModal}
                        onPrintReceipt={handlePrintReceipt}
                        onRecallClick={fetchHeldOrders}
                    />
                </div>

                {/* MOBILE UI */}
                {!isMobileCartOpen && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-40 flex justify-between items-center shadow-2xl">
                        <div className="flex flex-col"><span className="text-[10px] text-gray-400 font-bold uppercase">{cart.length} Items</span><span className="text-lg font-black">₱{(total/100).toFixed(2)}</span></div>
                        <button onClick={() => setIsMobileCartOpen(true)} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-bold active:scale-95 transition-all shadow-lg text-sm">View Order</button>
                    </div>
                )}

                {isMobileCartOpen && (
                    <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
                        <CartSidebar
                            settings={activeSettings}
                            showPaymentModal={showPaymentModal}
                            setShowPaymentModal={setShowPaymentModal}
                            onClose={() => setIsMobileCartOpen(false)}
                            onPrintReceipt={handlePrintReceipt}
                            onRecallClick={fetchHeldOrders}
                        />
                    </div>
                )}
            </div>

            {/* HELD ORDERS MODAL */}
            {showHeldOrdersModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="font-bold text-gray-800 uppercase tracking-widest text-xs">Held Orders</h3>
                            <button onClick={() => setShowHeldOrdersModal(false)} className="text-gray-400 text-2xl">&times;</button>
                        </div>
                        <div className="overflow-y-auto p-4 custom-scrollbar bg-white">
                            {heldOrders.length === 0 ? <p className="text-center text-gray-400 py-10 font-bold text-sm">No saved orders.</p> : (
                                <div className="space-y-3">
                                    {heldOrders.map(order => (
                                        <div key={order.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                                            <div><p className="font-black text-gray-900 text-sm">{order.reference_note}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(order.created_at).toLocaleString()}</p></div>
                                            <button onClick={() => handleRecallOrder(order)} className="bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-600 hover:text-white transition-all">Recall</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}