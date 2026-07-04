import React, { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

const renderPaymentIcon = (type, fallbackIcon) => {
    const t = type?.toLowerCase();
    if (t === 'gcash') {
        return (
            <span className="inline-flex items-center justify-center bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded tracking-tighter uppercase leading-none select-none shrink-0 font-mono">
                GCash
            </span>
        );
    }
    if (t === 'maya') {
        return (
            <span className="inline-flex items-center justify-center bg-emerald-600 text-white text-[9px] font-black px-2 py-1 rounded tracking-tighter uppercase leading-none select-none shrink-0 font-mono">
                Maya
            </span>
        );
    }
    return <span className="text-xl shrink-0">{fallbackIcon || '📱'}</span>;
};

export default function SystemInfo({ auth, settings }) {
    const fileInput = useRef();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [preview, setPreview] = useState(settings?.logo_path ? `/storage/${settings.logo_path}` : null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState(Array.isArray(settings?.payment_methods) ? settings.payment_methods : []);
    const [editingMethod, setEditingMethod] = useState(null);
    const [newMethod, setNewMethod] = useState({ type: '', label: '', number: '', name: '', icon: '' });

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        app_name: settings?.app_name || '',
        support_email: settings?.support_email || '',
        support_phone: settings?.support_phone || '',
        company_address: settings?.company_address || '',
        logo: null,
        payment_methods: JSON.stringify(Array.isArray(settings?.payment_methods) ? settings.payment_methods : []),
    });

    useEffect(() => {
        setData('payment_methods', JSON.stringify(paymentMethods));
    }, [paymentMethods]);

    // Reset state when opening modal
    const openModal = () => {
        reset();
        clearErrors();
        setPreview(settings?.logo_path ? `/storage/${settings.logo_path}` : null);
        setIsModalOpen(true);
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('logo', file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const submit = (e) => {
        e.preventDefault();

        Swal.fire({
            title: 'Save System Settings?',
            text: 'Are you sure you want to update the global system configuration?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#111827', // Dark Gray 900 to match theme
            cancelButtonColor: '#f3f4f6',
            confirmButtonText: 'Yes, Save Settings',
            cancelButtonText: '<span class="text-gray-700 font-bold">Cancel</span>',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-none sm:rounded-xl',
                confirmButton: 'rounded-none sm:rounded-lg px-6 py-3 font-bold text-sm shadow-md',
                cancelButton: 'rounded-none sm:rounded-lg px-6 py-3 font-bold text-sm border border-gray-200 hover:bg-gray-200 transition-all'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Saving...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                post(route('developer.system.update'), {
                    preserveScroll: true,
                    forceFormData: true,
                    onSuccess: () => {
                        setIsModalOpen(false);
                        Swal.fire({
                            title: 'Settings Saved',
                            text: 'Your global system information has been successfully updated.',
                            icon: 'success',
                            confirmButtonColor: '#111827',
                            customClass: {
                                popup: 'rounded-none sm:rounded-xl',
                                confirmButton: 'rounded-none sm:rounded-lg px-8 py-3 font-bold text-sm'
                            }
                        });
                    },
                    onError: () => {
                        Swal.close();
                    }
                });
            }
        });
    };

    // Premium SaaS Data Row Component
    const InfoRow = ({ icon, label, value }) => (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-gray-100/80 last:border-0 gap-2 transition-colors hover:bg-gray-50/50 -mx-6 px-6 sm:-mx-8 sm:px-8">
            <dt className="flex items-center gap-3 text-[13px] font-medium text-gray-500 shrink-0">
                <div className="text-gray-400">{icon}</div>
                {label}
            </dt>
            <dd className="text-sm font-semibold text-gray-900 sm:text-right break-words">
                {value || <span className="text-gray-400 font-normal italic text-[13px]">Not configured</span>}
            </dd>
        </div>
    );

    // Common input classes for the modal
    const inputClasses = "w-full border-gray-200 bg-gray-50/50 rounded-none sm:rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400";
    const labelClasses = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5";
    const errorClasses = "text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide";

    const persistPaymentMethods = (methodsToSave) => {
        Swal.fire({
            title: 'Saving Payment Methods...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        router.post(route('developer.system.update'), {
            payment_methods: JSON.stringify(methodsToSave),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    title: 'Saved',
                    text: 'Payment methods updated successfully.',
                    icon: 'success',
                    confirmButtonColor: '#111827',
                    customClass: {
                        popup: 'rounded-none sm:rounded-xl',
                        confirmButton: 'rounded-none sm:rounded-lg px-8 py-3 font-bold text-sm'
                    }
                });
            },
            onError: () => {
                Swal.fire({
                    title: 'Save Failed',
                    text: 'Unable to save payment methods. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#dc2626',
                    customClass: {
                        popup: 'rounded-none sm:rounded-xl',
                        confirmButton: 'rounded-none sm:rounded-lg px-8 py-3 font-bold text-sm'
                    }
                });
            }
        });
    };

    const confirmDeletePaymentMethod = (idx) => {
        Swal.fire({
            title: 'Delete payment method?',
            text: 'This method will be removed after you save System Information.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#f3f4f6',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: '<span class="text-gray-700 font-bold">Cancel</span>',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-none sm:rounded-xl',
                confirmButton: 'rounded-none sm:rounded-lg px-6 py-3 font-bold text-sm shadow-md',
                cancelButton: 'rounded-none sm:rounded-lg px-6 py-3 font-bold text-sm border border-gray-200 hover:bg-gray-200 transition-all'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const updated = paymentMethods.filter((_, i) => i !== idx);
                setPaymentMethods(updated);
                persistPaymentMethods(updated);
            }
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">System Information</h2>}
        >
            <Head title="System Info" />

            <div className="py-8 lg:py-16 bg-[#FAFAFA] min-h-screen selection:bg-gray-900 selection:text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* BRANDING & IDENTITY CARD */}
                    <div className="bg-white rounded-none sm:rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border-y-0 border border-gray-200/60 overflow-hidden">
                        <div className="px-6 sm:px-8 py-5 border-b border-gray-100/80 bg-white flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                                Branding & Identity
                            </h3>
                            <button
                                onClick={openModal}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-none sm:rounded-lg bg-gray-900 text-white font-semibold text-xs sm:text-sm hover:bg-black transition-all active:scale-[0.98] shadow-md shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Edit
                            </button>
                        </div>
                        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-gray-100">
                            <div className="w-32 h-32 rounded-none sm:rounded-lg border border-gray-100 shadow-sm bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                                {settings?.logo_path ? (
                                    <img src={`/storage/${settings.logo_path}`} alt="System Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                )}
                            </div>
                            <div className="w-full">
                                <dl>
                                </dl>
                            </div>
                        </div>
                        <div className="px-6 sm:px-8 pb-2">
                            <dl>
                                <InfoRow
                                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                    label="Application Name"
                                    value={settings?.app_name}
                                />
                                <InfoRow
                                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>}
                                    label="Support Email"
                                    value={settings?.support_email}
                                />
                                <InfoRow
                                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                                    label="Support Phone"
                                    value={settings?.support_phone}
                                />
                                <InfoRow
                                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                    label="Official Business Address"
                                    value={settings?.company_address}
                                />
                            </dl>
                        </div>
                    </div>

                    {/* PAYMENT METHODS CARD */}
                    <div className="bg-white rounded-none sm:rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border-y-0 border border-gray-200/60 overflow-hidden">
                        <div className="px-6 sm:px-8 py-5 border-b border-gray-100/80 bg-white flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5">
                                <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10a1 1 0 011-1h16a1 1 0 011 1v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10l2.293-2.293a1 1 0 011.414 0l4.586 4.586a1 1 0 001.414 0l4.586-4.586a1 1 0 011.414 0L21 10" /></svg>
                                </div>
                                Payment Methods
                            </h3>
                            <button
                                onClick={() => {
                                    setEditingMethod(null);
                                    setNewMethod({ type: '', label: '', number: '', name: '', icon: '📱' });
                                    setIsPaymentModalOpen(true);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-none sm:rounded-lg bg-green-600 text-white font-semibold text-xs sm:text-sm hover:bg-green-700 transition-all active:scale-[0.98] shadow-md shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                Add Method
                            </button>
                        </div>
                        <div className="p-6 sm:p-8">
                            {paymentMethods.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-8">No payment methods configured yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {paymentMethods.map((method, idx) => (
                                        <div key={idx} className="p-4 bg-gray-50/50 border border-gray-150 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4 flex-1">
                                                {renderPaymentIcon(method.type, method.icon)}
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">{method.label}</p>
                                                    <p className="text-xs text-gray-500">{method.number} • {method.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setEditingMethod(idx);
                                                        setNewMethod(method);
                                                        setIsPaymentModalOpen(true);
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => confirmDeletePaymentMethod(idx)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PAYMENT METHOD MODAL */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-none sm:rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                        {/* Modal Header */}
                        <div className="bg-white border-b border-gray-100 px-6 sm:px-8 py-6 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900">{editingMethod !== null ? 'Edit' : 'Add'} Payment Method</h2>
                            <button
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 sm:p-8 space-y-5">
                            <div>
                                <label className={labelClasses}>Select Provider</label>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewMethod({
                                            ...newMethod,
                                            type: 'gcash',
                                            label: 'GCash',
                                            icon: '📱'
                                        })}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                            newMethod.type === 'gcash'
                                                ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-100/50'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded tracking-tighter uppercase leading-none select-none">
                                            GCash
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-bold mt-2">Mobile Wallet</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setNewMethod({
                                            ...newMethod,
                                            type: 'maya',
                                            label: 'Maya',
                                            icon: '📱'
                                        })}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                            newMethod.type === 'maya'
                                                ? 'border-emerald-600 bg-emerald-50/50 ring-4 ring-emerald-100/50'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded tracking-tighter uppercase leading-none select-none">
                                            Maya
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-bold mt-2">Mobile Wallet</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClasses}>Account/Reference Number</label>
                                <input
                                    type="text"
                                    value={newMethod.number}
                                    onChange={(e) => setNewMethod({ ...newMethod, number: e.target.value })}
                                    placeholder="e.g., 0912 345 6789"
                                    className={inputClasses}
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Account/Business Name</label>
                                <input
                                    type="text"
                                    value={newMethod.name}
                                    onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                                    placeholder="e.g., Juan Dela Cruz"
                                    className={inputClasses}
                                    required
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50/80 px-6 sm:px-8 py-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
                            <button
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="px-6 py-3 text-gray-600 font-semibold bg-white border border-gray-300 hover:bg-gray-50 rounded-none sm:rounded-lg text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!newMethod.type || !newMethod.label || !newMethod.number || !newMethod.name) {
                                        Swal.fire({
                                            icon: 'warning',
                                            title: 'Missing Fields',
                                            text: 'Please fill in all required fields.',
                                            confirmButtonColor: '#16a34a',
                                            customClass: { popup: 'rounded-2xl' }
                                        });
                                        return;
                                    }
                                    if (editingMethod !== null) {
                                        const updated = [...paymentMethods];
                                        updated[editingMethod] = newMethod;
                                        setPaymentMethods(updated);
                                        persistPaymentMethods(updated);
                                    } else {
                                        const updated = [...paymentMethods, newMethod];
                                        setPaymentMethods(updated);
                                        persistPaymentMethods(updated);
                                    }
                                    setIsPaymentModalOpen(false);
                                }}
                                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-none sm:rounded-lg text-sm transition-all"
                            >
                                {editingMethod !== null ? 'Update Method' : 'Add Method'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-none sm:rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] sm:max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="bg-white border-b border-gray-100 px-6 sm:px-10 py-6 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Edit System Settings</h2>
                                <p className="text-xs font-medium text-gray-500 mt-1">Changes here reflect across the entire platform.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="bg-gray-50 hover:bg-gray-100 p-2.5 rounded-none sm:rounded-full text-gray-500 hover:text-gray-900 transition-colors active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar">
                            <form id="system-form" onSubmit={submit} className="space-y-8">

                                {/* Logo Upload */}
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-gray-100">
                                    <div
                                        onClick={() => fileInput.current.click()}
                                        className="relative w-28 h-28 rounded-none sm:rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer group hover:border-gray-400 hover:bg-gray-50 transition-all shadow-sm shrink-0"
                                    >
                                        {preview ? (
                                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <h3 className="font-bold text-gray-900 text-sm">System Logo</h3>
                                        <p className="text-xs text-gray-500 mt-1 mb-3">Recommended size is 256x256px. Max 2MB.</p>
                                        <button
                                            type="button"
                                            onClick={() => fileInput.current.click()}
                                            className="text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-none sm:rounded-lg transition-colors shadow-sm"
                                        >
                                            Upload new logo
                                        </button>
                                        <input type="file" ref={fileInput} onChange={handleLogoChange} className="hidden" accept="image/png, image/jpeg, image/jpg, image/svg+xml" />
                                        {errors.logo && <p className={errorClasses}>{errors.logo}</p>}
                                    </div>
                                </div>

                                {/* Form Inputs */}
                                <div className="space-y-6">
                                    <div>
                                        <label className={labelClasses}>Application / Company Name</label>
                                        <input type="text" value={data.app_name} onChange={e => setData('app_name', e.target.value)} required className={inputClasses} placeholder="e.g. NextGen POS Systems Inc." />
                                        {errors.app_name && <p className={errorClasses}>{errors.app_name}</p>}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClasses}>Support Email</label>
                                            <input type="email" value={data.support_email} onChange={e => setData('support_email', e.target.value)} className={inputClasses} placeholder="support@yourdomain.com" />
                                            {errors.support_email && <p className={errorClasses}>{errors.support_email}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Support Phone</label>
                                            <input type="text" value={data.support_phone} onChange={e => setData('support_phone', e.target.value)} className={inputClasses} placeholder="+63 912 345 6789" />
                                            {errors.support_phone && <p className={errorClasses}>{errors.support_phone}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Official Business Address</label>
                                        <textarea
                                            value={data.company_address}
                                            onChange={e => setData('company_address', e.target.value)}
                                            rows="3"
                                            className={`${inputClasses} resize-none`}
                                            placeholder="Enter full address for billing purposes..."
                                        ></textarea>
                                        {errors.company_address && <p className={errorClasses}>{errors.company_address}</p>}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50/80 px-6 sm:px-10 py-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="order-2 sm:order-1 px-6 py-3 text-gray-600 font-semibold bg-white border border-gray-300 hover:bg-gray-50 rounded-none sm:rounded-lg text-sm transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="system-form"
                                disabled={processing}
                                className="order-1 sm:order-2 px-8 py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-none sm:rounded-lg shadow-md text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Saving...
                                    </>
                                ) : 'Save Settings'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}