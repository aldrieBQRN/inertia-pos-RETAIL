import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Users({ auth, users, roles = ['super_admin', 'admin', 'cashier'] }) {
    const fileInput = useRef();
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    // --- FILTER STATES ---
    const params = new URLSearchParams(window.location.search);
    const [searchQuery, setSearchQuery] = useState(params.get('search') || '');
    const [roleFilter, setRoleFilter] = useState(params.get('role') || 'all');

    // --- FORM SETUP ---
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        phone_number: '',
        address: '',
        city: '',
        province: '',
        country: '',
        password: '',
        password_confirmation: '',
        role: 'admin',
        avatar: null,
        _method: 'post', // Used to spoof PUT for file uploads during edit
    });

    // --- REAL-TIME POLLING & FILTERING ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            router.get(window.location.pathname, { search: searchQuery, role: roleFilter }, {
                preserveState: true, preserveScroll: true, replace: true, only: ['users']
            });
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, roleFilter]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!showModal) { // Pause polling if modal is open to prevent UI jumps
                router.reload({ only: ['users'], preserveScroll: true, preserveState: true });
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [showModal]);

    // --- HANDLERS ---
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('avatar', file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        reset();
        clearErrors();
        setData({
            name: '', email: '', phone_number: '', address: '', city: '', province: '', country: '',
            password: '', password_confirmation: '', role: 'admin', avatar: null, _method: 'post'
        });
        setAvatarPreview(null);
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        clearErrors();
        setData({
            name: user.name || '',
            email: user.email || '',
            phone_number: user.phone_number || '',
            address: user.address || '',
            city: user.city || '',
            province: user.province || '',
            country: user.country || '',
            role: user.role || 'admin',
            password: '',
            password_confirmation: '',
            avatar: null,
            _method: 'put', // Spoof PUT for Inertia file upload handling
        });
        setAvatarPreview(user.avatar_path ? `/storage/${user.avatar_path}` : null);
        setShowModal(true);
    };

    const submitUser = (e) => {
        e.preventDefault();

        Swal.fire({
            title: editingUser ? 'Updating User...' : 'Creating User...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // Always use POST. If editing, Laravel will read the `_method: 'put'` flag.
        const submitRoute = editingUser ? route('developer.users.update', editingUser.id) : route('developer.users.store');

        post(submitRoute, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowModal(false);
                reset();
                Swal.fire({
                    icon: 'success',
                    title: editingUser ? 'User Updated!' : 'User Created!',
                    confirmButtonColor: '#111827',
                    customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm' }
                });
            },
            onError: () => Swal.close()
        });
    };

    const handleDeleteUser = (user) => {
        if (user.id === auth.user.id) return Swal.fire('Action Denied', 'You cannot delete your own account.', 'error');

        Swal.fire({
            title: 'Delete User?',
            text: `Are you sure you want to permanently delete ${user.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#f3f4f6',
            confirmButtonText: 'Yes, Delete Account',
            cancelButtonText: '<span class="text-gray-700 font-bold">Cancel</span>',
            reverseButtons: true,
            customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm', cancelButton: 'rounded-xl px-6 py-3 border border-gray-200 text-sm' }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
                router.delete(route('developer.users.destroy', user.id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({title: 'Deleted!', text: 'The user has been removed.', icon: 'success', customClass: {popup: 'rounded-3xl', confirmButton: 'rounded-xl bg-gray-900'}}),
                    onError: () => Swal.close()
                });
            }
        });
    };

    // --- HELPERS ---
    const getRoleBadge = (role) => {
        const baseClass = "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider inline-flex items-center justify-center shrink-0 border shadow-sm";
        if (role === 'super_admin') return <span className={`${baseClass} bg-purple-50 text-purple-700 border-purple-200/60`}>Super Admin</span>;
        if (role === 'admin') return <span className={`${baseClass} bg-blue-50 text-blue-700 border-blue-200/60`}>Store Admin</span>;
        return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200/60`}>Cashier</span>;
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const userList = users?.data || [];

    // Premium Input Classes
    const inputClasses = "w-full border-gray-200 bg-gray-50/50 rounded-none sm:rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400";
    const labelClasses = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5";

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">User Management</h2>}
        >
            <Head title="System Users" />

            <div className="py-8 lg:py-12 bg-[#FAFAFA] min-h-screen selection:bg-gray-900 selection:text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">

                    {/* TOP ACTION BAR & FILTERS */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="relative w-full xl:max-w-md shrink-0">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name, email, or account number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3 border-gray-200 rounded-none sm:rounded-lg bg-white shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all font-medium text-sm"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto lg:justify-end">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full sm:w-auto bg-white border-gray-200 shadow-sm rounded-none sm:rounded-lg text-xs font-bold text-gray-700 py-3 pl-4 pr-8 focus:ring-gray-900 focus:border-gray-900 cursor-pointer"
                            >
                                <option value="all">All Roles</option>
                                <option value="super_admin">Super Admins</option>
                                <option value="admin">Store Admins</option>
                                <option value="cashier">Cashiers</option>
                            </select>

                            <button
                                onClick={openCreateModal}
                                className="w-full sm:w-auto bg-gray-900 text-white px-6 py-3 rounded-none sm:rounded-lg font-bold text-sm hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgb(0,0,0,0.1)]"
                            >
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                Create User
                            </button>
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    {userList.length === 0 ? (
                        <div className="bg-white rounded-none sm:rounded-lg border border-gray-200/60 shadow-sm p-12 sm:p-20 text-center animate-in fade-in zoom-in duration-500 w-full border-y sm:border-y-0">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 tracking-tight">No matching users</h3>
                            <p className="text-gray-500 text-sm mt-2 font-medium">Try adjusting your filters or search query.</p>
                        </div>
                    ) : (
                        <>
                            {/* PREMIUM USER GRID */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {userList.map((u, index) => (
                                    <div key={u.id} className="flex flex-col bg-white rounded-none sm:rounded-lg shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-y sm:border-y-0 border-gray-200/60 hover:border-gray-300 transition-all p-6 sm:p-8 relative animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>

                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            <div className="w-14 h-14 rounded-full border-2 border-gray-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                                {u.avatar_path ? (
                                                    <img src={`/storage/${u.avatar_path}`} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-bold text-lg">
                                                        {getInitials(u.name)}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-bold text-lg text-gray-900 truncate tracking-tight">{u.name}</h3>
                                                    {u.account_number && (
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0 mt-1">
                                                            #{u.account_number}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium truncate mb-2">{u.email}</p>

                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {getRoleBadge(u.role)}
                                                    {u.store && (
                                                        <span className="bg-gray-50 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider shadow-sm truncate max-w-[120px]">
                                                            {u.store.name}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Mini Details Block */}
                                                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                                                    {u.phone_number && (
                                                        <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                                                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                            {u.phone_number}
                                                        </p>
                                                    )}
                                                    {(u.city || u.province) && (
                                                        <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 truncate">
                                                            <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            {[u.city, u.province].filter(Boolean).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-5 flex gap-2">
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="flex-1 flex items-center justify-center py-2.5 text-[10px] font-bold rounded-none sm:rounded-lg bg-white text-blue-600 border border-gray-200 hover:bg-blue-50 uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                                            >
                                                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u)}
                                                disabled={u.id === auth.user.id}
                                                className="flex-1 flex items-center justify-center py-2.5 text-[10px] font-bold rounded-none sm:rounded-lg bg-white text-red-600 border border-gray-200 hover:bg-red-50 uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                                            >
                                                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* PAGINATION */}
                            {users.links && users.links.length > 3 && (
                                <div className="flex flex-wrap justify-center items-center gap-1.5 mt-10">
                                    {users.links.map((link, i) => {
                                        const currentIndex = users.links.findIndex(l => l.active);
                                        const isFirst = i === 0;
                                        const isLast = i === users.links.length - 1;
                                        const isCurrent = link.active;
                                        const isAdjacent = Math.abs(i - currentIndex) <= 1;
                                        const isNavButton = link.label === '&laquo;' || link.label === '&raquo;';

                                        // Show first, last, current, adjacent pages, and nav buttons
                                        const show = isFirst || isLast || isCurrent || isAdjacent || isNavButton;

                                        if (!show) {
                                            // Show ellipsis between gaps
                                            if (i > 1 && i < currentIndex - 1) {
                                                if (i === 2 && !users.links[1].active) return <span key={`ellipsis-${i}`} className="px-2 text-gray-400 font-bold">...</span>;
                                            }
                                            if (i < users.links.length - 2 && i > currentIndex + 1) {
                                                if (i === currentIndex + 2) return <span key={`ellipsis-${i}`} className="px-2 text-gray-400 font-bold">...</span>;
                                            }
                                            return null;
                                        }

                                        return (
                                            <Link
                                                key={i} href={link.url || '#'} preserveScroll preserveState
                                                className={`px-4 py-2.5 text-xs font-semibold rounded-none sm:rounded-lg transition-all ${
                                                    link.active ? 'bg-gray-900 text-white shadow-md' : link.url ? 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50' : 'bg-transparent text-gray-300 cursor-not-allowed'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* PREMIUM CREATE / EDIT MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-3xl rounded-none sm:rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] sm:max-h-[90vh]">

                        <div className="bg-white border-b border-gray-100 px-6 sm:px-10 py-6 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">{editingUser ? 'Edit User Account' : 'Provision New User'}</h2>
                                <p className="text-xs font-medium text-gray-500 mt-1">Manage system access and personal details.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-gray-50 hover:bg-gray-100 p-2.5 rounded-none sm:rounded-lg text-gray-500 hover:text-gray-900 transition-colors active:scale-95">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar">
                            <form id="user-form" onSubmit={submitUser} className="space-y-10">

                                {/* Avatar Upload */}
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-gray-100">
                                    <div onClick={() => fileInput.current.click()} className="relative w-24 h-24 rounded-none sm:rounded-full ring-4 ring-gray-50 flex items-center justify-center overflow-hidden cursor-pointer group hover:ring-gray-200 transition-all shadow-sm shrink-0">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-bold text-2xl">{getInitials(data.name || '??')}</div>
                                        )}
                                        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                                        </div>
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <h3 className="font-bold text-gray-900 text-sm">User Avatar</h3>
                                        <p className="text-xs text-gray-500 mt-1 mb-3">Optional. Supported formats: JPG, PNG. Max 2MB.</p>
                                        <button type="button" onClick={() => fileInput.current.click()} className="text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-none sm:rounded-lg transition-colors shadow-sm">
                                            Choose file
                                        </button>
                                        <input type="file" ref={fileInput} onChange={handleAvatarChange} className="hidden" accept="image/jpeg, image/png, image/webp, image/jpg" />
                                        {errors.avatar && <p className="text-red-500 text-[10px] font-bold mt-1.5 uppercase">{errors.avatar}</p>}
                                    </div>
                                </div>

                                {/* Form Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

                                    {/* Personal Details */}
                                    <div className="space-y-5">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            Identity & Access
                                        </h3>
                                        <div>
                                            <label className={labelClasses}>Full Name</label>
                                            <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} required className={inputClasses} placeholder="John Doe" />
                                            {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Email Address</label>
                                            <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} required className={inputClasses} placeholder="john@example.com" />
                                            {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.email}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClasses}>System Role</label>
                                            <select value={data.role} onChange={e => setData('role', e.target.value)} required className={`${inputClasses} cursor-pointer`}>
                                                {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
                                            </select>
                                            {errors.role && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.role}</p>}
                                        </div>

                                        {/* FIXED PASSWORD FIELDS */}
                                        <div className="pt-2 space-y-4">
                                            <div>
                                                <label className={labelClasses}>
                                                    Password {editingUser && <span className="normal-case font-medium text-gray-400">(Leave blank to keep current)</span>}
                                                </label>
                                                <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} required={!editingUser} className={inputClasses} placeholder="Password" />
                                                {errors.password && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.password}</p>}
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Confirm Password</label>
                                                <input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} required={!editingUser || data.password.length > 0} className={inputClasses} placeholder="Confirm Password" />
                                                {errors.password_confirmation && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.password_confirmation}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location Details */}
                                    <div className="space-y-5">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            Contact & Location
                                        </h3>
                                        <div>
                                            <label className={labelClasses}>Phone Number</label>
                                            <input type="text" value={data.phone_number} onChange={e => setData('phone_number', e.target.value)} className={inputClasses} placeholder="+1 (555) 000-0000" />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Street Address</label>
                                            <input type="text" value={data.address} onChange={e => setData('address', e.target.value)} className={inputClasses} placeholder="123 Main St" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>City</label>
                                                <input type="text" value={data.city} onChange={e => setData('city', e.target.value)} className={inputClasses} placeholder="Makati" />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Province</label>
                                                <input type="text" value={data.province} onChange={e => setData('province', e.target.value)} className={inputClasses} placeholder="Metro Manila" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Country</label>
                                            <input type="text" value={data.country} onChange={e => setData('country', e.target.value)} className={inputClasses} placeholder="Philippines" />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="bg-gray-50/80 px-6 sm:px-10 py-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setShowModal(false)} className="order-2 sm:order-1 px-6 py-3 text-gray-600 font-semibold bg-white border border-gray-300 hover:bg-gray-50 rounded-none sm:rounded-lg text-sm transition-all active:scale-[0.98]">
                                Cancel
                            </button>
                            <button type="submit" form="user-form" disabled={processing} className="order-1 sm:order-2 px-8 py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-none sm:rounded-lg shadow-md text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                                {processing ? 'Processing...' : (editingUser ? 'Save Changes' : 'Create User')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}