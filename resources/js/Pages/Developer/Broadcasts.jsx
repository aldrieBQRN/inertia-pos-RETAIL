import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import ApplicationLogo from '@/Components/ApplicationLogo';

export default function Broadcasts({ auth, announcements = { data: [], links: [] } }) {
    const { active_announcement } = usePage().props;
    const [progress, setProgress] = useState(0);

    const { data, setData, post, processing, reset, errors } = useForm({
        message: '',
        style: 'info'
    });

    // --- REAL-TIME POLLING (5 SECONDS) ---
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['announcements', 'active_announcement'],
                preserveScroll: true,
                preserveState: true
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // --- HANDLERS ---
    const handleBroadcast = (e) => {
        e.preventDefault();

        setProgress(0);

        Swal.fire({
            title: 'Broadcasting Alert',
            html: `
                <div class="w-full text-left">
                    <p class="mb-4 text-sm font-semibold">Deploying banner and notifying all store owners via email...</p>
                    <div class="w-full bg-gray-200 rounded-lg overflow-hidden h-2">
                        <div id="progress-bar" class="bg-blue-600 h-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                    <p class="mt-3 text-xs text-gray-500 font-medium"><b>Please do not close this window.</b></p>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                const newProgress = Math.min(prev + Math.random() * 30, 90);
                const progressBar = document.getElementById('progress-bar');
                if (progressBar) {
                    progressBar.style.width = newProgress + '%';
                }
                return newProgress;
            });
        }, 300);

        post(route('developer.announcements.store'), {
            onSuccess: () => {
                clearInterval(progressInterval);
                setProgress(100);
                const progressBar = document.getElementById('progress-bar');
                if (progressBar) {
                    progressBar.style.width = '100%';
                }

                setTimeout(() => {
                    reset();
                    Swal.fire({
                        icon: 'success',
                        title: 'Broadcast Live!',
                        text: 'Banner updated and emails delivered successfully.',
                        confirmButtonColor: '#2563eb',
                    });
                }, 500);
            },
            onError: () => {
                clearInterval(progressInterval);
                Swal.close();
            }
        });
    };

    const clearAnnouncement = () => {
        Swal.fire({
            title: 'Clear Active Alert?',
            text: "This will remove the banner from all tenant screens immediately.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, clear it',
            reverseButtons: true,
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('developer.announcements.clear'), {}, {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'info', title: 'Banner Cleared', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false })
                });
            }
        });
    };

    // --- HELPERS ---
    const getThemeStyles = (styleType) => {
        if (styleType === 'danger') return 'bg-red-50 border-red-500 text-red-700';
        if (styleType === 'warning') return 'bg-amber-50 border-amber-500 text-amber-800';
        return 'bg-blue-50 border-blue-500 text-blue-700';
    };

    const getThemeIcon = (styleType) => {
        if (styleType === 'danger') return (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        );
        if (styleType === 'warning') return (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
        return (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
    };

    const getActiveBorderClass = (theme) => {
        if (data.style !== theme) return 'border-gray-100 hover:border-gray-300 bg-white';
        if (theme === 'danger') return 'border-red-600 bg-red-50 shadow-md ring-4 ring-red-100';
        if (theme === 'warning') return 'border-amber-500 bg-amber-50 shadow-md ring-4 ring-amber-100';
        return 'border-blue-600 bg-blue-50 shadow-md ring-4 ring-blue-100';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 uppercase tracking-widest">System Broadcasts</h2>}
        >
            <Head title="Broadcasts" />

            <div className="py-8 sm:py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* --- NEW BROADCAST FORM --- */}
                        <div className="bg-white rounded-none sm:rounded-xl shadow-sm border border-y sm:border-y-0 border-gray-100 overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-500">
                            <div className="bg-gray-900 px-6 py-5">
                                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                                    Publish New Broadcast
                                </h2>
                            </div>

                            <form onSubmit={handleBroadcast} className="p-6 sm:p-8 space-y-8 flex-1 flex flex-col">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Message Content</label>
                                    <textarea
                                        rows="4"
                                        value={data.message}
                                        onChange={e => setData('message', e.target.value)}
                                        placeholder="Enter the broadcast message for all tenants..."
                                        required
                                        className="w-full border-gray-200 rounded-none sm:rounded-lg focus:ring-blue-500 p-5 font-bold text-gray-800 resize-none transition-all shadow-sm bg-gray-50/50"
                                    ></textarea>
                                    {errors.message && <p className="text-red-500 text-xs font-bold mt-2 uppercase tracking-tight">{errors.message}</p>}
                                </div>

                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Banner Theme</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {['info', 'warning', 'danger'].map((theme) => (
                                            <label
                                                key={theme}
                                                className={`cursor-pointer border-2 rounded-none sm:rounded-lg p-4 text-center transition-all duration-300 relative ${getActiveBorderClass(theme)}`}
                                            >
                                                <input type="radio" name="theme" value={theme} checked={data.style === theme} onChange={e => setData('style', e.target.value)} className="sr-only" />
                                                <div className={`flex justify-center mb-2 ${data.style === theme ? (theme === 'danger' ? 'text-red-600' : theme === 'warning' ? 'text-amber-500' : 'text-blue-600') : 'text-gray-400'}`}>
                                                    {getThemeIcon(theme)}
                                                </div>
                                                <div className="text-[10px] font-black uppercase text-gray-900 tracking-widest">{theme}</div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={processing || !data.message.trim()}
                                        className="w-full py-4 bg-blue-600 text-white font-black rounded-none sm:rounded-lg shadow-xl shadow-blue-100 hover:bg-blue-700 uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {processing ? 'Processing...' : 'Deploy Global Broadcast'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* --- PREVIEW & ACTIVE STATUS --- */}
                        <div className="space-y-6 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="bg-white p-6 sm:p-8 rounded-none sm:rounded-xl shadow-sm border border-y sm:border-y-0 border-gray-100">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Live Preview</h3>
                                <div className={`p-5 rounded-none sm:rounded-lg border-l-8 font-black shadow-sm transition-all duration-500 flex items-center gap-4 ${getThemeStyles(data.style)}`}>
                                    <ApplicationLogo size="sm" dark={false} showSubtitle={false} className="shrink-0 scale-90" />
                                    <span className="h-4 w-px bg-current opacity-25"></span>
                                    <span className="text-sm leading-tight italic">"{data.message || "Enter a message to see the preview..."}"</span>
                                </div>
                            </div>

                            <div className="bg-white p-6 sm:p-8 rounded-none sm:rounded-xl shadow-sm border border-y sm:border-y-0 border-gray-100 flex-1 flex flex-col">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Active Status</h3>
                                        {active_announcement && (
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                            </span>
                                        )}
                                    </div>
                                    {active_announcement && (
                                        <button type="button" onClick={clearAnnouncement} className="text-red-500 text-[10px] font-black bg-red-50 px-4 py-2 rounded-none sm:rounded-lg border border-red-100 uppercase tracking-widest hover:bg-red-100 transition-all">
                                            Disable Banner
                                        </button>
                                    )}
                                </div>

                                {active_announcement ? (
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className={`p-6 rounded-none sm:rounded-lg border-2 font-black shadow-inner flex flex-col sm:flex-row items-center gap-5 ${getThemeStyles(active_announcement.style)}`}>
                                            <div className="bg-white/80 p-3 rounded-xl shadow-sm">
                                                <ApplicationLogo size="sm" dark={false} showSubtitle={false} />
                                            </div>
                                            <div className="text-center sm:text-left text-lg leading-tight flex-1">{active_announcement.message}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-4 border-dashed border-gray-100 rounded-none sm:rounded-xl">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                        </div>
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Silence Mode</h3>
                                        <p className="text-gray-400 text-xs font-medium">There is currently no live banner active on tenant screens.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- BROADCAST HISTORY --- */}
                    <div className="bg-white rounded-none sm:rounded-xl shadow-sm border border-y sm:border-y-0 border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Broadcast History Log</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Audit trail of all system-wide alerts</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                        <th className="p-6">Status</th>
                                        <th className="p-6">Message Content</th>
                                        <th className="p-6">Applied Theme</th>
                                        <th className="p-6 text-right">Deployment Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {announcements.data.map((ann) => (
                                        <tr key={ann.id} className="hover:bg-gray-50/30 transition-colors group">
                                            <td className="p-6">
                                                {ann.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none sm:rounded-lg text-[9px] font-black bg-green-50 text-green-600 uppercase tracking-widest border border-green-100 shadow-sm">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1.5 rounded-none sm:rounded-lg text-[9px] font-black bg-gray-100 text-gray-400 uppercase tracking-widest border border-gray-200">
                                                        Archived
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 font-bold text-sm text-gray-700 max-w-md truncate group-hover:text-gray-900">{ann.message}</td>
                                            <td className="p-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-none sm:rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${getThemeStyles(ann.style).replace('border-l-8', 'border-2')}`}>
                                                    {getThemeIcon(ann.style)}
                                                    {ann.style}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right text-xs text-gray-500 font-bold whitespace-nowrap">{formatDate(ann.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {announcements.links && announcements.links.length > 3 && (
                            <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/30 flex flex-wrap items-center justify-center gap-2">
                                {announcements.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        preserveScroll
                                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-none sm:rounded-lg border transition-all ${
                                            link.active ? 'bg-gray-900 text-white border-gray-900 shadow-lg scale-110 z-10' :
                                            link.url ? 'bg-white text-gray-600 border-gray-200 hover:border-gray-900 hover:text-gray-900' : 'bg-transparent text-gray-300 border-transparent cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}