import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';
import ShiftModal from '@/Components/ShiftModal';
import usePrinterStore from '@/Stores/usePrinterStore';

/**
 * Settings Component
 * Role-based view:
 * - Admins: Editable Store Configuration and Read-only Legal/Compliance Policies.
 * - Staff: Real-time Read-only Store Details, Hardware Configuration, and Shift Management.
 */
export default function Settings({ auth }) {
    const user = auth?.user;

    const [settings, setSettings] = useState({
        store_name: '',
        address: '',
        phone: '',
        terms_of_service: '',
        privacy_policy: '',
        staff_terms_of_service: '',
        staff_privacy_policy: '',
        active_shift: null, // Track shift stats
    });

    const [logoFile, setLogoFile] = useState(null);
    const [preview, setPreview] = useState('/logo.png');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showShiftModal, setShowShiftModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false); // Edit Store Modal State
    const [isFullScreen, setIsFullScreen] = useState(false);

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

    // Unified state for handling the 4 different legal modals
    const [activeModal, setActiveModal] = useState(null); // null, 'admin_terms', 'admin_privacy', 'staff_terms', 'staff_privacy'

    // Printer Store Access
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

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const res = await axios.get('/api/settings');
                setSettings(res.data);

                if (res.data.logo_path) {
                    setPreview(`${res.data.logo_path}?t=${new Date().getTime()}`);
                } else {
                    setPreview('/logo.png');
                }
            } catch (error) {
                console.error("Failed to load initial settings", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();

        let pollingInterval;
        if (!user?.is_admin) {
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
    }, [user?.is_admin]);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();
        formData.append('store_name', settings.store_name);
        formData.append('address', settings.address || '');
        formData.append('phone', settings.phone || '');
        if (logoFile) formData.append('logo', logoFile);

        try {
            await axios.post('/api/settings', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Swal.fire({
                icon: 'success',
                title: 'Settings Saved',
                text: 'Store configuration updated successfully.',
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
            setShowEditModal(false); // Close the modal on success
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to save settings.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTestPrint = async () => {
        const encode = (text) => new TextEncoder().encode(text);
        const lineCap = paperWidth === '80mm' ? 42 : 32;
        const separator = "-".repeat(lineCap) + "\n";

        const commands = new Uint8Array([
            0x1B, 0x40, 0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01,
            ...encode("PRINTER TEST\n"), 0x1B, 0x45, 0x00,
            ...encode(separator),
            ...encode(`Paper Width: ${paperWidth}\n`),
            ...encode("Connection: SUCCESSFUL\n"),
            0x1B, 0x61, 0x00,
            0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01, 0x1D, 0x21, 0x11,
            ...encode(`${settings.store_name || "Smart POS"}\n`),
            0x1D, 0x21, 0x00, 0x1B, 0x45, 0x00, 0x1B, 0x61, 0x00,
            ...encode(`Date: ${new Date().toLocaleString()}\n`),
            ...encode(separator),
            0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41
        ]);
        await executePrint(commands);
    };

    // Helper math for the live shift summary
    const activeShift = settings?.active_shift || {};
    const gcashSales = Number(activeShift.gcash_sales || 0);
    const mayaSales = Number(activeShift.maya_sales || 0);
    const creditCardSales = Number(activeShift.credit_card_sales || 0);
    const debitCardSales = Number(activeShift.debit_card_sales || 0);
    const cashSales = Number(activeShift.cash_sales || 0);
    const totalGrossSales = cashSales + gcashSales + mayaSales + creditCardSales + debitCardSales;

    // Dynamic configuration for the legal modals to keep code DRY
    const modalConfig = {
        admin_terms: { title: 'Platform Terms of Service', content: settings.terms_of_service },
        admin_privacy: { title: 'Platform Privacy Policy', content: settings.privacy_policy },
        staff_terms: { title: 'Staff Acceptable Use Policy', content: settings.staff_terms_of_service },
        staff_privacy: { title: 'Staff Privacy Policy', content: settings.staff_privacy_policy },
    };

    // Style constants for modal inputs
    const inputClasses = "w-full border-gray-200 bg-gray-50/50 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400";
    const labelClasses = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5";

    // ==========================================
    // ROLE-BASED SKELETON LOADING STATE
    // ==========================================
    if (loading) return (
        <AuthenticatedLayout user={user} header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">Store Settings</h2>}>
            <Head title="Settings" />
            <div className="py-0 sm:py-8 lg:py-16 bg-gray-100 sm:bg-[#FAFAFA] min-h-[calc(100vh-65px)] sm:min-h-screen">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-2 sm:gap-8 lg:gap-12 items-start animate-pulse">

                        {/* LEFT COLUMN SKELETON (Shared for both roles, NO STICKY) */}
                        <div className="lg:col-span-4 space-y-2 sm:space-y-6">
                            <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200/60 p-6 sm:p-8 text-center flex flex-col items-center">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-full mb-3 sm:mb-5"></div>
                                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2 sm:mb-4"></div>
                                {user?.is_admin && (
                                    <div className="w-full mt-4">
                                        <div className="h-12 bg-gray-100 rounded-lg sm:rounded-lg w-full"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN SKELETON (Role-based) */}
                        <div className="lg:col-span-8 space-y-2 sm:space-y-6 lg:space-y-8 pb-10 sm:pb-0">

                            {/* EVERYONE SKELETON: Store Details */}
                            <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200/60 overflow-hidden">
                                <div className="px-4 sm:px-8 py-5 border-b border-gray-100/80 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
                                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                                    </div>
                                </div>
                                <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
                                    <div className="h-8 bg-gray-100 rounded w-full"></div>
                                    <div className="h-8 bg-gray-100 rounded w-full"></div>
                                    <div className="h-8 bg-gray-100 rounded w-full"></div>
                                </div>
                            </div>

                            {user?.is_admin ? (
                                /* ADMIN SKELETON: Legal Agreements */
                                <>
                                    {/* Legal & Agreements Skeleton */}
                                    <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200/60 overflow-hidden">
                                        <div className="px-4 sm:px-8 py-5 border-b border-gray-100/80 flex items-center gap-3">
                                            <div className="w-6 h-6 bg-gray-200 rounded-md"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                        </div>
                                        <div className="p-4 sm:p-8 space-y-6">
                                            <div className="border border-gray-100 rounded-md p-5 bg-gray-50/50 flex flex-col sm:flex-row justify-between gap-4">
                                                <div className="space-y-2 w-full">
                                                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-full max-w-lg"></div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <div className="w-24 h-8 bg-gray-200 rounded-md"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* STAFF SKELETON: Hardware & End of Day & Legal */
                                <>
                                    {/* Hardware Skeleton */}
                                    <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200/60 overflow-hidden">
                                        <div className="px-4 sm:px-8 py-5 border-b border-gray-100/80 flex items-center gap-3">
                                            <div className="w-6 h-6 bg-gray-200 rounded-md"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                        </div>
                                        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
                                            <div className="w-full h-20 bg-gray-100 rounded-md"></div>
                                            <div className="w-full h-24 bg-gray-100 rounded-md"></div>
                                        </div>
                                    </div>

                                    {/* End of Day Skeleton */}
                                    <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200/60 overflow-hidden">
                                        <div className="px-4 sm:px-8 py-5 border-b border-gray-100/80 flex items-center gap-3">
                                            <div className="w-6 h-6 bg-gray-200 rounded-md"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                        </div>
                                        <div className="p-4 sm:p-8">
                                            <div className="w-full h-32 bg-gray-100 rounded-md mb-6"></div>
                                        </div>
                                    </div>

                                    {/* Staff Legal Skeleton */}
                                    <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200/60 overflow-hidden">
                                        <div className="px-4 sm:px-8 py-5 border-b border-gray-100/80 flex items-center gap-3">
                                            <div className="w-6 h-6 bg-gray-200 rounded-md"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                        </div>
                                        <div className="p-4 sm:p-8 space-y-6">
                                            <div className="w-full h-20 bg-gray-100 rounded-md"></div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );

    return (
        <AuthenticatedLayout user={user} header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">Store Settings</h2>}>
            <Head title="Settings" />

            <div className="py-0 sm:py-8 lg:py-16 bg-gray-100 sm:bg-[#FAFAFA] min-h-[calc(100vh-65px)] sm:min-h-screen selection:bg-gray-900 selection:text-white">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-2 sm:gap-8 lg:gap-12 items-start animate-in fade-in sm:slide-in-from-bottom-4 duration-500">

                        {/* LEFT COLUMN: Store Logo Card (NO LONGER STICKY) */}
                        <div className="lg:col-span-4 space-y-2 sm:space-y-6">
                            <div className="bg-white sm:rounded-2xl sm:shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border border-gray-200/60 p-6 sm:p-8 text-center relative overflow-hidden flex flex-col items-center">
                                {/* Subtle decorative background glow */}
                                <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none"></div>

                                {/* Logo Display */}
                                <div className="relative inline-block mb-3 sm:mb-5">
                                    <div className="w-24 h-24 sm:w-32 sm:h-32 sm:ring-4 ring-white sm:shadow-xl bg-gray-50 overflow-hidden mx-auto z-10 relative flex items-center justify-center rounded-full border border-gray-200 sm:border-none">
                                        <img src={preview} alt="Store Logo" className="w-full h-full object-cover rounded-full" onError={(e) => {e.target.src='https://via.placeholder.com/150?text=Logo'}} />
                                    </div>
                                </div>

                                {/* Store Name (Smarter display logic) */}
                                <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-4 relative z-10 w-full">
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{settings.store_name || 'Not Configured'}</h1>
                                    {user?.is_admin && (
                                        <p className="text-[10px] sm:text-[11px] font-bold sm:font-semibold text-blue-600 sm:text-gray-400 uppercase tracking-widest mt-1">
                                            Store Identity
                                        </p>
                                    )}
                                </div>

                                {/* Action Button (Admin/Cashier) */}
                                <div className="w-full relative z-10 mt-2 sm:mt-4 space-y-2">
                                    {user?.is_admin && (
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 rounded-md sm:rounded-md bg-gray-900 text-white font-semibold text-sm hover:bg-black transition-all active:scale-[0.98] sm:shadow-[0_4px_12px_rgb(0,0,0,0.1)]"
                                        >
                                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            Edit Details
                                        </button>
                                    )}

                                    <button
                                        onClick={toggleFullScreen}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 rounded-md sm:rounded-md border border-gray-200 bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50 transition-all active:scale-[0.98]"
                                    >
                                        {isFullScreen ? (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4.5 4.5M9 9H4.5M9 9V4.5M15 9l4.5-4.5M15 9h4.5M15 9V4.5M15 15l4.5 4.5M15 15h4.5M15 15v4.5M9 15l-4.5 4.5M9 15H4.5M9 15v4.5" /></svg>
                                                Exit Full Screen
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" /></svg>
                                                Go Full Screen
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Forms and Configs */}
                        <div className="lg:col-span-8 space-y-2 sm:space-y-6 lg:space-y-8 pb-10 sm:pb-0">

                            {/* VISIBLE TO EVERYONE (Admins & Staff): Store Details Card */}
                            <div className="bg-white sm:rounded-2xl sm:shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border border-gray-200/60 overflow-hidden">
                                <div className="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-gray-100/80 bg-white flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5 uppercase sm:normal-case tracking-wider sm:tracking-normal text-[11px] sm:text-sm text-gray-500 sm:text-gray-900">
                                        <div className="hidden sm:block p-1.5 bg-blue-50 text-blue-600 rounded-md">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                        </div>
                                        Store Details
                                    </h3>
                                </div>
                                <div className="p-0">
                                    <dl className="divide-y divide-gray-100">
                                        <div className="px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/50 transition-colors">
                                            <dt className="text-sm font-medium text-gray-500">Store Name</dt>
                                            <dd className="mt-1 text-sm font-semibold text-gray-900 sm:mt-0">{settings.store_name || <span className="italic text-gray-400 font-normal">Not configured</span>}</dd>
                                        </div>
                                        <div className="px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/50 transition-colors">
                                            <dt className="text-sm font-medium text-gray-500">Address</dt>
                                            <dd className="mt-1 text-sm font-semibold text-gray-900 sm:mt-0 sm:text-right max-w-md">{settings.address || <span className="italic text-gray-400 font-normal">Not configured</span>}</dd>
                                        </div>
                                        <div className="px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/50 transition-colors">
                                            <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                                            <dd className="mt-1 text-sm font-semibold text-gray-900 sm:mt-0">{settings.phone || <span className="italic text-gray-400 font-normal">Not configured</span>}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>

                            {/* ADMIN ONLY - Legal & Agreements Section */}
                            {user?.is_admin && (
                                <div className="bg-white sm:rounded-2xl sm:shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border border-gray-200/60 overflow-hidden">
                                    <div className="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-gray-100/80 bg-white">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5 uppercase sm:normal-case tracking-wider sm:tracking-normal text-[11px] sm:text-sm text-gray-500 sm:text-gray-900">
                                            <div className="hidden sm:block p-1.5 bg-amber-50 text-amber-600 rounded-md">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            </div>
                                            Legal & Agreements
                                        </h3>
                                    </div>

                                    <div className="p-4 sm:p-8 space-y-6">

                                        {/* Store Owner Platform Agreements */}
                                        <div className="border border-gray-200 rounded-md p-5 bg-gray-50/50">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">Platform Terms & Privacy</h4>
                                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-lg">
                                                        The overarching system agreements you accepted when creating this workspace. These dictate the relationship between your business and the platform.
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button type="button" onClick={() => setActiveModal('admin_terms')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-md hover:bg-gray-50 shadow-sm active:scale-95 transition-all">
                                                        View Terms
                                                    </button>
                                                    <button type="button" onClick={() => setActiveModal('admin_privacy')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-md hover:bg-gray-50 shadow-sm active:scale-95 transition-all">
                                                        View Privacy
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Standard Staff Agreements */}
                                        <div className="border border-gray-200 rounded-md p-5 bg-gray-50/50">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">Staff Acceptable Use Policy</h4>
                                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-lg">
                                                        The mandatory security and privacy policies all staff members must legally agree to before accessing the POS terminal. These are enforced uniformly by the system to ensure security.
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button type="button" onClick={() => setActiveModal('staff_terms')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-md hover:bg-gray-50 shadow-sm active:scale-95 transition-all">
                                                        View Terms
                                                    </button>
                                                    <button type="button" onClick={() => setActiveModal('staff_privacy')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-md hover:bg-gray-50 shadow-sm active:scale-95 transition-all">
                                                        View Privacy
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}

                            {/* STAFF ONLY: Hardware, Shift & Legal Cards */}
                            {!user?.is_admin && (
                                <>
                                    {/* STAFF ONLY: Hardware Configuration Card */}
                                    <div className="bg-white sm:rounded-2xl sm:shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border border-gray-200/60 overflow-hidden">
                                        <div className="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-gray-100/80 bg-white">
                                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5 uppercase sm:normal-case tracking-wider sm:tracking-normal text-[11px] sm:text-sm text-gray-500 sm:text-gray-900">
                                                <div className="hidden sm:block p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                </div>
                                                Hardware
                                            </h3>
                                        </div>
                                        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">

                                            {/* Paper Size Selection */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 border border-gray-100 sm:border-gray-200 rounded-md sm:rounded-md bg-white sm:bg-gray-50/50">
                                                <div className="text-left">
                                                    <h4 className="font-bold text-gray-900 text-sm sm:text-base">Receipt Width</h4>
                                                    <p className="text-xs sm:text-[13px] text-gray-500 mt-0.5">Printer character alignment.</p>
                                                </div>
                                                <div className="flex bg-gray-100 sm:bg-gray-200/60 rounded-md sm:rounded-md p-1 sm:border border-gray-200 shadow-inner w-full sm:w-auto">
                                                    <button
                                                        onClick={() => setPaperWidth('58mm')}
                                                        className={`flex-1 sm:flex-none px-6 py-2.5 sm:py-2 rounded-md sm:rounded-lg text-sm font-bold transition-all duration-200 ${paperWidth === '58mm' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        58mm
                                                    </button>
                                                    <button
                                                        onClick={() => setPaperWidth('80mm')}
                                                        className={`flex-1 sm:flex-none px-6 py-2.5 sm:py-2 rounded-md sm:rounded-lg text-sm font-bold transition-all duration-200 ${paperWidth === '80mm' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        80mm
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Printer Connection Status */}
                                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-5 border border-gray-100 sm:border-gray-200 rounded-md sm:rounded-md bg-white sm:shadow-sm">
                                                <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                                                    <div className="relative flex shrink-0">
                                                        <div className={`p-3 sm:p-4 rounded-md sm:rounded-md transition-colors duration-300 ${usbDevice || bluetoothDevice ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 sm:w-7 sm:h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                                        </div>
                                                        <span className="absolute -top-1 -right-1 flex h-3 w-3 sm:h-3.5 sm:w-3.5">
                                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${usbDevice || bluetoothDevice ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                                            <span className={`relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 border-2 border-white ${usbDevice || bluetoothDevice ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-sm sm:text-[15px]">Thermal Printer</h4>
                                                        <p className="text-xs sm:text-[13px] font-medium mt-0.5 transition-colors duration-300 flex items-center gap-1.5">
                                                            Status: <span className={`${usbDevice || bluetoothDevice ? 'text-green-600' : 'text-red-500'}`}>
                                                                {usbDevice ? 'Connected (USB)' : bluetoothDevice ? 'Connected (Bluetooth)' : 'Offline'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap md:flex-nowrap gap-2 sm:gap-3 w-full md:w-auto">
                                                    {!(usbDevice || bluetoothDevice) ? (
                                                        <button
                                                            type="button"
                                                            onClick={isMobile ? connectBluetooth : connectUsb}
                                                            className="w-full md:w-auto px-6 py-3 sm:py-2.5 bg-blue-600 text-white font-bold sm:font-semibold text-sm rounded-lg sm:rounded-lg shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                                                            Pair {isMobile ? 'Bluetooth' : 'USB'}
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button type="button" onClick={handleTestPrint} className="flex-1 md:flex-none px-4 sm:px-5 py-3 sm:py-2.5 bg-gray-100 border border-transparent sm:bg-white sm:border-gray-200 text-gray-800 sm:text-gray-700 font-bold sm:font-semibold text-sm rounded-lg sm:rounded-lg sm:shadow-sm hover:bg-gray-200 sm:hover:bg-gray-50 transition-all active:scale-[0.98] whitespace-nowrap">Test Print</button>

                                                            <button type="button" onClick={openCashDrawer} className="flex-1 md:flex-none px-4 sm:px-5 py-3 sm:py-2.5 bg-gray-100 border border-transparent sm:bg-white sm:border-gray-200 text-gray-800 sm:text-gray-700 font-bold sm:font-semibold text-sm rounded-lg sm:rounded-lg sm:shadow-sm hover:bg-gray-200 sm:hover:bg-gray-50 transition-all active:scale-[0.98] whitespace-nowrap">Open Drawer</button>

                                                            <button type="button" onClick={disconnect} className="flex-1 md:flex-none w-full md:w-auto px-4 sm:px-5 py-3 sm:py-2.5 bg-red-100 sm:bg-red-50 border border-transparent sm:border-red-100 text-red-700 sm:text-red-600 font-bold sm:font-semibold text-sm rounded-lg sm:rounded-lg sm:shadow-sm hover:bg-red-200 sm:hover:bg-red-100 transition-all active:scale-[0.98] whitespace-nowrap">Disconnect</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* STAFF ONLY: Z-READ CARD WITH LIVE SHIFT SUMMARY */}
                                    <div className="bg-white sm:rounded-2xl sm:shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border border-gray-200/60 overflow-hidden mt-6">
                                        <div className="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-gray-100/80 bg-white flex justify-between items-center">
                                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5 uppercase sm:normal-case tracking-wider sm:tracking-normal text-[11px] sm:text-sm text-gray-500 sm:text-gray-900">
                                                <div className="hidden sm:block p-1.5 bg-purple-50 text-purple-600 rounded-md">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                Shift Summary
                                            </h3>

                                            {/* Status Badge */}
                                            {settings?.active_shift && (
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                                                    Active Shift
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-4 sm:p-8 space-y-6">

                                            {/* LIVE SHIFT RECONCILIATION SUMMARY */}
                                            {settings?.active_shift ? (
                                                <div className="space-y-3 sm:space-y-4">
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                                                        Started: {settings.active_shift.start_time}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                        {/* Starting Cash */}
                                                        <div className="bg-gray-50 p-4 rounded-md border border-gray-100 flex flex-col justify-center transition-all hover:bg-gray-100">
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Starting Cash</span>
                                                            <span className="text-lg sm:text-xl font-black text-gray-900">₱{Number(settings.active_shift.starting_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                        </div>

                                                        {/* Cash Sales */}
                                                        <div className="bg-emerald-50/50 p-4 rounded-md border border-emerald-100 flex flex-col justify-center transition-all hover:bg-emerald-50">
                                                            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Cash Sales</span>
                                                            <span className="text-lg sm:text-xl font-black text-emerald-700">₱{Number(settings.active_shift.cash_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                        </div>

                                                        {/* FIXED: Expected Cash in Drawer with light green background */}
                                                        <div className="bg-emerald-50 p-5 rounded-md border border-emerald-100 flex flex-col justify-center col-span-2 shadow-sm">
                                                            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Expected in Drawer</span>
                                                            <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">₱{Number(settings.active_shift.expected_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    </div>

                                                    {/* DIGITAL SALES BREAKDOWN */}
                                                    {(gcashSales > 0 || mayaSales > 0 || creditCardSales > 0 || debitCardSales > 0) && (
                                                        <div className="pt-3 border-t border-gray-100">
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Digital Sales</span>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                                                {gcashSales > 0 && (
                                                                    <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100 flex flex-col justify-center">
                                                                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">GCash</span>
                                                                        <span className="text-sm font-black text-blue-700">₱{gcashSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                )}
                                                                {mayaSales > 0 && (
                                                                    <div className="bg-green-50/50 p-3 rounded-md border border-green-100 flex flex-col justify-center">
                                                                        <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest mb-0.5">Maya</span>
                                                                        <span className="text-sm font-black text-green-700">₱{mayaSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                )}
                                                                {creditCardSales > 0 && (
                                                                    <div className="bg-purple-50/50 p-3 rounded-md border border-purple-100 flex flex-col justify-center">
                                                                        <span className="text-[9px] font-bold text-purple-500 uppercase tracking-widest mb-0.5">Credit</span>
                                                                        <span className="text-sm font-black text-purple-700">₱{creditCardSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                )}
                                                                {debitCardSales > 0 && (
                                                                    <div className="bg-indigo-50/50 p-3 rounded-md border border-indigo-100 flex flex-col justify-center">
                                                                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-0.5">Debit</span>
                                                                        <span className="text-sm font-black text-indigo-700">₱{debitCardSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* TOTAL GROSS SALES */}
                                                    <div className="mt-2 bg-gray-50 p-4 rounded-md border border-gray-200 flex justify-between items-center">
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Gross Sales</span>
                                                        <span className="text-lg font-black text-gray-900">
                                                            ₱{ totalGrossSales.toLocaleString('en-US', { minimumFractionDigits: 2 }) }
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 bg-gray-50 rounded-md border border-gray-100 border-dashed">
                                                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    <p className="text-sm font-bold text-gray-500">No active shift detected.</p>
                                                    <p className="text-xs text-gray-400 mt-1">Open a shift on the POS Terminal to start selling.</p>
                                                </div>
                                            )}

                                            <button onClick={() => setShowShiftModal(true)} className="w-full bg-gray-900 text-white px-8 py-4 sm:py-3.5 rounded-md font-black text-sm sm:shadow-[0_4px_12px_rgb(0,0,0,0.1)] hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                                Perform Z-Read & Close Shift
                                            </button>
                                        </div>
                                    </div>

                                    {/* STAFF ONLY: Legal & Agreements Section */}
                                    <div className="bg-white sm:rounded-2xl sm:shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border border-gray-200/60 overflow-hidden mt-6">
                                        <div className="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-gray-100/80 bg-white">
                                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5 uppercase sm:normal-case tracking-wider sm:tracking-normal text-[11px] sm:text-sm text-gray-500 sm:text-gray-900">
                                                <div className="hidden sm:block p-1.5 bg-amber-50 text-amber-600 rounded-md">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                </div>
                                                Legal & Agreements
                                            </h3>
                                        </div>

                                        <div className="p-4 sm:p-8">
                                            <div className="border border-gray-200 rounded-md p-5 bg-gray-50/50">
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-sm">Staff Acceptable Use Policy</h4>
                                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-lg">
                                                            The mandatory security and privacy policies all staff members must legally agree to before accessing the POS terminal.
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <button type="button" onClick={() => setActiveModal('staff_terms')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-md hover:bg-gray-50 shadow-sm active:scale-95 transition-all">
                                                            View Terms
                                                        </button>
                                                        <button type="button" onClick={() => setActiveModal('staff_privacy')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-md hover:bg-gray-50 shadow-sm active:scale-95 transition-all">
                                                            View Privacy
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* SHARED MODALS */}

            {/* Admin Edit Store Modal (Premium Design) */}
            {showEditModal && (
                <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
                    <div className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-2xl sm:shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

                        {/* Header (Sticky on Mobile) */}
                        <div className="bg-white border-b border-gray-100 px-6 sm:px-10 py-5 sm:py-6 flex justify-between items-center shrink-0 sticky top-0 z-50">
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Edit Store Details</h2>
                                <p className="text-[11px] sm:text-xs font-medium text-gray-500 mt-0.5 sm:mt-1">Update the store identity and contact info.</p>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="bg-gray-50 hover:bg-gray-100 p-2 sm:p-2.5 rounded-full text-gray-500 hover:text-gray-900 transition-colors active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar relative">
                            <form id="edit-store-form" onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">

                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 sm:pb-8 border-b border-gray-100">
                                    <div
                                        onClick={() => document.getElementById('store-logo-input').click()}
                                        className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-gray-50 flex items-center justify-center overflow-hidden cursor-pointer group hover:ring-gray-200 transition-all shadow-sm shrink-0"
                                    >
                                        <img src={preview} alt="Preview" className="w-full h-full object-cover bg-white" />
                                        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <h3 className="font-bold text-gray-900 text-sm">Store Logo</h3>
                                        <p className="text-xs text-gray-500 mt-1 mb-3">Recommended size is 500x500px. Max 2MB.</p>
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('store-logo-input').click()}
                                            className="text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors shadow-sm"
                                        >
                                            Choose new image
                                        </button>
                                        <input id="store-logo-input" type="file" onChange={handleFileChange} className="hidden" accept="image/jpeg, image/png, image/webp, image/jpg" />
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className={labelClasses}>Store Name</label>
                                        <input
                                            name="store_name"
                                            value={settings.store_name || ''}
                                            onChange={handleChange}
                                            className={inputClasses}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Address</label>
                                        <input
                                            name="address"
                                            value={settings.address || ''}
                                            onChange={handleChange}
                                            className={inputClasses}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Phone Number</label>
                                        <input
                                            name="phone"
                                            value={settings.phone || ''}
                                            onChange={handleChange}
                                            className={inputClasses}
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer (Sticky bottom) */}
                        <div className="bg-white sm:bg-gray-50/80 px-6 sm:px-10 py-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="order-2 sm:order-1 w-full sm:w-auto px-6 py-3.5 sm:py-3 text-gray-600 font-semibold bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="edit-store-form"
                                disabled={saving}
                                className="order-1 sm:order-2 w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-md shadow-md text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Saving...
                                    </>
                                ) : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Shift Modal */}
            <ShiftModal isOpen={showShiftModal} settings={settings} onClose={() => setShowShiftModal(false)} />

            {/* Dynamic Legal & Compliance Modal */}
            {activeModal && (
                <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
                    <div className="bg-white w-full sm:h-auto sm:max-w-2xl sm:rounded-2xl sm:shadow-2xl h-full sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                {modalConfig[activeModal]?.title}
                            </h2>
                            <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto text-sm text-gray-700 space-y-4 leading-relaxed custom-scrollbar bg-white">
                            {modalConfig[activeModal]?.content ? (
                                <div
                                    className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600 prose-p:leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: modalConfig[activeModal].content }}
                                />
                            ) : (
                                <div className="text-center py-10 text-gray-400 font-medium italic">
                                    Document content has not been configured yet.
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button onClick={() => setActiveModal(null)} className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-md text-sm transition-colors shadow-sm">Close Document</button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}