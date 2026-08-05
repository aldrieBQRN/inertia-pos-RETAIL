import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { Head } from '@inertiajs/react';

export default function Edit({ auth, mustVerifyEmail, status }) {
    const user = auth.user;
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Simulate initial loading to show the new skeleton state
    const [loading, setLoading] = useState(true);

    // Helper boolean to check if user has admin privileges
    const isAdmin = user.role === 'super_admin' || user.role === 'admin';

    useEffect(() => {
        // Simulating network request for user data
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

    const getRoleBadge = (role) => {
        const baseClass = "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center justify-center shrink-0 border";
        if (role === 'super_admin') return <span className={`${baseClass} bg-purple-50 text-purple-700 border-purple-200/60`}>Super Admin</span>;
        if (role === 'admin') return <span className={`${baseClass} bg-[#EFF4F9] text-[#1B3B6A] border-[#CBD7E6]`}>Store Admin</span>;
        return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200/60`}>Cashier</span>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Material-style List Row for Mobile / Premium SaaS Row for Desktop
    const InfoRow = ({ icon, label, value }) => (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 sm:py-4 border-b border-gray-100 last:border-0 gap-1 sm:gap-2 active:bg-gray-50 sm:hover:bg-gray-50/50 sm:-mx-8 px-4 sm:px-8 transition-colors">
            <dt className="flex items-center gap-3 text-[13px] sm:text-sm font-medium text-gray-500">
                <div className="text-gray-400">{icon}</div>
                {label}
            </dt>
            <dd className="text-sm sm:text-base font-semibold text-gray-900 sm:text-right break-words pl-7 sm:pl-0">
                {value || <span className="text-gray-400 font-normal italic text-[13px]">Not provided</span>}
            </dd>
        </div>
    );

    // ==========================================
    // NEW SKELETON LOADING STATE
    // ==========================================
    if (loading) return (
        <AuthenticatedLayout user={user} header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">Account Settings</h2>}>
            <Head title="Profile" />
            <div className="py-0 sm:py-8 lg:py-16 bg-gray-100 sm:bg-[#FAFAFA] min-h-[calc(100vh-65px)] sm:min-h-screen">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-2 sm:gap-8 lg:gap-12 items-start animate-pulse">

                        {/* LEFT COLUMN SKELETON */}
                        <div className="lg:col-span-4 space-y-2 sm:space-y-6">
                            <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200/60 p-6 sm:p-8 text-center flex flex-col items-center">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-full mb-3 sm:mb-5"></div>
                                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2 mb-6 sm:mb-8"></div>
                                <div className="w-full space-y-3 sm:space-y-4 border-t border-gray-100 pt-4 sm:pt-0 sm:border-none">
                                    <div className="h-12 bg-gray-100 rounded-md sm:rounded-lg w-full"></div>
                                    <div className="h-12 bg-gray-100 rounded-md sm:rounded-lg w-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN SKELETON */}
                        <div className="lg:col-span-8 space-y-2 sm:space-y-6 lg:space-y-8">
                            <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200/60 overflow-hidden">
                                <div className="px-4 sm:px-8 py-5 border-b border-gray-100/80 flex items-center gap-3">
                                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                                </div>
                                <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
                                    <div className="flex justify-between py-2"><div className="h-4 bg-gray-200 rounded w-24"></div><div className="h-4 bg-gray-200 rounded w-40"></div></div>
                                    <div className="flex justify-between py-2"><div className="h-4 bg-gray-200 rounded w-32"></div><div className="h-4 bg-gray-200 rounded w-24"></div></div>
                                    <div className="flex justify-between py-2"><div className="h-4 bg-gray-200 rounded w-28"></div><div className="h-4 bg-gray-200 rounded w-36"></div></div>
                                </div>
                            </div>

                            <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200/60 overflow-hidden">
                                <div className="px-4 sm:px-8 py-5 border-b border-gray-100/80 flex items-center gap-3">
                                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                                </div>
                                <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
                                    <div className="flex justify-between py-2"><div className="h-4 bg-gray-200 rounded w-24"></div><div className="h-4 bg-gray-200 rounded w-40"></div></div>
                                    <div className="flex justify-between py-2"><div className="h-4 bg-gray-200 rounded w-32"></div><div className="h-4 bg-gray-200 rounded w-32"></div></div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );

    return (
        <AuthenticatedLayout
            user={user}
            header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">Account Settings</h2>}
        >
            <Head title="Profile" />

            <div className="py-0 sm:py-8 lg:py-16 bg-gray-100 sm:bg-[#FAFAFA] min-h-[calc(100vh-65px)] sm:min-h-screen selection:bg-[#1B3B6A] selection:text-white">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-2 sm:gap-8 lg:gap-12 items-start animate-in fade-in sm:slide-in-from-bottom-4 duration-500">

                        {/* LEFT COLUMN: Sticky User Summary Card */}
                        <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-2 sm:space-y-6">
                            <div className="bg-white sm:rounded-2xl sm:shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border border-gray-200/60 p-6 sm:p-8 text-center relative overflow-hidden flex flex-col items-center">

                                {/* Subtle decorative background glow */}
                                <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-[#EFF4F9] to-transparent pointer-events-none"></div>

                                {/* Avatar */}
                                <div className="relative inline-block mb-3 sm:mb-5">
                                    <div className="w-24 h-24 sm:w-32 sm:h-32 sm:ring-4 ring-white sm:shadow-xl bg-white overflow-hidden mx-auto z-10 relative rounded-full border border-gray-200 sm:border-none">
                                        {user.avatar_path ? (
                                            <img src={`/storage/${user.avatar_path}`} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-bold text-3xl sm:text-4xl">
                                                {getInitials(user.name)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute bottom-1 right-1 sm:bottom-3 sm:right-3 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 border-2 border-white rounded-full z-20 shadow-sm" title="Online & Active"></div>
                                </div>

                                {/* User Info */}
                                <div className="space-y-1 sm:space-y-2 mb-6 sm:mb-8 relative z-10 w-full">
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{user.name}</h1>
                                    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2">
                                        {getRoleBadge(user.role)}
                                        <p className="text-[10px] sm:text-[11px] font-bold sm:font-semibold text-gray-400 uppercase tracking-widest mt-1">
                                            ID: #{user.account_number || 'PENDING'}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons - Conditionally Rendered based on Role */}
                                <div className="flex flex-col gap-2 sm:gap-3 relative z-10 w-full max-w-sm mx-auto border-t border-gray-100 sm:border-none pt-4 sm:pt-0">
                                    {isAdmin ? (
                                        <>
                                            <button
                                                onClick={() => setShowProfileModal(true)}
                                                className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 rounded-md sm:rounded-lg bg-[#1B3B6A] hover:bg-[#142E54] text-white font-bold sm:font-semibold text-sm transition-all active:scale-[0.98] shadow-md"
                                            >
                                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                Edit Profile
                                            </button>
                                            <button
                                                onClick={() => setShowPasswordModal(true)}
                                                className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 rounded-md sm:rounded-lg bg-white border border-[#CBD7E6] text-[#1B3B6A] font-bold sm:font-semibold text-sm hover:bg-[#EFF4F9] transition-all active:scale-[0.98] shadow-xs"
                                            >
                                                <svg className="w-4 h-4 shrink-0 text-[#1B3B6A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Security Settings
                                            </button>
                                        </>
                                    ) : (
                                        <div className="bg-gray-50 border border-gray-100 rounded-md p-4 sm:p-5 text-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400 mx-auto mb-2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                            </svg>
                                            <p className="text-[13px] text-gray-600 font-medium leading-relaxed">
                                                <span className="font-bold block text-gray-900 mb-0.5">Restricted Access</span>
                                                Please contact your store administrator to update your profile details or password.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Detail Cards */}
                        <div className="lg:col-span-8 space-y-2 sm:space-y-6 lg:space-y-8 pb-10 sm:pb-0">

                            {/* Section 1: Personal Details */}
                            <div className="bg-white sm:rounded-2xl sm:shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border border-gray-200/60 overflow-hidden">
                                <div className="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-gray-100/80 bg-white">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5 uppercase sm:normal-case tracking-wider sm:tracking-normal text-[11px] sm:text-sm text-gray-500 sm:text-gray-900">
                                        <div className="hidden sm:block p-1.5 bg-[#EFF4F9] text-[#1B3B6A] rounded-md">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        </div>
                                        Personal Information
                                    </h3>
                                </div>
                                <div className="px-0 sm:px-8 pb-0 sm:pb-2">
                                    <dl>
                                        <InfoRow
                                            icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                                            label="Email Address"
                                            value={user.email}
                                        />
                                        <InfoRow
                                            icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                                            label="Phone Number"
                                            value={user.phone_number}
                                        />
                                        <InfoRow
                                            icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                            label="Member Since"
                                            value={formatDate(user.created_at)}
                                        />
                                    </dl>
                                </div>
                            </div>

                            {/* Section 2: Localization */}
                            <div className="bg-white sm:rounded-2xl sm:shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border border-gray-200/60 overflow-hidden">
                                <div className="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-gray-100/80 bg-white">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5 uppercase sm:normal-case tracking-wider sm:tracking-normal text-[11px] sm:text-sm text-gray-500 sm:text-gray-900">
                                        <div className="hidden sm:block p-1.5 bg-[#EFF4F9] text-[#1B3B6A] rounded-md">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        Location & Address
                                    </h3>
                                </div>
                                <div className="px-0 sm:px-8 pb-0 sm:pb-2">
                                    <dl>
                                        <InfoRow
                                            icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                                            label="Street Address"
                                            value={user.address}
                                        />
                                        <InfoRow
                                            icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                                            label="City/Municipality"
                                            value={user.city}
                                        />
                                        <InfoRow
                                            icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
                                            label="Province"
                                            value={user.province}
                                        />
                                        <InfoRow
                                            icon={<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                            label="Country"
                                            value={user.country}
                                        />
                                    </dl>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {isAdmin && (
                <>
                    <UpdateProfileInformationForm
                        isOpen={showProfileModal}
                        onClose={() => setShowProfileModal(false)}
                        user={user}
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />

                    <UpdatePasswordForm
                        isOpen={showPasswordModal}
                        onClose={() => setShowPasswordModal(false)}
                    />
                </>
            )}

        </AuthenticatedLayout>
    );
}