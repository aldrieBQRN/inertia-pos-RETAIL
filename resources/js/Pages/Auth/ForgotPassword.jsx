import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

/**
 * Forgot Password Component
 * Handles password reset via OTP verification
 * Uses same premium split-screen hero layout matching Login
 */
export default function ForgotPassword({ status, settings = {} }) {
    const [step, setStep] = useState('email'); // 'email', 'otp', or 'password'
    const [userEmail, setUserEmail] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [data, setData] = useState({
        email: '',
        otp_code: '',
        password: '',
        password_confirmation: '',
    });
    const [errors, setErrors] = useState({});

    const setError = (field, message) => {
        setErrors(prev => ({
            ...prev,
            [field]: message
        }));
    };

    // Password strength validation
    const hasMinLength = data.password.length >= 8;
    const hasUpperLower = /[A-Z]/.test(data.password) && /[a-z]/.test(data.password);
    const hasNumberSymbol = /[0-9]/.test(data.password) && /[^A-Za-z0-9]/.test(data.password);
    const isPasswordStrong = hasMinLength && hasUpperLower && hasNumberSymbol;

    // Shared Styling Constants
    const inputClasses = "appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-none shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] sm:text-sm font-bold text-gray-900 bg-gray-50/50 transition-all";
    const labelClasses = "block text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 mb-1.5";
    const errorClasses = "mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wide";

    const CheckIcon = () => <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
    const DotIcon = () => <svg className="w-4 h-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="4" fill="currentColor" /></svg>;

    // STEP 1: Send OTP to email
    const handleSendOtp = async (e) => {
        e.preventDefault();

        if (!data.email) {
            setError('email', 'Email address is required');
            return;
        }

        try {
            setIsSendingOtp(true);
            const response = await axios.post('/forgot-password/send-otp', {
                email: data.email
            });

            setUserEmail(data.email);
            setStep('otp');

            Swal.fire({
                icon: 'success',
                title: 'OTP Sent!',
                text: `A 6-digit verification code has been sent to ${data.email}`,
                confirmButtonColor: '#1B3B6A',
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'rounded-none',
                    confirmButton: 'rounded-none px-8 py-2.5 font-bold text-sm'
                }
            });
        } catch (error) {
            setIsSendingOtp(false);

            if (error.response?.status === 422 && error.response?.data?.errors?.email) {
                setError('email', error.response.data.errors.email[0]);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'Failed to send OTP. Please try again.',
                    confirmButtonColor: '#ef4444',
                    customClass: {
                        popup: 'rounded-none',
                        confirmButton: 'rounded-none px-8 py-2.5 font-bold text-sm'
                    }
                });
            }
        } finally {
            setIsSendingOtp(false);
        }
    };

    // STEP 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();

        if (!data.otp_code) {
            setError('otp_code', 'Verification code is required');
            return;
        }

        try {
            setIsVerifyingOtp(true);
            const response = await axios.post('/forgot-password/verify-otp', {
                email: data.email,
                code: data.otp_code
            });

            setStep('password');

            Swal.fire({
                icon: 'success',
                title: 'Verified!',
                text: 'You can now set a new password.',
                confirmButtonColor: '#1B3B6A',
                customClass: {
                    popup: 'rounded-none',
                    confirmButton: 'rounded-none px-8 py-2.5 font-bold text-sm'
                }
            });
        } catch (error) {
            setIsVerifyingOtp(false);

            if (error.response?.status === 422 && error.response?.data?.message) {
                setError('otp_code', error.response.data.message);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Verification Failed',
                    text: 'The code you entered is invalid or expired.',
                    confirmButtonColor: '#ef4444',
                    customClass: {
                        popup: 'rounded-none',
                        confirmButton: 'rounded-none px-8 py-2.5 font-bold text-sm'
                    }
                });
            }
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // STEP 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!data.password || !data.password_confirmation) {
            Swal.fire({
                icon: 'warning',
                title: 'Complete the form',
                text: 'Please fill in all password fields',
                confirmButtonColor: '#1B3B6A',
                customClass: {
                    popup: 'rounded-none',
                    confirmButton: 'rounded-none px-8 py-2.5 font-bold text-sm'
                }
            });
            return;
        }

        if (!isPasswordStrong) {
            Swal.fire({
                icon: 'error',
                title: 'Weak Password',
                text: 'Please make sure your password meets all security requirements (green checkmarks) before continuing.',
                confirmButtonColor: '#ef4444',
                customClass: {
                    popup: 'rounded-none',
                    confirmButton: 'rounded-none px-8 py-2.5 font-bold text-sm'
                }
            });
            return;
        }

        if (data.password !== data.password_confirmation) {
            setError('password_confirmation', 'Passwords do not match');
            return;
        }

        try {
            setIsResettingPassword(true);
            const response = await axios.post('/forgot-password/reset', {
                email: data.email,
                password: data.password,
                password_confirmation: data.password_confirmation,
            });

            Swal.fire({
                icon: 'success',
                title: 'Password Reset!',
                text: 'Your password has been successfully reset. Redirecting to login...',
                confirmButtonColor: '#1B3B6A',
                customClass: {
                    popup: 'rounded-none',
                    confirmButton: 'rounded-none px-8 py-2.5 font-bold text-sm'
                }
            }).then(() => {
                window.location.href = '/login';
            });
        } catch (error) {
            setIsResettingPassword(false);

            if (error.response?.status === 422 && error.response?.data?.message) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response.data.message,
                    confirmButtonColor: '#ef4444',
                    customClass: {
                        popup: 'rounded-none',
                        confirmButton: 'rounded-none px-8 py-2.5 font-bold text-sm'
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to reset password. Please try again.',
                    confirmButtonColor: '#ef4444',
                    customClass: {
                        popup: 'rounded-none',
                        confirmButton: 'rounded-none px-8 py-2.5 font-bold text-sm'
                    }
                });
            }
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white selection:bg-[#1B3B6A] selection:text-white">
            <Head title="Reset Password" />

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
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-md rounded-none border border-white/20 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
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
                            Account Recovery & Protection
                        </p>
                    </div>
                </div>

                {/* Center: System Value Proposition */}
                <div className="relative z-10 my-6 lg:my-8 space-y-4 lg:space-y-8 animate-in fade-in slide-in-from-left-6 duration-700">
                    <div className="space-y-2 sm:space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-white/10 border border-white/15 text-blue-200 text-xs font-semibold backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Secure Account Recovery
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
                            Recover your access safely with OTP verification.
                        </h2>
                        <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed max-w-md">
                            Protecting store management data and account credentials with end-to-end encrypted security checks.
                        </p>
                    </div>

                    {/* Feature Badges (Tablet & Desktop) */}
                    <div className="hidden sm:flex flex-col space-y-3 pt-2">
                        <div className="flex items-center gap-3 p-3.5 rounded-none bg-white/5 border border-white/10 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-none bg-white/10 flex items-center justify-center text-blue-200 shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white">256-bit Security Verification</h4>
                                <p className="text-[11px] text-blue-200/70">Single-use 6-digit email OTP codes</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3.5 rounded-none bg-white/5 border border-white/10 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-none bg-white/10 flex items-center justify-center text-blue-200 shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white">Instant Account Protection</h4>
                                <p className="text-[11px] text-blue-200/70">Automated session expiry and quick reset</p>
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
                            {step === 'email' && 'Reset Password'}
                            {step === 'otp' && 'Verify Security Code'}
                            {step === 'password' && 'Set New Password'}
                        </h2>
                        <p className="mt-1.5 text-sm font-semibold text-gray-500">
                            {step === 'email' && 'Enter your email address to receive a 6-digit verification code.'}
                            {step === 'otp' && 'Enter the 6-digit verification code sent to your email.'}
                            {step === 'password' && 'Create a new strong password for your store account.'}
                        </p>
                    </div>

                    {status && (
                        <div className="font-bold text-sm text-emerald-700 text-center bg-emerald-50 p-3.5 rounded-none border border-emerald-200">
                            {status}
                        </div>
                    )}

                    {/* STEP 1: EMAIL */}
                    {step === 'email' && (
                        <form onSubmit={handleSendOtp} className="space-y-5">
                            <div>
                                <label className={labelClasses}>Email Address</label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData({...data, email: e.target.value})}
                                    className={inputClasses}
                                    placeholder="e.g. admin@email.com"
                                    autoFocus
                                    autoComplete="email"
                                />
                                {errors.email && <p className={errorClasses}>{errors.email}</p>}
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={isSendingOtp}
                                    className={`w-full py-4 bg-[#1B3B6A] hover:bg-[#142E54] text-white font-black text-[12px] uppercase tracking-widest rounded-none shadow-lg shadow-[#1B3B6A]/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 cursor-pointer
                                        ${isSendingOtp ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSendingOtp ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Sending Code...
                                        </>
                                    ) : 'Send Verification Code'}
                                </button>
                            </div>

                            <div className="text-center text-sm pt-2">
                                <p className="text-gray-600">Remember your password?
                                    <Link href={route('login')} className="ml-1.5 font-bold text-[#1B3B6A] hover:text-[#142E54] transition-colors hover:underline">
                                        Sign In
                                    </Link>
                                </p>
                            </div>
                        </form>
                    )}

                    {/* STEP 2: OTP VERIFICATION */}
                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div className="bg-[#EFF4F9] border border-[#CBD7E6] rounded-none p-4">
                                <p className="text-xs text-[#1B3B6A] font-semibold">
                                    Verification code sent to <strong>{userEmail}</strong>
                                </p>
                            </div>

                            <div>
                                <label className={labelClasses}>Verification Code</label>
                                <input
                                    type="text"
                                    value={data.otp_code}
                                    onChange={(e) => setData({...data, otp_code: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                                    className={inputClasses}
                                    placeholder="000000"
                                    autoFocus
                                    maxLength="6"
                                    inputMode="numeric"
                                />
                                {errors.otp_code && <p className={errorClasses}>{errors.otp_code}</p>}
                                <p className="text-[10px] text-gray-500 mt-2 ml-1">Enter the 6-digit code from your email</p>
                            </div>

                            <div className="pt-4 border-t border-gray-100 space-y-3">
                                <button
                                    type="submit"
                                    disabled={isVerifyingOtp}
                                    className={`w-full py-4 bg-[#1B3B6A] hover:bg-[#142E54] text-white font-black text-[12px] uppercase tracking-widest rounded-none shadow-lg shadow-[#1B3B6A]/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 cursor-pointer
                                        ${isVerifyingOtp ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isVerifyingOtp ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Verifying...
                                        </>
                                    ) : 'Verify Code'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('email');
                                        setData({...data, otp_code: ''});
                                    }}
                                    className="w-full text-center text-sm font-semibold text-gray-600 hover:text-[#1B3B6A] transition-colors py-2 cursor-pointer"
                                >
                                    ← Back to Email
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 3: PASSWORD RESET */}
                    {step === 'password' && (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-none p-4">
                                <p className="text-xs text-emerald-800 font-semibold">
                                    ✓ Email verified successfully!
                                </p>
                            </div>

                            {/* New Password Field */}
                            <div className="relative">
                                <label className={labelClasses}>New Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={data.password}
                                    onChange={(e) => setData({...data, password: e.target.value})}
                                    className={inputClasses}
                                    placeholder="Enter new password"
                                    autoFocus
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.188-1.583 8.32 8.32 0 013.89.981L19.5 19.5" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                                {errors.password && <p className={errorClasses}>{errors.password}</p>}
                            </div>

                            {/* Password Strength Checklist */}
                            <div className="p-4 rounded-none bg-gray-50 border border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-6 sm:items-center justify-center">
                                <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${hasMinLength ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {hasMinLength ? <CheckIcon /> : <DotIcon />}
                                    8+ Characters
                                </div>
                                <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${hasUpperLower ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {hasUpperLower ? <CheckIcon /> : <DotIcon />}
                                    Upper & Lowercase
                                </div>
                                <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${hasNumberSymbol ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {hasNumberSymbol ? <CheckIcon /> : <DotIcon />}
                                    Number & Symbol
                                </div>
                            </div>

                            {/* Confirm Password Field */}
                            <div className="relative">
                                <label className={labelClasses}>Confirm Password</label>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={data.password_confirmation}
                                    onChange={(e) => setData({...data, password_confirmation: e.target.value})}
                                    className={inputClasses}
                                    placeholder="Re-enter password"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                >
                                    {showConfirmPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.188-1.583 8.32 8.32 0 013.89.981L19.5 19.5" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                                {errors.password_confirmation && <p className={errorClasses}>{errors.password_confirmation}</p>}
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={isResettingPassword}
                                    className={`w-full py-4 bg-[#1B3B6A] hover:bg-[#142E54] text-white font-black text-[12px] uppercase tracking-widest rounded-none shadow-lg shadow-[#1B3B6A]/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 cursor-pointer
                                        ${isResettingPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isResettingPassword ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Resetting...
                                        </>
                                    ) : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Mobile Footer Notice */}
                    <div className="text-center text-xs text-gray-400 lg:hidden pt-4">
                        &copy; {new Date().getFullYear()} {settings?.app_name || 'POS System'}. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}
