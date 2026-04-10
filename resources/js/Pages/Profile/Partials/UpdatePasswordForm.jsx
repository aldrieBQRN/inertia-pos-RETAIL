import { useRef, useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function UpdatePasswordForm({ isOpen, onClose }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    // Password visibility states
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, errors, put, reset, clearErrors, processing } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    // Reset form and errors whenever the modal is opened or closed
    useEffect(() => {
        if (isOpen) {
            reset();
            clearErrors();
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const updatePassword = (e) => {
        e.preventDefault();

        Swal.fire({
            title: 'Securing Account...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                onClose(); // Close modal on success
                reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Password Updated!',
                    text: 'Your security credentials have been successfully updated.',
                    confirmButtonColor: '#111827'
                });
            },
            onError: (errors) => {
                Swal.close();
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }
                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    // Reusable Toggle Component
    const EyeToggle = ({ isVisible, toggleVisibility }) => (
        <button
            type="button"
            onClick={toggleVisibility}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
            tabIndex="-1"
        >
            {isVisible ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.148-1.414c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            )}
        </button>
    );

    // Premium Input Component styling
    const inputClasses = "w-full border-gray-200 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 pl-4 pr-12 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400 [&::-ms-reveal]:hidden";
    const labelClasses = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5";
    const errorClasses = "text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide";

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
            {/* MOBILE: Full width/height, rounded-none, slides up from bottom.
                DESKTOP: max-w-md, rounded-2xl, centers and zooms in.
            */}
            <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl sm:shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

                {/* Header (Sticky on Mobile) */}
                <div className="bg-white border-b border-gray-100 px-6 sm:px-10 py-5 sm:py-6 flex justify-between items-center shrink-0 sticky top-0 z-50">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Security Settings</h2>
                        <p className="text-[11px] sm:text-xs font-medium text-gray-500 mt-0.5 sm:mt-1">Ensure your account is using a secure password.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-gray-50 hover:bg-gray-100 p-2 sm:p-2.5 rounded-full text-gray-500 hover:text-gray-900 transition-colors active:scale-95 shrink-0 ml-4"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar relative">
                    <form id="password-update-form" onSubmit={updatePassword} className="space-y-6">

                        <div>
                            <label className={labelClasses}>Current Password</label>
                            <div className="relative">
                                <input
                                    ref={currentPasswordInput}
                                    value={data.current_password}
                                    onChange={e => setData('current_password', e.target.value)}
                                    type={showCurrentPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    className={inputClasses}
                                    placeholder="Enter current password"
                                />
                                <EyeToggle isVisible={showCurrentPassword} toggleVisibility={() => setShowCurrentPassword(!showCurrentPassword)} />
                            </div>
                            {errors.current_password && <p className={errorClasses}>{errors.current_password}</p>}
                        </div>

                        <div className="pt-2">
                            <label className={labelClasses}>New Password</label>
                            <div className="relative">
                                <input
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    type={showNewPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    className={inputClasses}
                                    placeholder="Enter new password"
                                />
                                <EyeToggle isVisible={showNewPassword} toggleVisibility={() => setShowNewPassword(!showNewPassword)} />
                            </div>
                            {errors.password && <p className={errorClasses}>{errors.password}</p>}
                        </div>

                        <div>
                            <label className={labelClasses}>Confirm New Password</label>
                            <div className="relative">
                                <input
                                    value={data.password_confirmation}
                                    onChange={e => setData('password_confirmation', e.target.value)}
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    className={inputClasses}
                                    placeholder="Confirm new password"
                                />
                                <EyeToggle isVisible={showConfirmPassword} toggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)} />
                            </div>
                            {errors.password_confirmation && <p className={errorClasses}>{errors.password_confirmation}</p>}
                        </div>
                    </form>
                </div>

                {/* Footer Actions (Sticky bottom on mobile) */}
                <div className="bg-white sm:bg-gray-50/80 px-6 sm:px-10 py-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="order-2 sm:order-1 w-full sm:w-auto px-6 py-3.5 sm:py-3 text-gray-600 font-semibold bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-sm transition-all active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="password-update-form"
                        disabled={processing}
                        className="order-1 sm:order-2 w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl shadow-md text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Updating...
                            </>
                        ) : 'Update Password'}
                    </button>
                </div>

            </div>
        </div>
    );
}