import { useRef, useState, useEffect } from 'react';
import { Link, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

export default function UpdateProfileInformationForm({ isOpen, onClose, user, mustVerifyEmail, status }) {
    const fileInput = useRef();
    const [avatarPreview, setAvatarPreview] = useState(user.avatar_path ? `/storage/${user.avatar_path}` : null);

    // Simulate loading for skeleton animation on open
    const [isLoading, setIsLoading] = useState(true);
    // NEW: Track background OTP sending to spin the button instead of popping an alert
    const [isSendingOtp, setIsSendingOtp] = useState(false);

    const { data, setData, post, errors, setError, processing, reset, clearErrors } = useForm({
        name: user.name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        city: user.city || '',
        province: user.province || '',
        country: user.country || '',
        avatar: null,
        _method: 'patch',
    });

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            reset();
            clearErrors();
            setAvatarPreview(user.avatar_path ? `/storage/${user.avatar_path}` : null);

            // Artificial delay to show skeleton
            const timer = setTimeout(() => setIsLoading(false), 400);
            return () => clearTimeout(timer);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('avatar', file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        clearErrors(); // Clear any previous inline errors

        // SMART CHECK: Did the user change their email address?
        if (data.email !== user.email) {
            try {
                // 1. Spin the save button quietly
                setIsSendingOtp(true);

                // 2. Ask Backend to send OTP
                await axios.post('/profile/send-otp', { email: data.email });

                // Stop the button spinner now that it sent
                setIsSendingOtp(false);

                // 3. Prompt user to enter the code (ONLY pops up if email was valid/unique!)
                const { value: otp, isDismissed } = await Swal.fire({
                    title: 'Verify New Email',
                    text: `We sent a 6-digit code to ${data.email}`,
                    input: 'text',
                    inputAttributes: { maxlength: 6, pattern: '[0-9]*', inputMode: 'numeric' },
                    showCancelButton: true,
                    confirmButtonText: 'Verify & Save',
                    confirmButtonColor: '#1B3B6A'
                });

                if (isDismissed) return; // Stop if they clicked cancel

                if (otp) {
                    // 4. Send code to backend to verify
                    Swal.fire({ title: 'Verifying...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    await axios.post('/profile/verify-otp', { code: otp });

                    // 5. Code was correct! Proceed to save the rest of the profile
                    patchProfile();
                } else {
                    Swal.fire('Error', 'Verification code is required.', 'error');
                }
            } catch (error) {
                setIsSendingOtp(false);

                // SMART ERROR HANDLING: Show email taken errors quietly inline!
                if (error.response?.status === 422 && error.response?.data?.errors?.email) {
                    setError('email', error.response.data.errors.email[0]);
                }
                // Handle wrong OTP code errors (which do need an alert since the modal is open)
                else if (error.response?.status === 422 && error.response?.data?.message) {
                     Swal.fire('Error', error.response.data.message, 'error');
                }
                // Fallback for weird server errors
                else {
                    Swal.fire('Error', 'Failed to send verification code. Please try again.', 'error');
                }
            }
        } else {
            // Email didn't change, just update the profile directly!
            patchProfile();
        }
    };

    const patchProfile = () => {
        post(route('profile.update'), {
            forceFormData: true,
            onSuccess: () => {
                onClose();
                Swal.fire({
                    icon: 'success',
                    title: 'Profile Updated!',
                    text: 'Your account information has been saved.',
                    confirmButtonColor: '#1B3B6A'
                });
            },
            onError: () => {
                Swal.close();
            }
        });
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

    const inputClasses = "w-full border-gray-200 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400";
    const labelClasses = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5";
    const errorClasses = "text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide";

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
            <div className="bg-white w-full h-full sm:h-auto sm:max-w-4xl sm:rounded-2xl sm:shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

                {/* Header (Sticky on Mobile) */}
                <div className="bg-white border-b border-gray-100 px-6 sm:px-10 py-5 sm:py-6 flex justify-between items-center shrink-0 sticky top-0 z-50">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Edit Profile</h2>
                        <p className="text-[11px] sm:text-xs font-medium text-gray-500 mt-0.5 sm:mt-1">Update your personal and contact details.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-gray-50 hover:bg-gray-100 p-2 sm:p-2.5 rounded-full text-gray-500 hover:text-gray-900 transition-colors active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar relative">

                    {/* SKELETON LOADING STATE */}
                    {isLoading ? (
                        <div className="space-y-10 animate-pulse">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-gray-100">
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-200 shrink-0"></div>
                                <div className="w-full text-center sm:text-left space-y-2">
                                    <div className="h-5 bg-gray-200 rounded w-32 mx-auto sm:mx-0"></div>
                                    <div className="h-3 bg-gray-200 rounded w-48 mx-auto sm:mx-0 mb-4"></div>
                                    <div className="h-10 bg-gray-200 rounded-md w-36 mx-auto sm:mx-0"></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                <div className="space-y-6">
                                    <div className="h-5 bg-gray-200 rounded w-32 border-b border-gray-100 pb-3"></div>
                                    <div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-20"></div><div className="h-12 bg-gray-100 rounded-md w-full"></div></div>
                                    <div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-24"></div><div className="h-12 bg-gray-100 rounded-md w-full"></div></div>
                                    <div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-28"></div><div className="h-12 bg-gray-100 rounded-md w-full"></div></div>
                                </div>
                                <div className="space-y-6">
                                    <div className="h-5 bg-gray-200 rounded w-32 border-b border-gray-100 pb-3"></div>
                                    <div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-24"></div><div className="h-12 bg-gray-100 rounded-md w-full"></div></div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-20"></div><div className="h-12 bg-gray-100 rounded-md w-full"></div></div>
                                        <div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-20"></div><div className="h-12 bg-gray-100 rounded-md w-full"></div></div>
                                    </div>
                                    <div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-20"></div><div className="h-12 bg-gray-100 rounded-md w-full"></div></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ACTUAL FORM */
                        <form id="profile-form" onSubmit={submit} className="space-y-10 animate-in fade-in duration-500">

                            {/* Avatar Upload */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-gray-100">
                                <div
                                    onClick={() => fileInput.current.click()}
                                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-gray-50 flex items-center justify-center overflow-hidden cursor-pointer group hover:ring-gray-200 transition-all shadow-sm shrink-0"
                                >
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-bold text-3xl">
                                            {getInitials(user.name)}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                </div>
                                <div className="text-center sm:text-left">
                                    <h3 className="font-bold text-gray-900 text-sm">Profile Photo</h3>
                                    <p className="text-xs text-gray-500 mt-1 mb-3">Recommended size is 500x500px. Max 2MB.</p>
                                    <button
                                        type="button"
                                        onClick={() => fileInput.current.click()}
                                        className="text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md transition-colors shadow-sm"
                                    >
                                        Choose new image
                                    </button>
                                    <input type="file" ref={fileInput} onChange={handleAvatarChange} className="hidden" accept="image/jpeg, image/png, image/webp, image/jpg" />
                                    {errors.avatar && <p className={errorClasses}>{errors.avatar}</p>}
                                </div>
                            </div>

                            {/* Grid Form */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 sm:gap-y-10">

                                {/* Left Column: Personal */}
                                <div className="space-y-5 sm:space-y-6">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        Personal Details
                                    </h3>
                                    <div>
                                        <label className={labelClasses}>Full Name</label>
                                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} required className={inputClasses} placeholder="e.g. Jane Doe" />
                                        {errors.name && <p className={errorClasses}>{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Email Address</label>
                                        <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} required className={inputClasses} placeholder="e.g. jane@example.com" />
                                        {errors.email && <p className={errorClasses}>{errors.email}</p>}
                                        <p className="text-[10px] text-blue-600 mt-2 leading-relaxed">
                                            💡 If you change this email address, a 6-digit verification code will be sent to confirm the change.
                                        </p>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Phone Number <span className="normal-case font-medium text-gray-400">(Optional)</span></label>
                                        <input type="text" value={data.phone_number} onChange={e => setData('phone_number', e.target.value)} className={inputClasses} placeholder="+1 (555) 000-0000" />
                                        {errors.phone_number && <p className={errorClasses}>{errors.phone_number}</p>}
                                    </div>
                                </div>

                                {/* Right Column: Location */}
                                <div className="space-y-5 sm:space-y-6">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        Location Details
                                    </h3>
                                    <div>
                                        <label className={labelClasses}>Street Address</label>
                                        <input type="text" value={data.address} onChange={e => setData('address', e.target.value)} className={inputClasses} placeholder="e.g. 123 Main St, Apt 4B" />
                                        {errors.address && <p className={errorClasses}>{errors.address}</p>}
                                    </div>

                                    {/* 2-Column inner grid for City/Municipality & Province */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                                        <div>
                                            <label className={labelClasses}>City / Municipality</label>
                                            <input type="text" value={data.city} onChange={e => setData('city', e.target.value)} className={inputClasses} placeholder="e.g. Makati" />
                                            {errors.city && <p className={errorClasses}>{errors.city}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Province</label>
                                            <input type="text" value={data.province} onChange={e => setData('province', e.target.value)} className={inputClasses} placeholder="e.g. Metro Manila" />
                                            {errors.province && <p className={errorClasses}>{errors.province}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Country</label>
                                        <input type="text" value={data.country} onChange={e => setData('country', e.target.value)} className={inputClasses} placeholder="e.g. Philippines" />
                                        {errors.country && <p className={errorClasses}>{errors.country}</p>}
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer Actions (Sticky bottom on mobile) */}
                <div className="bg-white sm:bg-gray-50/80 px-6 sm:px-10 py-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="order-2 sm:order-1 w-full sm:w-auto px-6 py-3.5 sm:py-3 text-[#1B3B6A] font-bold bg-white border border-[#CBD7E6] hover:bg-[#EFF4F9] rounded-lg text-sm transition-all active:scale-[0.98] shadow-xs"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="profile-form"
                        disabled={processing || isLoading || isSendingOtp}
                        className="order-1 sm:order-2 w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-[#1B3B6A] hover:bg-[#142E54] text-white font-bold rounded-lg shadow-md text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing || isSendingOtp ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Saving...
                            </>
                        ) : 'Save Changes'}
                    </button>
                </div>

            </div>
        </div>
    );
}