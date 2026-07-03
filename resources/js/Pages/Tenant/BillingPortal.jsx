import React, { useState, useEffect } from 'react';
import BillingLayout from '@/Layouts/BillingLayout';
import { Head, useForm, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

const renderPaymentIcon = (type, fallbackIcon) => {
    const t = type?.toLowerCase();
    if (t === 'gcash') {
        return (
            <span className="inline-flex items-center justify-center bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded tracking-tighter uppercase leading-none select-none shrink-0">
                GCash
            </span>
        );
    }
    if (t === 'maya') {
        return (
            <span className="inline-flex items-center justify-center bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded tracking-tighter uppercase leading-none select-none shrink-0">
                Maya
            </span>
        );
    }
    return <span className="text-xl shrink-0">{fallbackIcon || '📱'}</span>;
};

export default function BillingPortal({ auth, store, plans, pendingPayment, history, paymentMethods }) {
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethods?.[0] || null);

    // Default selection to current plan or the first available plan
    const [selectedPlan, setSelectedPlan] = useState(
        plans.find(p => p.id === store.plan_id) || plans[0]
    );

    // --- REAL-TIME STATUS POLLING (5 SECONDS) ---
    useEffect(() => {
        if (!pendingPayment) return;

        const interval = setInterval(() => {
            router.reload({
                only: ['pendingPayment', 'history', 'store'],
                preserveScroll: true,
                preserveState: true
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [pendingPayment]);

    const { data, setData, post, processing, errors, reset } = useForm({
        plan_id: selectedPlan?.id || '',
        amount: selectedPlan?.price || '',
        reference_number: '',
        receipt: null,
        terms: false,
    });

    // Handle plan selection
    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
        setData(prev => ({
            ...prev,
            plan_id: plan.id,
            amount: plan.price
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setData('receipt', file);
        if (file) setImagePreview(URL.createObjectURL(file));
        else setImagePreview(null);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('tenant.billing.submit'), {
            onSuccess: () => {
                Swal.fire({
                    title: 'Payment Submitted',
                    text: 'Your renewal request is now being verified by our team.',
                    icon: 'success',
                    confirmButtonColor: '#2563eb',
                });
                reset();
                setImagePreview(null);
            },
        });
    };

    // Calculate New Estimated Expiry
    const calculateNewExpiry = () => {
        const currentExpiry = new Date(store.subscription_ends_at);
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        const newDate = new Date(baseDate);
        newDate.setMonth(newDate.getMonth() + (selectedPlan?.duration_months || 0));
        return newDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    return (
        <BillingLayout storeName={store.name}>
            <Head title="Subscription Renewal" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-10">

                {/* --- LEFT COLUMN: PLAN SELECTION & STATUS --- */}
                <div className="flex-1 space-y-8">

                    {/* EXPIRATION STATUS CARD */}
                    <div className={`p-8 rounded-2xl border shadow-sm bg-white ${!store.status ? 'border-red-200 ring-4 ring-red-50' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Expiration</h3>
                                <p className={`text-2xl font-black tracking-tight ${!store.status ? 'text-red-600' : 'text-gray-900'}`}>
                                    {new Date(store.subscription_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${store.status ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-100 text-red-600 border-red-200'}`}>
                                {store.status ? 'Account Active' : 'Account Suspended'}
                            </div>
                        </div>

                        {!store.status && (
                            <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 italic">
                                Access restricted. Renew now to restore POS and Dashboard services.
                            </p>
                        )}
                    </div>

                    {/* STEP 1: SELECT RENEWAL PLAN */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black">1</span>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Renewal Plan</h3>
                            </div>
                            {selectedPlan && (
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg">
                                    New Expiry: {calculateNewExpiry()}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {plans.map((plan) => (
                                <button
                                    key={plan.id}
                                    type="button"
                                    disabled={!!pendingPayment}
                                    onClick={() => handlePlanSelect(plan)}
                                    className={`relative p-6 rounded-2xl border-2 text-left transition-all group ${
                                        selectedPlan?.id === plan.id
                                        ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100 shadow-lg'
                                        : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'
                                    } ${!!pendingPayment ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                                            selectedPlan?.id === plan.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {plan.duration_months} Month(s)
                                        </span>
                                        {store.plan_id === plan.id && (
                                            <span className="text-[10px] font-bold text-blue-600 italic">Current</span>
                                        )}
                                    </div>
                                    <h4 className="text-xl font-black text-gray-900 leading-tight">{plan.name}</h4>
                                    <div className="text-2xl font-black text-blue-600 mt-1 tracking-tight">
                                        ₱{parseFloat(plan.price).toLocaleString()}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* HISTORY TABLE */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Recent History</h3>
                        {history.length === 0 ? (
                            <p className="text-xs font-bold text-gray-300 uppercase italic py-4 text-center">No transactions found.</p>
                        ) : (
                            <div className="space-y-3">
                                {history.map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
                                        <div>
                                            <p className="text-sm font-black text-gray-900 italic">{new Date(item.created_at).toLocaleDateString()}</p>
                                            <p className="text-[9px] text-gray-400 font-mono uppercase">Ref: {item.reference_number}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-gray-900">₱{parseFloat(item.amount).toLocaleString()}</p>
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${item.status === 'approved' ? 'text-green-600' : 'text-orange-500'}`}>{item.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT COLUMN: PAYMENT ENGINE --- */}
                <div className="flex-1">
                    {pendingPayment ? (
                        /* STATE: UNDER REVIEW (With Dynamic Status Check) */
                        <div className="bg-white p-12 rounded-2xl shadow-xl border border-orange-100 text-center flex flex-col justify-center items-center h-full">
                            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                                <svg className="w-10 h-10 text-orange-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2 text-orange-600 italic">
                                Verification Pending
                            </h2>

                            <p className="text-gray-500 text-sm mb-8 leading-relaxed px-6">
                                We've received your payment of <strong>₱{parseFloat(pendingPayment.amount).toLocaleString()}</strong>.

                                {store.status ? (
                                    <span> Your subscription will be <strong>extended</strong> automatically as soon as our team confirms the transfer. Thank you for renewing early!</span>
                                ) : (
                                    <span> Your account will automatically <strong>reactivate</strong> and restore access once our team confirms the transfer.</span>
                                )}
                            </p>

                            <div className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                                {store.status
                                    ? "You still have full access to the system while we verify."
                                    : "Verification is usually completed within 1 hour."
                                }
                            </div>
                        </div>
                    ) : (
                        /* STATE: UPLOAD FORM */
                        <div className="bg-white p-10 shadow-2xl rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-3 mb-8">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black">2</span>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Payment Submission</h3>
                            </div>

                            <div className="mb-8 p-8 bg-gray-900 rounded-3xl text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Transfer Exactly</span>
                                    <div className="text-5xl font-black mt-2 mb-6 tracking-tighter italic">₱{parseFloat(selectedPlan?.price || 0).toLocaleString()}</div>

                                    {/* Payment Method Details */}
                                    <div className="space-y-2 border-t border-white/10 pt-4 text-xs font-bold opacity-80 uppercase tracking-tight">
                                        <div className="flex justify-between"><span>{selectedPaymentMethod?.label} Number</span> <span>{selectedPaymentMethod?.number}</span></div>
                                        <div className="flex justify-between"><span>Account Name</span> <span>{selectedPaymentMethod?.name}</span></div>
                                    </div>

                                    {/* Payment Method Selector */}
                                    {paymentMethods && paymentMethods.length > 1 && (
                                        <div className="mt-6 pt-6 border-t border-white/10">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">Other Payment Methods</p>
                                            <div className="space-y-2">
                                                {paymentMethods.map((method) => (
                                                    <button
                                                        key={method.type}
                                                        type="button"
                                                        onClick={() => setSelectedPaymentMethod(method)}
                                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-tight transition-all ${
                                                            selectedPaymentMethod?.type === method.type
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-white/10 hover:bg-white/20 text-white'
                                                        }`}
                                                    >
                                                        <span>{method.label}</span>
                                                        {renderPaymentIcon(method.type, method.icon)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <form className="space-y-5" onSubmit={submit}>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Reference Number</label>
                                    <input type="text" value={data.reference_number} onChange={e => setData('reference_number', e.target.value)} required placeholder="12-digit Ref No." className="block w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-mono text-gray-900 focus:bg-white focus:ring-blue-500 shadow-inner" />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Upload Receipt Image</label>
                                    <input type="file" accept="image/*" onChange={handleFileChange} required className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer" />

                                    {imagePreview && (
                                        <div className="mt-4 p-2 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl relative overflow-hidden">
                                            <img src={imagePreview} alt="Receipt" className="max-h-56 w-full object-contain rounded-2xl" />
                                            <button type="button" onClick={() => { setImagePreview(null); setData('receipt', null); }} className="absolute top-4 right-4 bg-gray-900/80 text-white p-2 rounded-full shadow-lg hover:bg-red-600">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-start gap-4 p-5 bg-blue-50/30 rounded-2xl border border-blue-50 mt-4">
                                    <input type="checkbox" checked={data.terms} onChange={e => setData('terms', e.target.checked)} required className="mt-1 w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 cursor-pointer" />
                                    <label className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase tracking-tight cursor-pointer">
                                        I certify that I am renewing the {selectedPlan?.name} and that the information provided is accurate.
                                    </label>
                                </div>

                                <button type="submit" disabled={processing || !data.terms} className="w-full py-5 rounded-2xl shadow-xl shadow-blue-100 text-xs font-black uppercase tracking-[0.2em] text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all transform active:scale-[0.98]">
                                    {processing ? 'Processing...' : `Submit Payment for ${selectedPlan?.name}`}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </BillingLayout>
    );
}