import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import ShiftModal from '@/Components/ShiftModal';
import usePrinterStore from '@/Stores/usePrinterStore';

/**
 * Store Settings Page
 * Unified Design System matching Inventory, Transactions, Shift History, Reports, Dashboard, and POS Terminal.
 * 
 * Dynamic Role Awareness:
 * - Admin: Store Profile, POS Registers/Lanes, Receipt Customization & Mockup, Operational Rules, Legal Policies.
 * - Cashier: Workstation Hardware, Active Shift Drawer & Z-Read, My Profile & Security, Staff Policies.
 */
export default function Settings({ auth, initial_settings, initial_terminals }) {
    const user = auth?.user;
    const isAdmin = Boolean(user?.is_admin);

    // Active Tab State
    const [activeTab, setActiveTab] = useState(isAdmin ? 'store' : 'hardware');
    const mobileTabsRef = useRef(null);

    // Settings Data State
    const [settings, setSettings] = useState(() => initial_settings || {
        store_name: '',
        address: '',
        phone: '',
        terms_of_service: '',
        privacy_policy: '',
        staff_terms_of_service: '',
        staff_privacy_policy: '',
        active_shift: null,
    });

    const [loading, setLoading] = useState(() => !initial_settings);
    const [saving, setSaving] = useState(false);

    // Store Profile Form State (Admin)
    const [storeForm, setStoreForm] = useState(() => ({
        store_name: initial_settings?.store_name || '',
        address: initial_settings?.address || '',
        phone: initial_settings?.phone || '',
    }));
    const [logoFile, setLogoFile] = useState(null);
    const [preview, setPreview] = useState(() => {
        if (initial_settings?.logo_path) {
            return `${initial_settings.logo_path}?t=${new Date().getTime()}`;
        }
        return '/logo.png';
    });

    // Receipt Customization State
    const [receiptHeaderTagline, setReceiptHeaderTagline] = useState(() => {
        return localStorage.getItem('pos_receipt_tagline') || 'Official Retail Receipt';
    });
    const [receiptFooterNote, setReceiptFooterNote] = useState(() => {
        return localStorage.getItem('pos_receipt_footer') || 'Thank you for shopping with us! Please keep this receipt for exchanges.';
    });

    // POS Terminals / Registers State
    const [terminals, setTerminals] = useState(() => initial_terminals || []);
    const [loadingTerminals, setLoadingTerminals] = useState(false);
    const [showTerminalModal, setShowTerminalModal] = useState(false);
    const [editingTerminal, setEditingTerminal] = useState(null);
    const [terminalForm, setTerminalForm] = useState({ name: '', code: '', notes: '' });
    const [currentLocalTerminalId, setCurrentLocalTerminalId] = useState(() => {
        return localStorage.getItem('pos_terminal_id');
    });

    // Hardware & Workstation Preferences (Stored per browser/device)
    const [localShortcutsEnabled, setLocalShortcutsEnabled] = useState(() => {
        return localStorage.getItem('pos_enable_shortcuts') !== 'false';
    });
    const [showResultsOnly, setShowResultsOnly] = useState(() => {
        return localStorage.getItem('pos_show_results_only') === '1';
    });
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Modals
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [selectedLegalDoc, setSelectedLegalDoc] = useState(isAdmin ? 'terms' : 'staff_terms'); // 'terms', 'privacy', 'staff_terms', 'staff_privacy'

    // Printer Zustand Store
    const usbDevice = usePrinterStore((state) => state.usbDevice);
    const bluetoothDevice = usePrinterStore((state) => state.bluetoothDevice);
    const isMobile = usePrinterStore((state) => state.isMobile);
    const paperWidth = usePrinterStore((state) => state.paperWidth);
    const setPaperWidth = usePrinterStore((state) => state.setPaperWidth);
    const connectUsb = usePrinterStore((state) => state.connectUsb);
    const connectBluetooth = usePrinterStore((state) => state.connectBluetooth);
    const disconnect = usePrinterStore((state) => state.disconnect);
    const executePrint = usePrinterStore((state) => state.executePrint);
    const openCashDrawer = usePrinterStore((state) => state.openCashDrawer);

    // Fullscreen Event Listener
    useEffect(() => {
        const handler = () => setIsFullScreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // Mobile / Tablet Tab Center Alignment
    useEffect(() => {
        if (mobileTabsRef.current) {
            const targetBtn = mobileTabsRef.current.querySelector(`[data-tab="${activeTab}"]`);
            if (targetBtn) {
                targetBtn.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeTab]);

    const isFirstMountRef = useRef(true);

    // Initial Data Fetch
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const res = await axios.get('/api/settings');
                setSettings(res.data);
                setStoreForm({
                    store_name: res.data.store_name || '',
                    address: res.data.address || '',
                    phone: res.data.phone || '',
                });

                if (res.data.logo_path) {
                    setPreview(`${res.data.logo_path}?t=${new Date().getTime()}`);
                } else {
                    setPreview('/logo.png');
                }
                fetchTerminals();
            } catch (error) {
                console.error("Failed to load store settings", error);
            } finally {
                setLoading(false);
            }
        };

        if (isFirstMountRef.current) {
            isFirstMountRef.current = false;
            if (!initial_settings) {
                fetchInitialData();
            }
        }

        let pollingInterval;
        if (!isAdmin) {
            pollingInterval = setInterval(async () => {
                try {
                    const res = await axios.get('/api/settings');
                    setSettings(res.data);
                    if (res.data.logo_path) {
                        setPreview(`${res.data.logo_path}?t=${new Date().getTime()}`);
                    }
                } catch (error) {
                    console.error("Background sync failed", error);
                }
            }, 10000);
        }

        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [isAdmin]);

    const fetchTerminals = async () => {
        setLoadingTerminals(true);
        try {
            const res = await axios.get('/api/terminals');
            setTerminals(res.data || []);
        } catch (err) {
            console.error("Failed to load terminals", err);
        } finally {
            setLoadingTerminals(false);
        }
    };

    // Store Logo File Selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    // Save Store Details (Admin)
    const handleSaveStoreDetails = async (e) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();
        formData.append('store_name', storeForm.store_name);
        formData.append('address', storeForm.address || '');
        formData.append('phone', storeForm.phone || '');
        if (logoFile) formData.append('logo', logoFile);

        try {
            await axios.post('/api/settings', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Swal.fire({
                icon: 'success',
                title: 'Store Settings Saved',
                text: 'Store profile & branding updated successfully.',
                toast: true,
                position: 'top-end',
                timer: 2000,
                showConfirmButton: false
            });

            const res = await axios.get('/api/settings');
            setSettings(res.data);
            if (res.data.logo_path) {
                setPreview(`${res.data.logo_path}?t=${new Date().getTime()}`);
            }
            setLogoFile(null);
            router.reload();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to save store settings.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Save Receipt Text Settings
    const handleSaveReceiptSettings = (e) => {
        e.preventDefault();
        localStorage.setItem('pos_receipt_tagline', receiptHeaderTagline);
        localStorage.setItem('pos_receipt_footer', receiptFooterNote);
        Swal.fire({
            icon: 'success',
            title: 'Receipt Settings Saved',
            text: 'Receipt header tagline and footer note updated.',
            toast: true,
            position: 'top-end',
            timer: 2000,
            showConfirmButton: false,
        });
    };

    // Terminal Management Handlers
    const handleOpenTerminalModal = (terminal = null) => {
        if (terminal) {
            setEditingTerminal(terminal);
            setTerminalForm({
                name: terminal.name,
                code: terminal.code || '',
                notes: terminal.notes || ''
            });
        } else {
            setEditingTerminal(null);
            setTerminalForm({
                name: `Register ${terminals.length + 1}`,
                code: `REG-0${terminals.length + 1}`,
                notes: ''
            });
        }
        setShowTerminalModal(true);
    };

    const handleSaveTerminal = async (e) => {
        e.preventDefault();
        if (!terminalForm.name.trim()) {
            Swal.fire('Name Required', 'Please enter a register name (e.g. Register 1).', 'warning');
            return;
        }

        try {
            if (editingTerminal) {
                await axios.put(`/api/terminals/${editingTerminal.id}`, terminalForm);
                Swal.fire({ icon: 'success', title: 'Register Updated', timer: 1500, showConfirmButton: false });
            } else {
                await axios.post('/api/terminals', terminalForm);
                Swal.fire({ icon: 'success', title: 'Register Created', timer: 1500, showConfirmButton: false });
            }
            setShowTerminalModal(false);
            fetchTerminals();
        } catch (err) {
            console.error("Failed to save terminal", err);
            const msg = err.response?.data?.message || 'Failed to save register.';
            Swal.fire('Error', msg, 'error');
        }
    };

    const handleDeleteTerminal = async (terminal) => {
        const result = await Swal.fire({
            title: `Delete ${terminal.name}?`,
            text: "This register will be removed. Ensure no active shifts are currently open on it.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Delete'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/terminals/${terminal.id}`);
                Swal.fire({ icon: 'success', title: 'Register Deleted', timer: 1500, showConfirmButton: false });
                fetchTerminals();
            } catch (err) {
                console.error("Failed to delete terminal", err);
                const msg = err.response?.data?.message || 'Failed to delete register.';
                Swal.fire('Error', msg, 'error');
            }
        }
    };

    const handleSetWorkstation = (terminal) => {
        localStorage.setItem('pos_terminal_id', terminal.id);
        setCurrentLocalTerminalId(String(terminal.id));
        Swal.fire({
            icon: 'success',
            title: 'Workstation Assigned',
            text: `This screen is now linked to ${terminal.name}.`,
            timer: 1800,
            showConfirmButton: false
        });
    };

    // Hardware Preference Toggles
    const toggleShortcuts = () => {
        const newVal = !localShortcutsEnabled;
        setLocalShortcutsEnabled(newVal);
        localStorage.setItem('pos_enable_shortcuts', newVal ? 'true' : 'false');
        Swal.fire({
            icon: 'success',
            title: newVal ? 'Shortcuts Enabled' : 'Shortcuts Disabled',
            text: newVal ? 'Keyboard function keys (F1–F12) are now active.' : 'Keyboard function keys are now inactive.',
            toast: true,
            position: 'top-end',
            timer: 2000,
            showConfirmButton: false
        });
    };

    const toggleResultsOnly = () => {
        const newVal = !showResultsOnly;
        setShowResultsOnly(newVal);
        localStorage.setItem('pos_show_results_only', newVal ? '1' : '0');
        Swal.fire({
            icon: 'success',
            title: newVal ? 'Results Only Mode Enabled' : 'Results Only Mode Disabled',
            text: newVal ? 'Catalog items will only show when typing a search query or scanning.' : 'All catalog items will display normally.',
            toast: true,
            position: 'top-end',
            timer: 2000,
            showConfirmButton: false
        });
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    };

    // Thermal Printer Test Print
    const handleTestPrint = async () => {
        const encode = (text) => new TextEncoder().encode(text);
        const lineCap = paperWidth === '80mm' ? 48 : 30;
        const separator = "-".repeat(lineCap) + "\n";

        const commands = new Uint8Array([
            0x00, 0x00, 0x1B, 0x40, 0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01,
            ...encode("PRINTER TEST\n"), 0x1B, 0x45, 0x00,
            ...encode(separator),
            ...encode(`Paper Width: ${paperWidth}\n`),
            ...encode("Connection: SUCCESSFUL\n"),
            0x1B, 0x61, 0x00,
            0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01,
            ...encode(`${settings.store_name || "Smart Retail POS"}\n`),
            0x1B, 0x45, 0x00, 0x1B, 0x21, 0x00, 0x1B, 0x61, 0x00,
            ...encode(`Date: ${new Date().toLocaleString()}\n`),
            ...encode(separator),
            0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41
        ]);
        await executePrint(commands);
    };

    // Helper Math for Shift Reconciliation
    const activeShift = settings?.active_shift || {};
    const gcashSales = Number(activeShift.gcash_sales || 0);
    const mayaSales = Number(activeShift.maya_sales || 0);
    const creditCardSales = Number(activeShift.credit_card_sales || 0);
    const debitCardSales = Number(activeShift.debit_card_sales || 0);
    const cashSales = Number(activeShift.cash_sales || 0);
    const totalGrossSales = cashSales + gcashSales + mayaSales + creditCardSales + debitCardSales;

    // Navigation Tabs Definition
    const adminTabs = [
        {
            id: 'store',
            label: 'Store Profile',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            description: 'Identity, branding & contact info'
        },
        {
            id: 'terminals',
            label: 'Registers & Lanes',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
                </svg>
            ),
            badge: `${terminals.length} Lanes`,
            description: 'Physical checkout registers'
        },
        {
            id: 'receipts',
            label: 'Receipt & Printing',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            ),
            description: 'Header, footer & live preview'
        },
        {
            id: 'rules',
            label: 'Sales & Inventory Rules',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                </svg>
            ),
            description: 'Discounts, thresholds & channels'
        },
        {
            id: 'legal',
            label: 'Policies & Compliance',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            description: 'Terms of service & privacy'
        },
    ];

    const cashierTabs = [
        {
            id: 'hardware',
            label: 'Workstation & Hardware',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
            ),
            description: 'Assigned register, printer & F-keys'
        },
        {
            id: 'shift',
            label: 'Active Shift & Drawer',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            badge: activeShift.start_time ? 'Active Shift' : 'Closed',
            description: 'Live drawer math & Z-Read'
        },
        {
            id: 'legal',
            label: 'Staff Policies',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            description: 'Acceptable use & compliance'
        },
    ];

    const currentTabs = isAdmin ? adminTabs : cashierTabs;

    // Loading Skeleton
    if (loading) {
        return (
            <AuthenticatedLayout
                user={user}
                header={
                    <div>
                        <h2 className="font-black text-xl text-gray-900 tracking-tight">Store Settings</h2>
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">
                            {isAdmin
                                ? 'Configure store identity, POS registers, receipt formatting, and operational policies'
                                : 'Manage workstation hardware, thermal printing, active shift drawer, and profile'}
                        </p>
                    </div>
                }
            >
                <Head title="Store Settings" />
                <div className="py-3 sm:py-8 bg-gray-50/80 min-h-0 sm:min-h-[calc(100vh-140px)] max-w-full overflow-x-clip">
                    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 animate-pulse space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-4 h-80 bg-gray-200 rounded-2xl"></div>
                            <div className="lg:col-span-8 h-96 bg-gray-200 rounded-2xl"></div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            user={user}
            header={
                <div>
                    <h2 className="font-black text-xl text-gray-900 tracking-tight">Store Settings</h2>
                    <p className="text-xs font-semibold text-gray-500 mt-0.5">
                        {isAdmin
                            ? 'Configure store identity, POS registers, receipt formatting, and operational policies'
                            : 'Manage workstation hardware, thermal printing, active shift drawer, and profile'}
                    </p>
                </div>
            }
        >
            <Head title="Store Settings" />

            <div className="py-3 sm:py-8 bg-gray-50/80 min-h-0 sm:min-h-[calc(100vh-140px)] max-w-full overflow-x-clip">
                <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-6 pb-12">

                    {/* MOBILE / TABLET HORIZONTAL TAB STRIP (Auto-centered, hidden scrollbar) */}
                    <div 
                        ref={mobileTabsRef}
                        className="lg:hidden flex overflow-x-auto gap-2 pb-1 scroll-smooth no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0"
                    >
                        {currentTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    data-tab={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 border cursor-pointer active:scale-95 ${
                                        isActive
                                            ? 'bg-[#1B3A69] text-white border-[#1B3A69] shadow-xs'
                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-xs'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {tab.badge && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                {/* MAIN SETTINGS GRID (DESKTOP SIDEBAR + CONTENT) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT COLUMN: DESKTOP TAB NAVIGATION & STORE CARD */}
                    <div className="hidden lg:block lg:col-span-4 space-y-4">
                        
                        {/* Store Overview Card */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200/80 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                                <img 
                                    src={preview} 
                                    alt="Store Logo" 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-bold text-gray-900 truncate">{settings.store_name || 'Retail POS Store'}</h3>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{settings.address || 'Address not configured'}</p>
                                <p className="text-xs font-mono text-[#1B3A69] font-semibold mt-1">Tel: {settings.phone || 'No phone set'}</p>
                            </div>
                        </div>

                        {/* Navigation Sidebar Card */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 p-2 shadow-xs space-y-1">
                            {currentTabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                                            isActive
                                                ? 'bg-[#EFF4F9] text-[#1B3A69] font-bold border border-[#CBD7E6] shadow-xs'
                                                : 'text-gray-700 hover:bg-gray-50 border border-transparent font-medium'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                                                isActive ? 'bg-[#1B3A69] text-white' : 'bg-gray-100 text-gray-500 group-hover:text-gray-700'
                                            }`}>
                                                {tab.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs sm:text-sm font-bold truncate">{tab.label}</p>
                                                <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-[#1B3A69]/80 font-medium' : 'text-gray-400'}`}>
                                                    {tab.description}
                                                </p>
                                            </div>
                                        </div>

                                        {tab.badge && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                                                tab.badge === 'Admin Only'
                                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                    : isActive
                                                        ? 'bg-[#1B3A69] text-white'
                                                        : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {tab.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: ACTIVE TAB CONTENT AREA */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* ======================================================== */}
                        {/* TAB 1: STORE PROFILE & BRANDING (ADMIN)                  */}
                        {/* ======================================================== */}
                        {isAdmin && activeTab === 'store' && (
                            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                                <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-sm sm:text-base font-bold text-gray-900">Store Profile & Branding</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Manage store name, contact numbers, address, and logo asset.</p>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF4F9] text-[#1B3A69] border border-[#CBD7E6]">
                                        Admin Config
                                    </span>
                                </div>

                                <form onSubmit={handleSaveStoreDetails} className="p-5 sm:p-6 space-y-6">
                                    {/* Logo Upload Section */}
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-gray-100">
                                        <div 
                                            onClick={() => document.getElementById('store-logo-file-input').click()}
                                            className="relative w-24 h-24 rounded-2xl ring-4 ring-gray-100 flex items-center justify-center overflow-hidden cursor-pointer group hover:ring-[#CBD7E6] transition-all shadow-xs shrink-0 bg-gray-50"
                                        >
                                            <img 
                                                src={preview} 
                                                alt="Preview" 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                                            />
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                <span className="text-[10px] font-bold mt-1">Change</span>
                                            </div>
                                        </div>

                                        <div className="text-center sm:text-left flex-1">
                                            <h4 className="font-bold text-gray-900 text-sm">Store Brand Logo</h4>
                                            <p className="text-xs text-gray-500 mt-1 mb-3 leading-relaxed">
                                                Displayed on the POS navigation header, customer receipts, and export reports. Recommended size: 500×500px square PNG, JPG, or SVG (Max 2MB).
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => document.getElementById('store-logo-file-input').click()}
                                                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-50 shadow-xs active:scale-95 transition-all cursor-pointer"
                                            >
                                                Upload New Logo
                                            </button>
                                            <input id="store-logo-file-input" type="file" onChange={handleFileChange} className="hidden" accept="image/jpeg, image/png, image/webp, image/jpg, image/svg+xml" />
                                        </div>
                                    </div>

                                    {/* Text Fields */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                                Store Name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={storeForm.store_name}
                                                onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                                                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#1B3A69]/20 focus:border-[#1B3A69] transition-all"
                                                placeholder="e.g. Aivin Retail & Grocery"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                                    Phone / Mobile Number
                                                </label>
                                                <input
                                                    type="text"
                                                    value={storeForm.phone}
                                                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                                                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#1B3A69]/20 focus:border-[#1B3A69] transition-all"
                                                    placeholder="e.g. 0917-123-4567"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                                    Business Address
                                                </label>
                                                <input
                                                    type="text"
                                                    value={storeForm.address}
                                                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                                                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#1B3A69]/20 focus:border-[#1B3A69] transition-all"
                                                    placeholder="e.g. 123 Main Street, City"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-4 py-2 sm:py-2.5 rounded-xl bg-[#1B3A69] hover:bg-[#142E54] text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <>
                                                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    <span>Saving Changes...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                    <span>Save Store Profile</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 2: POS REGISTERS & LANES (ADMIN)                     */}
                        {/* ======================================================== */}
                        {isAdmin && activeTab === 'terminals' && (
                            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                                <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-sm sm:text-base font-bold text-gray-900">Physical Checkout Registers</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Manage multiple checkout computers, lanes, and register hardware assignments.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenTerminalModal()}
                                        className="px-4 py-2 rounded-xl bg-[#1B3A69] hover:bg-[#142E54] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                        <span>Add New Register</span>
                                    </button>
                                </div>

                                <div className="p-5 sm:p-6 space-y-4">
                                    {terminals.length === 0 ? (
                                        <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                            <p className="text-xs font-bold text-gray-500">No registers configured yet.</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Click "Add New Register" to set up Register 1.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {terminals.map((term) => {
                                                const isAssigned = String(term.id) === String(currentLocalTerminalId);
                                                const activeShift = term.active_shift;

                                                return (
                                                    <div
                                                        key={term.id}
                                                        className={`p-4 rounded-2xl border transition-all ${
                                                            isAssigned
                                                                ? 'border-[#1B3A69] bg-[#EFF4F9]/40 ring-2 ring-[#1B3A69]/10 shadow-xs'
                                                                : 'border-gray-200 bg-white hover:border-gray-300 shadow-xs'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold shrink-0">
                                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" /></svg>
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                                                        <span>{term.name}</span>
                                                                        {term.code && (
                                                                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono font-bold">
                                                                                {term.code}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                                                        {activeShift ? (
                                                                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                                <span>Cashier: {activeShift.user?.name || 'Staff'} (Shift #{activeShift.id})</span>
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400 flex items-center gap-1">
                                                                                <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                                                                <span>Closed / Idle</span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isAssigned && (
                                                                <span className="px-2 py-0.5 bg-[#1B3A69] text-white text-[10px] font-bold rounded-lg uppercase tracking-wider shrink-0">
                                                                    This Screen
                                                                </span>
                                                            )}
                                                        </div>

                                                        {term.notes && (
                                                            <p className="text-xs text-gray-500 italic mt-3 pt-2.5 border-t border-gray-100">
                                                                {term.notes}
                                                            </p>
                                                        )}

                                                        <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                                                            {!isAssigned ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSetWorkstation(term)}
                                                                    className="text-xs font-bold text-[#1B3A69] hover:underline cursor-pointer"
                                                                >
                                                                    Set as this Screen's Register
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                                                                    Active on this browser
                                                                </span>
                                                            )}

                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenTerminalModal(term)}
                                                                    className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteTerminal(term)}
                                                                    className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                                    title="Delete Register"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 3: RECEIPT & PRINTING (ADMIN)                        */}
                        {/* ======================================================== */}
                        {isAdmin && activeTab === 'receipts' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-sm sm:text-base font-bold text-gray-900">Receipt Customization & Layout</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Customize printed header sub-notes, footer text, and paper roll dimensions.</p>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF4F9] text-[#1B3A69] border border-[#CBD7E6]">
                                            Live Mockup
                                        </span>
                                    </div>

                                    <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                                        {/* Configuration Inputs */}
                                        <div className="lg:col-span-7 space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                                    Receipt Header Subtitle / Tagline
                                                </label>
                                                <input
                                                    type="text"
                                                    value={receiptHeaderTagline}
                                                    onChange={(e) => setReceiptHeaderTagline(e.target.value)}
                                                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#1B3A69]/20 focus:border-[#1B3A69] transition-all"
                                                    placeholder="e.g. Official Retail Receipt"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                                    Custom Receipt Footer Note
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={receiptFooterNote}
                                                    onChange={(e) => setReceiptFooterNote(e.target.value)}
                                                    className="w-full p-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#1B3A69]/20 focus:border-[#1B3A69] transition-all"
                                                    placeholder="e.g. Thank you for shopping with us! Please keep your receipt for returns."
                                                />
                                            </div>

                                            {/* Paper Width Selector */}
                                            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">Thermal Paper Roll Size</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">Specify layout width matching printer paper.</p>
                                                </div>
                                                <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaperWidth('58mm')}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            paperWidth === '58mm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                                                        }`}
                                                    >
                                                        58mm
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaperWidth('80mm')}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            paperWidth === '80mm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                                                        }`}
                                                    >
                                                        80mm
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-gray-100 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveReceiptSettings}
                                                    className="px-4 py-2 sm:py-2.5 rounded-xl bg-[#1B3A69] hover:bg-[#142E54] text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all cursor-pointer"
                                                >
                                                    Save Receipt Text
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleTestPrint}
                                                    className="px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all cursor-pointer"
                                                >
                                                    Test Thermal Print
                                                </button>
                                            </div>
                                        </div>

                                        {/* Interactive Live Receipt Mockup */}
                                        <div className="lg:col-span-5 bg-[#F8FAFC] border border-gray-200 rounded-2xl p-4 shadow-inner flex flex-col items-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Live Thermal Preview ({paperWidth})</span>
                                            
                                            <div className={`bg-white border border-gray-300 rounded-xl p-4 font-mono text-[11px] text-gray-800 shadow-sm leading-tight space-y-2 w-full ${
                                                paperWidth === '58mm' ? 'max-w-[240px]' : 'max-w-[280px]'
                                            }`}>
                                                <div className="text-center space-y-0.5">
                                                    <p className="font-black text-xs text-gray-900 uppercase">{settings.store_name || "AIVIN RETAIL STORE"}</p>
                                                    <p className="text-[10px] text-gray-500">{receiptHeaderTagline}</p>
                                                    <p className="text-[10px] text-gray-500">{settings.address || "123 Main Commercial St."}</p>
                                                    <p className="text-[10px] text-gray-500">Tel: {settings.phone || "0917-000-0000"}</p>
                                                </div>

                                                <div className="border-t border-dashed border-gray-300 pt-1.5 space-y-1">
                                                    <div className="flex justify-between text-[10px] text-gray-500">
                                                        <span>INV #2026-0089</span>
                                                        <span>{new Date().toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="border-t border-dashed border-gray-300 pt-1.5 space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span>1x Instant Coffee 50g</span>
                                                        <span>₱45.00</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span>2x Mineral Water 500ml</span>
                                                        <span>₱30.00</span>
                                                    </div>
                                                </div>

                                                <div className="border-t border-dashed border-gray-300 pt-1.5 space-y-1 font-bold">
                                                    <div className="flex justify-between">
                                                        <span>SUBTOTAL</span>
                                                        <span>₱75.00</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-900 font-black">
                                                        <span>TOTAL</span>
                                                        <span>₱75.00</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-gray-500 font-normal">
                                                        <span>CASH TENDERED</span>
                                                        <span>₱100.00</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-gray-500 font-normal">
                                                        <span>CHANGE</span>
                                                        <span>₱25.00</span>
                                                    </div>
                                                </div>

                                                <div className="border-t border-dashed border-gray-300 pt-2 text-center text-[10px] text-gray-500 italic leading-snug">
                                                    <p>{receiptFooterNote}</p>
                                                    <p className="mt-1 font-black not-italic text-[9px] uppercase tracking-wider text-gray-400">THIS IS NOT A VALID INVOICE</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 4: SALES & INVENTORY RULES (ADMIN)                   */}
                        {/* ======================================================== */}
                        {isAdmin && activeTab === 'rules' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-sm sm:text-base font-bold text-gray-900">Operational & Sales Rules</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Overview of system discount policies, stock threshold triggers, and payment configurations.</p>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF4F9] text-[#1B3A69] border border-[#CBD7E6]">
                                            Store Policies
                                        </span>
                                    </div>

                                    <div className="p-5 sm:p-6 space-y-6">
                                        {/* Policy Cards Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            
                                            {/* Senior & PWD Discount Card */}
                                            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono">Discounts</span>
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        20% Active
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-gray-900 text-sm">Senior & PWD Statutory Discount</h4>
                                                <p className="text-xs text-gray-500 leading-relaxed">
                                                    Standard 20% discount compliant with RA 9994. Triggered at POS via <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono text-[10px]">F10</kbd>.
                                                </p>
                                            </div>

                                            {/* Low Stock Alert Threshold */}
                                            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono">Inventory</span>
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                        Trigger: &le; 5 Units
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-gray-900 text-sm">Low Stock Alert Center</h4>
                                                <p className="text-xs text-gray-500 leading-relaxed">
                                                    Surfaces replenishment badges on POS catalog cards and the Dashboard Attention Center when product stock drops.
                                                </p>
                                            </div>

                                            {/* Wholesale Multi-Tier Pricing */}
                                            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono">Pricing</span>
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF4F9] text-[#1B3A69] border border-[#CBD7E6]">
                                                        Dual Tier
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-gray-900 text-sm">Wholesale & Bulk Rates</h4>
                                                <p className="text-xs text-gray-500 leading-relaxed">
                                                    Instant toggle on the POS Terminal to apply bulk wholesale pricing for high-volume customer orders.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Active Payment Channels Overview */}
                                        <div className="pt-4 border-t border-gray-100">
                                            <h4 className="font-bold text-gray-900 text-sm mb-3">Supported POS Payment Channels</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs font-mono">₱</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900">Cash Drawer</p>
                                                        <p className="text-[11px] text-emerald-700 font-semibold">F1 • Enabled</p>
                                                    </div>
                                                </div>

                                                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">G</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900">GCash E-Wallet</p>
                                                        <p className="text-[11px] text-blue-700 font-semibold">F3 • Enabled</p>
                                                    </div>
                                                </div>

                                                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">M</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900">Maya E-Wallet</p>
                                                        <p className="text-[11px] text-emerald-700 font-semibold">F4 • Enabled</p>
                                                    </div>
                                                </div>

                                                <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/40 flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">💳</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900">Cards (Credit/Debit)</p>
                                                        <p className="text-[11px] text-indigo-700 font-semibold">F8/F9 • Enabled</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 5: WORKSTATION & HARDWARE (CASHIER)                  */}
                        {/* ======================================================== */}
                        {(!isAdmin && activeTab === 'hardware') && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-sm sm:text-base font-bold text-gray-900">Workstation & Thermal Printer</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Manage USB/Bluetooth printer hardware and cash drawer kickers on this terminal.</p>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                            usbDevice || bluetoothDevice
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}>
                                            {usbDevice ? 'USB Connected' : bluetoothDevice ? 'Bluetooth Connected' : 'Printer Offline'}
                                        </span>
                                    </div>

                                    <div className="p-5 sm:p-6 space-y-6">
                                        {/* Assigned Terminal Lane Dropdown */}
                                        <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">Assigned POS Register Lane</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">Choose which checkout register this browser/screen represents.</p>
                                            </div>
                                            <select
                                                value={currentLocalTerminalId || ''}
                                                onChange={(e) => {
                                                    const selected = terminals.find(t => String(t.id) === String(e.target.value));
                                                    if (selected) handleSetWorkstation(selected);
                                                }}
                                                className="h-10 px-3 rounded-xl border border-gray-300 bg-white text-xs sm:text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#1B3A69]/20 focus:border-[#1B3A69] cursor-pointer"
                                            >
                                                {terminals.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name} ({t.code || 'LANE'})</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Printer Connection Controls */}
                                        <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className={`p-3 rounded-2xl transition-colors ${
                                                    usbDevice || bluetoothDevice
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                                                }`}>
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">Receipt Thermal Printer</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Status: <span className={usbDevice || bluetoothDevice ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                                            {usbDevice ? 'Ready (USB)' : bluetoothDevice ? 'Ready (Bluetooth)' : 'Not Connected'}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                                {!(usbDevice || bluetoothDevice) ? (
                                                    <button
                                                        type="button"
                                                        onClick={isMobile ? connectBluetooth : connectUsb}
                                                        className="px-4 py-2 sm:py-2.5 rounded-xl bg-[#1B3A69] hover:bg-[#142E54] text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                                                        Pair {isMobile ? 'Bluetooth' : 'USB'} Printer
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button type="button" onClick={handleTestPrint} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-50 shadow-xs active:scale-95 transition-all cursor-pointer">
                                                            Test Print
                                                        </button>
                                                        <button type="button" onClick={openCashDrawer} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-50 shadow-xs active:scale-95 transition-all cursor-pointer">
                                                            Kick Drawer
                                                        </button>
                                                        <button type="button" onClick={disconnect} className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs sm:text-sm hover:bg-rose-100 transition-all cursor-pointer">
                                                            Disconnect
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* POS Screen & Keyboard Preferences */}
                                        <div className="space-y-3 pt-2">
                                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm uppercase tracking-wider">Workstation Display & Keybindings</h4>
                                            
                                            {/* POS Keyboard Shortcuts Toggle */}
                                            <div className="p-4 rounded-2xl border border-gray-200 bg-white flex items-center justify-between gap-4">
                                                <div>
                                                    <h5 className="font-bold text-gray-900 text-sm">POS Keyboard Function Keys (F1–F12)</h5>
                                                    <p className="text-xs text-gray-500 mt-0.5">Enable physical keyboard shortcuts for rapid cashier checkout operations.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={toggleShortcuts}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${localShortcutsEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${localShortcutsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>

                                            {/* Full Screen Mode */}
                                            <div className="p-4 rounded-2xl border border-gray-200 bg-white flex items-center justify-between gap-4">
                                                <div>
                                                    <h5 className="font-bold text-gray-900 text-sm">POS Full Screen Mode</h5>
                                                    <p className="text-xs text-gray-500 mt-0.5">Maximize POS display area to hide browser chrome and distraction bars.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={toggleFullScreen}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isFullScreen ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isFullScreen ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>

                                            {/* Scan / Results Only Mode */}
                                            <div className="p-4 rounded-2xl border border-gray-200 bg-white flex items-center justify-between gap-4">
                                                <div>
                                                    <h5 className="font-bold text-gray-900 text-sm">Scan & Search Results Only</h5>
                                                    <p className="text-xs text-gray-500 mt-0.5">Only show catalog items when scanning barcodes or typing a search query.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={toggleResultsOnly}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showResultsOnly ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${showResultsOnly ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 6: ACTIVE SHIFT & DRAWER (CASHIER)                   */}
                        {/* ======================================================== */}
                        {(!isAdmin && activeTab === 'shift') && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-sm sm:text-base font-bold text-gray-900">Active Shift Reconciliation & Z-Read</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Monitor current cash drawer expected count and perform end-of-shift Z-Read.</p>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                            settings?.active_shift ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {settings?.active_shift ? 'Shift In Progress' : 'No Active Shift'}
                                        </span>
                                    </div>

                                    <div className="p-5 sm:p-6 space-y-6">
                                        {settings?.active_shift ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between border-b border-gray-100 pb-3 text-xs sm:text-sm">
                                                    <span className="text-gray-500 font-medium">Shift Started:</span>
                                                    <span className="font-mono font-bold text-gray-800">{settings.active_shift.start_time}</span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50">
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono">Starting Float</span>
                                                        <p className="text-xl font-bold text-gray-900 font-mono mt-1">
                                                            ₱{Number(settings.active_shift.starting_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>

                                                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40">
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 font-mono">Cash Sales</span>
                                                        <p className="text-xl font-bold text-emerald-700 font-mono mt-1">
                                                            ₱{Number(settings.active_shift.cash_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>

                                                    <div className="p-4 rounded-2xl border border-[#CBD7E6] bg-[#EFF4F9]">
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B3A69] font-mono">Expected in Drawer</span>
                                                        <p className="text-xl font-bold text-[#1B3A69] font-mono mt-1">
                                                            ₱{Number(settings.active_shift.expected_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Digital Sales Breakdown */}
                                                {(gcashSales > 0 || mayaSales > 0 || creditCardSales > 0 || debitCardSales > 0) && (
                                                    <div className="pt-3 border-t border-gray-100 space-y-2">
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono">Digital Payments Collected</span>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                            {gcashSales > 0 && (
                                                                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/40">
                                                                    <span className="text-xs font-bold text-blue-600">GCash</span>
                                                                    <p className="font-mono font-bold text-blue-800 text-sm mt-0.5">₱{gcashSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                                </div>
                                                            )}
                                                            {mayaSales > 0 && (
                                                                <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40">
                                                                    <span className="text-xs font-bold text-emerald-600">Maya</span>
                                                                    <p className="font-mono font-bold text-emerald-800 text-sm mt-0.5">₱{mayaSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                                </div>
                                                            )}
                                                            {creditCardSales > 0 && (
                                                                <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/40">
                                                                    <span className="text-xs font-bold text-purple-600">Credit Card</span>
                                                                    <p className="font-mono font-bold text-purple-800 text-sm mt-0.5">₱{creditCardSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                                </div>
                                                            )}
                                                            {debitCardSales > 0 && (
                                                                <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40">
                                                                    <span className="text-xs font-bold text-indigo-600">Debit Card</span>
                                                                    <p className="font-mono font-bold text-indigo-800 text-sm mt-0.5">₱{debitCardSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                    <div>
                                                        <span className="text-xs sm:text-sm font-medium text-gray-500">Gross Shift Revenue: </span>
                                                        <span className="text-base font-bold text-gray-900 font-mono">₱{totalGrossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setShowShiftModal(true)}
                                                        className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl bg-[#1B3A69] hover:bg-[#142E54] text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        <span>Perform Z-Read & Close Shift</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 space-y-2">
                                                <svg className="w-10 h-10 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <p className="text-xs font-bold text-gray-500">No active selling shift on this terminal.</p>
                                                <p className="text-xs text-gray-400">Open a shift on the POS Terminal to start recording sales.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* TAB 7: LEGAL & POLICIES (ADMIN & CASHIER)                */}
                        {/* ======================================================== */}
                        {activeTab === 'legal' && (
                            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                                <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-sm sm:text-base font-bold text-gray-900">Legal Agreements & Policies</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Platform terms of service, acceptable use policies, and privacy standards.</p>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF4F9] text-[#1B3A69] border border-[#CBD7E6]">
                                        Compliance
                                    </span>
                                </div>

                                <div className="p-5 sm:p-6 space-y-5">
                                    {/* Document Selection Tabs Strip */}
                                    <div className="flex overflow-x-auto gap-1.5 p-1.5 bg-gray-100/80 rounded-xl border border-gray-200 w-full sm:w-max custom-scrollbar">
                                        {isAdmin && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedLegalDoc('terms')}
                                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                                        selectedLegalDoc === 'terms'
                                                            ? 'bg-white text-[#1B3A69] shadow-xs'
                                                            : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                                >
                                                    Terms of Service
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedLegalDoc('privacy')}
                                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                                        selectedLegalDoc === 'privacy'
                                                            ? 'bg-white text-[#1B3A69] shadow-xs'
                                                            : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                                >
                                                    Privacy Policy
                                                </button>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedLegalDoc('staff_terms')}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                                selectedLegalDoc === 'staff_terms'
                                                    ? 'bg-white text-[#1B3A69] shadow-xs'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            Staff Acceptable Use
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedLegalDoc('staff_privacy')}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                                selectedLegalDoc === 'staff_privacy'
                                                    ? 'bg-white text-[#1B3A69] shadow-xs'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            Staff Privacy Policy
                                        </button>
                                    </div>

                                    {/* Direct Inline Document Reader Box */}
                                    <div className="bg-gray-50/70 border border-gray-200/90 rounded-2xl p-5 sm:p-6 space-y-3 shadow-inner">
                                        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#1B3A69]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                </svg>
                                                <h3 className="font-bold text-gray-900 text-sm">
                                                    {selectedLegalDoc === 'terms' && 'Platform Terms of Service'}
                                                    {selectedLegalDoc === 'privacy' && 'Platform Privacy Policy'}
                                                    {selectedLegalDoc === 'staff_terms' && 'Staff Acceptable Use Policy'}
                                                    {selectedLegalDoc === 'staff_privacy' && 'Staff Privacy Policy'}
                                                </h3>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-xs">
                                                Official Document
                                            </span>
                                        </div>

                                        <div className="text-xs sm:text-sm text-gray-700 leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar font-sans pr-2">
                                            {(() => {
                                                let text = '';
                                                if (selectedLegalDoc === 'terms') text = settings.terms_of_service;
                                                else if (selectedLegalDoc === 'privacy') text = settings.privacy_policy;
                                                else if (selectedLegalDoc === 'staff_terms') text = settings.staff_terms_of_service;
                                                else if (selectedLegalDoc === 'staff_privacy') text = settings.staff_privacy_policy;

                                                return text ? (
                                                    <div
                                                        className="prose prose-sm max-w-none text-xs text-gray-700 leading-relaxed [&_section]:space-y-4 [&_h2]:text-sm [&_h2]:font-black [&_h2]:text-gray-900 [&_h2]:tracking-tight [&_h2]:mt-4 [&_h2]:mb-1 [&_p]:text-xs [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:text-xs [&_li]:text-gray-600"
                                                        dangerouslySetInnerHTML={{ __html: text }}
                                                    />
                                                ) : (
                                                    <p className="text-gray-400 italic py-8 text-center">No policy text configured for this document.</p>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>

            {/* SHARED MODALS */}

            {/* Add / Edit Register Modal */}
            {showTerminalModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Standard App Modal Navy Header */}
                        <div className="px-6 py-4 bg-[#1B3A69] text-white flex justify-between items-center shrink-0 shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-white">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-base tracking-tight text-white">
                                        {editingTerminal ? 'Edit Register Lane' : 'Add New Register Lane'}
                                    </h3>
                                    <p className="text-xs text-white/80 font-medium mt-0.5">Configure checkout lane hardware details</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTerminalModal(false)}
                                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveTerminal} className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                    Register Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={terminalForm.name}
                                    onChange={(e) => setTerminalForm({ ...terminalForm, name: e.target.value })}
                                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#1B3A69]/20 focus:border-[#1B3A69]"
                                    placeholder="e.g. Register 1 / Front Counter"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                    Register Code
                                </label>
                                <input
                                    type="text"
                                    value={terminalForm.code}
                                    onChange={(e) => setTerminalForm({ ...terminalForm, code: e.target.value })}
                                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm font-semibold font-mono text-gray-800 focus:ring-2 focus:ring-[#1B3A69]/20 focus:border-[#1B3A69]"
                                    placeholder="e.g. REG-01"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                    Notes / Location
                                </label>
                                <textarea
                                    rows={2}
                                    value={terminalForm.notes}
                                    onChange={(e) => setTerminalForm({ ...terminalForm, notes: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#1B3A69]/20 focus:border-[#1B3A69]"
                                    placeholder="e.g. Main checkout lane near entrance"
                                />
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowTerminalModal(false)}
                                    className="px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-50 transition-all shadow-xs active:scale-95 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 sm:py-2.5 rounded-xl bg-[#1B3A69] hover:bg-[#142E54] text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all cursor-pointer"
                                >
                                    Save Register
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Shift Modal Portal (Z-Read) */}
            {showShiftModal && (
                <ShiftModal
                    show={showShiftModal}
                    onClose={() => setShowShiftModal(false)}
                    initialData={settings?.active_shift}
                />
            )}

        </AuthenticatedLayout>
    );
}