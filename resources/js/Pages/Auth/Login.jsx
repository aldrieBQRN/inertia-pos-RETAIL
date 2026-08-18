import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';

/**
 * Login Component
 * * Handles user authentication and session initiation.
 * * Uses premium dual-panel layout with rich branding, demo credentials, and high-performance UI.
 */
export default function Login({ status, canResetPassword, settings = {} }) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    // Show alert when login fails
    useEffect(() => {
        if (errors.email || errors.password) {
            Swal.fire({
                icon: 'warning',
                title: 'Login Failed',
                text: 'These credentials do not match our records.',
                confirmButtonColor: '#1B3B6A',
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'rounded-lg',
                    confirmButton: 'rounded-lg px-8 py-2.5 font-bold text-sm'
                }
            });
        }
    }, [errors]);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    // Shared Styling Constants
    const inputClasses = "appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] sm:text-sm font-bold text-gray-900 bg-gray-50/50 transition-all";
    const labelClasses = "block text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 mb-1.5";
    const errorClasses = "mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wide";

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white selection:bg-[#1B3B6A] selection:text-white">
            <Head title="Log in" />

            {/* LEFT HERO PANEL (Desktop Only / Top Banner on Mobile) */}
            <div className="lg:col-span-5 xl:col-span-5 bg-gradient-to-br from-[#0E2240] via-[#1B3B6A] to-[#142E54] text-white p-8 sm:p-12 lg:p-12 xl:p-16 flex flex-col justify-between relative overflow-hidden shrink-0 min-h-[220px] sm:min-h-[260px] lg:min-h-screen">
                
                {/* Background Image & Ambient Radial Lighting */}
                <div className="absolute inset-0 pointer-events-none">
                    <img
                        src="/images/auth-bg.png"
                        alt="Background"
                        className="w-full h-full object-cover opacity-25 mix-blend-overlay"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.15)_0%,transparent_60%)]"></div>
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                {/* Top: Branding Header */}
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
                        {settings?.logo_path ? (
                            <img 
                                src={`/storage/${settings.logo_path}`} 
                                alt="Logo" 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/logo.png';
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/10 text-white font-black text-xl sm:text-2xl">
                                {settings?.app_name?.charAt(0) || 'S'}
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-black tracking-widest uppercase text-white drop-shadow-sm">
                            {settings?.app_name || 'InertiaPos'}
                        </h1>
                        <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-widest">
                            Retail & Inventory POS Platform
                        </p>
                    </div>
                </div>

                {/* Center: System Value Proposition */}
                <div className="relative z-10 my-6 lg:my-8 space-y-4 lg:space-y-8 animate-in fade-in slide-in-from-left-6 duration-700">
                    <div className="space-y-2 sm:space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-blue-200 text-xs font-semibold backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Smart Retail POS Solution
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
                            Streamline retail checkout & manage inventory stock effortlessly.
                        </h2>
                        <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed max-w-md">
                            Empower cashiers with rapid barcode checkout, real-time stock sync, drawer cash reconciliations, and comprehensive sales reporting.
                        </p>
                    </div>

                    {/* Feature Badges (Tablet & Desktop) */}
                    <div className="hidden sm:flex flex-col space-y-3 pt-2">
                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-blue-200 shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white">High-Speed POS & Barcode Scanner</h4>
                                <p className="text-[11px] text-blue-200/70">Instant product lookup and quick payments</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-blue-200 shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white">Real-Time Inventory & Stock Alerts</h4>
                                <p className="text-[11px] text-blue-200/70">Automatic quantity sync and low-stock indicators</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Footer (Desktop) */}
                <div className="relative z-10 text-xs text-blue-200/60 hidden lg:block pt-4 border-t border-white/10">
                    &copy; {new Date().getFullYear()} {settings?.app_name || 'POS System'}. All rights reserved.
                </div>
            </div>

            {/* RIGHT FORM PANEL */}
            <div className="lg:col-span-7 xl:col-span-7 bg-white p-6 sm:p-12 lg:p-16 xl:p-20 flex flex-col justify-center relative">
                <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in duration-500">

                    {/* Header */}
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                            Sign In
                        </h2>
                        <p className="mt-1.5 text-sm font-semibold text-gray-500">
                            Enter your credentials to access your store terminal.
                        </p>
                    </div>

                    {/* Demo Quick Login */}
                    <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                Demo Accounts
                            </span>
                            <span className="text-[10px] font-semibold text-gray-400">Click to fill</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setData(prev => ({ ...prev, email: 'admin@email.com', password: 'password' }))}
                                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-[#1B3B6A] hover:bg-blue-50/40 transition-all text-left group shadow-xs active:scale-[0.98]"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 group-hover:bg-[#1B3B6A] group-hover:text-white transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-900 truncate">Store Admin</p>
                                    <p className="text-[10px] text-gray-500 truncate">admin@email.com</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setData(prev => ({ ...prev, email: 'cashier@email.com', password: 'password' }))}
                                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-[#1B3B6A] hover:bg-blue-50/40 transition-all text-left group shadow-xs active:scale-[0.98]"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 group-hover:bg-[#1B3B6A] group-hover:text-white transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-900 truncate">Cashier POS</p>
                                    <p className="text-[10px] text-gray-500 truncate">cashier@email.com</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div className="font-bold text-sm text-emerald-700 text-center bg-emerald-50 p-3.5 rounded-lg border border-emerald-200">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label className={labelClasses}>Email Address</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className={inputClasses}
                                placeholder="e.g. admin@email.com"
                                autoFocus
                                autoComplete="username"
                            />
                            {errors.email && <p className={errorClasses}>{errors.email}</p>}
                        </div>

                        {/* Password Field */}
                        <div className="relative">
                            <label className={labelClasses}>Password</label>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className={inputClasses}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.188-1.583 8.32 8.32 0 013.89.981L19.5 19.5" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                            {errors.password && <p className={errorClasses}>{errors.password}</p>}
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center cursor-pointer group">
                                <div className="relative flex items-center justify-center shrink-0">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-[#1B3B6A] checked:border-[#1B3B6A] transition-all cursor-pointer focus:ring-2 focus:ring-[#1B3B6A] focus:ring-offset-2"
                                    />
                                    <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="ms-2 text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">
                                    Remember me
                                </span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-sm font-bold text-[#1B3B6A] hover:text-[#142E54] transition-colors hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={processing}
                                className={`w-full py-4 bg-[#1B3B6A] hover:bg-[#142E54] text-white font-black text-[12px] uppercase tracking-widest rounded-xl shadow-lg shadow-[#1B3B6A]/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2
                                    ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Signing In...
                                    </>
                                ) : 'Sign In'}
                            </button>
                        </div>
                    </form>

                    {/* Mobile Footer Notice */}
                    <div className="text-center text-xs text-gray-400 lg:hidden pt-4">
                        &copy; {new Date().getFullYear()} {settings?.app_name || 'POS System'}. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}