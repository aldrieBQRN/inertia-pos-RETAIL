import React from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';

export default function BillingLayout({ children, storeName }) {
    const { post } = useForm();
    const { settings } = usePage().props;
    const logoUrl = settings?.logo_path ? `/storage/${settings.logo_path}` : null;

    const handleLogout = (e) => {
        e.preventDefault();
        post(route('logout'));
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
            {/* CLEAN HEADER */}
            <nav className="bg-white border-b border-gray-200 py-4 px-6 sm:px-12 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    {logoUrl ? (
                        <img src={logoUrl} alt="System Logo" className="h-12 w-12 object-cover rounded-none" />
                    ) : (
                        <div className="w-12 h-12 bg-blue-600 rounded-none flex items-center justify-center text-white shadow-md">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 0 00-3-3H6a3 0 00-3 3v8a3 0 003 3z" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <h1 className="font-black text-lg leading-tight uppercase tracking-tight">{storeName}</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Billing Management</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="text-xs font-black text-gray-500 hover:text-red-600 transition-colors uppercase tracking-widest flex items-center gap-2"
                >
                    Sign Out
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
            </nav>

            {/* MAIN CONTENT AREA */}
            <main className="py-12">
                {children}
            </main>

            {/* FOOTER */}
            <footer className="py-10 text-center bg-white border-t border-gray-200 mt-auto">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                    © {new Date().getFullYear()} {settings?.app_name || 'System'} &bull; Secure Billing Portal
                </p>
            </footer>
        </div>
    );
}