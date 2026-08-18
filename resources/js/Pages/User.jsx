import React, { useState, useMemo, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

export default function User({ auth, users }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [originalEmail, setOriginalEmail] = useState('');

    // NEW: State to hold the user being viewed in the read-only modal
    const [viewUser, setViewUser] = useState(null);
    const [currentAvatarPath, setCurrentAvatarPath] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        name: '',
        account_number: '',
        email: '',
        role: 'cashier',
        phone_number: '',
        address: '',
        city: '',
        province: '',
        password: '',
        avatar: null,
    });

    const handlePhoneChange = (e) => {
        const onlyNumbers = e.target.value.replace(/\D/g, '');
        setData('phone_number', onlyNumbers);
    };

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 400);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['users'], preserveState: true, preserveScroll: true });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter]);

    const userArray = Array.isArray(users) ? users : (users?.data || []);

    const filteredUsers = useMemo(() => {
        return userArray.filter(user => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = user.name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower) ||
                (user.account_number && user.account_number.toLowerCase().includes(searchLower));
            const matchesRole = roleFilter ? user.role === roleFilter : true;
            return matchesSearch && matchesRole;
        });
    }, [userArray, searchQuery, roleFilter]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // --- MODAL HANDLERS ---

    // NEW: Open the View Modal
    const openViewModal = (user) => {
        setViewUser(user);
    };

    const openAddModal = () => {
        setEditMode(false);
        setEditingId(null);
        clearErrors();

        const accNums = userArray.map(u => parseInt(u.account_number, 10)).filter(n => !isNaN(n));
        const nextAccNum = accNums.length > 0 ? (Math.max(...accNums) + 1).toString() : '10000001';

        setCurrentAvatarPath('');
        setData({
            name: '',
            account_number: nextAccNum,
            email: '',
            role: 'cashier',
            phone_number: '',
            address: '',
            city: '',
            province: '',
            password: '',
            avatar: null,
        });

        setShowModal(true);
    };

    const openEditModal = (user) => {
        setEditMode(true);
        setEditingId(user.id);
        setOriginalEmail(user.email);
        clearErrors();

        setCurrentAvatarPath(user.avatar_path || '');
        setData({
            name: user.name || '',
            account_number: user.account_number || '',
            email: user.email || '',
            role: user.role || 'cashier',
            phone_number: user.phone_number || '',
            address: user.address || '',
            city: user.city || '',
            province: user.province || '',
            password: '',
            avatar: null,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearErrors();

        // Check if email changed in edit mode
        if (editMode && data.email !== originalEmail) {
            try {
                // 1. Spin the save button quietly
                setIsSendingOtp(true);

                // 2. Ask Backend to send OTP to new email
                await axios.post('/staff/send-otp', { email: data.email, staff_id: editingId });

                // Stop the button spinner
                setIsSendingOtp(false);

                // 3. Prompt user to enter the code
                const { value: otp, isDismissed } = await Swal.fire({
                    title: 'Verify New Email',
                    text: `We sent a 6-digit code to ${data.email}`,
                    input: 'text',
                    inputAttributes: { maxlength: 6, pattern: '[0-9]*', inputMode: 'numeric' },
                    showCancelButton: true,
                    confirmButtonText: 'Verify & Save',
                    confirmButtonColor: '#111827'
                });

                if (isDismissed) return; // Stop if they clicked cancel

                if (otp) {
                    // 4. Verify the code
                    Swal.fire({ title: 'Verifying...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    await axios.post('/staff/verify-otp', { code: otp, staff_id: editingId });

                    // 5. Code was correct! Proceed to save
                    submitStaffUpdate();
                } else {
                    Swal.fire('Error', 'Verification code is required.', 'error');
                }
            } catch (error) {
                setIsSendingOtp(false);

                // Handle email taken errors
                if (error.response?.status === 422 && error.response?.data?.errors?.email) {
                    Swal.fire('Error', error.response.data.errors.email[0], 'error');
                }
                // Handle wrong OTP code errors
                else if (error.response?.status === 422 && error.response?.data?.message) {
                    Swal.fire('Error', error.response.data.message, 'error');
                }
                // Fallback for server errors
                else {
                    Swal.fire('Error', 'Something went wrong.', 'error');
                }
            }
        } else {
            // Email was not changed or in add mode, just submit normally
            submitStaffUpdate();
        }
    };

    const submitStaffUpdate = () => {
        setIsSaving(true);
        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsSaving(false);
                setShowModal(false);
                reset();
                Swal.fire({
                    icon: 'success',
                    title: editMode ? 'Profile Updated' : 'Invite Sent!',
                    text: editMode ? 'Changes have been saved successfully.' : `An email has been sent to ${data.email} to complete their setup.`,
                    position: 'center',
                    showConfirmButton: true
                });
            },
            onError: () => {
                setIsSaving(false);
            }
        };

        if (editMode) {
            router.post(route('users.update', editingId), {
                _method: 'PUT',
                ...data
            }, options);
        } else {
            post(route('users.store'), options);
        }
    };

    const handleToggleActive = (user) => {
        const isRevoking = user.is_active !== false;
        Swal.fire({
            title: isRevoking ? 'Revoke Access?' : 'Restore Access?',
            text: isRevoking
                ? `Are you sure you want to revoke system access for "${user.name}"?`
                : `Restore system access for "${user.name}"?`,
            icon: isRevoking ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonColor: isRevoking ? '#d33' : '#1B3A69',
            confirmButtonText: isRevoking ? 'Yes, revoke access' : 'Yes, restore access'
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route('users.toggle-active', user.id), {}, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        Swal.fire(
                            isRevoking ? 'Revoked!' : 'Restored!',
                            isRevoking ? 'User access has been revoked successfully.' : 'User access has been restored successfully.',
                            'success'
                        );
                    }
                });
            }
        });
    };

    const handleDelete = (user) => {
        Swal.fire({
            title: 'Remove Staff?',
            text: "Are you sure you want to remove this staff member? This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, remove staff'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('users.destroy', user.id), {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => Swal.fire('Removed!', 'The staff member has been deleted.', 'success'),
                    onError: (errors) => {
                        if (errors.delete === 'linked_to_sales') {
                            if (user.is_active === false) {
                                Swal.fire({
                                    title: 'Cannot Delete Staff',
                                    text: 'This staff member has processed sales records and cannot be permanently deleted. Their system access is already revoked.',
                                    icon: 'error',
                                    confirmButtonColor: '#1B3A69',
                                    confirmButtonText: 'OK'
                                });
                            } else {
                                Swal.fire({
                                    title: 'Cannot Delete Staff',
                                    text: 'This staff member has processed sales records and cannot be permanently deleted. Would you like to revoke their access instead?',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#1B3A69',
                                    cancelButtonColor: '#d33',
                                    confirmButtonText: 'Yes, Revoke Access',
                                    cancelButtonText: 'No'
                                }).then((archiveResult) => {
                                    if (archiveResult.isConfirmed) {
                                        router.patch(route('users.toggle-active', user.id), {}, {
                                            preserveScroll: true,
                                            preserveState: true,
                                            onSuccess: () => Swal.fire('Revoked!', 'User access has been revoked successfully.', 'success')
                                        });
                                    }
                                });
                            }
                        } else {
                            Swal.fire('Error', errors.message || 'You cannot delete this user.', 'error');
                        }
                    }
                });
            }
        });
    };

    const RoleBadge = ({ role }) => {
        const isAppAdmin = role === 'admin';
        return (
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                isAppAdmin
                    ? 'bg-purple-50 text-purple-700 border-purple-200/70'
                    : 'bg-[#1B3B6A]/10 text-[#1B3B6A] border-[#1B3B6A]/20'
            }`}>
                {role || 'Cashier'}
            </span>
        );
    };

    const StatusBadge = ({ termsAcceptedAt, isActive }) => {
        if (isActive === false) {
            return (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/70 shadow-xs inline-flex items-center gap-1 cursor-default">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    Revoked
                </span>
            );
        }
        if (termsAcceptedAt) {
            return (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-xs inline-flex items-center gap-1 cursor-default">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Active
                </span>
            );
        }
        return (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/70 shadow-xs inline-flex items-center gap-1 cursor-default">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6v6m0-6h6H6" /></svg>
                Pending Setup
            </span>
        );
    };

    const getAvatarUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http') || path.startsWith('/')) return path;
        return `/storage/${path}`;
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800">Staff Management</h2>}>
            <Head title="Staff Management" />

            <div className="py-4 sm:py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">

                    {/* UNIFIED FULL-WIDTH MEGA TOOLBAR */}
                    <div className="px-4 sm:px-0">
                        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 w-full items-center">
                            <div className="relative w-full md:flex-1">
                                <input
                                    type="text"
                                    placeholder="Search account no, name or email..."
                                    className="pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-lg w-full focus:border-gray-400 focus:ring-1 focus:ring-gray-300/40 focus:bg-white text-sm font-medium transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3 sm:top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>

                            <div className="flex flex-row gap-2 sm:gap-3 w-full md:w-auto shrink-0">
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="flex-1 md:w-40 bg-white border border-gray-200 rounded-lg py-2.5 sm:py-3 pl-3 pr-8 focus:border-gray-400 focus:ring-1 focus:ring-gray-300/40 focus:bg-white text-gray-600 text-xs sm:text-sm font-medium transition-colors"
                                >
                                    <option value="">All Roles</option>
                                    <option value="admin">Administrator</option>
                                    <option value="cashier">Cashier</option>
                                </select>

                                <button onClick={openAddModal} className="flex-1 md:w-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-center bg-[#1B3B6A] text-white rounded-lg font-bold hover:bg-[#142E54] shadow-sm active:scale-95 transition-all text-xs sm:text-sm gap-1.5 sm:gap-2 whitespace-nowrap">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Invite Staff
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TABLE: DESKTOP VIEW */}
                    <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 mx-4 sm:mx-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b text-gray-500 uppercase text-[10px] font-black tracking-wider">
                                    <tr>
                                        <th className="p-4 w-16">Profile</th>
                                        <th className="p-4">Staff Member</th>
                                        <th className="p-4">Contact Info</th>
                                        <th className="p-4">System Role</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        Array.from({ length: 4 }).map((_, index) => (
                                            <tr key={`skel-${index}`} className="animate-pulse">
                                                <td className="p-4"><div className="w-10 h-10 rounded-full bg-gray-200"></div></td>
                                                <td className="p-4"><div className="h-5 bg-gray-200 rounded w-32 mb-1"></div><div className="h-3 bg-gray-200 rounded w-16"></div></td>
                                                <td className="p-4"><div className="h-4 bg-gray-200 rounded w-32 mb-1"></div><div className="h-3 bg-gray-200 rounded w-24"></div></td>
                                                <td className="p-4"><div className="h-6 bg-gray-200 rounded w-20"></div></td>
                                                <td className="p-4"><div className="h-6 bg-gray-200 rounded w-24"></div></td>
                                                <td className="p-4 flex justify-center gap-2 mt-1">
                                                    <div className="w-9 h-9 bg-gray-200 rounded-md"></div>
                                                    <div className="w-9 h-9 bg-gray-200 rounded-md"></div>
                                                    <div className="w-9 h-9 bg-gray-200 rounded-md"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : paginatedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center py-6">
                                                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                                    </svg>
                                                    <h3 className="text-lg font-bold text-gray-900">No staff found</h3>
                                                    <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">We couldn't find any staff matching your current filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    {u.avatar_path ? (
                                                        <img src={getAvatarUrl(u.avatar_path)} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm shrink-0" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-[#EFF4F9] text-[#1B3B6A] flex items-center justify-center font-black text-lg border border-[#CBD7E6] shrink-0 uppercase">
                                                            {u.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-800">{u.name}</div>
                                                    {u.account_number && <div className="text-[10px] font-mono text-gray-400 mt-0.5">Acc: {u.account_number}</div>}
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-gray-900 text-sm">{u.email}</div>
                                                    <div className="text-gray-500 text-xs mt-0.5">
                                                        {u.phone_number ? u.phone_number : <span className="text-gray-300 italic">Pending Setup</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4"><RoleBadge role={u.role} /></td>
                                                <td className="p-4"><StatusBadge termsAcceptedAt={u.terms_accepted_at} isActive={u.is_active} /></td>
                                                <td className="p-4 text-center flex justify-center gap-2">
                                                    <button onClick={() => openViewModal(u)} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="View Profile">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    </button>
                                                    <button onClick={() => openEditModal(u)} className="p-2 text-[#1B3B6A] hover:text-[#142E54] hover:bg-[#EFF4F9] rounded-lg transition-colors" title="Edit">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(u)}
                                                        disabled={auth.user.id === u.id}
                                                        className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent ${u.is_active === false
                                                                ? 'text-green-600 hover:text-green-800 hover:bg-green-100'
                                                                : 'text-amber-600 hover:text-amber-800 hover:bg-amber-100'
                                                            }`}
                                                        title={auth.user.id === u.id
                                                            ? "Cannot modify own status"
                                                            : u.is_active === false
                                                                ? "Restore Access"
                                                                : "Revoke Access"
                                                        }
                                                    >
                                                        {u.is_active === false ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(u)}
                                                        disabled={auth.user.id === u.id}
                                                        className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                        title={auth.user.id === u.id ? "Cannot delete self" : "Delete Staff"}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MOBILE APP-LIKE CARD VIEW */}
                    <div className="md:hidden flex flex-col divide-y divide-gray-100 bg-white sm:rounded-lg border-y sm:border border-gray-200 shadow-sm">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, index) => (
                                <div key={`mob-skel-${index}`} className="p-4 flex flex-col gap-3 animate-pulse">
                                    <div className="flex items-center gap-4 border-b border-gray-50 pb-3">
                                        <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0"></div>
                                        <div className="flex-1 flex flex-col gap-2">
                                            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : paginatedUsers.length === 0 ? (
                            <div className="p-10 text-center text-gray-500 font-bold text-sm">
                                No staff found. Adjust filters to see results.
                            </div>
                        ) : (
                            paginatedUsers.map((u) => {
                                return (
                                    <div key={u.id} className="p-4 flex flex-col gap-3 active:bg-gray-50 transition-colors">
                                        <div className="flex items-start gap-4 border-b border-gray-100 pb-3">
                                            {u.avatar_path ? (
                                                <img src={getAvatarUrl(u.avatar_path)} alt={u.name} className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-[#EFF4F9] text-[#1B3B6A] flex items-center justify-center font-black text-xl border border-[#CBD7E6] shrink-0 uppercase shadow-sm">
                                                    {u.name.charAt(0)}
                                                </div>
                                            )}

                                            <div className="flex-1 flex flex-col justify-center">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <h3 className="font-bold text-gray-900 text-lg leading-tight tracking-tight">{u.name}</h3>
                                                        {u.account_number && <span className="text-[10px] text-gray-400 font-mono mt-0.5">Acc: {u.account_number}</span>}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <RoleBadge role={u.role} />
                                                        <StatusBadge termsAcceptedAt={u.terms_accepted_at} isActive={u.is_active} />
                                                    </div>
                                                </div>
                                                <p className="text-xs font-medium text-gray-500 mt-2">{u.email}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <button onClick={() => openViewModal(u)} className="py-2 text-xs font-bold text-gray-700 bg-gray-50 rounded-lg border border-gray-200 shadow-sm active:scale-95 transition-transform">View Profile</button>
                                            <button onClick={() => openEditModal(u)} className="py-2 text-xs font-bold text-[#1B3B6A] bg-[#EFF4F9] rounded-lg border border-[#CBD7E6] shadow-sm active:scale-95 transition-transform">Edit</button>
                                            <button
                                                onClick={() => handleToggleActive(u)}
                                                disabled={auth.user.id === u.id}
                                                className={`py-2 text-xs font-bold rounded-lg border shadow-sm active:scale-95 transition-transform disabled:opacity-40 disabled:scale-100 ${u.is_active === false
                                                        ? 'text-green-700 bg-green-50 border-green-200'
                                                        : 'text-amber-700 bg-amber-50 border-amber-200'
                                                    }`}
                                            >
                                                {u.is_active === false ? 'Restore Access' : 'Revoke Access'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u)}
                                                disabled={auth.user.id === u.id}
                                                className="py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg shadow-sm active:scale-95 transition-transform disabled:opacity-40 disabled:scale-100"
                                            >
                                                Delete Staff
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* SEAMLESS FRONTEND PAGINATION WITH SMART PAGE DISPLAY */}
                    {!loading && totalPages > 1 && (() => {
                        const getPageNumbers = () => {
                            const pages = [];
                            const delta = 1; // pages on each side of current page
                            const left = Math.max(2, currentPage - delta);
                            const right = Math.min(totalPages - 1, currentPage + delta);

                            // Always add page 1
                            pages.push(1);

                            // Add ellipsis if there's a gap
                            if (left > 2) pages.push('...');

                            // Add pages around current
                            for (let i = left; i <= right; i++) {
                                if (i !== 1 && i !== totalPages) pages.push(i);
                            }

                            // Add ellipsis if there's a gap
                            if (right < totalPages - 1) pages.push('...');

                            // Always add last page if more than 1 page
                            if (totalPages > 1) pages.push(totalPages);

                            return pages;
                        };

                        return (
                            <div className="py-4 flex flex-col sm:flex-row justify-between items-center gap-4 pb-10 sm:pb-4 w-full overflow-visible">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest shrink-0">
                                    Page <span className="text-gray-900">{currentPage}</span> of {totalPages}
                                </span>

                                <div className="w-full sm:w-auto overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
                                    <div className="flex gap-1.5 flex-nowrap w-max mx-auto sm:mx-0 px-1">
                                        <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-3.5 py-2 min-h-9 rounded-lg text-xs font-bold border transition-all bg-white text-gray-600 border-gray-200 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap flex items-center">&laquo; Prev</button>
                                        {getPageNumbers().map((num, idx) => (
                                            num === '...' ? (
                                                <span key={`ellipsis-${idx}`} className="px-2 py-2 min-h-9 text-gray-400 font-bold flex items-center">...</span>
                                            ) : (
                                                <button
                                                    key={num}
                                                    onClick={() => { setCurrentPage(num); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                    className={`shrink-0 px-3.5 py-2 min-h-9 rounded-lg text-xs font-bold border transition-all flex items-center justify-center
                                                        ${currentPage === num ? 'bg-[#1B3B6A] text-white border-[#1B3B6A] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    {num}
                                                </button>
                                            )
                                        ))}
                                        <button disabled={currentPage === totalPages} onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-3.5 py-2 min-h-9 rounded-lg text-xs font-bold border transition-all bg-white text-gray-600 border-gray-200 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap flex items-center">Next &raquo;</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* DYNAMIC VIEW PROFILE MODAL */}
            {viewUser && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
                    <div className="absolute inset-0" onClick={() => setViewUser(null)}></div>

                    <div className="relative bg-white w-full max-w-lg rounded-t-xl md:rounded-lg shadow-2xl overflow-hidden animate-slide-up sm:animate-fade-in-up flex flex-col max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-[#142E54] flex justify-between items-center bg-[#1B3B6A]">
                            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded"></div>
                            <h2 className="text-xl font-black text-white tracking-tight mt-2 md:mt-0">Staff Profile</h2>
                            <button onClick={() => setViewUser(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors mt-2 md:mt-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">

                            {/* Header / Identity Area */}
                            <div className="flex items-center gap-5">
                                {viewUser.avatar_path ? (
                                    <img src={getAvatarUrl(viewUser.avatar_path)} alt={viewUser.name} className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md shrink-0 ring-4 ring-[#EFF4F9]" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-[#EFF4F9] text-[#1B3B6A] flex items-center justify-center font-black text-3xl border-2 border-white shadow-md ring-4 ring-[#EFF4F9] shrink-0 uppercase">
                                        {viewUser.name.charAt(0)}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="font-black text-2xl text-gray-900 leading-tight">{viewUser.name}</h3>
                                    <p className="text-sm font-medium text-gray-500 mb-1">{viewUser.email}</p>
                                    <div className="flex items-center gap-2">
                                        <RoleBadge role={viewUser.role} />
                                        {viewUser.account_number && <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">ID: {viewUser.account_number}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information Area */}
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    Contact & Location
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                                        <p className="text-sm font-bold text-gray-900 mt-0.5">{viewUser.phone_number || <span className="text-gray-400 italic font-normal">Not provided</span>}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Street Address</p>
                                        <p className="text-sm font-bold text-gray-900 mt-0.5">{viewUser.address || <span className="text-gray-400 italic font-normal">Not provided</span>}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">City</p>
                                        <p className="text-sm font-bold text-gray-900 mt-0.5">{viewUser.city || <span className="text-gray-400 italic font-normal">Not provided</span>}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Province</p>
                                        <p className="text-sm font-bold text-gray-900 mt-0.5">{viewUser.province || <span className="text-gray-400 italic font-normal">Not provided</span>}</p>
                                    </div>
                                </div>
                            </div>

                            {/* NEW: Legal & Compliance Area */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    Security & Compliance
                                </h4>

                                {viewUser.terms_accepted_at ? (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-3">
                                        <div className="mt-0.5 bg-emerald-100 text-emerald-600 rounded-full p-1 shrink-0">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-emerald-900">Setup Complete</p>
                                            <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                                                This staff member has completed their profile setup and legally agreed to the store's Terms of Service and Privacy Policy.
                                            </p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-2">
                                                Accepted on: {new Date(viewUser.terms_accepted_at).toLocaleString(undefined, {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start gap-3">
                                        <div className="mt-0.5 bg-amber-100 text-amber-600 rounded-full p-1 shrink-0">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6v6m0-6h6H6" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-amber-900">Pending Setup</p>
                                            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                                This staff member has been invited but has not yet completed their profile or agreed to the store policies. They cannot access the system until this is complete.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* DYNAMIC EDIT/ADD MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
                    <div className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:rounded-2xl sm:shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

                        {/* Header (Sticky on Mobile) */}
                        <div className="bg-[#1B3B6A] border-b border-[#142E54] px-6 sm:px-10 py-5 sm:py-6 flex justify-between items-center shrink-0 sticky top-0 z-50">
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                    {editMode ? 'Edit Staff Member' : 'Invite Staff Member'}
                                </h2>
                                <p className="text-[11px] sm:text-xs font-medium text-blue-200 mt-0.5 sm:mt-1">
                                    {editMode ? 'Update their identity and contact details.' : 'They will receive a secure email to complete their setup.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="bg-white/10 hover:bg-white/20 p-2 sm:p-2.5 rounded-full text-white/70 hover:text-white transition-colors active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">

                            <form id="user-form" onSubmit={handleSubmit} className="space-y-10">

                                {/* Left Column: Identity (Always Visible) */}
                                <div className="space-y-5 sm:space-y-6">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        System Identity
                                    </h3>

                                    {editMode && (
                                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            {data.avatar ? (
                                                <img
                                                    src={URL.createObjectURL(data.avatar)}
                                                    alt="Avatar Preview"
                                                    className="w-16 h-16 rounded-full object-cover border border-gray-200 shadow-sm"
                                                />
                                            ) : currentAvatarPath ? (
                                                <img
                                                    src={getAvatarUrl(currentAvatarPath)}
                                                    alt="Current Avatar"
                                                    className="w-16 h-16 rounded-full object-cover border border-gray-200 shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-[#EFF4F9] text-[#1B3B6A] flex items-center justify-center font-black text-xl border border-[#CBD7E6] shrink-0 uppercase">
                                                    {data.name ? data.name.charAt(0) : 'S'}
                                                </div>
                                            )}

                                            <div className="flex-1">
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-0.5">Profile Picture</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => setData('avatar', e.target.files[0])}
                                                    className="block w-full text-xs text-gray-500
                                                        file:mr-4 file:py-2 file:px-4
                                                        file:rounded-md file:border-0
                                                        file:text-xs file:font-semibold
                                                        file:bg-gray-100 file:text-gray-700
                                                        hover:file:bg-gray-200
                                                        file:cursor-pointer cursor-pointer"
                                                />
                                                {errors.avatar && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide">{errors.avatar}</p>}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Full Name</label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            required
                                            className="w-full border-gray-200 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400"
                                            placeholder="Juan Dela Cruz"
                                        />
                                        {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide">{errors.name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Email Address</label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                            required
                                            className="w-full border-gray-200 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400"
                                            placeholder="staff@store.com"
                                        />
                                        {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide">{errors.email}</p>}
                                        {editMode && (
                                            <p className="text-[10px] text-[#1B3B6A] mt-2 leading-relaxed font-medium">
                                                💡 If you change this email address, a 6-digit verification code will be sent to confirm the change.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">System Role</label>
                                        <select
                                            value={data.role}
                                            onChange={e => setData('role', e.target.value)}
                                            className="w-full border-gray-200 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm"
                                        >
                                            <option value="cashier">Cashier</option>
                                            <option value="admin">Administrator</option>
                                        </select>
                                        {errors.role && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide">{errors.role}</p>}
                                    </div>
                                </div>

                                {/* Personal Details Section - Only visible in Edit Mode */}
                                {editMode && (
                                    <div className="space-y-5 sm:space-y-6 animate-fade-in-up">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            Contact Details
                                        </h3>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={data.phone_number}
                                                onChange={handlePhoneChange}
                                                maxLength="15"
                                                className="w-full border-gray-200 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400"
                                                placeholder="09123456789"
                                            />
                                            {errors.phone_number && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide">{errors.phone_number}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Street Address</label>
                                            <input
                                                type="text"
                                                value={data.address}
                                                onChange={e => setData('address', e.target.value)}
                                                className="w-full border-gray-200 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400"
                                                placeholder="House No. & Street"
                                            />
                                            {errors.address && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide">{errors.address}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">City / Municipality</label>
                                                <input
                                                    type="text"
                                                    value={data.city}
                                                    onChange={e => setData('city', e.target.value)}
                                                    className="w-full border-gray-200 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400"
                                                    placeholder="City"
                                                />
                                                {errors.city && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide">{errors.city}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Province</label>
                                                <input
                                                    type="text"
                                                    value={data.province}
                                                    onChange={e => setData('province', e.target.value)}
                                                    className="w-full border-gray-200 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400"
                                                    placeholder="Province"
                                                />
                                                {errors.province && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide">{errors.province}</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Security Section - Only visible in Edit Mode */}
                                {editMode && (
                                    <div className="space-y-5 sm:space-y-6 border-t border-gray-100 pt-6 animate-fade-in-up">
                                        <h3 className="text-sm font-bold text-red-600 flex items-center gap-2 border-b border-red-100 pb-3">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            Security Override
                                        </h3>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">New Password <span className="normal-case font-medium text-gray-400">(Optional)</span></label>
                                            <input
                                                type="password"
                                                value={data.password}
                                                onChange={e => setData('password', e.target.value)}
                                                className="w-full border-gray-200 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-[#1B3B6A] focus:border-[#1B3B6A] focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400"
                                                placeholder="Leave blank to keep current password"
                                            />
                                            {errors.password && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 uppercase tracking-wide">{errors.password}</p>}
                                            <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">Tip: Leave blank to keep their current password. Set a new password only if needed.</p>
                                        </div>
                                    </div>
                                )}

                            </form>
                        </div>

                        {/* Footer Actions (Sticky bottom on mobile) */}
                        <div className="bg-white sm:bg-gray-50/80 px-6 sm:px-10 py-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="order-2 sm:order-1 w-full sm:w-auto px-6 py-3.5 sm:py-3 text-gray-600 font-semibold bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="user-form"
                                disabled={processing || isSendingOtp || isSaving}
                                className="order-1 sm:order-2 w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-[#1B3B6A] hover:bg-[#142E54] text-white font-semibold rounded-lg shadow-md shadow-[#1B3B6A]/20 text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processing || isSendingOtp || isSaving ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        {isSaving ? 'Saving Changes...' : 'Processing...'}
                                    </>
                                ) : (editMode ? 'Save Changes' : 'Send Invite Link')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}