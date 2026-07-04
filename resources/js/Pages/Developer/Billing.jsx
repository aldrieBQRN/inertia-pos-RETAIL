import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Billing({ auth, plans }) {
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        duration_months: 1,
        price: ''
    });

    const submitPlan = (e) => {
        e.preventDefault();

        Swal.fire({
            title: 'Publishing Plan',
            html: 'Please wait while we set up the new pricing tier...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        post(route('developer.plans.store'), {
            onSuccess: () => {
                reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Plan Created!',
                    text: 'The new pricing tier is now available for new tenants.',
                    confirmButtonColor: '#2563eb'
                });
            },
            onError: () => Swal.close()
        });
    };

    const toggleStatus = (id, currentStatus) => {
        const actionText = currentStatus ? 'Disable' : 'Enable';
        Swal.fire({
            title: `${actionText} Plan?`,
            text: `Are you sure you want to ${actionText.toLowerCase()} this pricing plan?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#dc2626' : '#2563eb',
            cancelButtonColor: '#4b5563',
            confirmButtonText: `Yes, ${actionText} it!`
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Updating Plan...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                router.post(route('developer.plans.toggle-status', id), {}, {
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Updated!',
                            text: `The plan has been ${currentStatus ? 'disabled' : 'enabled'}.`,
                            confirmButtonColor: '#2563eb'
                        });
                    },
                    onError: () => Swal.close()
                });
            }
        });
    };

    // Make the duration look professional (e.g. "12" becomes "Billed Annually")
    const getDurationLabel = (months) => {
        if (months == 1) return 'Billed Monthly';
        if (months == 12) return 'Billed Annually';
        if (months == 24) return 'Billed Every 2 Years';
        return `Billed Every ${months} Months`;
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 uppercase tracking-widest truncate">Billing & Pricing</h2>}
        >
            <Head title="Pricing Plans" />

            <div className="py-6 sm:py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 flex-col-reverse lg:flex-row">

                        {/* --- LEFT COLUMN: ACTIVE PLANS GRID --- */}
                        <div className="lg:col-span-2 space-y-6 sm:space-y-8 order-2 lg:order-1">
                            {plans.length === 0 ? (
                                <div className="bg-white rounded-none sm:rounded-xl border-4 border-dashed border-gray-100 p-12 sm:p-20 text-center animate-in fade-in zoom-in duration-500 border-y sm:border-y-0 w-full">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-tight">No Pricing Plans</h3>
                                    <p className="text-gray-400 text-xs sm:text-sm mt-2 font-medium px-4">Use the form on the right to create your first subscription tier.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                                    {plans.map((p, index) => (
                                        <div key={p.id} className="bg-white p-6 sm:p-8 rounded-none sm:rounded-xl border-2 border-y sm:border-y-0 border-gray-100 hover:border-blue-200 transition-all relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>

                                            {/* Decorative Background Element */}
                                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-in-out pointer-events-none"></div>

                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4 sm:mb-5">
                                                    <h3 className="font-black text-lg sm:text-xl text-gray-900 truncate pr-2">{p.name}</h3>
                                                    <span className={`border text-[8px] sm:text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shrink-0 shadow-sm ${
                                                        p.is_active 
                                                            ? 'bg-green-50 border-green-150 text-green-600' 
                                                            : 'bg-red-50 border-red-150 text-red-600'
                                                    }`}>
                                                        {p.is_active ? 'Active' : 'Disabled'}
                                                    </span>
                                                </div>

                                                <div className="flex items-baseline gap-1 text-blue-600 mb-1.5 sm:mb-2">
                                                    <span className="text-lg sm:text-xl font-bold">₱</span>
                                                    <span className="text-3xl sm:text-4xl font-black tracking-tight truncate">{parseFloat(p.price).toLocaleString()}</span>
                                                </div>

                                                <div className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 sm:mb-8">
                                                    {getDurationLabel(p.duration_months)}
                                                </div>

                                                <div className="border-t border-gray-100 pt-4 sm:pt-5 flex items-center justify-between text-xs sm:text-sm">
                                                    <span className="text-gray-500 font-bold uppercase tracking-tight text-[10px] sm:text-xs">System Access</span>
                                                    <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${p.is_active ? 'text-green-500' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        {p.is_active ? (
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        ) : (
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                                        )}
                                                    </svg>
                                                </div>

                                                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleStatus(p.id, p.is_active)}
                                                        className={`text-[9px] sm:text-[10px] font-black px-3.5 py-1.5 rounded-lg uppercase tracking-widest border transition-all active:scale-[0.98] ${
                                                            p.is_active
                                                                ? 'border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50'
                                                                : 'border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50'
                                                        }`}
                                                    >
                                                        {p.is_active ? 'Disable Plan' : 'Enable Plan'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* --- RIGHT COLUMN: CREATE PLAN FORM --- */}
                        <div className="lg:col-span-1 order-1 lg:order-2">
                            <div className="bg-white rounded-none sm:rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:sticky lg:top-24 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="bg-gray-900 px-6 sm:px-8 py-5 sm:py-6">
                                    <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-widest flex items-center gap-2.5 leading-none">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        Create New Plan
                                    </h2>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-tighter">Pricing Engine</p>
                                </div>

                                <form onSubmit={submitPlan} className="p-6 sm:p-8 space-y-5 sm:space-y-6">
                                    <div>
                                        <label className="block text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1.5 sm:mb-2 ml-1 tracking-widest">Plan Name</label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            placeholder="e.g. Enterprise Annual"
                                            required
                                            className="w-full border-gray-100 bg-gray-50 rounded-none sm:rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all py-3 sm:py-3.5 px-4 sm:px-5 text-xs sm:text-sm font-bold text-gray-900 shadow-sm"
                                        />
                                        {errors.name && <p className="text-red-500 text-[9px] sm:text-[10px] font-black mt-1.5 sm:mt-2 ml-1 uppercase">{errors.name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1.5 sm:mb-2 ml-1 flex justify-between tracking-widest">
                                            <span>Billing Cycle (Months)</span>
                                            <span className="text-blue-600">{data.duration_months} mo</span>
                                        </label>
                                        <div className="flex items-center gap-3 sm:gap-4 p-2">
                                            <input
                                                type="range"
                                                min="1"
                                                max="36"
                                                step="1"
                                                value={data.duration_months}
                                                onChange={e => setData('duration_months', e.target.value)}
                                                className="w-full h-2 sm:h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                            <input
                                                type="number"
                                                min="1"
                                                value={data.duration_months}
                                                onChange={e => setData('duration_months', e.target.value)}
                                                required
                                                className="w-16 sm:w-20 border-gray-100 bg-gray-50 rounded-none sm:rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white font-black text-center shadow-sm py-2 sm:py-2.5 text-xs sm:text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <label className="block text-[9px] sm:text-[10px] font-black text-gray-500 uppercase mb-1.5 sm:mb-2 ml-1 tracking-widest">Total Price (₱)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
                                                <span className="text-gray-500 font-black text-sm sm:text-base">₱</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={data.price}
                                                onChange={e => setData('price', e.target.value)}
                                                placeholder="0.00"
                                                required
                                                className="w-full pl-9 sm:pl-11 pr-4 sm:pr-5 py-3 sm:py-3.5 border-gray-100 bg-gray-50 rounded-none sm:rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-base sm:text-lg font-black text-gray-900 shadow-sm"
                                            />
                                        </div>
                                        {errors.price && <p className="text-red-500 text-[9px] sm:text-[10px] font-black mt-1.5 sm:mt-2 ml-1 uppercase">{errors.price}</p>}
                                    </div>

                                    <div className="pt-4 sm:pt-6 border-t border-gray-100">
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="w-full py-3.5 sm:py-4 bg-blue-600 text-white font-black rounded-none sm:rounded-lg shadow-lg shadow-blue-100 hover:bg-blue-700 uppercase tracking-widest text-[9px] sm:text-[10px] transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
                                        >
                                            {processing ? 'Saving...' : 'Publish Plan'}
                                        </button>
                                        <p className="text-[9px] sm:text-[10px] text-gray-400 text-center mt-3 sm:mt-4 font-bold leading-relaxed px-2">
                                            Once published, this plan will be immediately available when provisioning new tenants.
                                        </p>
                                    </div>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}