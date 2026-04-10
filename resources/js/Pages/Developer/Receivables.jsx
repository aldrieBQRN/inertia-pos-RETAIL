import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Receivables({ auth, overdue, upcoming }) {

    const handleRemind = (store) => {
        Swal.fire({
            title: 'Send Bill?',
            text: `Email renewal link to ${store.name}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Send Now'
        }).then((result) => {
            if (result.isConfirmed) router.post(route('developer.stores.remind', store.id));
        });
    };

    const daysLeft = (date) => {
        const diff = new Date(date) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const StoreCard = ({ store, isOverdue }) => (
        <div className={`bg-white p-5 rounded-2xl shadow-sm border-2 flex flex-col md:flex-row justify-between items-center gap-4 ${isOverdue ? 'border-red-100' : 'border-blue-50'}`}>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-gray-900">{store.name}</h3>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${isOverdue ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                        {isOverdue ? 'Overdue' : 'Due Soon'}
                    </span>
                </div>
                <div className="text-xs text-gray-500 font-bold uppercase mt-1">
                    {store.users?.[0]?.name} • {store.users?.[0]?.email}
                </div>
                <div className={`text-xs mt-2 font-black ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>
                    {isOverdue
                        ? `Expired ${Math.abs(daysLeft(store.subscription_ends_at))} days ago`
                        : `Expires in ${daysLeft(store.subscription_ends_at)} days`}
                    ({new Date(store.subscription_ends_at).toLocaleDateString()})
                </div>
            </div>
            <div className="text-right px-6 border-x border-gray-100 hidden md:block">
                <div className="text-xl font-black text-gray-900">₱{parseFloat(store.plan?.price || 0).toLocaleString()}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{store.plan?.name}</div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => handleRemind(store)} className="flex-1 md:w-32 bg-gray-900 text-white py-2.5 rounded-xl text-xs font-black uppercase shadow-md hover:bg-black transition-all">
                    Send Bill
                </button>
            </div>
        </div>
    );

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800">Account Receivables</h2>}>
            <Head title="Receivables" />

            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

                    {/* OVERDUE SECTION */}
                    <div>
                        <h2 className="text-xl font-black text-red-600 mb-4 flex items-center gap-2">
                            <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
                            Overdue Payments ({overdue.length})
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {overdue.length === 0 ? (
                                <div className="p-10 bg-white rounded-2xl border-2 border-dashed text-center text-gray-400 font-bold">No overdue accounts. Great job!</div>
                            ) : (
                                overdue.map(s => <StoreCard key={s.id} store={s} isOverdue={true} />)
                            )}
                        </div>
                    </div>

                    {/* UPCOMING SECTION */}
                    <div>
                        <h2 className="text-xl font-black text-blue-600 mb-4 flex items-center gap-2">
                            Upcoming Renewals (Next 5 Days)
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {upcoming.length === 0 ? (
                                <div className="p-10 bg-white rounded-2xl border-2 border-dashed text-center text-gray-400 font-bold">No renewals in the next 5 days.</div>
                            ) : (
                                upcoming.map(s => <StoreCard key={s.id} store={s} isOverdue={false} />)
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}