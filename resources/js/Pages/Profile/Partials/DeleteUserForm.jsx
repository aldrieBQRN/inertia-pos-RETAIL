import { useRef, useState } from 'react';
import Modal from '@/Components/Modal';
import { useForm } from '@inertiajs/react';

export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();
        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header>
                <h2 className="text-lg font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Danger Zone
                </h2>
                <p className="mt-2 text-[10px] font-bold text-red-500/80 uppercase tracking-widest leading-relaxed">
                    Once your account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain.
                </p>
            </header>

            <button
                onClick={confirmUserDeletion}
                className="bg-red-600 text-white px-8 py-3.5 rounded-none font-black hover:bg-red-700 uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-md shadow-red-200"
            >
                Delete Account
            </button>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-8">
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-3">
                        Are you sure you want to delete your account?
                    </h2>

                    <p className="text-xs font-bold text-gray-500 mb-6">
                        Once your account is deleted, all of its resources and data will be permanently deleted. Please enter your password to confirm you would like to permanently delete your account.
                    </p>

                    <div className="mt-6">
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="w-full border-gray-200 bg-gray-50 rounded-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all py-3.5 px-5 text-sm font-bold text-gray-900 shadow-sm"
                            placeholder="Enter your password to confirm..."
                        />
                        {errors.password && <p className="text-red-500 text-[10px] font-black mt-2 ml-1 uppercase tracking-tight">{errors.password}</p>}
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="py-3.5 px-6 text-gray-500 font-black bg-gray-100 hover:bg-gray-200 rounded-none uppercase tracking-widest text-[10px] transition-all"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={processing}
                            className="py-3.5 px-6 bg-red-600 hover:bg-red-700 text-white font-black rounded-none shadow-lg shadow-red-200 uppercase tracking-widest text-[10px] transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            Delete Account
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}