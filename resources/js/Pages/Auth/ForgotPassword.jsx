import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

/**
 * Forgot Password Component
 * Handles password reset via OTP verification
 * Uses same premium glassmorphism style as Login
 */
export default function ForgotPassword({ status, settings = {} }) {
    const [step, setStep] = useState('email'); // 'email' or 'otp'
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
    const inputClasses = "appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-bold text-gray-900 bg-gray-50/50 transition-all";
    const labelClasses = "block text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 mb-1.5";
    const errorClasses = "mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wide";

    const CheckIcon = () => <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
    const DotIcon = () => <svg className="w-4 h-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="4" fill="currentColor" /></svg>

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
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'rounded-lg',
                    confirmButton: 'rounded-lg px-8 py-2.5 font-bold text-sm'
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
                        popup: 'rounded-lg',
                        confirmButton: 'rounded-lg px-8 py-2.5 font-bold text-sm'
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
                confirmButtonColor: '#3b82f6',
                customClass: {
                    popup: 'rounded-lg',
                    confirmButton: 'rounded-lg px-8 py-2.5 font-bold text-sm'
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
                        popup: 'rounded-lg',
                        confirmButton: 'rounded-lg px-8 py-2.5 font-bold text-sm'
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
                confirmButtonColor: '#3b82f6',
                customClass: {
                    popup: 'rounded-lg',
                    confirmButton: 'rounded-lg px-8 py-2.5 font-bold text-sm'
                }
            });
            return;
        }

        if (!isPasswordStrong) {
            Swal.fire({
                icon: 'error',
                title: 'Weak Password',
                text: 'Please make sure your password meets all the security requirements (green checkmarks) before continuing.',
                confirmButtonColor: '#ef4444',
                customClass: {
                    popup: 'rounded-lg',
                    confirmButton: 'rounded-lg px-8 py-2.5 font-bold text-sm'
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
                confirmButtonColor: '#3b82f6',
                customClass: {
                    popup: 'rounded-lg',
                    confirmButton: 'rounded-lg px-8 py-2.5 font-bold text-sm'
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
                        popup: 'rounded-lg',
                        confirmButton: 'rounded-lg px-8 py-2.5 font-bold text-sm'
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to reset password. Please try again.',
                    confirmButtonColor: '#ef4444',
                    customClass: {
                        popup: 'rounded-lg',
                        confirmButton: 'rounded-lg px-8 py-2.5 font-bold text-sm'
                    }
                });
            }
        }
    };

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

            <Head title="Reset Password" />

            {/* Header & Logo Section */}
            <div className="flex-1 sm:flex-none flex flex-col justify-center items-center relative z-10 px-4 py-6 sm:py-0 sm:mb-2 animate-in fade-in slide-in-from-top-4 duration-700 text-center">

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
                    Reset Password
                </h2>
                <p className="mt-1 text-sm font-medium text-gray-200 max-w-xs mx-auto leading-relaxed drop-shadow-md">
                    {step === 'email' && 'Enter your email to receive a verification code'}
                    {step === 'otp' && 'Enter the 6-digit code sent to your email'}
                    {step === 'password' && 'Create a new password for your account'}
                </p>
            </div>

            {/* Form Container */}
            <div className="w-full sm:max-w-md relative z-10 sm:mx-auto bg-white/95 backdrop-blur-xl p-6 pb-8 sm:p-10 sm:pb-8 rounded-t-lg sm:rounded-lg shadow-[0_-10px_40px_rgba(0,0,0,0.2)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Native App Drag Handle Indicator */}
                <div className="w-12 h-1.5 bg-gray-300/80 rounded-full mx-auto mb-6 sm:hidden"></div>

                {status && <div className="mb-6 font-bold text-sm text-emerald-600 text-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">{status}</div>}

                {/* STEP 1: EMAIL */}
                {step === 'email' && (
                    <form onSubmit={handleSendOtp} className="space-y-5 sm:space-y-6">
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

                        <div className="pt-4 sm:pt-6 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={isSendingOtp}
                                className={`w-full py-4 bg-blue-600 text-white font-black text-[12px] uppercase tracking-widest rounded-lg shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2
                                    ${isSendingOtp ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSendingOtp ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Sending...
                                    </>
                                ) : 'Send Verification Code'}
                            </button>
                        </div>

                        <div className="text-center text-sm -mb-4 sm:mb-0">
                            <p className="text-gray-600">Remember your password?
                                <Link href={route('login')} className="ml-1 font-bold text-blue-600 hover:text-blue-800 transition-colors hover:underline">
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </form>
                )}

                {/* STEP 2: OTP VERIFICATION */}
                {step === 'otp' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-5 sm:space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <p className="text-xs text-blue-800 font-semibold">
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

                        <div className="pt-4 sm:pt-6 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={isVerifyingOtp}
                                className={`w-full py-4 bg-blue-600 text-white font-black text-[12px] uppercase tracking-widest rounded-lg shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2
                                    ${isVerifyingOtp ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isVerifyingOtp ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Verifying...
                                    </>
                                ) : 'Verify Code'}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setStep('email');
                                setData({...data, otp_code: ''});
                            }}
                            className="w-full text-center text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors py-2 -mb-4 sm:-mb-6"
                        >
                            ← Back to Email
                        </button>
                    </form>
                )}

                {/* STEP 3: PASSWORD RESET */}
                {step === 'password' && (
                    <form onSubmit={handleResetPassword} className="space-y-5 sm:space-y-6">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
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

                        {/* Password Strength Checklist */}
                        <div className="mt-2 p-4 rounded-lg bg-gray-50 border border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-6 sm:items-center justify-center">
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
                                className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showConfirmPassword ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.188-1.583 8.32 8.32 0 013.89.981L19.5 19.5" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                            {errors.password_confirmation && <p className={errorClasses}>{errors.password_confirmation}</p>}
                        </div>

                        <div className="pt-4 sm:pt-6 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={isResettingPassword}
                                className={`w-full py-4 bg-emerald-600 text-white font-black text-[12px] uppercase tracking-widest rounded-lg shadow-lg hover:bg-emerald-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2
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
            </div>
        </div>
    );
}
