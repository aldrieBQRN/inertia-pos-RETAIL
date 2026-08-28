import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function User({ auth, users, settings }) {
    // 1. Core Data States
    const [loading, setLoading] = useState(() => !users || (Array.isArray(users) ? users.length === 0 : false));
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showDataMenu, setShowDataMenu] = useState(false);

    // View Mode State (Table vs Grid) — Matches Inventory & Transactions
    const [viewMode, setViewMode] = useState(() => {
        try {
            return localStorage.getItem('pos_staff_view_mode') || 'table';
        } catch {
            return 'table';
        }
    });

    // Pagination State (9 for grid, 10 for table)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedMode = localStorage.getItem('pos_staff_view_mode');
            if (savedMode === 'grid') {
                return window.innerWidth >= 1280 ? 9 : 10;
            }
        }
        return 10;
    });

    // Filter States
    const [statusTab, setStatusTab] = useState('all'); // 'all' | 'on_shift' | 'cashiers' | 'admins' | 'inactive'
    const [searchFilter, setSearchFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [accountStatusFilter, setAccountStatusFilter] = useState('');

    // Detail View Drawer States
    const [showDetails, setShowDetails] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);

    // Add / Edit Modal States
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [originalEmail, setOriginalEmail] = useState('');
    const [currentAvatarPath, setCurrentAvatarPath] = useState('');

    // Section Refs for Smooth Scrolling & Tabs
    const workspaceSectionRef = useRef(null);
    const pipelineTabsRef = useRef(null);
    const dataMenuRef = useRef(null);

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

    const userArray = useMemo(() => {
        return Array.isArray(users) ? users : (users?.data || []);
    }, [users]);

    const formatCurrency = (centsOrPesos) => {
        const val = typeof centsOrPesos === 'number' ? centsOrPesos : parseFloat(centsOrPesos || 0);
        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getAvatarUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http') || path.startsWith('/')) return path;
        return `/storage/${path}`;
    };

    // Auto-scroll active pipeline tab into view
    useEffect(() => {
        if (pipelineTabsRef.current) {
            const activeBtn = pipelineTabsRef.current.querySelector(`[data-tab="${statusTab}"]`);
            if (activeBtn) {
                activeBtn.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [statusTab]);

    // Close Data Menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showDataMenu && dataMenuRef.current && !dataMenuRef.current.contains(e.target)) {
                setShowDataMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDataMenu]);

    // Lock page scroll when slide-over drawer or modal is open
    useEffect(() => {
        const isOverlayOpen = showDetails || showModal;
        if (typeof document !== 'undefined') {
            document.body.style.overflow = isOverlayOpen ? 'hidden' : 'unset';
        }
        return () => {
            if (typeof document !== 'undefined') {
                document.body.style.overflow = 'unset';
            }
        };
    }, [showDetails, showModal]);

    // Switch view mode helper
    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        try {
            localStorage.setItem('pos_staff_view_mode', mode);
        } catch {}
        if (mode === 'grid') {
            setItemsPerPage(window.innerWidth >= 1280 ? 9 : 10);
        } else {
            setItemsPerPage(10);
        }
        setCurrentPage(1);
    };

    const scrollToWorkspace = (tabKey) => {
        // Wait a frame for React to update the filtered list
        requestAnimationFrame(() => {
            if (workspaceSectionRef.current) {
                const isMobile = window.innerWidth < 640;
                const isTablet = window.innerWidth < 1024;
                const offset = isMobile ? 68 : (isTablet ? 76 : 85);

                const bodyRect = document.body.getBoundingClientRect().top;
                const elementRect = workspaceSectionRef.current.getBoundingClientRect().top;
                const elementPosition = elementRect - bodyRect;
                const offsetPosition = elementPosition - offset;

                const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
                const maxScroll = Math.max(0, scrollHeight - window.innerHeight);

                if (maxScroll > 0) {
                    const targetScroll = Math.min(maxScroll, Math.max(0, offsetPosition));
                    if (Math.abs(window.scrollY - targetScroll) > 6) {
                        window.scrollTo({
                            top: targetScroll,
                            behavior: 'smooth'
                        });
                    }
                }
            }

            if (tabKey && pipelineTabsRef.current) {
                const tabEl = pipelineTabsRef.current.querySelector(`[data-tab="${tabKey}"]`);
                if (tabEl) {
                    tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }
        });
    };

    const handleStatusTabChange = (tab) => {
        setStatusTab(tab);
        setCurrentPage(1);
        scrollToWorkspace(tab);
    };

    // Live Metrics Calculations (Constant across tab filters)
    const kpiMetrics = useMemo(() => {
        const total = userArray.length;
        const onShift = userArray.filter(u => u.active_shift !== null && u.active_shift !== undefined).length;
        const cashiers = userArray.filter(u => u.role === 'cashier').length;
        const admins = userArray.filter(u => u.role === 'admin').length;
        const active = userArray.filter(u => u.is_active !== false).length;
        const inactive = userArray.filter(u => u.is_active === false).length;
        const totalSalesCount = userArray.reduce((acc, u) => acc + (u.sales_count || 0), 0);
        const totalSalesAmount = userArray.reduce((acc, u) => acc + (Number(u.sales_sum_total_amount || 0) / 100), 0);

        return {
            total,
            onShift,
            cashiers,
            admins,
            active,
            inactive,
            totalSalesCount,
            totalSalesAmount
        };
    }, [userArray]);

    // Tab Counts
    const tabCounts = useMemo(() => {
        return {
            all: userArray.length,
            on_shift: userArray.filter(u => !!u.active_shift).length,
            cashiers: userArray.filter(u => u.role === 'cashier').length,
            admins: userArray.filter(u => u.role === 'admin').length,
            inactive: userArray.filter(u => u.is_active === false).length,
        };
    }, [userArray]);

    // Filter Logic
    const filteredUsers = useMemo(() => {
        return userArray.filter(user => {
            // 1. Pipeline Quick Tabs
            if (statusTab === 'on_shift' && !user.active_shift) return false;
            if (statusTab === 'cashiers' && user.role !== 'cashier') return false;
            if (statusTab === 'admins' && user.role !== 'admin') return false;
            if (statusTab === 'inactive' && user.is_active !== false) return false;

            // 2. Search Filter
            if (searchFilter.trim()) {
                const q = searchFilter.toLowerCase();
                const matchName = user.name?.toLowerCase().includes(q);
                const matchEmail = user.email?.toLowerCase().includes(q);
                const matchAcc = user.account_number?.toLowerCase().includes(q);
                const matchPhone = user.phone_number?.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchAcc && !matchPhone) return false;
            }

            // 3. Role Filter
            if (roleFilter && user.role !== roleFilter) return false;

            // 4. Status Filter
            if (accountStatusFilter === 'active' && user.is_active === false) return false;
            if (accountStatusFilter === 'inactive' && user.is_active !== false) return false;
            if (accountStatusFilter === 'pending' && user.terms_accepted_at) return false;

            return true;
        });
    }, [userArray, statusTab, searchFilter, roleFilter, accountStatusFilter]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(start, start + itemsPerPage);
    }, [filteredUsers, currentPage, itemsPerPage]);

    useEffect(() => {
        if (users && (Array.isArray(users) ? users.length > 0 : true)) {
            setLoading(false);
        } else {
            const timer = setTimeout(() => setLoading(false), 200);
            return () => clearTimeout(timer);
        }
    }, [users]);

    // Auto-reload data periodically
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['users'], preserveState: true, preserveScroll: true });
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // --- DRAWER & MODAL ACTIONS ---

    const handleViewDetails = (user) => {
        setSelectedStaff(user);
        setShowDetails(true);
    };

    const handleCloseDetails = () => {
        setShowDetails(false);
        setSelectedStaff(null);
    };

    const showDemoAlert = () => {
        Swal.fire({
            icon: 'info',
            title: 'Demo Mode Restricted',
            text: 'Please contact the POS provider to access this feature.',
            confirmButtonColor: '#1B3B6A'
        });
    };

    const openAddModal = () => {
        if (is_demo_mode) {
            showDemoAlert();
            return;
        }
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
        if (is_demo_mode) {
            showDemoAlert();
            return;
        }
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

    const handlePhoneChange = (e) => {
        const onlyNumbers = e.target.value.replace(/\D/g, '');
        setData('phone_number', onlyNumbers);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (is_demo_mode) {
            showDemoAlert();
            return;
        }
        clearErrors();

        if (editMode && data.email !== originalEmail) {
            try {
                setIsSendingOtp(true);
                await axios.post('/staff/send-otp', { email: data.email, staff_id: editingId });
                setIsSendingOtp(false);

                const { value: otp, isDismissed } = await Swal.fire({
                    title: 'Verify New Email',
                    text: `We sent a 6-digit verification code to ${data.email}`,
                    input: 'text',
                    inputAttributes: { maxlength: 6, pattern: '[0-9]*', inputMode: 'numeric' },
                    showCancelButton: true,
                    confirmButtonText: 'Verify & Save',
                    confirmButtonColor: '#1B3B6A'
                });

                if (isDismissed) return;

                if (otp) {
                    Swal.fire({ title: 'Verifying...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    await axios.post('/staff/verify-otp', { code: otp, staff_id: editingId });
                    submitStaffUpdate();
                } else {
                    Swal.fire('Error', 'Verification code is required.', 'error');
                }
            } catch (error) {
                setIsSendingOtp(false);
                if (error.response?.status === 422 && error.response?.data?.errors?.email) {
                    Swal.fire('Error', error.response.data.errors.email[0], 'error');
                } else if (error.response?.status === 422 && error.response?.data?.message) {
                    Swal.fire('Error', error.response.data.message, 'error');
                } else {
                    Swal.fire('Error', 'Something went wrong while verifying email.', 'error');
                }
            }
        } else {
            submitStaffUpdate();
        }
    };

    const submitStaffUpdate = () => {
        if (is_demo_mode) {
            showDemoAlert();
            return;
        }
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
                    text: editMode ? 'Staff changes saved successfully.' : `Setup invitation sent to ${data.email}.`,
                    confirmButtonColor: '#1B3B6A'
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
        if (is_demo_mode) {
            showDemoAlert();
            return;
        }
        const isRevoking = user.is_active !== false;
        Swal.fire({
            title: isRevoking ? 'Revoke System Access?' : 'Restore Access?',
            text: isRevoking
                ? `Revoking access for "${user.name}" prevents them from logging into POS or opening shifts immediately. Historical sales will remain intact.`
                : `Restore POS and administrative login access for "${user.name}"?`,
            icon: isRevoking ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonColor: isRevoking ? '#DC2626' : '#1B3B6A',
            confirmButtonText: isRevoking ? 'Yes, Revoke Access' : 'Yes, Restore Access'
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route('users.toggle-active', user.id), {}, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        Swal.fire(
                            isRevoking ? 'Access Revoked' : 'Access Restored',
                            isRevoking ? 'Staff member can no longer access the system.' : 'Staff member access restored successfully.',
                            'success'
                        );
                    }
                });
            }
        });
    };

    const handleResendInvite = (user) => {
        if (is_demo_mode) {
            showDemoAlert();
            return;
        }
        Swal.fire({
            title: 'Resend Setup Invite?',
            text: `Send a new secure 24-hour setup link to "${user.email}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1B3B6A',
            confirmButtonText: 'Send Setup Email'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('users.resend-invite', user.id), {}, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        Swal.fire('Invitation Sent', `A new setup link was emailed to ${user.email}.`, 'success');
                    }
                });
            }
        });
    };

    const handleDelete = (user) => {
        if (is_demo_mode) {
            showDemoAlert();
            return;
        }
        Swal.fire({
            title: 'Delete Staff Member?',
            text: `Are you sure you want to permanently delete "${user.name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('users.destroy', user.id), {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => Swal.fire('Deleted', 'Staff member has been removed.', 'success'),
                    onError: (errors) => {
                        if (errors.delete === 'linked_to_sales') {
                            Swal.fire({
                                title: 'Cannot Delete Staff',
                                text: 'This staff member has recorded sales transactions. You can revoke their access instead to preserve store audit trails.',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#1B3B6A',
                                confirmButtonText: 'Revoke Access Instead'
                            }).then((archiveResult) => {
                                if (archiveResult.isConfirmed) {
                                    router.patch(route('users.toggle-active', user.id), {}, {
                                        preserveScroll: true,
                                        preserveState: true,
                                        onSuccess: () => Swal.fire('Revoked', 'Staff access has been revoked.', 'success')
                                    });
                                }
                            });
                        } else {
                            Swal.fire('Error', errors.message || 'Unable to delete staff member.', 'error');
                        }
                    }
                });
            }
        });
    };

    // --- EXPORT FUNCTIONALITY (Styled like Inventory & Transactions) ---

    // --- EXPORT FUNCTIONALITY (1:1 with Inventory.jsx) ---

    const exportExcel = async () => {
        setIsExporting(true);
        setShowDataMenu(false);

        try {
            const exportData = filteredUsers;
            if (!exportData || exportData.length === 0) {
                Swal.fire('No Data', 'No staff records found to export.', 'info');
                setIsExporting(false);
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Staff Directory', {
                views: [{ showGridLines: true }]
            });

            // Set column widths
            worksheet.getColumn('A').width = 18; // Account #
            worksheet.getColumn('B').width = 28; // Staff Name
            worksheet.getColumn('C').width = 18; // System Role
            worksheet.getColumn('D').width = 16; // Account Status
            worksheet.getColumn('E').width = 24; // Workstation Shift
            worksheet.getColumn('F').width = 30; // Email Address
            worksheet.getColumn('G').width = 18; // Phone Number
            worksheet.getColumn('H').width = 15; // Total Shifts
            worksheet.getColumn('I').width = 15; // Total Sales

            // Store Header (Rows 1 to 4)
            const storeName = settings?.store_name || settings?.name || 'POS Store System';
            const storeAddress = settings?.address || '';
            const storeContact = settings?.phone ? `Contact: ${settings.phone}` : '';

            // Store Name
            worksheet.mergeCells('A1:I1');
            worksheet.getCell('A1').value = storeName.toUpperCase();
            worksheet.getCell('A1').font = { bold: true, color: { argb: '1B3A69' }, size: 16 };
            worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 28;

            // Address
            worksheet.mergeCells('A2:I2');
            worksheet.getCell('A2').value = storeAddress;
            worksheet.getCell('A2').font = { color: { argb: '555555' }, size: 9 };
            worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(2).height = 16;

            // Contact
            worksheet.mergeCells('A3:I3');
            worksheet.getCell('A3').value = storeContact;
            worksheet.getCell('A3').font = { color: { argb: '555555' }, size: 9, italic: true };
            worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(3).height = 16;

            // Title
            worksheet.mergeCells('A4:I4');
            worksheet.getCell('A4').value = `STAFF MANAGEMENT & DUTY ROSTER REPORT (Generated: ${new Date().toLocaleString()})`;
            worksheet.getCell('A4').font = { bold: true, color: { argb: '333333' }, size: 11 };
            worksheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(4).height = 20;

            // Empty spacing row
            worksheet.getRow(5).height = 10;

            // Headers on Row 6
            const headers = ['Account #', 'Staff Name', 'System Role', 'Account Status', 'Workstation Shift', 'Email Address', 'Phone Number', 'Total Shifts', 'Total Sales'];
            headers.forEach((h, colIndex) => {
                const cell = worksheet.getRow(6).getCell(colIndex + 1);
                cell.value = h;
                cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '1B3A69' }
                };
                cell.alignment = { vertical: 'middle', horizontal: colIndex >= 7 ? 'right' : 'left' };
            });
            worksheet.getRow(6).height = 25;

            // Enable worksheet protection
            worksheet.protect('', {
                selectLockedCells: true,
                selectUnlockedCells: true
            });

            // Counters
            let cashierCount = 0;
            let adminCount = 0;
            let onShiftCount = 0;
            let activeCount = 0;

            // Add Staff rows starting from Row 7
            exportData.forEach((u, idx) => {
                const rowIndex = idx + 7;
                const row = worksheet.getRow(rowIndex);

                const roleName = u.role === 'admin' ? 'Store Admin' : 'Cashier';
                const statusName = u.is_active === false ? 'Revoked' : (u.terms_accepted_at ? 'Active' : 'Pending Setup');
                const shiftName = u.active_shift ? `On Shift (${u.active_shift.terminal?.name || 'POS'})` : 'Off Duty';

                if (u.role === 'admin') adminCount++;
                if (u.role === 'cashier') cashierCount++;
                if (u.active_shift) onShiftCount++;
                if (u.is_active !== false) activeCount++;

                row.getCell(1).value = u.account_number ? `#${u.account_number}` : `ID: #${u.id}`;
                row.getCell(2).value = u.name || 'Unknown';
                row.getCell(3).value = roleName;
                row.getCell(4).value = statusName;
                row.getCell(5).value = shiftName;
                row.getCell(6).value = u.email || '';
                row.getCell(7).value = u.phone_number || 'N/A';
                row.getCell(8).value = u.shifts_count || 0;
                row.getCell(9).value = u.sales_count || 0;

                // Format cell alignments
                row.getCell(1).alignment = { horizontal: 'left' };
                row.getCell(2).alignment = { horizontal: 'left' };
                row.getCell(3).alignment = { horizontal: 'left' };
                row.getCell(4).alignment = { horizontal: 'left' };
                row.getCell(5).alignment = { horizontal: 'left' };
                row.getCell(6).alignment = { horizontal: 'left' };
                row.getCell(7).alignment = { horizontal: 'left' };
                row.getCell(8).alignment = { horizontal: 'right' };
                row.getCell(9).alignment = { horizontal: 'right' };

                // Number formats
                row.getCell(8).numFmt = '#,##0';
                row.getCell(9).numFmt = '#,##0';

                // Unlock data rows cells for editing
                for (let c = 1; c <= 9; c++) {
                    row.getCell(c).protection = { locked: false };
                }
            });

            // Summary Footer Box
            const summaryStartRow = exportData.length + 8;
            worksheet.getRow(summaryStartRow).height = 10;

            worksheet.mergeCells(`A${summaryStartRow + 1}:I${summaryStartRow + 1}`);
            const summaryTitleCell = worksheet.getCell(`A${summaryStartRow + 1}`);
            summaryTitleCell.value = 'STAFF DIRECTORY SUMMARY & STATS';
            summaryTitleCell.font = { bold: true, color: { argb: '1E293B' }, size: 10 };
            summaryTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            summaryTitleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'F1F5F9' }
            };
            worksheet.getRow(summaryStartRow + 1).height = 20;

            const summaryRow = worksheet.getRow(summaryStartRow + 2);
            summaryRow.getCell('A').value = `Total Staff: ${exportData.length}`;
            summaryRow.getCell('C').value = `Active Accounts: ${activeCount}`;
            summaryRow.getCell('E').value = `Currently On Shift: ${onShiftCount}`;
            summaryRow.getCell('G').value = `Cashiers: ${cashierCount}`;
            summaryRow.getCell('I').value = `Admins: ${adminCount}`;

            ['A', 'C', 'E', 'G', 'I'].forEach(col => {
                const cell = summaryRow.getCell(col);
                cell.font = { bold: true, size: 9, color: { argb: '334155' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'F8FAFC' }
                };
            });
            summaryRow.height = 22;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const safeStorePrefix = (settings?.store_name || settings?.name || 'POS').replace(/[^a-zA-Z0-9_-]/g, '_');
            const dateStr = new Date().toISOString().split('T')[0];
            saveAs(blob, `${safeStorePrefix}_Staff_Directory_${dateStr}.xlsx`);

            Swal.fire({
                icon: 'success',
                title: 'Excel Exported!',
                text: 'Staff directory report downloaded successfully.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (e) {
            console.error("Excel Generation Error:", e);
            Swal.fire('Error', 'Failed to generate Excel report.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const exportPDF = async () => {
        setIsExporting(true);
        setShowDataMenu(false);

        try {
            const exportData = filteredUsers;
            if (!exportData || exportData.length === 0) {
                Swal.fire('No Data', 'No staff records found to export.', 'info');
                setIsExporting(false);
                return;
            }

            const doc = new jsPDF('landscape');
            const pageWidth = doc.internal.pageSize.width;

            const storeName = settings?.store_name || settings?.name || 'POS Store System';
            const storeAddress = settings?.address || '';
            const storeContact = settings?.phone ? `Contact: ${settings.phone}` : '';

            let currentY = 20;

            doc.setFontSize(22);
            doc.setTextColor(31, 41, 55);
            doc.setFont(undefined, 'bold');
            doc.text(storeName, 14, currentY);

            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.setFont(undefined, 'normal');

            if (storeAddress) {
                currentY += 6;
                doc.text(storeAddress, 14, currentY);
            }
            if (storeContact) {
                currentY += 5;
                doc.text(storeContact, 14, currentY);
            }

            currentY += 8;
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.5);
            doc.line(14, currentY, pageWidth - 14, currentY);

            currentY += 10;
            doc.setFontSize(16);
            doc.setTextColor(31, 41, 55);
            doc.setFont(undefined, 'bold');
            doc.text('Staff Management & Duty Directory Report', 14, currentY);

            currentY += 6;
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.setFont(undefined, 'normal');

            let filterParts = [];
            if (searchFilter) filterParts.push(`Search: "${searchFilter}"`);
            if (roleFilter) filterParts.push(`Role: ${roleFilter === 'admin' ? 'Store Admins' : 'Cashiers'}`);
            if (accountStatusFilter) filterParts.push(`Status: ${accountStatusFilter}`);
            if (statusTab === 'on_shift') filterParts.push('Currently On Shift Only');
            if (statusTab === 'cashiers') filterParts.push('Cashiers Only');
            if (statusTab === 'admins') filterParts.push('Admins Only');
            if (statusTab === 'inactive') filterParts.push('Revoked Access Only');

            const filterText = filterParts.length > 0 ? `Filters: ${filterParts.join(' | ')}` : 'Filter: All Staff Members';
            doc.text(filterText, 14, currentY);

            const generatedText = `Generated: ${new Date().toLocaleString()}`;
            const textWidth = doc.getTextWidth(generatedText);
            doc.text(generatedText, pageWidth - 14 - textWidth, currentY);

            const tableStartY = currentY + 8;
            const tableColumns = ["Account #", "Staff Name", "System Role", "Workstation Shift", "Email Address", "Phone Number", "Total Shifts", "Total Sales", "Status"];
            const tableRows = [];

            let cashierCount = 0;
            let adminCount = 0;
            let onShiftCount = 0;
            let activeCount = 0;

            exportData.forEach(u => {
                const roleName = u.role === 'admin' ? 'Store Admin' : 'Cashier';
                const statusName = u.is_active === false ? 'Revoked' : (u.terms_accepted_at ? 'Active' : 'Pending Setup');
                const shiftName = u.active_shift ? `On Shift (${u.active_shift.terminal?.name || 'POS'})` : 'Off Duty';

                if (u.role === 'admin') adminCount++;
                if (u.role === 'cashier') cashierCount++;
                if (u.active_shift) onShiftCount++;
                if (u.is_active !== false) activeCount++;

                tableRows.push([
                    u.account_number ? `#${u.account_number}` : `ID: #${u.id}`,
                    u.name || 'Unknown',
                    roleName,
                    shiftName,
                    u.email || '—',
                    u.phone_number || '—',
                    (u.shifts_count || 0).toString(),
                    (u.sales_count || 0).toString(),
                    statusName
                ]);
            });

            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: tableStartY,
                theme: 'striped',
                headStyles: { fillColor: '#1B3A69', textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 4, valign: 'middle' },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 8) {
                        if (data.cell.raw === 'Revoked') {
                            data.cell.styles.textColor = [220, 38, 38];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (data.cell.raw === 'Active') {
                            data.cell.styles.textColor = [22, 163, 74];
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [217, 119, 6];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : tableStartY + 20;

            if (finalY > 160) {
                doc.addPage();
                finalY = 20;
            }

            // Draw Summary Box Background
            doc.setFillColor(249, 250, 251);
            doc.setDrawColor(229, 231, 235);
            doc.rect(14, finalY, pageWidth - 28, 36, 'FD');

            // Summary Box Title
            doc.setFontSize(12);
            doc.setTextColor(31, 41, 55);
            doc.setFont(undefined, 'bold');
            doc.text('Staff Directory & Roster Summary', 20, finalY + 8);

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(75, 85, 99);

            // Summary text
            doc.text(`Total Staff Records: ${exportData.length}`, 20, finalY + 18);
            doc.text(`Active Accounts: ${activeCount}`, 20, finalY + 26);
            doc.text(`Currently On Shift: ${onShiftCount}`, pageWidth / 2 - 40, finalY + 18);
            doc.text(`Total Cashiers: ${cashierCount}`, pageWidth / 2 - 40, finalY + 26);
            doc.text(`Store Administrators: ${adminCount}`, pageWidth - 90, finalY + 18);

            const dateStr = new Date().toISOString().split('T')[0];
            const safeStorePrefix = (settings?.store_name || settings?.name || 'POS').replace(/[^a-zA-Z0-9_-]/g, '_');
            doc.save(`${safeStorePrefix}_Staff_Directory_${dateStr}.pdf`);

            Swal.fire({
                icon: 'success',
                title: 'PDF Exported!',
                text: 'Staff directory report downloaded successfully.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });

        } catch (error) {
            console.error("PDF Generation Error:", error);
            Swal.fire('Error', 'Failed to generate PDF report.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div>
                    <h2 className="font-black text-xl text-gray-900 tracking-tight">Staff Management</h2>
                    <p className="text-xs font-semibold text-gray-500 mt-0.5">
                        Manage store cashiers, administrators, system access, and live workstation shifts
                    </p>
                </div>
            }
        >
            <Head title="Staff Management" />

            <div className="py-3 sm:py-6 bg-gray-50/80 min-h-0 sm:min-h-[calc(100vh-140px)] max-w-full overflow-x-clip">
                <div className="w-full max-w-full px-3.5 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">

                    {/* ========================================================================= */}
                    {/* 1. EXECUTIVE STAFF & SHIFT KPI METRIC STRIP (4 CARDS)                     */}
                    {/* ========================================================================= */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                        
                        {/* KPI 1: Total Staff */}
                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                                    <p className="text-[10px] sm:text-[11px] font-black text-gray-500 uppercase tracking-wider truncate">Total Staff</p>
                                    <h3 className="text-base sm:text-2xl font-black text-gray-900 tracking-tight">{kpiMetrics.total}</h3>
                                </div>
                                <div className="p-2 sm:p-2.5 bg-[#EFF4F9] text-[#1B3B6A] rounded-xl ring-1 ring-[#CBD7E6] shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs text-gray-500 font-semibold gap-1">
                                <span className="truncate">Team</span>
                                <span className="font-bold text-gray-700 truncate shrink-0">{kpiMetrics.cashiers} Cash · {kpiMetrics.admins} Adm</span>
                            </div>
                        </div>

                        {/* KPI 2: Currently On Shift */}
                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                                    <p className="text-[10px] sm:text-[11px] font-black text-emerald-700 uppercase tracking-wider truncate">On Shift</p>
                                    <h3 className="text-base sm:text-2xl font-black text-emerald-900 tracking-tight">{kpiMetrics.onShift}</h3>
                                </div>
                                <div className="p-2 sm:p-2.5 bg-emerald-100/70 text-emerald-700 rounded-xl ring-1 ring-emerald-200 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-3 border-t border-emerald-100 flex items-center justify-between text-[10px] sm:text-xs font-semibold text-emerald-700 gap-1">
                                <span className="truncate">Active floor</span>
                                <span className="font-bold text-emerald-800 truncate shrink-0">{kpiMetrics.onShift} Active</span>
                            </div>
                        </div>

                        {/* KPI 3: Cashiers */}
                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                                    <p className="text-[10px] sm:text-[11px] font-black text-blue-700 uppercase tracking-wider truncate">Cashiers</p>
                                    <h3 className="text-base sm:text-2xl font-black text-blue-900 tracking-tight">{kpiMetrics.cashiers}</h3>
                                </div>
                                <div className="p-2 sm:p-2.5 bg-blue-100/70 text-blue-700 rounded-xl ring-1 ring-blue-200 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-100 flex items-center justify-between text-[10px] sm:text-xs font-semibold text-blue-700 gap-1">
                                <span className="truncate">Registers</span>
                                <span className="font-bold text-blue-800 truncate shrink-0">{kpiMetrics.cashiers} Staff</span>
                            </div>
                        </div>

                        {/* KPI 4: Store Administrators */}
                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                                    <p className="text-[10px] sm:text-[11px] font-black text-purple-700 uppercase tracking-wider truncate">Admins</p>
                                    <h3 className="text-base sm:text-2xl font-black text-purple-900 tracking-tight">{kpiMetrics.admins}</h3>
                                </div>
                                <div className="p-2 sm:p-2.5 bg-purple-100/70 text-purple-700 rounded-xl ring-1 ring-purple-200 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-3 border-t border-purple-100 flex items-center justify-between text-[10px] sm:text-xs font-semibold text-purple-700 gap-1">
                                <span className="truncate">Management</span>
                                <span className="font-bold text-purple-800 truncate shrink-0">{kpiMetrics.admins} Admins</span>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 2. STAFF WORKSPACE: CONNECTED TABS + MAIN CONTENT CARD                     */}
                    {/* ========================================================================= */}
                    <div ref={workspaceSectionRef} className="flex flex-col scroll-mt-4">
                        
                        {/* Interactive Pipeline Status Tabs (With Inverted Scoop Radiuses) */}
                        <div className="w-full max-w-full overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth -mb-px relative z-20 pt-1">
                            <div ref={pipelineTabsRef} className="flex flex-nowrap items-end gap-1 sm:gap-1.5 px-2 sm:px-3 w-max min-w-full">
                                
                                {/* Tab 1: All Staff */}
                                <button
                                    data-tab="all"
                                    onClick={() => handleStatusTabChange('all')}
                                    className={`group px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-t-xl text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap shrink-0 border-t-2 border-x relative cursor-pointer ${
                                        statusTab === 'all'
                                            ? 'bg-white text-[#1B3B6A] font-black border-t-[#1B3B6A] border-x-gray-200/90 shadow-xs z-20'
                                            : 'bg-gray-100/70 hover:bg-gray-100 text-gray-500 hover:text-gray-800 font-bold border-transparent'
                                    }`}
                                >
                                    {statusTab === 'all' && (
                                        <>
                                            <div className="absolute -bottom-px -left-3 w-3 h-3 pointer-events-none z-30 overflow-hidden">
                                                <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 12 12">
                                                    <path d="M12 0 L12 12 L0 12 A12 12 0 0 0 12 0 Z" />
                                                    <path d="M0 12 A12 12 0 0 0 12 0" fill="none" stroke="rgba(229, 231, 235, 0.9)" strokeWidth="1.2" />
                                                </svg>
                                            </div>
                                            <div className="absolute -bottom-px -right-3 w-3 h-3 pointer-events-none z-30 overflow-hidden">
                                                <svg className="w-3 h-3 text-white fill-current scale-x-[-1]" viewBox="0 0 12 12">
                                                    <path d="M12 0 L12 12 L0 12 A12 12 0 0 0 12 0 Z" />
                                                    <path d="M0 12 A12 12 0 0 0 12 0" fill="none" stroke="rgba(229, 231, 235, 0.9)" strokeWidth="1.2" />
                                                </svg>
                                            </div>
                                        </>
                                    )}
                                    <span>All Staff</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black transition-all ${
                                        statusTab === 'all'
                                            ? 'bg-[#1B3B6A] text-white shadow-2xs'
                                            : 'bg-gray-200/80 text-gray-600 group-hover:bg-gray-300 group-hover:text-gray-800'
                                    }`}>
                                        {tabCounts.all}
                                    </span>
                                </button>

                                {/* Tab 2: On Shift */}
                                <button
                                    data-tab="on_shift"
                                    onClick={() => handleStatusTabChange('on_shift')}
                                    className={`group px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-t-xl text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap shrink-0 border-t-2 border-x relative cursor-pointer ${
                                        statusTab === 'on_shift'
                                            ? 'bg-white text-emerald-800 font-black border-t-emerald-600 border-x-gray-200/90 shadow-xs z-20'
                                            : 'bg-gray-100/70 hover:bg-gray-100 text-gray-500 hover:text-gray-800 font-bold border-transparent'
                                    }`}
                                >
                                    {statusTab === 'on_shift' && (
                                        <>
                                            <div className="absolute -bottom-px -left-3 w-3 h-3 pointer-events-none z-30 overflow-hidden">
                                                <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 12 12">
                                                    <path d="M12 0 L12 12 L0 12 A12 12 0 0 0 12 0 Z" />
                                                    <path d="M0 12 A12 12 0 0 0 12 0" fill="none" stroke="rgba(229, 231, 235, 0.9)" strokeWidth="1.2" />
                                                </svg>
                                            </div>
                                            <div className="absolute -bottom-px -right-3 w-3 h-3 pointer-events-none z-30 overflow-hidden">
                                                <svg className="w-3 h-3 text-white fill-current scale-x-[-1]" viewBox="0 0 12 12">
                                                    <path d="M12 0 L12 12 L0 12 A12 12 0 0 0 12 0 Z" />
                                                    <path d="M0 12 A12 12 0 0 0 12 0" fill="none" stroke="rgba(229, 231, 235, 0.9)" strokeWidth="1.2" />
                                                </svg>
                                            </div>
                                        </>
                                    )}
                                    <span>On Active Shift</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black transition-all ${
                                        statusTab === 'on_shift'
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
                                    }`}>
                                        {tabCounts.on_shift}
                                    </span>
                                </button>

                                {/* Tab 3: Cashiers */}
                                <button
                                    data-tab="cashiers"
                                    onClick={() => handleStatusTabChange('cashiers')}
                                    className={`group px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-t-xl text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap shrink-0 border-t-2 border-x relative cursor-pointer ${
                                        statusTab === 'cashiers'
                                            ? 'bg-white text-blue-800 font-black border-t-blue-600 border-x-gray-200/90 shadow-xs z-20'
                                            : 'bg-gray-100/70 hover:bg-gray-100 text-gray-500 hover:text-gray-800 font-bold border-transparent'
                                    }`}
                                >
                                    {statusTab === 'cashiers' && (
                                        <>
                                            <div className="absolute -bottom-px -left-3 w-3 h-3 pointer-events-none z-30 overflow-hidden">
                                                <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 12 12">
                                                    <path d="M12 0 L12 12 L0 12 A12 12 0 0 0 12 0 Z" />
                                                    <path d="M0 12 A12 12 0 0 0 12 0" fill="none" stroke="rgba(229, 231, 235, 0.9)" strokeWidth="1.2" />
                                                </svg>
                                            </div>
                                            <div className="absolute -bottom-px -right-3 w-3 h-3 pointer-events-none z-30 overflow-hidden">
                                                <svg className="w-3 h-3 text-white fill-current scale-x-[-1]" viewBox="0 0 12 12">
                                                    <path d="M12 0 L12 12 L0 12 A12 12 0 0 0 12 0 Z" />
                                                    <path d="M0 12 A12 12 0 0 0 12 0" fill="none" stroke="rgba(229, 231, 235, 0.9)" strokeWidth="1.2" />
                                                </svg>
                                            </div>
                                        </>
                                    )}
                                    <span>Cashiers</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black transition-all ${
                                        statusTab === 'cashiers'
                                            ? 'bg-blue-600 text-white shadow-2xs'
                                            : 'bg-blue-50 text-blue-700 group-hover:bg-blue-100'
                                    }`}>
                                        {tabCounts.cashiers}
                                    </span>
                                </button>

                                {/* Tab 4: Store Administrators */}
                                <button
                                    data-tab="admins"
                                    onClick={() => handleStatusTabChange('admins')}
                                    className={`group px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-t-xl text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap shrink-0 border-t-2 border-x relative cursor-pointer ${
                                        statusTab === 'admins'
                                            ? 'bg-white text-purple-800 font-black border-t-purple-600 border-x-gray-200/90 shadow-xs z-20'
                                            : 'bg-gray-100/70 hover:bg-gray-100 text-gray-500 hover:text-gray-800 font-bold border-transparent'
                                    }`}
                                >
                                    {statusTab === 'admins' && (
                                        <>
                                            <div className="absolute -bottom-px -left-3 w-3 h-3 pointer-events-none z-30 overflow-hidden">
                                                <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 12 12">
                                                    <path d="M12 0 L12 12 L0 12 A12 12 0 0 0 12 0 Z" />
                                                    <path d="M0 12 A12 12 0 0 0 12 0" fill="none" stroke="rgba(229, 231, 235, 0.9)" strokeWidth="1.2" />
                                                </svg>
                                            </div>
                                            <div className="absolute -bottom-px -right-3 w-3 h-3 pointer-events-none z-30 overflow-hidden">
                                                <svg className="w-3 h-3 text-white fill-current scale-x-[-1]" viewBox="0 0 12 12">
                                                    <path d="M12 0 L12 12 L0 12 A12 12 0 0 0 12 0 Z" />
                                                    <path d="M0 12 A12 12 0 0 0 12 0" fill="none" stroke="rgba(229, 231, 235, 0.9)" strokeWidth="1.2" />
                                                </svg>
                                            </div>
                                        </>
                                    )}
                                    <span>Store Admins</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black transition-all ${
                                        statusTab === 'admins'
                                            ? 'bg-purple-600 text-white shadow-2xs'
                                            : 'bg-purple-50 text-purple-700 group-hover:bg-purple-100'
                                    }`}>
                                        {tabCounts.admins}
                                    </span>
                                </button>

                                {/* Tab 5: Inactive / Suspended */}
                                <button
                                    data-tab="inactive"
                                    onClick={() => handleStatusTabChange('inactive')}
                                    className={`group px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-t-xl text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap shrink-0 border-t-2 border-x relative cursor-pointer ${
                                        statusTab === 'inactive'
                                            ? 'bg-white text-rose-900 font-black border-t-rose-600 border-x-gray-200/90 shadow-xs z-20'
                                            : 'bg-gray-100/70 hover:bg-gray-100 text-gray-500 hover:text-gray-800 font-bold border-transparent'
                                    }`}
                                >
                                    {statusTab === 'inactive' && (
                                        <>
                                            <div className="absolute -bottom-px -left-3 w-3 h-3 pointer-events-none z-30 overflow-hidden">
                                                <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 12 12">
                                                    <path d="M12 0 L12 12 L0 12 A12 12 0 0 0 12 0 Z" />
                                                    <path d="M0 12 A12 12 0 0 0 12 0" fill="none" stroke="rgba(229, 231, 235, 0.9)" strokeWidth="1.2" />
                                                </svg>
                                            </div>
                                            <div className="absolute -bottom-px -right-3 w-3 h-3 pointer-events-none z-30 overflow-hidden">
                                                <svg className="w-3 h-3 text-white fill-current scale-x-[-1]" viewBox="0 0 12 12">
                                                    <path d="M12 0 L12 12 L0 12 A12 12 0 0 0 12 0 Z" />
                                                    <path d="M0 12 A12 12 0 0 0 12 0" fill="none" stroke="rgba(229, 231, 235, 0.9)" strokeWidth="1.2" />
                                                </svg>
                                            </div>
                                        </>
                                    )}
                                    <span>Inactive / Revoked</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black transition-all ${
                                        statusTab === 'inactive'
                                            ? 'bg-rose-600 text-white shadow-2xs'
                                            : 'bg-rose-50 text-rose-700 group-hover:bg-rose-100'
                                    }`}>
                                        {tabCounts.inactive}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* ========================================================================= */}
                        {/* MAIN WHITE CARD CONTAINER                                                 */}
                        {/* ========================================================================= */}
                        <div className="bg-white rounded-b-2xl sm:rounded-tr-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col relative z-10">
                            
                            {/* UNIFIED TOOLBAR: Search, Filters & View Switcher */}
                            <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-white space-y-3 relative z-10">
                                
                                {/* Tier 1: Search & Filter Controls (1:1 with Inventory.jsx) */}
                                <div className="overflow-x-auto no-scrollbar pb-0.5">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:flex-nowrap gap-2.5 min-w-full sm:min-w-max lg:min-w-0">
                                        
                                        {/* Search Bar */}
                                        <div className="relative flex-1 min-w-full sm:min-w-[220px] lg:min-w-[240px]">
                                            <input
                                                type="text"
                                                placeholder="Search by name, email, phone, or account #..."
                                                value={searchFilter}
                                                onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
                                                className="w-full pl-11 pr-10 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-800 focus:bg-white focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/10 transition-all shadow-2xs placeholder:text-gray-400"
                                            />
                                            <svg className="w-5 h-5 text-gray-400 absolute left-3.5 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            {searchFilter && (
                                                <button onClick={() => { setSearchFilter(''); setCurrentPage(1); }} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                                </button>
                                            )}
                                        </div>

                                        {/* View Mode Toggle (Placed right after search bar, with List and Cards labels 1:1 with Inventory.jsx) */}
                                        <div className="hidden lg:inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 shrink-0 self-start sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={() => handleViewModeChange('table')}
                                                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs font-black' : 'text-gray-500 hover:text-gray-900 font-medium'}`}
                                                title="List View"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                                                <span className="hidden sm:inline">List</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleViewModeChange('grid')}
                                                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-xs font-black' : 'text-gray-500 hover:text-gray-900 font-medium'}`}
                                                title="Card View"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                                                <span className="hidden sm:inline">Cards</span>
                                            </button>
                                        </div>

                                        {/* Dropdowns (Single row with Search in Desktop/Tablet; 2nd row in Mobile) */}
                                        <div className="grid grid-cols-2 sm:flex sm:flex-nowrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
                                            
                                            {/* Role Dropdown */}
                                            <select
                                                value={roleFilter}
                                                onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                                                className="bg-gray-50/70 border border-gray-200 rounded-xl py-2.5 pl-3 pr-7 sm:pl-3.5 sm:pr-8 focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/10 text-gray-700 text-xs sm:text-sm font-semibold transition-all shadow-2xs w-full sm:w-[150px] lg:w-[165px] shrink-0 cursor-pointer truncate"
                                            >
                                                <option value="">All Roles</option>
                                                <option value="cashier">Cashiers</option>
                                                <option value="admin">Store Admins</option>
                                            </select>

                                            {/* Status Dropdown */}
                                            <select
                                                value={accountStatusFilter}
                                                onChange={(e) => { setAccountStatusFilter(e.target.value); setCurrentPage(1); }}
                                                className="bg-gray-50/70 border border-gray-200 rounded-xl py-2.5 pl-3 pr-7 sm:pl-3.5 sm:pr-8 focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/10 text-gray-700 text-xs sm:text-sm font-semibold transition-all shadow-2xs w-full sm:w-[150px] lg:w-[165px] shrink-0 cursor-pointer truncate"
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="active">Active Accounts</option>
                                                <option value="pending">Pending Setup</option>
                                                <option value="inactive">Revoked Access</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Tier 2: Action Buttons & Tools Strip (Admin Only) - 1:1 with Inventory.jsx */}
                                {auth.user.is_admin && (
                                    <div className="pt-2.5 border-t border-gray-100 pb-0.5 relative z-20">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 w-full">
                                            
                                            {/* Left Side: Section Label (Desktop Only) */}
                                            <div className="hidden lg:block">
                                                <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Staff Actions</span>
                                            </div>

                                            {/* Right Side Actions: Data & Export + Add Staff */}
                                            <div className="grid grid-cols-2 lg:flex lg:w-auto items-center gap-2 w-full shrink-0 justify-end">
                                                
                                                {/* Data & Export Dropdown */}
                                                <div className="relative data-menu-container w-full lg:w-auto shrink-0" ref={dataMenuRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDataMenu(!showDataMenu)}
                                                        className="w-full lg:w-auto justify-center px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#EFF4F9] text-[#1B3B6A] hover:bg-[#E2ECF6] border border-[#CBD7E6] shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#1B3B6A]">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                        </svg>
                                                        <span>Data & Export</span>
                                                        <svg className={`w-3.5 h-3.5 ml-0.5 text-gray-500 transition-transform duration-200 ${showDataMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>

                                                    {showDataMenu && (
                                                        <div className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 w-full sm:w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                                                            <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">Reports & Export</div>
                                                            <button
                                                                onClick={exportExcel}
                                                                disabled={isExporting}
                                                                className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                                                </svg>
                                                                Export to Excel (.xlsx)
                                                            </button>
                                                            <button
                                                                onClick={exportPDF}
                                                                disabled={isExporting}
                                                                className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-rose-600">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                                </svg>
                                                                Export to PDF Document
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 4. Add Staff Button */}
                                                <button
                                                    onClick={openAddModal}
                                                    className="w-full lg:w-auto justify-center px-3.5 sm:px-4 py-2.5 bg-[#1B3B6A] hover:bg-[#142E54] text-white rounded-xl font-bold shadow-md shadow-[#1B3B6A]/15 active:scale-95 transition-all text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                    </svg>
                                                    <span>Add Staff</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* DATA AREA: TABLE OR GRID */}
                            {loading ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin inline-block w-8 h-8 border-4 border-[#1B3B6A] border-t-transparent rounded-full mb-3"></div>
                                    <div className="text-sm font-bold text-gray-600">Loading staff directory...</div>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="p-12 text-center">
                                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                    </svg>
                                    <h3 className="text-base font-extrabold text-gray-900">No staff members found</h3>
                                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Try clearing search or adjusting your status filters.</p>
                                </div>
                            ) : (
                                <>
                                    {/* --- 1. DESKTOP TABLE VIEW (Visible on >= lg when viewMode === 'table') --- */}
                                    {viewMode === 'table' && (
                                        <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                                            <table className="w-full text-left text-xs min-w-[950px]">
                                                <thead className="bg-gray-50/90 border-b border-gray-200/80 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-500">
                                                    <tr>
                                                        <th className="p-3.5 sm:p-4 min-w-[200px]">Staff Member</th>
                                                        <th className="p-3.5 sm:p-4 min-w-[130px]">Role & Permissions</th>
                                                        <th className="p-3.5 sm:p-4 min-w-[180px]">Workstation Shift</th>
                                                        <th className="p-3.5 sm:p-4 min-w-[200px]">Contact Info</th>
                                                        <th className="p-3.5 sm:p-4 min-w-[120px]">Account Status</th>
                                                        <th className="p-3.5 sm:p-4 text-center min-w-[140px]">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 whitespace-nowrap">
                                                    {paginatedUsers.map((u) => {
                                                        const isOnShift = !!u.active_shift;
                                                        return (
                                                            <tr
                                                                key={u.id}
                                                                onClick={() => handleViewDetails(u)}
                                                                className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                                                            >
                                                                {/* Staff Name & Avatar */}
                                                                <td className="p-3.5 sm:p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        {u.avatar_path ? (
                                                                            <img src={getAvatarUrl(u.avatar_path)} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-2xs shrink-0" />
                                                                        ) : (
                                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-[#EFF4F9] text-[#1B3B6A] flex items-center justify-center font-black text-sm border border-gray-200 shrink-0 uppercase shadow-2xs">
                                                                                {u.name.charAt(0)}
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <div className="font-extrabold text-gray-900 text-sm group-hover:text-[#1B3B6A] transition-colors">{u.name}</div>
                                                                            <div className="text-[11px] font-mono font-bold text-gray-400 mt-0.5">
                                                                                {u.account_number ? `#${u.account_number}` : `ID: #${u.id}`}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                {/* Role */}
                                                                <td className="p-3.5 sm:p-4">
                                                                    {u.role === 'admin' ? (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/70 shadow-2xs">
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                                                                            Store Admin
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#1B3B6A]/10 text-[#1B3B6A] border border-[#1B3B6A]/20 shadow-2xs">
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                                                                            Cashier
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                {/* Workstation Shift */}
                                                                <td className="p-3.5 sm:p-4">
                                                                    {isOnShift ? (
                                                                        <div className="inline-flex flex-col">
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                                                                                On Shift · {u.active_shift.terminal?.name || 'POS Workstation'}
                                                                            </span>
                                                                            <span className="text-[10px] text-gray-500 font-semibold mt-1">
                                                                                Shift #{u.active_shift.id} · Float: ₱{formatCurrency(u.active_shift.starting_cash)}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200 shadow-2xs">
                                                                            Off Duty
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                {/* Contact */}
                                                                <td className="p-3.5 sm:p-4">
                                                                    <div className="font-bold text-gray-800">{u.email}</div>
                                                                    <div className="text-gray-500 text-[11px] font-medium mt-0.5">
                                                                        {u.phone_number || <span className="text-gray-300 italic">No phone set</span>}
                                                                    </div>
                                                                </td>

                                                                {/* Account Status */}
                                                                <td className="p-3.5 sm:p-4">
                                                                    {u.is_active === false ? (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                                            Revoked
                                                                        </span>
                                                                    ) : u.terms_accepted_at ? (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                                            Active
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                                                                            Pending Setup
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                {/* Action Buttons */}
                                                                <td className="p-3.5 sm:p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <button
                                                                            onClick={() => handleViewDetails(u)}
                                                                            title="View Details"
                                                                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors inline-flex items-center justify-center active:scale-95 cursor-pointer"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                        </button>

                                                                        <button
                                                                            onClick={() => openEditModal(u)}
                                                                            title="Edit Profile"
                                                                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center justify-center active:scale-95 cursor-pointer"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-600">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                                                            </svg>
                                                                        </button>

                                                                        {!u.terms_accepted_at && (
                                                                            <button
                                                                                onClick={() => handleResendInvite(u)}
                                                                                title="Resend Setup Email"
                                                                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors inline-flex items-center justify-center active:scale-95 cursor-pointer"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                                                                            </button>
                                                                        )}

                                                                        <button
                                                                            onClick={() => handleToggleActive(u)}
                                                                            title={u.is_active !== false ? 'Revoke Access' : 'Restore Access'}
                                                                            className={`p-1.5 rounded-lg transition-colors inline-flex items-center justify-center active:scale-95 cursor-pointer ${
                                                                                u.is_active !== false
                                                                                    ? 'text-gray-500 hover:text-rose-700 hover:bg-rose-50'
                                                                                    : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                                                            }`}
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" /></svg>
                                                                        </button>

                                                                        <button
                                                                            onClick={() => handleDelete(u)}
                                                                            title="Delete Staff"
                                                                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center justify-center active:scale-95 cursor-pointer"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* --- 2. RESPONSIVE CARD VIEW (Mobile/Tablet always, and Laptop/Desktop when viewMode === 'grid') --- */}
                                    <div className={`${viewMode === 'table' ? 'lg:hidden' : 'block'} p-3.5 sm:p-4 bg-gray-50/40 border-t lg:border-t-0 border-gray-100`}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                                            {paginatedUsers.map((u) => {
                                                const isOnShift = !!u.active_shift;
                                                return (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => handleViewDetails(u)}
                                                        className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:border-[#1B3B6A]/30 hover:shadow-md transition-all p-3.5 sm:p-5 flex flex-col justify-between cursor-pointer group"
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                                {u.role === 'admin' ? (
                                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/70 shadow-2xs">
                                                                        Store Admin
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#1B3B6A]/10 text-[#1B3B6A] border border-[#1B3B6A]/20 shadow-2xs">
                                                                        Cashier
                                                                    </span>
                                                                )}

                                                                {u.is_active === false ? (
                                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                                                        Revoked
                                                                    </span>
                                                                ) : u.terms_accepted_at ? (
                                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                                                        Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                                                                        Pending Setup
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-3 mb-3">
                                                                {u.avatar_path ? (
                                                                    <img src={getAvatarUrl(u.avatar_path)} alt={u.name} className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-200 shadow-2xs shrink-0" />
                                                                ) : (
                                                                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-slate-100 to-[#EFF4F9] text-[#1B3B6A] flex items-center justify-center font-black text-base sm:text-lg border-2 border-gray-200 shrink-0 uppercase shadow-2xs">
                                                                        {u.name.charAt(0)}
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0 flex-1">
                                                                    <h3 className="font-extrabold text-gray-900 text-sm sm:text-base truncate group-hover:text-[#1B3B6A] transition-colors">{u.name}</h3>
                                                                    <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{u.account_number ? `#${u.account_number}` : `ID: #${u.id}`}</p>
                                                                </div>
                                                            </div>

                                                            <div className={`p-2.5 rounded-xl border mb-3 text-xs ${
                                                                isOnShift
                                                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                                                    : 'bg-gray-50 border-gray-200/70 text-gray-600'
                                                            }`}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="font-bold truncate pr-1">
                                                                        {isOnShift ? (
                                                                            <span>On Shift ({u.active_shift.terminal?.name || 'POS'})</span>
                                                                        ) : (
                                                                            <span>Off Duty</span>
                                                                        )}
                                                                    </div>
                                                                    {isOnShift && (
                                                                        <span className="font-mono font-black text-emerald-700 shrink-0">
                                                                            ₱{formatCurrency(u.active_shift.starting_cash)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1 text-xs text-gray-600 mb-3 font-medium">
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                                                                    <span className="truncate">{u.email}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                                                                    <span className="truncate">{u.phone_number || 'No phone number'}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Staff Card Actions */}
                                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => handleViewDetails(u)}
                                                                className="flex-1 py-2 px-2.5 sm:px-3 text-xs font-bold text-[#1B3B6A] bg-[#EFF4F9] hover:bg-[#E2ECF6] rounded-xl border border-[#CBD7E6] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs truncate"
                                                                title="View Details"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                <span className="truncate">View Details</span>
                                                            </button>

                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {/* Edit Button */}
                                                                <button 
                                                                    onClick={() => openEditModal(u)} 
                                                                    className="p-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs"
                                                                    title="Edit Staff Member"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-700">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                                                    </svg>
                                                                </button>

                                                                {/* Resend Invite (if pending) */}
                                                                {!u.terms_accepted_at && (
                                                                    <button
                                                                        onClick={() => handleResendInvite(u)}
                                                                        className="p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs"
                                                                        title="Resend Setup Email"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                                                                    </button>
                                                                )}

                                                                {/* Revoke / Restore Access */}
                                                                <button
                                                                    onClick={() => handleToggleActive(u)}
                                                                    className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-2xs ${
                                                                        u.is_active !== false
                                                                            ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                                                                            : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                                                    }`}
                                                                    title={u.is_active !== false ? "Revoke Access" : "Restore Access"}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" /></svg>
                                                                </button>

                                                                {/* Delete */}
                                                                <button
                                                                    onClick={() => handleDelete(u)}
                                                                    className="p-2 text-gray-500 bg-gray-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 rounded-xl border border-gray-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs"
                                                                    title="Delete Staff"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* PAGINATION FOOTER */}
                            {totalPages > 1 && (
                                <div className="p-3.5 sm:p-4 border-t border-gray-200/80 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="text-xs text-gray-500 font-semibold text-center sm:text-left">
                                        Showing <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="font-bold text-gray-900">{filteredUsers.length}</span> staff members
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-gray-700 transition-colors shadow-2xs cursor-pointer"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs font-bold text-gray-700 px-2 font-mono">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-gray-700 transition-colors shadow-2xs cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. SLIDE-OVER STAFF DETAILS DRAWER (PORTALED)                              */}
            {/* ========================================================================= */}
            {showDetails && selectedStaff && typeof document !== 'undefined' && document.body && createPortal(
                <div className="fixed inset-0 z-[100] overflow-hidden">
                    <div
                        onClick={handleCloseDetails}
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    />

                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-3 sm:pl-10">
                        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-gray-200 animate-in slide-in-from-right duration-200">
                            
                            {/* Drawer Header */}
                            <div className="p-4 sm:p-6 bg-[#1B3B6A] text-white flex items-start justify-between shrink-0 shadow-md">
                                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                                    {selectedStaff.avatar_path ? (
                                        <img src={getAvatarUrl(selectedStaff.avatar_path)} alt={selectedStaff.name} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white/30 shadow-md shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 text-white flex items-center justify-center font-black text-lg sm:text-xl border-2 border-white/20 shrink-0 uppercase shadow-md">
                                            {selectedStaff.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h2 className="text-base sm:text-lg font-black text-white leading-tight truncate">{selectedStaff.name}</h2>
                                        <p className="text-xs text-white/80 font-mono mt-0.5 truncate">
                                            {selectedStaff.account_number ? `#${selectedStaff.account_number}` : `ID: #${selectedStaff.id}`}
                                        </p>
                                        <div className="flex items-center gap-1.5 sm:gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white shrink-0">
                                                {selectedStaff.role === 'admin' ? 'Store Admin' : 'Cashier'}
                                            </span>
                                            {selectedStaff.is_active === false ? (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shrink-0">
                                                    Revoked
                                                </span>
                                            ) : selectedStaff.terms_accepted_at ? (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shrink-0">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 shrink-0">
                                                    Pending Setup
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCloseDetails}
                                    className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer shrink-0 ml-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Drawer Body */}
                            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 sm:space-y-6 bg-gray-50/50">

                                {/* Live Shift Card if on duty */}
                                {selectedStaff.active_shift ? (
                                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
                                        <div className="flex items-center justify-between mb-2.5">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                                Currently on Active Shift
                                            </span>
                                            <span className="text-xs font-mono font-extrabold text-emerald-900">
                                                Shift #{selectedStaff.active_shift.id}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex flex-col justify-between h-full min-h-[58px]">
                                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Workstation</div>
                                                <div className="font-black text-gray-900 mt-1 truncate">{selectedStaff.active_shift.terminal?.name || 'Register 1'}</div>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex flex-col justify-between h-full min-h-[58px]">
                                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Opening Float</div>
                                                <div className="font-black text-emerald-700 mt-1 font-mono truncate">₱{formatCurrency(selectedStaff.active_shift.starting_cash)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 text-center shadow-2xs">
                                        <span className="text-xs font-bold text-gray-500">Staff is currently off duty (No active shift)</span>
                                    </div>
                                )}

                                {/* Performance & Activity Stats */}
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2.5">Staff POS Activity</h4>
                                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between h-full min-h-[76px]">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">Total Shifts</div>
                                            <div className="text-lg sm:text-xl font-black text-gray-900 font-mono mt-1">{selectedStaff.shifts_count || 0}</div>
                                        </div>
                                        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between h-full min-h-[76px]">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">Completed Sales</div>
                                            <div className="text-lg sm:text-xl font-black text-gray-900 font-mono mt-1">{selectedStaff.sales_count || 0}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact & Profile Details */}
                                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2">Account Profile Details</h4>
                                    
                                    <div className="text-xs">
                                        <span className="text-gray-400 font-bold block text-[10px] uppercase">Email Address</span>
                                        <span className="font-extrabold text-gray-800 break-all">{selectedStaff.email}</span>
                                    </div>

                                    <div className="text-xs">
                                        <span className="text-gray-400 font-bold block text-[10px] uppercase">Phone Number</span>
                                        <span className="font-extrabold text-gray-800">{selectedStaff.phone_number || 'Not provided'}</span>
                                    </div>

                                    <div className="text-xs">
                                        <span className="text-gray-400 font-bold block text-[10px] uppercase">Assigned Address</span>
                                        <span className="font-extrabold text-gray-800">
                                            {[selectedStaff.address, selectedStaff.city, selectedStaff.province].filter(Boolean).join(', ') || 'No address logged'}
                                        </span>
                                    </div>

                                    <div className="text-xs">
                                        <span className="text-gray-400 font-bold block text-[10px] uppercase">Account Created</span>
                                        <span className="font-extrabold text-gray-800 font-mono">
                                            {selectedStaff.created_at ? new Date(selectedStaff.created_at).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                            </div>

                            {/* Drawer Footer */}
                            <div className="p-3.5 sm:p-4 bg-white border-t border-gray-200 flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                                <button
                                    onClick={() => { handleCloseDetails(); openEditModal(selectedStaff); }}
                                    className="flex-1 min-w-[120px] py-2.5 bg-[#1B3B6A] hover:bg-[#142D52] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                    </svg>
                                    Edit Profile
                                </button>

                                {!selectedStaff.terms_accepted_at && (
                                    <button
                                        onClick={() => handleResendInvite(selectedStaff)}
                                        className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs transition-colors cursor-pointer shrink-0"
                                    >
                                        Resend Invite
                                    </button>
                                )}

                                <button
                                    onClick={() => handleToggleActive(selectedStaff)}
                                    className={`px-3 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                                        selectedStaff.is_active !== false
                                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    }`}
                                >
                                    {selectedStaff.is_active !== false ? 'Revoke Access' : 'Restore'}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ========================================================================= */}
            {/* 4. ADD / EDIT STAFF MODAL (PORTALED - MATCHING INVENTORY.JSX LABEL SIZES)   */}
            {/* ========================================================================= */}
            {showModal && typeof document !== 'undefined' && document.body && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto sm:my-8">
                        
                        {/* Header */}
                        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#1B3B6A] text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-sm sm:text-base font-black text-white">
                                    {editMode ? 'Edit Staff Member' : 'Register New Staff Member'}
                                </h3>
                                <p className="text-[11px] sm:text-xs text-white/70 font-medium mt-0.5">
                                    {editMode ? 'Update employee identity, contact, and system role' : 'Create account & send secure 24-hour setup invite'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Employee ID & Role */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                                        Account / Employee #
                                    </label>
                                    <input
                                        type="text"
                                        value={data.account_number}
                                        disabled={editMode}
                                        onChange={(e) => setData('account_number', e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-gray-700 disabled:opacity-75"
                                        placeholder="10000001"
                                    />
                                    {errors.account_number && <div className="text-rose-500 text-xs mt-1">{errors.account_number}</div>}
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                                        System Role <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={data.role}
                                        onChange={(e) => setData('role', e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/10 cursor-pointer"
                                    >
                                        <option value="cashier">Cashier</option>
                                        <option value="admin">Store Administrator</option>
                                    </select>
                                </div>
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/10"
                                    placeholder="e.g. Maria Santos"
                                />
                                {errors.name && <div className="text-rose-500 text-xs mt-1">{errors.name}</div>}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                                    Email Address <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/10"
                                    placeholder="employee@store.com"
                                />
                                {errors.email && <div className="text-rose-500 text-xs mt-1">{errors.email}</div>}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={data.phone_number}
                                    onChange={handlePhoneChange}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-[#1B3B6A] focus:ring-2 focus:ring-[#1B3B6A]/10"
                                    placeholder="09171234567"
                                />
                            </div>

                            {/* Address Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">City</label>
                                    <input
                                        type="text"
                                        value={data.city}
                                        onChange={(e) => setData('city', e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-[#1B3B6A]"
                                        placeholder="Manila"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">Province</label>
                                    <input
                                        type="text"
                                        value={data.province}
                                        onChange={(e) => setData('province', e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-[#1B3B6A]"
                                        placeholder="Metro Manila"
                                    />
                                </div>
                            </div>

                            {/* Optional Direct Password (for Edit Mode) */}
                            {editMode && (
                                <div className="pt-2 border-t border-gray-100">
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                                        Reset Password <span className="text-gray-400 font-normal text-xs">(Leave blank to keep unchanged)</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-[#1B3B6A]"
                                        placeholder="••••••••"
                                        minLength={8}
                                    />
                                </div>
                            )}

                            {/* Avatar Upload */}
                            {editMode && (
                                <div className="pt-2 border-t border-gray-100">
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                                        Profile Avatar
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setData('avatar', e.target.files[0])}
                                        className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1B3B6A]/10 file:text-[#1B3B6A] hover:file:bg-[#1B3B6A]/20 cursor-pointer bg-gray-50 border border-gray-200 rounded-xl p-1"
                                    />
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="pt-3.5 sm:pt-4 border-t border-gray-200 flex justify-end gap-2 sm:gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || isSendingOtp || processing}
                                    className="px-5 sm:px-6 py-2.5 bg-[#1B3B6A] hover:bg-[#142D52] text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {isSaving || isSendingOtp ? 'Saving...' : (editMode ? 'Save Changes' : 'Send Invite')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </AuthenticatedLayout>
    );
}