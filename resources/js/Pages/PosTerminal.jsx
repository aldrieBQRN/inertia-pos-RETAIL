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
    const [categoryNavIndex, setCategoryNavIndex] = useState(-1);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);
    const [heldOrders, setHeldOrders] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Client revision state variables
    const [isWholesaleActive, setIsWholesaleActive] = useState(false);
    const [showResultsOnly, setShowResultsOnly] = useState(() => {
        return localStorage.getItem('pos_show_results_only') === 'true';
    });
    const [showQtyModal, setShowQtyModal] = useState(false);
    const [qtyModalProduct, setQtyModalProduct] = useState(null);
    const [qtyModalInput, setQtyModalInput] = useState('1');
    const [isQtyEditMode, setIsQtyEditMode] = useState(false);
    const [showCustomItemModal, setShowCustomItemModal] = useState(false);
    const [customItemForm, setCustomItemForm] = useState({
        sku: '',
        name: '',
        category_id: '',
        stock_quantity: '0',
        cost_price: '',
        price: '',
        wholesale_price: ''
    });
    const [isCheckingSku, setIsCheckingSku] = useState(false);
    const [productNavIndex, setProductNavIndex] = useState(-1);
    const [heldOrdersNavIndex, setHeldOrdersNavIndex] = useState(-1);

    useEffect(() => {
        localStorage.setItem('pos_show_results_only', showResultsOnly);
    }, [showResultsOnly]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const isPolling = useRef(false);
    const lastSearchInputTime = useRef(0);
    const searchInputRef = useRef(null);
    const catalogContainerRef = useRef(null);

    useEffect(() => {
        // Automatically focus search input on component mount
        const timer = setTimeout(() => {
            if (searchInputRef.current) {
                searchInputRef.current.focus();
            }
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        setProductNavIndex(-1);
    }, [searchQuery]);

    useEffect(() => {
        if (productNavIndex === -1) {
            if (catalogContainerRef.current) {
                catalogContainerRef.current.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        } else {
            const element = document.querySelector(`[data-catalog-item-index="${productNavIndex}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [productNavIndex]);

    useEffect(() => {
        if (showHeldOrdersModal && heldOrdersNavIndex !== -1) {
            const element = document.querySelector(`[data-held-order-index="${heldOrdersNavIndex}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [heldOrdersNavIndex, showHeldOrdersModal]);

    useEffect(() => {
        const handleCloseDropdown = () => {
            setShowCategoryDropdown(false);
            setCategoryNavIndex(-1);
        };
        const handleResetCatalog = () => {
            setProductNavIndex(-1);
        };
        window.addEventListener('close-category-dropdown', handleCloseDropdown);
        window.addEventListener('reset-catalog-nav', handleResetCatalog);
        return () => {
            window.removeEventListener('close-category-dropdown', handleCloseDropdown);
            window.removeEventListener('reset-catalog-nav', handleResetCatalog);
        };
    }, []);

    // Global key listener for main POS screen
    useEffect(() => {
        const handlePOSKeys = (e) => {
            const isFKey = e.key.match(/^F[1-9]$|^F1[0-2]$/);
            
            // Intercept and prevent browser native defaults for POS F-keys
            if (isFKey) {
                e.preventDefault();
            }

            // Ignore if standard typing in input/textarea (unless it's an F-key)
            if (!isFKey && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                return;
            }

            if (isFKey) {
                setTimeout(() => {
                    setProductNavIndex(-1);
                }, 0);
            }

            // If Category Dropdown is open, handle navigation keys
            if (showCategoryDropdown) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setCategoryNavIndex(prev => Math.min(prev + 1, categories.length));
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setCategoryNavIndex(prev => Math.max(prev - 1, 0));
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowCategoryDropdown(false);
                    setCategoryNavIndex(-1);
                    return;
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (categoryNavIndex === 0) {
                        setSelectedCategory('all');
                        setShowCategoryDropdown(false);
                        setCategoryNavIndex(-1);
                    } else if (categoryNavIndex > 0 && categoryNavIndex <= categories.length) {
                        setSelectedCategory(categories[categoryNavIndex - 1].id);
                        setShowCategoryDropdown(false);
                        setCategoryNavIndex(-1);
                    }
                    return;
                }
            }

            // Handle held orders key navigation when that modal is open
            if (showHeldOrdersModal) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (heldOrders.length > 0) {
                        setHeldOrdersNavIndex(prev => Math.min(prev + 1, heldOrders.length - 1));
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (heldOrders.length > 0) {
                        setHeldOrdersNavIndex(prev => Math.max(prev - 1, 0));
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowHeldOrdersModal(false);
                    setHeldOrdersNavIndex(-1);
                } else if (e.key === 'Enter' || e.key === 'F7') {
                    e.preventDefault();
                    if (heldOrdersNavIndex !== -1 && heldOrdersNavIndex < heldOrders.length) {
                        handleRecallOrder(heldOrders[heldOrdersNavIndex]);
                    }
                } else if (e.key === 'Backspace' || e.key === 'Delete' || e.code === 'Backspace' || e.code === 'Delete') {
                    e.preventDefault();
                    if (heldOrdersNavIndex !== -1 && heldOrdersNavIndex < heldOrders.length) {
                        handleDiscardHeldOrder(heldOrders[heldOrdersNavIndex]);
                    }
                }
                return;
            }

            // Suspend POS shortcuts if checkout modal or quantity modal is open
            if (showPaymentModal || showQtyModal) {
                return;
            }

            // Intercept shortcuts specifically for the Add Custom Item modal if open
            if (showCustomItemModal) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowCustomItemModal(false);
                } else if (e.key === 'F1') {
                    e.preventDefault();
                    document.getElementById('custom-sku-input')?.focus();
                } else if (e.key === 'F2') {
                    e.preventDefault();
                    document.getElementById('custom-name-input')?.focus();
                } else if (e.key === 'F3') {
                    e.preventDefault();
                    document.getElementById('custom-category-input')?.focus();
                } else if (e.key === 'F5') {
                    e.preventDefault();
                    document.getElementById('custom-stock-input')?.focus();
                } else if (e.key === 'F6') {
                    e.preventDefault();
                    document.getElementById('custom-cost-input')?.focus();
                } else if (e.key === 'F7') {
                    e.preventDefault();
                    document.getElementById('custom-retail-input')?.focus();
                } else if (e.key === 'F8') {
                    e.preventDefault();
                    document.getElementById('custom-wholesale-input')?.focus();
                } else if (e.key === 'F9') {
                    e.preventDefault();
                    generateCustomItemSKU();
                }
                return;
            }

            if (e.key === 'F1') {
                // Close category dropdown
                setShowCategoryDropdown(false);
                setCategoryNavIndex(-1);
                // Reset cart navigation selection
                window.dispatchEvent(new CustomEvent('reset-cart-nav'));
                // Toggle focus search input
                if (searchInputRef.current) {
                    if (document.activeElement === searchInputRef.current) {
                        searchInputRef.current.blur();
                    } else {
                        searchInputRef.current.focus();
                        searchInputRef.current.select();
                    }
                }
            } else if (e.key === 'F2') {
                setIsWholesaleActive(prev => !prev);
            } else if (e.key === 'F3') {
                setShowResultsOnly(prev => {
                    const next = !prev;
                    localStorage.setItem('pos_show_results_only', next ? '1' : '0');
                    return next;
                });
            } else if (e.key === 'F4') {
                handleOpenCustomItemModal();
            } else if (e.key === 'F5') {
                // Blur search input to prevent input character pollution and free arrow keys
                if (searchInputRef.current) {
                    searchInputRef.current.blur();
                }
                // Reset cart navigation selection
                window.dispatchEvent(new CustomEvent('reset-cart-nav'));

                setShowCategoryDropdown(prev => {
                    const next = !prev;
                    if (next) {
                        setCategoryNavIndex(0); // Focus "All Categories" initially
                    } else {
                        setCategoryNavIndex(-1);
                    }
                    return next;
                });
            } else if (e.key === 'F7') {
                fetchHeldOrders();
            }
        };

        window.addEventListener('keydown', handlePOSKeys);
        return () => window.removeEventListener('keydown', handlePOSKeys);
    }, [showPaymentModal, showQtyModal, showHeldOrdersModal, showCustomItemModal, showCategoryDropdown, categoryNavIndex, categories, customItemForm, isCheckingSku]);

    const cart = useCartStore((state) => state.cart);
    const addToCart = useCartStore((state) => state.addToCart);
    const setCart = useCartStore((state) => state.setCart);
    const getComputations = useCartStore((state) => state.getComputations);
    const printReceipt = usePrinterStore((state) => state.printReceipt);

    const { total } = getComputations ? getComputations() : { total: 0 };

    const loadProductsAndCategories = async (showLoading = false) => {
        if (showLoading) setIsLoading(true);
        try {
            const [prodRes, catRes] = await Promise.all([
                axios.get('/api/products?all=true'),
                axios.get('/api/categories')
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
        } catch (error) {
            console.error("Error loading products/categories:", error);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProductsAndCategories(true);

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

    const filteredProducts = useMemo(() => {
        if (showResultsOnly && !searchQuery.trim()) {
            return [];
        }
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
    }, [products, selectedCategory, searchQuery, showResultsOnly]);

    const handleSearchKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredProducts.length > 0) {
                setProductNavIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
            }
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredProducts.length > 0) {
                setProductNavIndex(prev => Math.max(prev - 1, -1));
            }
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            
            // If an item in the search results is highlighted via arrow keys, select it
            if (productNavIndex !== -1 && productNavIndex < filteredProducts.length) {
                const selectedProd = filteredProducts[productNavIndex];
                const inCart = cart.find(item => item.id === selectedProd.id);
                const remainingStock = selectedProd.stock_quantity - (inCart ? inCart.quantity : 0);
                if (remainingStock > 0) {
                    new Audio('/beep.mp3').play().catch(() => {});
                    triggerQtyModal(selectedProd);
                    setProductNavIndex(-1);
                } else {
                    Swal.fire({ icon: 'error', title: 'Out of Stock', text: 'Catalog stock limit reached.', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
                }
                return;
            }

            // Default SKU search enter key behavior
            const timeDiff = Date.now() - lastSearchInputTime.current;
            // Ignore automatic trailing Enter sent by barcode scanners (usually <120ms of typing).
            if (timeDiff < 120) {
                return;
            }
            let p = products.find(prod => prod.sku === searchQuery.trim());
            if (!p && filteredProducts.length === 1) {
                p = filteredProducts[0];
            }
            if (p) {
                new Audio('/beep.mp3').play().catch(() => {});
                triggerQtyModal(p);
            }
        } else {
            lastSearchInputTime.current = Date.now();
        }
    };

    const triggerQtyModal = (product, isEdit = false) => {
        const inCart = cart.find(item => item.id === product.id);
        const currentQty = inCart ? inCart.quantity : 0;
        if (!isEdit && currentQty >= product.stock_quantity) {
            Swal.fire({ icon: 'error', title: 'Out of Stock', text: 'Catalog stock limit reached.', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
            return;
        }
        setQtyModalProduct(product);
        setQtyModalInput(isEdit ? String(product.quantity) : '1');
        setIsQtyEditMode(isEdit);
        setShowQtyModal(true);
        if (searchInputRef.current) searchInputRef.current.blur();
    };

    const handleConfirmQty = (e) => {
        if (e) e.preventDefault();
        const qty = parseInt(qtyModalInput, 10);
        if (isNaN(qty) || qty <= 0) {
            Swal.fire({ icon: 'error', title: 'Invalid Quantity', text: 'Please enter a valid positive number.', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
            return;
        }

        if (qty > qtyModalProduct.stock_quantity) {
            Swal.fire({
                icon: 'error',
                title: 'Limit Reached',
                text: `Only ${qtyModalProduct.stock_quantity} items available in stock.`,
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 2000
            });
            return;
        }

        const appliedPrice = (isWholesaleActive && qtyModalProduct.wholesale_price !== null && qtyModalProduct.wholesale_price !== undefined) 
            ? qtyModalProduct.wholesale_price 
            : qtyModalProduct.price;

        if (isQtyEditMode) {
            const updatedCart = cart.map(item => item.id === qtyModalProduct.id ? { ...item, quantity: qty } : item);
            setCart(updatedCart);
        } else {
            addToCart(qtyModalProduct, qty, appliedPrice);
        }

        setShowQtyModal(false);
        setQtyModalProduct(null);
        setIsQtyEditMode(false);
        setSearchQuery('');
        
        setTimeout(() => {
            const searchInput = document.querySelector('input[placeholder*="Search"]');
            if (searchInput) searchInput.focus();
        }, 100);
    };

    const generateCustomItemSKU = async () => {
        setIsCheckingSku(true);
        try {
            const response = await axios.get('/api/products/next-sku');
            if (response.data.success && response.data.next_sku) {
                setCustomItemForm(prev => ({ ...prev, sku: response.data.next_sku }));
            } else {
                throw new Error("Invalid next SKU response");
            }
        } catch (error) {
            console.error("SKU generation failed:", error);
            Swal.fire('Error', 'Could not generate next sequential SKU.', 'error');
        } finally {
            setIsCheckingSku(false);
        }
    };

    const handleOpenCustomItemModal = () => {
        setCustomItemForm({
            sku: '',
            name: '',
            category_id: '',
            stock_quantity: '0',
            cost_price: '',
            price: '',
            wholesale_price: ''
        });
        setShowCustomItemModal(true);
        if (searchInputRef.current) searchInputRef.current.blur();
    };

    const handleAddCustomItem = async (e) => {
        if (e) e.preventDefault();
        const { sku, name, category_id, stock_quantity, cost_price, price, wholesale_price } = customItemForm;

        if (!name.trim() || !price || !category_id || !sku.trim() || stock_quantity === '') {
            Swal.fire({ icon: 'error', title: 'Fields Required', text: 'Please fill in SKU, Product Name, Category, Retail Price, and Initial Stock.', toast: true, position: 'top', showConfirmButton: false, timer: 2000 });
            return;
        }

        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            Swal.fire({ icon: 'error', title: 'Invalid Price', text: 'Please enter a valid retail price.', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
            return;
        }

        const skuExists = products.some(p => p.sku === sku.trim());
        if (skuExists) {
            Swal.fire({ icon: 'error', title: 'Duplicate SKU', text: 'A product with this SKU already exists.', toast: true, position: 'top', showConfirmButton: false, timer: 2000 });
            return;
        }

        setIsLoading(true);
        try {
            const postData = {
                sku: sku.trim(),
                name: name.trim(),
                category_id: category_id,
                stock_quantity: parseInt(stock_quantity, 10),
                price: numericPrice,
                cost_price: cost_price ? parseFloat(cost_price) : null,
                wholesale_price: wholesale_price ? parseFloat(wholesale_price) : null
            };

            const res = await axios.post('/api/products', postData);
            
            const newProduct = res.data;
            const appliedPrice = (isWholesaleActive && newProduct.wholesale_price !== null && newProduct.wholesale_price !== undefined) 
                ? newProduct.wholesale_price 
                : newProduct.price;

            addToCart(newProduct, 1, appliedPrice);

            setShowCustomItemModal(false);
            setCustomItemForm({
                sku: '',
                name: '',
                category_id: '',
                stock_quantity: '0',
                cost_price: '',
                price: '',
                wholesale_price: ''
            });

            await loadProductsAndCategories(false);

            Swal.fire({ icon: 'success', title: 'Product Added!', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } catch (error) {
            console.error("Failed to add product:", error);
            const errorMsg = error.response?.data?.error || 'An error occurred while saving the product.';
            Swal.fire({ icon: 'error', title: 'Save Failed', text: errorMsg });
        } finally {
            setIsLoading(false);
        }
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
            setHeldOrdersNavIndex(response.data.length > 0 ? 0 : -1);
            if (searchInputRef.current) searchInputRef.current.blur();
        } catch (error) { console.error(error); }
    };

    const handleRecallOrder = async (order) => {
        const result = await Swal.fire({ title: 'Recall Order?', text: `Replace current cart with "${order.reference_note || 'Untitled'}"?`, icon: 'question', showCancelButton: true });
        if (result.isConfirmed) {
            setCart(order.cart_data);
            await axios.delete(`/api/held-orders/${order.id}`);
            setShowHeldOrdersModal(false);
            setHeldOrdersNavIndex(-1);
            if (window.innerWidth < 768) setIsMobileCartOpen(true);
        }
    };

    const handleDiscardHeldOrder = async (order) => {
        const result = await Swal.fire({
            title: 'Discard Order?',
            text: `Are you sure you want to delete "${order.reference_note || 'Untitled'}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Yes, discard it',
            cancelButtonText: 'Cancel'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/held-orders/${order.id}`);
                const response = await axios.get('/api/held-orders');
                setHeldOrders(response.data);
                setHeldOrdersNavIndex(prev => {
                    const newLen = response.data.length;
                    if (newLen === 0) return -1;
                    return Math.min(prev, newLen - 1);
                });
            } catch (e) {
                console.error("Discard failed:", e);
            }
        }
    };

    const isAnyModalOpen = showPaymentModal || showQtyModal || showHeldOrdersModal || showCustomItemModal;
    const activeCat = categories.find(c => c.id === selectedCategory);
    const themeColor = activeCat?.color || '#3B82F6';

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="POS Terminal" />

            <div className="flex h-[calc(100vh-65px)] bg-gray-100 overflow-hidden relative">

                {/* LEFT: CART SIDEBAR (50/50 splits) */}
                <div className={`flex-1 md:w-1/2 flex-col min-w-0 h-full bg-white ${isMobileCartOpen ? 'flex fixed inset-0 z-50 bg-white' : 'hidden md:flex'}`}>
                    <CartSidebar
                        settings={activeSettings}
                        showPaymentModal={showPaymentModal}
                        setShowPaymentModal={setShowPaymentModal}
                        onPrintReceipt={handlePrintReceipt}
                        onRecallClick={fetchHeldOrders}
                        onEditItemQty={(item) => triggerQtyModal(item, true)}
                        onClose={isMobile ? () => setIsMobileCartOpen(false) : undefined}
                        disabled={isAnyModalOpen}
                    />
                </div>

                {/* RIGHT PANEL: PRODUCT LISTING (50/50 splits) */}
                <div className={`w-full md:w-1/2 md:flex-1 min-w-0 bg-gray-50 border-l border-gray-200 flex-col h-full ${isMobileCartOpen ? 'hidden md:flex' : 'flex'}`}>

                    {/* COMPACT TOOLBAR */}
                    <div className="p-2 md:p-3 bg-white border-b flex flex-col gap-2 shadow-sm z-10 shrink-0">
                        {/* Row 1: Category & Search */}
                        <div className="flex gap-2 items-center w-full">
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        if (isAnyModalOpen) return;
                                        if (searchInputRef.current) {
                                            searchInputRef.current.blur();
                                        }
                                        window.dispatchEvent(new CustomEvent('reset-cart-nav'));
                                        setShowCategoryDropdown(!showCategoryDropdown);
                                        setCategoryNavIndex(prev => prev === -1 ? 0 : -1);
                                    }}
                                    disabled={isAnyModalOpen}
                                    className={`px-3 h-[46px] rounded-md border border-gray-200 transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed ${selectedCategory === 'all' ? 'bg-white text-gray-500' : ''}`}
                                    style={selectedCategory !== 'all' ? { backgroundColor: `${themeColor}15`, color: themeColor, borderColor: themeColor } : {}}
                                    title="Category Filter (F5)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>
                                    <span>Category (F5)</span>
                                </button>
                                {showCategoryDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => { setShowCategoryDropdown(false); setCategoryNavIndex(-1); }}></div>
                                        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-2xl border border-gray-100 z-50 py-1 animate-fade-in-up max-h-[60vh] overflow-y-auto custom-scrollbar">
                                            <button 
                                                onClick={() => {setSelectedCategory('all'); setShowCategoryDropdown(false); setCategoryNavIndex(-1);}} 
                                                className={`w-full text-left px-4 py-2.5 text-base font-bold transition-colors ${categoryNavIndex === 0 ? 'bg-indigo-600 text-white' : selectedCategory === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                All Categories (F5)
                                            </button>
                                            {categories.map((c, idx) => {
                                                const isHighlighted = categoryNavIndex === (idx + 1);
                                                const isSelected = selectedCategory === c.id;
                                                return (
                                                    <button 
                                                        key={c.id} 
                                                        onClick={() => {setSelectedCategory(c.id); setShowCategoryDropdown(false); setCategoryNavIndex(-1);}} 
                                                        className={`w-full text-left px-4 py-2.5 text-base font-bold flex items-center gap-3 transition-colors ${isHighlighted ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'}`}
                                                        style={(!isHighlighted && isSelected) ? {color: c.color} : {}}
                                                    >
                                                        <span className={`w-2.5 h-2.5 rounded-full ${isHighlighted ? 'bg-white' : ''}`} style={!isHighlighted ? {backgroundColor: c.color} : {}}></span> 
                                                        <span style={isHighlighted ? {color: '#fff'} : isSelected ? {color: c.color} : {}}>{c.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="relative flex-1">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search... (F1)"
                                    className="w-full pl-9 pr-3 py-2.5 rounded-md bg-white border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none text-base font-semibold disabled:bg-gray-100/50 disabled:cursor-not-allowed disabled:text-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    disabled={isAnyModalOpen}
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>

                        {/* Row 2: Wholesale Toggle, Results Only Toggle & Custom Item Button */}
                        <div className="flex items-center justify-between w-full pt-1">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center cursor-pointer select-none">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={isWholesaleActive}
                                            onChange={() => !isAnyModalOpen && setIsWholesaleActive(!isWholesaleActive)}
                                            disabled={isAnyModalOpen}
                                            className="sr-only"
                                        />
                                        <div className={`w-9 h-5 rounded-full transition-colors ${isWholesaleActive ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                                        <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isWholesaleActive ? 'transform translate-x-4' : ''}`}></div>
                                    </div>
                                    <span className="ml-2 text-xs font-black uppercase tracking-wider text-gray-500 font-mono">Wholesale Mode (F2)</span>
                                </label>

                                <label className="flex items-center cursor-pointer select-none">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={showResultsOnly}
                                            onChange={() => !isAnyModalOpen && setShowResultsOnly(!showResultsOnly)}
                                            disabled={isAnyModalOpen}
                                            className="sr-only"
                                        />
                                        <div className={`w-9 h-5 rounded-full transition-colors ${showResultsOnly ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                                        <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${showResultsOnly ? 'transform translate-x-4' : ''}`}></div>
                                    </div>
                                    <span className="ml-2 text-xs font-black uppercase tracking-wider text-gray-500 font-mono">Results Only (F3)</span>
                                </label>
                            </div>

                            <button
                                onClick={handleOpenCustomItemModal}
                                disabled={isAnyModalOpen}
                                className="px-3 py-2 bg-gray-900 hover:bg-black text-white rounded-md text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                Custom Item (F4)
                            </button>
                        </div>
                    </div>

                    {/* PRODUCT LIST COLUMN HEADERS */}
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 shrink-0 hidden md:block">
                        <div className="grid grid-cols-[140px_1fr_100px_110px] gap-2 text-xs font-black uppercase tracking-wider text-gray-500 font-mono">
                            <div className="pl-2">Barcode</div>
                            <div className="pl-2">Product Name / Category</div>
                            <div className="text-right">Stock</div>
                            <div className="text-right">Price</div>
                        </div>
                    </div>

                    {/* PRODUCT LIST (TABLE-LIKE VIEW FLUSH WITH SIDES) */}
                    <div ref={catalogContainerRef} className="flex-1 overflow-y-auto custom-scrollbar bg-white divide-y divide-gray-100">
                        {isLoading ? (
                            <div className="p-3 space-y-2">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="bg-white p-3.5 rounded-md border border-gray-150 animate-pulse flex justify-between items-center">
                                        <div className="space-y-2 w-2/3">
                                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-2 bg-gray-150 rounded w-1/2"></div>
                                        </div>
                                        <div className="h-5 bg-gray-200 rounded w-12 text-right"></div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-full text-gray-300 py-10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2 opacity-20"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" /></svg>
                                <p className="text-xs font-bold text-gray-400">
                                    {showResultsOnly && !searchQuery.trim()
                                        ? "Scan barcode or search to display products"
                                        : "No products found"}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-gray-100">
                                {filteredProducts.map((p, index) => {
                                    const catColor = p.category?.color || '#f3f4f6';
                                    const inCart = cart.find(item => item.id === p.id);
                                    const remainingStock = p.stock_quantity - (inCart ? inCart.quantity : 0);
                                    const isSoldOut = remainingStock <= 0;
                                    const appliedPrice = (isWholesaleActive && p.wholesale_price !== null) ? p.wholesale_price : p.price;
                                    const isHighlighted = productNavIndex === index;

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => !isSoldOut && triggerQtyModal(p)}
                                            data-catalog-item-index={index}
                                            className={`px-3 py-3.5 grid grid-cols-[1fr_90px] md:grid-cols-[140px_1fr_100px_110px] gap-2 items-center cursor-pointer transition-colors hover:bg-gray-50 ${isHighlighted ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/40' : ''} ${isSoldOut ? 'opacity-50 cursor-not-allowed bg-gray-50/50' : ''}`}
                                        >
                                            {/* Barcode Column */}
                                            <div className="min-w-0 font-mono text-base font-black text-gray-900 select-all hidden md:block truncate pl-2">
                                                {p.sku || '—'}
                                            </div>

                                            {/* Name Column */}
                                            <div className="min-w-0 pl-2">
                                                <div className="font-extrabold text-gray-800 text-base truncate">{p.name}</div>
                                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                    {p.sku && (
                                                        <span className="md:hidden font-mono text-sm font-black text-gray-500">{p.sku}</span>
                                                    )}
                                                    {p.category && (
                                                        <span
                                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                                                            style={{ backgroundColor: `${catColor}15`, color: catColor }}
                                                        >
                                                            {p.category.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stock Column */}
                                            <div className="text-right hidden md:block">
                                                <span className={`text-sm font-bold ${isSoldOut ? 'text-red-500' : remainingStock < 10 ? 'text-orange-500' : 'text-green-600'}`}>
                                                    {isSoldOut ? 'Sold Out' : `${remainingStock}`}
                                                </span>
                                            </div>

                                            {/* Price Column */}
                                            <div className="text-right">
                                                <div className="font-black text-gray-955 text-base">
                                                    {(appliedPrice / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <div className={`md:hidden text-xs font-bold mt-0.5 ${isSoldOut ? 'text-red-500' : remainingStock < 10 ? 'text-orange-500' : 'text-green-600'}`}>
                                                    {isSoldOut ? 'Sold Out' : `${remainingStock} left`}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* MOBILE VIEW ACTIONS */}
                {!isMobileCartOpen && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-40 flex justify-between items-center shadow-2xl">
                        <div className="flex flex-col"><span className="text-[10px] text-gray-450 font-bold uppercase">{cart.length} Items</span><span className="text-lg font-black">{(total/100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
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
                            onEditItemQty={(item) => triggerQtyModal(item, true)}
                            disabled={isAnyModalOpen}
                        />
                    </div>
                )}
            </div>

            {/* HELD ORDERS MODAL */}
            {showHeldOrdersModal && (
                <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-white w-full max-w-md h-auto max-h-[85vh] sm:max-h-[90vh] rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in">
                        {/* Header */}
                        <div className="bg-gray-50 px-4 py-4 border-b flex justify-between items-center shrink-0">
                            <h2 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">Recall Saved Order</h2>
                            <button
                                onClick={() => { setShowHeldOrdersModal(false); setHeldOrdersNavIndex(-1); }}
                                className="p-1.5 bg-gray-200 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {/* Scrollable list */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar bg-gray-50 flex flex-col gap-3">
                            {heldOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-300 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                                    <p className="font-bold text-sm">No saved orders found</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {heldOrders.map((order, index) => {
                                        const isSelected = heldOrdersNavIndex === index;
                                        const itemCount = order.cart_data.reduce((acc, item) => acc + item.quantity, 0);
                                        const orderTotal = order.cart_data.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                                        return (
                                            <div
                                                key={order.id}
                                                data-held-order-index={index}
                                                onClick={() => setHeldOrdersNavIndex(index)}
                                                className={`bg-white rounded-lg border transition-all p-3.5 flex flex-col gap-2.5 cursor-pointer group shadow-sm hover:bg-indigo-50/10
                                                    ${isSelected ? 'ring-2 ring-inset ring-indigo-500 border-indigo-300 bg-indigo-50/20' : 'border-gray-200'}`}
                                            >
                                                {/* Top Row: Note & Price */}
                                                <div className="flex justify-between items-start gap-3">
                                                    <span className="font-black text-gray-900 text-sm md:text-base tracking-tight truncate flex-1">
                                                        {order.reference_note || 'Untitled Saved Order'}
                                                    </span>
                                                    <span className="font-mono font-extrabold text-gray-900 text-sm md:text-base shrink-0">
                                                        ₱{(orderTotal / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                {/* Bottom Row: Info & Actions */}
                                                <div className="flex justify-between items-center gap-2">
                                                    {/* Info */}
                                                    <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-gray-405 uppercase tracking-wider">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-gray-400 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                                                        <span>{new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span>•</span>
                                                        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 shrink-0 select-none">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDiscardHeldOrder(order); }}
                                                            className="p-1.5 text-gray-450 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                                                            title="Discard (Backspace)"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRecallOrder(order); }}
                                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all hover:shadow-md active:scale-95 flex items-center gap-1"
                                                            title="Recall (Enter)"
                                                        >
                                                            Recall
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {/* Footer Action */}
                        <div className="p-4 border-t bg-gray-50 shrink-0">
                            <button
                                type="button"
                                onClick={() => { setShowHeldOrdersModal(false); setHeldOrdersNavIndex(-1); }}
                                className="w-full py-3 bg-white text-gray-755 border border-gray-300 font-black text-sm uppercase tracking-widest rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-[0.98]"
                            >
                                Cancel (Esc)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUANTITY INPUT MODAL */}
            {showQtyModal && qtyModalProduct && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity">
                    <div className="bg-white w-full max-w-sm h-auto max-h-[85vh] sm:max-h-[90vh] rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in">
                        <div className="bg-gray-50 px-4 py-4 border-b flex justify-between items-center shrink-0">
                            <h2 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">Enter Quantity</h2>
                            <button
                                onClick={() => { setShowQtyModal(false); setQtyModalProduct(null); }}
                                className="p-1.5 bg-gray-200 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleConfirmQty} className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar flex flex-col">
                            {/* Product Info Summary */}
                            <div className="text-center mb-5 shrink-0">
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Item Details</div>
                                <div className="text-lg md:text-xl font-black text-gray-900 tracking-tight truncate px-2">{qtyModalProduct.name}</div>
                                <div className="text-2xl md:text-3xl font-black text-blue-600 tracking-tighter mt-1">
                                    {(((isWholesaleActive && qtyModalProduct.wholesale_price !== null) ? qtyModalProduct.wholesale_price : qtyModalProduct.price) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>

                            {/* Quantity Input Wrapper */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-inner flex-1 flex flex-col justify-center">
                                <label className="block text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-2 text-left">Quantity</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max={qtyModalProduct.stock_quantity}
                                    value={qtyModalInput}
                                    onChange={(e) => setQtyModalInput(e.target.value)}
                                    className="w-full px-4 py-3 text-center text-3xl font-black text-gray-900 border-gray-300 rounded-lg focus:ring-gray-900 focus:border-gray-900 shadow-sm font-mono"
                                    placeholder="0"
                                    autoFocus
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setShowQtyModal(false);
                                            setQtyModalProduct(null);
                                        }
                                    }}
                                />
                                {qtyModalProduct.stock_quantity < 99999 && (
                                    <div className="mt-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Available Stock: <span className="text-gray-600 font-black">{qtyModalProduct.stock_quantity}</span>
                                    </div>
                                )}
                            </div>

                            {/* Submit & Cancel Buttons */}
                            <div className="flex flex-col gap-2 mt-5 pb-2 shrink-0">
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-gray-900 hover:bg-black text-white font-black text-sm uppercase tracking-widest rounded-lg shadow-lg transition-all active:scale-[0.98]"
                                >
                                    Add to Cart (Enter)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowQtyModal(false); setQtyModalProduct(null); }}
                                    className="w-full py-3 bg-white text-gray-755 border border-gray-300 font-black text-sm uppercase tracking-widest rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-[0.98]"
                                >
                                    Cancel (Esc)
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CUSTOM ITEM MODAL */}
            {showCustomItemModal && (
                <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-white w-full max-w-md h-auto max-h-[85vh] sm:max-h-[90vh] rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in">
                        {/* Header */}
                        <div className="bg-gray-50 px-4 py-4 border-b flex justify-between items-center shrink-0">
                            <h2 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">Add Custom Item</h2>
                            <button
                                onClick={() => setShowCustomItemModal(false)}
                                className="p-1.5 bg-gray-200 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {/* Scrollable Form body */}
                        <form onSubmit={handleAddCustomItem} className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar flex flex-col gap-4 bg-white">
                            {/* SKU / Barcode */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">SKU / Barcode (F1)</label>
                                <div className="flex gap-2">
                                    <input
                                        id="custom-sku-input"
                                        type="text"
                                        required
                                        value={customItemForm.sku}
                                        onChange={(e) => setCustomItemForm({ ...customItemForm, sku: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                        className="flex-1 border border-gray-300 bg-gray-55/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-sm font-mono"
                                        placeholder="Scan or type barcode..."
                                    />
                                    <button
                                        type="button"
                                        onClick={generateCustomItemSKU}
                                        disabled={isCheckingSku}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 px-3.5 py-2.5 rounded-lg transition-colors active:scale-95 disabled:opacity-50"
                                        title="Generate SKU (F9)"
                                    >
                                        {isCheckingSku ? (
                                            <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Product Name */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Product Name (F2)</label>
                                <input
                                    id="custom-name-input"
                                    type="text"
                                    required
                                    value={customItemForm.name}
                                    onChange={(e) => setCustomItemForm({ ...customItemForm, name: e.target.value })}
                                    className="w-full border border-gray-300 bg-gray-55/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-sm"
                                    placeholder="e.g. Classic Cappuccino"
                                />
                            </div>

                            {/* Category & Initial Stock */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Category (F3)</label>
                                    <select
                                        id="custom-category-input"
                                        required
                                        value={customItemForm.category_id}
                                        onChange={(e) => setCustomItemForm({ ...customItemForm, category_id: e.target.value })}
                                        className="w-full border border-gray-300 bg-gray-55/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-sm"
                                    >
                                        <option value="">Select Category...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Initial Stock (F5)</label>
                                    <input
                                        id="custom-stock-input"
                                        type="number"
                                        required
                                        value={customItemForm.stock_quantity}
                                        onChange={(e) => setCustomItemForm({ ...customItemForm, stock_quantity: e.target.value })}
                                        className="w-full border border-gray-300 bg-gray-55/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-sm"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Cost Price */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Cost Price (₱) (F6)</label>
                                <input
                                    id="custom-cost-input"
                                    type="number"
                                    step="0.01"
                                    value={customItemForm.cost_price}
                                    onChange={(e) => setCustomItemForm({ ...customItemForm, cost_price: e.target.value })}
                                    className="w-full border border-gray-300 bg-gray-55/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-sm"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Retail Price & Wholesale Price */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Retail Price (₱) (F7)</label>
                                    <input
                                        id="custom-retail-input"
                                        type="number"
                                        step="0.01"
                                        required
                                        value={customItemForm.price}
                                        onChange={(e) => setCustomItemForm({ ...customItemForm, price: e.target.value })}
                                        className="w-full border border-gray-300 bg-gray-55/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Wholesale Price (₱) (F8)</label>
                                    <input
                                        id="custom-wholesale-input"
                                        type="number"
                                        step="0.01"
                                        value={customItemForm.wholesale_price}
                                        onChange={(e) => setCustomItemForm({ ...customItemForm, wholesale_price: e.target.value })}
                                        className="w-full border border-gray-300 bg-gray-55/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-2.5 px-3 text-sm font-semibold text-gray-900 shadow-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Actions Group */}
                            <div className="flex flex-col gap-2 mt-4 pt-4 border-t shrink-0">
                                <button
                                    id="custom-item-form-submit-btn"
                                    type="submit"
                                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-black text-sm uppercase tracking-widest rounded-lg shadow-lg transition-all active:scale-[0.98]"
                                >
                                    Add Custom (Enter)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCustomItemModal(false)}
                                    className="w-full py-3 bg-white text-gray-755 border border-gray-300 font-black text-sm uppercase tracking-widest rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-[0.98]"
                                >
                                    Cancel (Esc)
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}