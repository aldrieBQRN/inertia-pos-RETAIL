import React from 'react';
import { Head, Link } from '@inertiajs/react'; // <-- Added Link import

export default function SetupSuccess({ message, role }) { // <-- Added role prop
    return (
        <div className="min-h-[100dvh] flex flex-col sm:justify-center relative overflow-x-hidden overflow-y-auto selection:bg-emerald-500 selection:text-white bg-[#0B0F19]">

            {/* FULL-SCREEN BLURRED BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img
                    src="/images/auth-bg.png"
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-[#0B0F19]/60 backdrop-blur-sm"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]"></div>
            </div>

            <Head title="Account Ready!" />

            {/* Header & Animated Icon Section */}
            <div className="flex-1 sm:flex-none flex flex-col justify-center items-center relative z-10 px-4 py-10 sm:py-0 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-700 text-center min-h-[40dvh] sm:min-h-0">

                {/* Premium Glowing Checkmark */}
                <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-30"></div>
                    <div className="relative w-full h-full bg-white text-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] border-2 border-emerald-100">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-12 h-12">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    </div>
                </div>

                <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">
                    Account Ready!
                </h2>
            </div>

            {/* Card Container */}
            <div className="w-full sm:max-w-md mt-auto sm:mt-0 relative z-10 sm:mx-auto bg-white/95 backdrop-blur-xl p-6 pb-12 sm:p-10 rounded-t-2xl sm:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-bottom-8 duration-700 text-center">

                {/* Native App Drag Handle Indicator */}
                <div className="w-12 h-1.5 bg-gray-300/80 rounded-full mx-auto mb-8 sm:hidden shrink-0"></div>

                <p className="text-gray-600 text-sm leading-relaxed mb-8 font-medium px-2">
                    {message || "Your identity has been verified, policies accepted, and your account is completely set up."}
                </p>

                {/* Next Step Box - DYNAMIC BASED ON ROLE */}
                <div className="bg-emerald-50/80 p-6 rounded-lg border border-emerald-100 shadow-inner">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mt-0.5">Next Step</p>
                    </div>

                    {role === 'admin' ? (
                        <div className="space-y-5 animate-in fade-in duration-500">
                            <p className="text-sm font-bold text-emerald-900 leading-relaxed">
                                You may now log in to access the store's administrative dashboard.
                            </p>
                            <Link
                                href={route('login')}
                                className="flex items-center justify-center w-full py-4 bg-emerald-600 text-white font-black text-[12px] uppercase tracking-widest rounded-lg shadow-[0_4px_14px_rgba(16,185,129,0.4)] hover:bg-emerald-700 hover:shadow-[0_6px_20px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all gap-2"
                            >
                                Go to Login
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </Link>
                        </div>
                    ) : (
                        <p className="text-sm font-bold text-emerald-900 leading-relaxed animate-in fade-in duration-500">
                            You may now close this window and log in securely at the store's POS terminal.
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
}