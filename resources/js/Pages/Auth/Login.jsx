import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';

/**
 * Login Component
 * * Handles user authentication and session initiation.
 * * Uses premium glassmorphism UI with a Native Mobile "Bottom Sheet" layout.
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
                confirmButtonColor: '#3b82f6',
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
    const inputClasses = "appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-bold text-gray-900 bg-gray-50/50 transition-all";
    const labelClasses = "block text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 mb-1.5"; // unchanged
    const errorClasses = "mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wide"; // unchanged

    return (
        <div className="min-h-screen flex flex-col sm:justify-center relative overflow-hidden selection:bg-blue-500 selection:text-white bg-gray-900">

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

            <Head title="Log in" />

            {/* Header & Logo Section - Added sm:mb-8 for desktop spacing! */}
            <div className="flex-1 sm:flex-none flex flex-col justify-center items-center relative z-10 px-4 py-8 sm:py-0 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-700 text-center">

                {/* DYNAMIC SYSTEM LOGO */}
                <div className="w-24 h-24 mb-6 bg-white rounded-lg border border-gray-100 shadow-2xl flex items-center justify-center overflow-hidden">
                    {settings?.logo_path ? (
                        <img src={`/storage/${settings.logo_path}`} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white font-black text-3xl">
                            {settings?.app_name?.charAt(0) || 'S'}
                        </div>
                    )}
                </div>

                <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">
                    Welcome Back
                </h2>
                <p className="mt-2 text-sm font-medium text-gray-200 max-w-xs mx-auto leading-relaxed drop-shadow-md">
                    Sign in to manage your store
                </p>
            </div>

            {/* Form Container - Snaps to bottom on mobile, floats on desktop */}
            <div className="w-full sm:max-w-md relative z-10 sm:mx-auto bg-white/95 backdrop-blur-xl p-6 pb-10 sm:p-10 rounded-t-lg sm:rounded-lg shadow-[0_-10px_40px_rgba(0,0,0,0.2)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Native App Drag Handle Indicator (Visible only on mobile) */}
                <div className="w-12 h-1.5 bg-gray-300/80 rounded-full mx-auto mb-6 sm:hidden"></div>


                {status && <div className="mb-6 font-bold text-sm text-emerald-600 text-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">{status}</div>}

                <form onSubmit={submit} className="space-y-5 sm:space-y-6">
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
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between mt-2 px-1">
                        <label className="flex items-center cursor-pointer group">
                            <div className="relative flex items-center justify-center shrink-0">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors hover:underline"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 sm:pt-6 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={processing}
                            className={`w-full py-4 bg-gray-900 text-white font-black text-[12px] uppercase tracking-widest rounded-lg shadow-lg hover:bg-black active:scale-[0.98] transition-all flex justify-center items-center gap-2
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
            </div>
        </div>
    );
}