import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Setup({ user, submitUrl, settings = {} }) {
    const [currentStep, setCurrentStep] = useState(1);

    // Separate states for each password field toggle
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Legal Modals state
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        store_name: '',
        store_phone: '',
        store_address: '',
        user_phone: '',
        user_address: '',
        user_city: '',
        user_province: '',
        user_country: '',
        password: '',
        password_confirmation: '',
        terms: false,
    });

    // Real-time password strength validation variables
    const hasMinLength = data.password.length >= 8;
    const hasUpperLower = /[A-Z]/.test(data.password) && /[a-z]/.test(data.password);
    const hasNumberSymbol = /[0-9]/.test(data.password) && /[^A-Za-z0-9]/.test(data.password);
    const isPasswordStrong = hasMinLength && hasUpperLower && hasNumberSymbol;

    const handleNext = () => {
        if (currentStep === 1 && (!data.store_name || !data.store_phone || !data.store_address)) {
            return Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please complete all Workspace details.', confirmButtonColor: '#0f172a', customClass: { popup: 'rounded-3xl' } });
        }
        if (currentStep === 2 && (!data.user_phone || !data.user_address || !data.user_city || !data.user_province || !data.user_country)) {
            return Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please complete all Personal details.', confirmButtonColor: '#0f172a', customClass: { popup: 'rounded-3xl' } });
        }
        setCurrentStep((prev) => prev + 1);
    };

    const handleBack = () => setCurrentStep((prev) => prev - 1);

    const submit = (e) => {
        e.preventDefault();

        // GUARD: Prevent accidental submission if not on the final step
        if (currentStep !== 3) return;

        // STRICT GUARD: Enforce Strong Password
        if (!isPasswordStrong) {
            return Swal.fire({
                icon: 'error',
                title: 'Weak Password',
                text: 'Please make sure your password meets all the security requirements (green checkmarks) before continuing.',
                confirmButtonColor: '#0f172a',
                customClass: { popup: 'rounded-3xl' }
            });
        }

        // STRICT GUARD: Password Mismatch
        if (data.password !== data.password_confirmation) {
            return Swal.fire({
                icon: 'error',
                title: 'Passwords Do Not Match',
                text: 'Your new password and confirmation password must be exactly the same.',
                confirmButtonColor: '#0f172a',
                customClass: { popup: 'rounded-3xl' }
            });
        }

        // STRICT GUARD: Terms and Conditions
        if (!data.terms) {
            return Swal.fire({
                icon: 'warning',
                title: 'Action Required',
                text: 'You must read and agree to the Terms of Service and Privacy Policy to finish setting up your store.',
                confirmButtonColor: '#0f172a',
                customClass: { popup: 'rounded-3xl' }
            });
        }

        post(submitUrl);
    };

    const inputClasses = "appearance-none block w-full px-4 py-3.5 border border-gray-200 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 sm:text-sm font-bold text-gray-900 bg-gray-50/50 transition-all";
    const labelClasses = "block text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 mb-1.5";
    const errorClasses = "mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wide";

    const CheckIcon = () => <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
    const DotIcon = () => <svg className="w-4 h-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="4" fill="currentColor" /></svg>;

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-500 selection:text-white">

            {/* FULL-SCREEN BLURRED BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img
                    src="/images/auth-bg.png"
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-[#0B0F19]/60 backdrop-blur-sm"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]"></div>
            </div>

            <Head title="Complete Store Setup" />

            {/* Header & Logo */}
            <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10 animate-in fade-in slide-in-from-top-4 duration-700 text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 bg-white rounded-lg border border-gray-100 shadow-2xl flex items-center justify-center overflow-hidden">
                        {settings?.logo_path ? (
                            <img src={`/storage/${settings.logo_path}`} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white font-black text-3xl">
                                {settings?.app_name?.charAt(0) || 'S'}
                            </div>
                        )}
                    </div>
                </div>

                <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">
                    Welcome, {user.name}!
                </h2>
                <p className="mt-3 text-sm font-medium text-gray-200 max-w-xs mx-auto leading-relaxed drop-shadow-md">
                    We're excited to have you. Let's get your workspace and profile configured so you can start managing your store.
                </p>
                <p className="mt-4 text-[10px] font-black text-white/70 uppercase tracking-[0.3em] drop-shadow-md">
                    Progress: Step {currentStep} of 3
                </p>
            </div>

            {/* Form Container */}
            <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-2xl z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 px-4">
                <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-t-2xl sm:rounded-2xl border border-white/40">

                    {/* Progress Bar */}
                    <div className="flex items-center justify-between mb-10 gap-3">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 shadow-sm ${step <= currentStep ? 'bg-gray-900' : 'bg-gray-200'}`} />
                        ))}
                    </div>

                    <form onSubmit={submit}>
                        {/* STEP 1: WORKSPACE DETAILS */}
                        {currentStep === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                <div className="border-b border-gray-100 pb-4">
                                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">Workspace Details</h3>
                                    <p className="text-xs font-medium text-gray-500 mt-1 italic">Identify your business for receipts and invoices.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2">
                                        <label className={labelClasses}>Official Store Name</label>
                                        <input type="text" value={data.store_name} onChange={e => setData('store_name', e.target.value)} className={inputClasses} placeholder="e.g. NextGen Retail" />
                                        {errors.store_name && <p className={errorClasses}>{errors.store_name}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Store Phone</label>
                                        <input type="tel" value={data.store_phone} onChange={e => setData('store_phone', e.target.value)} className={inputClasses} placeholder="e.g. +63 912 345 6789" />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Store Address</label>
                                        <input type="text" value={data.store_address} onChange={e => setData('store_address', e.target.value)} className={inputClasses} placeholder="e.g. 123 Business Blvd, Suite 4A" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: PERSONAL INFORMATION */}
                        {currentStep === 2 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                <div className="border-b border-gray-100 pb-4">
                                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">Personal Info</h3>
                                    <p className="text-xs font-medium text-gray-500 mt-1 italic">Your administrative contact and location details.</p>
                                </div>
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="sm:col-span-2">
                                            <label className={labelClasses}>Home Street Address</label>
                                            <input type="text" value={data.user_address} onChange={e => setData('user_address', e.target.value)} className={inputClasses} placeholder="e.g. 456 Main St, Apt 2B" />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>City</label>
                                            <input type="text" value={data.user_city} onChange={e => setData('user_city', e.target.value)} className={inputClasses} placeholder="e.g. Nasugbu" />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Province</label>
                                            <input type="text" value={data.user_province} onChange={e => setData('user_province', e.target.value)} className={inputClasses} placeholder="e.g. Batangas" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className={labelClasses}>Country</label>
                                            <input type="text" value={data.user_country} onChange={e => setData('user_country', e.target.value)} className={inputClasses} placeholder="e.g. Philippines" />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Personal Phone</label>
                                            <input type="tel" value={data.user_phone} onChange={e => setData('user_phone', e.target.value)} className={inputClasses} placeholder="e.g. +63 998 765 4321" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: ACCOUNT SECURITY */}
                        {currentStep === 3 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                <div className="border-b border-gray-100 pb-4">
                                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">Security</h3>
                                    <p className="text-xs font-medium text-gray-500 mt-1 italic">Secure your administrator account access.</p>
                                </div>
                                <div className="space-y-5">
                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center shadow-inner">
                                        <p className="text-xs font-bold text-gray-600">Login Email: <span className="text-gray-900">{user.email}</span></p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                                        {/* New Password Field */}
                                        <div className="relative">
                                            <label className={labelClasses}>New Password</label>
                                            <input type={showPassword ? "text" : "password"} value={data.password} onChange={e => setData('password', e.target.value)} className={inputClasses} placeholder="e.g. Str0ng!P@ss" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-600 transition-colors">
                                                {showPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.188-1.583 8.32 8.32 0 013.89.981L19.5 19.5" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                            </button>
                                        </div>

                                        {/* Confirm Password Field */}
                                        <div className="relative">
                                            <label className={labelClasses}>Confirm Password</label>
                                            <input type={showConfirmPassword ? "text" : "password"} value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} className={inputClasses} placeholder="e.g. Str0ng!P@ss" />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-600 transition-colors">
                                                {showConfirmPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.188-1.583 8.32 8.32 0 013.89.981L19.5 19.5" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                            </button>
                                        </div>

                                        {/* Dynamic Password Checklist */}
                                        <div className="sm:col-span-2 mt-1 p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-6 sm:items-center justify-center">
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

                                        {/* TERMS AND CONDITIONS CHECKBOX WITH BUTTONS */}
                                        <div className="sm:col-span-2 mt-2">
                                            <label className="flex items-start gap-3 group">
                                                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                        checked={data.terms}
                                                        onChange={e => setData('terms', e.target.checked)}
                                                    />
                                                    <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <span className="text-xs font-medium text-gray-600 leading-relaxed select-none">
                                                    I agree to the <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="text-blue-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer">Terms of Service</button> and <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} className="text-blue-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer">Privacy Policy</button>, and I confirm that all the information provided is accurate.
                                                </span>
                                            </label>
                                        </div>

                                    </div>
                                    {errors.password && <p className={errorClasses}>{errors.password}</p>}
                                </div>
                            </div>
                        )}

                        {/* Navigation Actions */}
                        <div className="pt-10 flex items-center justify-between gap-4 border-t border-gray-100">
                            {currentStep > 1 ? (
                                <button
                                    key="back-btn"
                                    type="button"
                                    onClick={handleBack}
                                    className="px-6 py-3.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    Back
                                </button>
                            ) : (
                                <div className="w-20"></div>
                            )}

                            {currentStep < 3 ? (
                                <button
                                    key="continue-btn"
                                    type="button"
                                    onClick={handleNext}
                                    className="px-8 py-3.5 rounded-lg bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                                >
                                    Continue
                                </button>
                            ) : (
                                <button
                                    key="finish-btn"
                                    type="submit"
                                    disabled={processing || !data.terms}
                                    className="px-8 py-3.5 rounded-lg bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 disabled:hover:bg-blue-600 active:scale-95 disabled:active:scale-100 flex items-center gap-2"
                                >
                                    {processing ? 'Saving...' : 'Finish Setup'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* MODALS */}

            {/* Terms of Service Modal */}
            {showTerms && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Terms of Service</h2>
                            <button onClick={() => setShowTerms(false)} className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto text-sm text-gray-700 space-y-4 leading-relaxed custom-scrollbar">
                            {settings?.terms_of_service ? (
                                <div
                                    className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600"
                                    dangerouslySetInnerHTML={{ __html: settings.terms_of_service }}
                                />
                            ) : (
                                <div className="text-center py-10 text-gray-400 font-medium italic">
                                    Terms of Service document has not been uploaded yet.
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button onClick={() => setShowTerms(false)} className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-lg text-sm transition-colors shadow-sm">I Understand</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy Policy Modal */}
            {showPrivacy && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Privacy Policy</h2>
                            <button onClick={() => setShowPrivacy(false)} className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto text-sm text-gray-700 space-y-4 leading-relaxed custom-scrollbar">
                            {settings?.privacy_policy ? (
                                <div
                                    className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600"
                                    dangerouslySetInnerHTML={{ __html: settings.privacy_policy }}
                                />
                            ) : (
                                <div className="text-center py-10 text-gray-400 font-medium italic">
                                    Privacy Policy document has not been uploaded yet.
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button onClick={() => setShowPrivacy(false)} className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-lg text-sm transition-colors shadow-sm">I Understand</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}