import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Tenants({ auth, stores, plans, owners = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);

    // --- FILTER STATES (Read from URL if present) ---
    const params = new URLSearchParams(window.location.search);
    const [searchQuery, setSearchQuery] = useState(params.get('search') || '');
    const [statusFilter, setStatusFilter] = useState(params.get('status') || 'all');
    const [planFilter, setPlanFilter] = useState(params.get('plan') || 'all');

    // --- REAL-TIME SERVER FILTERING ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            router.get(window.location.pathname, {
                search: searchQuery,
                status: statusFilter,
                plan: planFilter
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true, // Replaces current history state so the back button isn't broken
                only: ['stores'] // Only refresh the stores data
            });
        }, 300); // 300ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, statusFilter, planFilter]);

    // --- REAL-TIME POLLING (5 SECONDS) ---
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['stores'],
                preserveScroll: true,
                preserveState: true
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Form: Create New Tenant
    const { data, setData, post, processing, errors, reset } = useForm({
        owner_name: '',
        owner_email: '',
        plan_id: '',
    });

    // Form: Provision Additional Branch for Existing Owner
    const {
        data: branchData,
        setData: setBranchData,
        post: postBranch,
        processing: branchProcessing,
        errors: branchErrors,
        reset: resetBranch,
    } = useForm({
        owner_id: '',
        branch_name: '',
        address: '',
        phone: '',
        plan_id: '',
    });

    const formatDate = (dateString) => {
        if (!dateString) return 'No Expiration Set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // --- HANDLERS ---
    const submitTenant = (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Sending Invitation',
            html: 'Please wait while we generate the secure link and notify the owner...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        post(route('developer.stores.store'), {
            onSuccess: () => {
                setShowModal(false);
                reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Invitation Sent!',
                    text: 'The tenant has been emailed a secure link to complete their setup.',
                    confirmButtonColor: '#2563eb'
                });
            },
            onError: () => Swal.close()
        });
    };

    const submitBranch = (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Provisioning Branch',
            html: 'Please wait while we create and link the new branch...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        postBranch(route('developer.stores.branch'), {
            onSuccess: () => {
                setShowBranchModal(false);
                resetBranch();
                Swal.fire({
                    icon: 'success',
                    title: 'Branch Provisioned!',
                    text: 'The new branch has been linked to the owner account.',
                    confirmButtonColor: '#2563eb'
                });
            },
            onError: () => Swal.close()
        });
    };

    const handleToggleStatus = (store) => {
        const action = store.status ? 'Suspend' : 'Activate';
        Swal.fire({
            title: `${action} Tenant?`,
            text: `Are you sure you want to ${action.toLowerCase()} ${store.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: store.status ? '#000000' : '#10b981',
            confirmButtonText: `Yes, ${action}!`
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Updating Status', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
                router.post(route('developer.stores.toggle-status', store.id), {}, {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire('Updated!', `Store has been ${action.toLowerCase()}ed.`, 'success'),
                    onError: () => Swal.close()
                });
            }
        });
    };

    const handleSendReminder = (store) => {
        Swal.fire({
            title: 'Send Billing Notice?',
            text: `Email a secure renewal link to ${store.users?.[0]?.email || 'the owner'}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Yes, Send Email'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Sending Email',
                    html: 'Preparing secure payment link...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });
                router.post(route('developer.stores.remind', store.id), {}, {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire('Sent!', 'Payment link has been delivered.', 'success'),
                    onError: () => Swal.close()
                });
            }
        });
    };

    // Use backend-filtered stores directly (fallback to empty array)
    const storeList = stores?.data || [];

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 uppercase tracking-widest truncate">Tenant Management</h2>}
        >
            <Head title="Tenants" />

            <div className="pb-24 sm:pb-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 space-y-4 sm:space-y-6 lg:space-y-8 py-4 sm:py-6 lg:py-12">

                    {/* TOP ACTION BAR & FILTERS */}
                    <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2 sm:gap-3 lg:gap-4 order-2 lg:order-1">

                        {/* Search Input */}
                        <div className="relative w-full lg:max-w-sm xl:max-w-md shrink-0 order-2 lg:order-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-4 py-2 sm:py-2.5 border-gray-200 rounded-none sm:rounded-lg leading-5 bg-white shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                            />
                        </div>

                        {/* Filters & Invite Button */}
                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 lg:gap-4 w-full lg:w-auto lg:justify-end order-1 lg:order-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full sm:w-auto bg-white border-gray-200 shadow-sm rounded-none sm:rounded-lg text-xs font-bold text-gray-700 py-2 sm:py-2.5 pl-3 sm:pl-4 pr-8 focus:ring-blue-500 focus:border-blue-500 cursor-pointer grow sm:grow-0 text-[12px] sm:text-xs min-h-10 sm:min-h-auto"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active Only</option>
                                <option value="suspended">Suspended Only</option>
                            </select>

                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="w-full sm:w-auto bg-white border-gray-200 shadow-sm rounded-none sm:rounded-lg text-xs font-bold text-gray-700 py-2 sm:py-2.5 pl-3 sm:pl-4 pr-8 focus:ring-blue-500 focus:border-blue-500 cursor-pointer grow sm:grow-0 text-[12px] sm:text-xs min-h-10 sm:min-h-auto"
                            >
                                <option value="all">All Plans</option>
                                {plans.map(p => (
                                    <option key={p.id} value={p.id.toString()}>{p.name}</option>
                                ))}
                            </select>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowBranchModal(true)}
                                    className="w-full sm:w-auto bg-blue-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-none sm:rounded-lg font-black hover:bg-blue-700 active:bg-blue-800 uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 shadow-md min-h-10 sm:min-h-auto"
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    <span className="whitespace-nowrap">+ Add Branch</span>
                                </button>

                                <button
                                    onClick={() => setShowModal(true)}
                                    className="w-full sm:w-auto bg-gray-900 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-none sm:rounded-lg font-black hover:bg-black active:bg-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 shadow-md min-h-10 sm:min-h-auto"
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                    <span className="whitespace-nowrap">Invite Tenant</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* CONTENT AREA: GRID OR EMPTY STATE */}
                    {storeList.length === 0 ? (
                        /* EMPTY STATE */
                        <div className="bg-white rounded-none sm:rounded-xl border-4 border-dashed border-gray-100 p-6 sm:p-12 lg:p-20 text-center animate-in fade-in zoom-in duration-500 mt-3 sm:mt-6 lg:mt-8 w-full border-y sm:border-y-0">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-6">
                                <svg className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                            <h3 className="text-base sm:text-lg lg:text-xl font-black text-gray-900 uppercase tracking-tight">No matching tenants</h3>
                            <p className="text-gray-400 text-xs sm:text-sm mt-2 font-medium px-2 sm:px-4">Try adjusting your filters or search query.</p>
                        </div>
                    ) : (
                        <>
                            {/* TENANT GRID */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                                {storeList.map((store) => (
                                    <div key={store.id} className={`flex flex-col h-full bg-white rounded-none sm:rounded-xl border-2 border-y sm:border-y-0 transition-all relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 ${!store.status ? 'border-red-100 bg-red-50/20' : 'border-gray-100 hover:border-blue-200'}`}>

                                        {/* EXPIRATION CORNER RIBBON */}
                                        <div className={`absolute top-0 right-0 text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase tracking-widest px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-bl-none sm:rounded-bl-lg z-10 ${!store.status ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
                                            Ends: {formatDate(store.subscription_ends_at)}
                                        </div>

                                        <div className="p-3 sm:p-4 lg:p-8 flex-1 flex flex-col">
                                            <div className="border-b border-gray-100 pb-3 sm:pb-3 lg:pb-5 mb-3 sm:mb-3 lg:mb-5 mt-3 sm:mt-2">
                                                <h3 className="font-black text-base sm:text-lg lg:text-xl text-gray-900 truncate pr-20" title={store.name}>{store.name}</h3>
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 lg:mt-3">
                                                    <span className={`px-2 sm:px-2.5 lg:px-3 py-0.5 sm:py-1 rounded-full text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase tracking-widest border shadow-sm ${store.status ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                        {store.status ? '● Active' : '● Suspended'}
                                                    </span>
                                                    <span className="px-2 sm:px-2.5 lg:px-3 py-0.5 sm:py-1 rounded-full text-[7px] sm:text-[8px] lg:text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100 shadow-sm truncate max-w-[120px] sm:max-w-none">
                                                        {store.plan?.name || 'Manual Plan'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* USERS LIST */}
                                            <div className="flex-1">
                                                <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 sm:mb-2 lg:mb-3 flex items-center gap-1">
                                                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                    Registered Users
                                                </p>
                                                <div className="space-y-1.5 sm:space-y-2 lg:space-y-3 max-h-[100px] sm:max-h-[130px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                                                    {store.users.map(u => (
                                                        <div key={u.id} className="flex justify-between items-center bg-gray-50/50 hover:bg-white active:bg-white transition-all p-2 sm:p-2.5 lg:p-3 rounded-none sm:rounded-lg border border-gray-100 group min-h-12 sm:min-h-14">
                                                            <div className="min-w-0 pr-2 text-left flex-1">
                                                                <div className="font-black text-[10px] sm:text-xs lg:text-sm text-gray-900 truncate uppercase tracking-tight">{u.name}</div>
                                                                <div className="text-[8px] sm:text-[9px] lg:text-[10px] text-gray-500 font-bold truncate lowercase">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* FOOTER ACTIONS */}
                                        <div className="p-3 sm:p-4 lg:p-6 bg-gray-50/50 border-t border-gray-100 flex gap-1.5 sm:gap-2 lg:gap-3">
                                            <button
                                                onClick={() => handleToggleStatus(store)}
                                                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 py-2 sm:py-2.5 lg:py-3 text-[8px] sm:text-[9px] lg:text-[10px] font-black rounded-none sm:rounded-lg border uppercase transition-all active:scale-95 min-h-10 sm:min-h-11 ${store.status ? 'bg-white text-red-600 border-red-100 hover:bg-red-50' : 'bg-green-600 text-white border-green-600 hover:bg-green-700'}`}
                                            >
                                                {store.status ? 'Suspend' : 'Activate'}
                                            </button>
                                            <button
                                                onClick={() => handleSendReminder(store)}
                                                className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 py-2 sm:py-2.5 lg:py-3 text-[8px] sm:text-[9px] lg:text-[10px] font-black rounded-none sm:rounded-lg bg-white text-blue-600 border border-blue-100 hover:bg-blue-50 active:bg-blue-100 uppercase transition-all active:scale-95 min-h-10 sm:min-h-11"
                                            >
                                                Send Bill
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* RESPONSIVE PAGINATION (PRESERVES FILTERS) */}
                            {stores.links && stores.links.length > 3 && (
                                <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-1.5 mt-6 sm:mt-10 lg:mt-12 pb-6 sm:pb-10 lg:pb-12">
                                    {stores.links.map((link, i) => {
                                        const currentIndex = stores.links.findIndex(l => l.active);
                                        const isFirst = i === 0;
                                        const isLast = i === stores.links.length - 1;
                                        const isCurrent = link.active;
                                        const isAdjacent = Math.abs(i - currentIndex) <= 1;
                                        const isNavButton = link.label === '&laquo;' || link.label === '&raquo;';

                                        // Show first, last, current, adjacent pages, and nav buttons
                                        const show = isFirst || isLast || isCurrent || isAdjacent || isNavButton;

                                        if (!show) {
                                            // Show ellipsis between gaps
                                            if (i > 1 && i < currentIndex - 1) {
                                                if (i === 2 && !stores.links[1].active) return <span key={`ellipsis-${i}`} className="px-1 text-gray-400 font-bold text-[8px] sm:text-[9px]">...</span>;
                                            }
                                            if (i < stores.links.length - 2 && i > currentIndex + 1) {
                                                if (i === currentIndex + 2) return <span key={`ellipsis-${i}`} className="px-1 text-gray-400 font-bold text-[8px] sm:text-[9px]">...</span>;
                                            }
                                            return null;
                                        }

                                        return (
                                            <Link
                                                key={i}
                                                href={link.url || '#'}
                                                preserveScroll
                                                preserveState
                                                className={`px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 text-[8px] sm:text-[9px] lg:text-[10px] font-black rounded-none sm:rounded-md lg:rounded-lg border transition-all whitespace-nowrap min-h-8 sm:min-h-9 flex items-center justify-center ${
                                                    link.active
                                                        ? 'bg-gray-900 text-white border-gray-900 scale-105 shadow-sm'
                                                        : link.url
                                                            ? 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                                                            : 'bg-transparent text-gray-300 border-transparent cursor-not-allowed'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* PROVISION MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-[100] p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-none sm:rounded-lg lg:rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="bg-gray-900 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 flex justify-between items-center sticky top-0 z-10">
                            <div>
                                <h2 className="text-base sm:text-lg lg:text-xl font-black text-white uppercase tracking-widest leading-none">Invite Tenant</h2>
                                <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-gray-400 uppercase mt-1 sm:mt-1.5 lg:mt-2">Provisioning Account</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-white/10 p-1.5 sm:p-2 rounded-none sm:rounded-lg text-white hover:bg-white/20 transition-all">
                                <svg className="w-4 h-4 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={submitTenant} className="p-4 sm:p-6 lg:p-8 space-y-3 sm:space-y-5 lg:space-y-6">
                            <div className="p-3 sm:p-4 bg-blue-50 border border-blue-100 rounded-none sm:rounded-lg lg:rounded-xl flex items-start gap-2 sm:gap-3">
                                <svg className="w-4 h-4 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-blue-900 leading-relaxed">
                                    This will email the owner a secure link to choose their password and set up their store details.
                                </p>
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-[8px] sm:text-[9px] lg:text-[10px] font-black text-gray-500 uppercase mb-1.5 sm:mb-2 ml-1 tracking-widest">Owner Full Name</label>
                                    <input type="text" value={data.owner_name} onChange={e => setData('owner_name', e.target.value)} required className="w-full border-gray-100 bg-gray-50 rounded-none sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all py-2.5 sm:py-3 lg:py-3.5 px-3 sm:px-4 lg:px-5 text-xs sm:text-sm font-bold text-gray-900 shadow-sm" placeholder="Juan Dela Cruz" />
                                    {errors.owner_name && <p className="text-red-500 text-[8px] sm:text-[9px] lg:text-[10px] font-black mt-1.5 sm:mt-2 ml-1 uppercase">{errors.owner_name}</p>}
                                </div>
                                <div>
                                    <label className="block text-[8px] sm:text-[9px] lg:text-[10px] font-black text-gray-500 uppercase mb-1.5 sm:mb-2 ml-1 tracking-widest">Email Address</label>
                                    <input type="email" value={data.owner_email} onChange={e => setData('owner_email', e.target.value)} required className="w-full border-gray-100 bg-gray-50 rounded-none sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all py-2.5 sm:py-3 lg:py-3.5 px-3 sm:px-4 lg:px-5 text-xs sm:text-sm font-bold text-gray-900 shadow-sm" placeholder="owner@domain.com" />
                                    {errors.owner_email && <p className="text-red-500 text-[8px] sm:text-[9px] lg:text-[10px] font-black mt-1.5 sm:mt-2 ml-1 uppercase">{errors.owner_email}</p>}
                                </div>
                                <div>
                                    <label className="block text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1.5 sm:mb-2 ml-1 tracking-widest">Assign Plan</label>
                                    <select value={data.plan_id} onChange={e => setData('plan_id', e.target.value)} required className="w-full border-gray-100 bg-gray-50 rounded-none sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all py-3 sm:py-3.5 px-4 sm:px-5 text-xs sm:text-sm font-black text-gray-800 shadow-sm cursor-pointer">
                                        <option value="">Select a billing plan...</option>
                                        {plans.map(p => <option key={p.id} value={p.id}>{p.name} - ₱{parseFloat(p.price).toLocaleString()} ({p.duration_months} mo)</option>)}
                                    </select>
                                    {errors.plan_id && <p className="text-red-500 text-[9px] sm:text-[10px] font-black mt-1.5 sm:mt-2 ml-1 uppercase">{errors.plan_id}</p>}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 lg:pt-6 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="order-2 sm:order-1 flex-1 py-2.5 sm:py-3 lg:py-4 text-gray-500 font-black bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-none sm:rounded-lg lg:rounded-xl uppercase tracking-widest text-[8px] sm:text-[9px] lg:text-[10px] transition-all min-h-11 sm:min-h-12">Discard</button>
                                <button type="submit" disabled={processing} className="order-1 sm:order-2 flex-[2] py-2.5 sm:py-3 lg:py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black rounded-none sm:rounded-lg lg:rounded-xl shadow-lg shadow-blue-100 uppercase tracking-widest text-[8px] sm:text-[9px] lg:text-[10px] transition-all active:scale-[0.98] flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 min-h-11 sm:min-h-12">
                                    {processing ? 'Processing...' : 'Send Invitation'}
                                    {!processing && <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* PROVISION BRANCH MODAL */}
            {showBranchModal && (
                <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-[100] p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-none sm:rounded-lg lg:rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="bg-blue-600 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 flex justify-between items-center sticky top-0 z-10">
                            <div>
                                <h2 className="text-base sm:text-lg lg:text-xl font-black text-white uppercase tracking-widest leading-none">Add Branch</h2>
                                <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-blue-100 uppercase mt-1 sm:mt-1.5 lg:mt-2">Provision Paid Branch for Client</p>
                            </div>
                            <button onClick={() => setShowBranchModal(false)} className="bg-white/10 p-1.5 sm:p-2 rounded-none sm:rounded-lg text-white hover:bg-white/20 transition-all cursor-pointer">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={submitBranch} className="p-4 sm:p-6 lg:p-8 space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1 tracking-widest">Select Tenant Owner</label>
                                <select value={branchData.owner_id} onChange={e => setBranchData('owner_id', e.target.value)} required className="w-full border-gray-100 bg-gray-50 rounded-none sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold text-gray-800 shadow-sm cursor-pointer">
                                    <option value="">Select owner account...</option>
                                    {owners.map(o => <option key={o.id} value={o.id}>{o.name} ({o.email})</option>)}
                                </select>
                                {branchErrors.owner_id && <p className="text-red-500 text-[9px] font-black mt-1 ml-1 uppercase">{branchErrors.owner_id}</p>}
                            </div>

                            <div>
                                <label className="block text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1 tracking-widest">Branch Name</label>
                                <input type="text" value={branchData.branch_name} onChange={e => setBranchData('branch_name', e.target.value)} required className="w-full border-gray-100 bg-gray-50 rounded-none sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold text-gray-900 shadow-sm" placeholder="e.g. Downtown Branch, SM Mall Branch" />
                                {branchErrors.branch_name && <p className="text-red-500 text-[9px] font-black mt-1 ml-1 uppercase">{branchErrors.branch_name}</p>}
                            </div>

                            <div>
                                <label className="block text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1 tracking-widest">Address (Optional)</label>
                                <input type="text" value={branchData.address} onChange={e => setBranchData('address', e.target.value)} className="w-full border-gray-100 bg-gray-50 rounded-none sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold text-gray-900 shadow-sm" placeholder="e.g. 123 Main St, City" />
                            </div>

                            <div>
                                <label className="block text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1 tracking-widest">Phone (Optional)</label>
                                <input type="text" value={branchData.phone} onChange={e => setBranchData('phone', e.target.value)} className="w-full border-gray-100 bg-gray-50 rounded-none sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold text-gray-900 shadow-sm" placeholder="e.g. +63 912 345 6789" />
                            </div>

                            <div>
                                <label className="block text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1 tracking-widest">Assign Plan</label>
                                <select value={branchData.plan_id} onChange={e => setBranchData('plan_id', e.target.value)} required className="w-full border-gray-100 bg-gray-50 rounded-none sm:rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-black text-gray-800 shadow-sm cursor-pointer">
                                    <option value="">Select a billing plan...</option>
                                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} - ₱{parseFloat(p.price).toLocaleString()} ({p.duration_months} mo)</option>)}
                                </select>
                                {branchErrors.plan_id && <p className="text-red-500 text-[9px] font-black mt-1 ml-1 uppercase">{branchErrors.plan_id}</p>}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowBranchModal(false)} className="order-2 sm:order-1 flex-1 py-2.5 sm:py-3 text-gray-500 font-black bg-gray-100 hover:bg-gray-200 rounded-none sm:rounded-lg uppercase tracking-widest text-[9px] sm:text-[10px] transition-all">Discard</button>
                                <button type="submit" disabled={branchProcessing} className="order-1 sm:order-2 flex-[2] py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-none sm:rounded-lg shadow-lg shadow-blue-100 uppercase tracking-widest text-[9px] sm:text-[10px] transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                    {branchProcessing ? 'Creating...' : 'Provision Branch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}