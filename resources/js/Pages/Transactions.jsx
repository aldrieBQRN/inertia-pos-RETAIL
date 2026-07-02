import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import usePrinterStore from '@/Stores/usePrinterStore';

export default function Transactions({ auth }) {
    // 1. Hybrid Engine States
    const [allTransactions, setAllTransactions] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Client-Side Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filtering States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchFilter, setSearchFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState(''); // Payment Filter State

    // Detail View States
    const [showDetails, setShowDetails] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);

    // Global Printer Store Access
    const { printReceipt } = usePrinterStore();

    const formatCurrency = (cents) => {
        return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Helper function for UI badging
    const getPaymentBadgeStyle = (method) => {
        switch(method) {
            case 'gcash': return 'bg-blue-100 text-blue-700';
            case 'maya': return 'bg-green-100 text-green-700';
            case 'credit_card': return 'bg-purple-100 text-purple-700';
            case 'debit_card': return 'bg-indigo-100 text-indigo-700';
            default: return 'bg-gray-100 text-gray-700'; // cash or unknown
        }
    };

    const formatPaymentName = (method) => {
        if (!method) return 'Unknown';
        if (method === 'credit_card') return 'Credit';
        if (method === 'debit_card') return 'Debit';
        return method;
    };

    const handleReprint = async (sale) => {
        try {
            await printReceipt(sale, settings);
        } catch (err) {
            console.error(err);
            Swal.fire("Reprint Failed", "Ensure your printer is connected in Settings.", "error");
        }
    };

    // 2. Initial Load & Background Polling Setup
    useEffect(() => {
        fetchSettings();
        loadAllTransactions(true);

        // SILENT BACKGROUND POLLING: Fetches fresh sales every 5 seconds
        const interval = setInterval(() => {
            loadAllTransactions(false); // false = don't show loading spinner
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Reset Pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, searchFilter, paymentFilter]);

    const fetchSettings = async () => {
        try { const res = await axios.get('/api/settings'); setSettings(res.data); } catch (e) {}
    };

    // 3. Fetches ALL transactions for the Hybrid Engine
    const loadAllTransactions = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const response = await axios.get('/api/transactions', { params: { all: true } });
            // Extract the array correctly based on how your backend sends `all: true`
            const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setAllTransactions(data);
        } catch (error) {
            console.error("Critical error loading transactions:", error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    // 4. CLIENT-SIDE FILTER ENGINE (Instant Search, Date Filter & Payment Filter)
    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(sale => {
            // Text Search
            let matchesSearch = true;
            if (searchFilter) {
                const searchLower = searchFilter.toLowerCase();
                const invoice = sale.invoice_number ? sale.invoice_number.toLowerCase() : '';
                const cashier = sale.cashier?.name ? sale.cashier.name.toLowerCase() : '';
                matchesSearch = invoice.includes(searchLower) || cashier.includes(searchLower);
            }

            // Date Range Search (Using simple string comparison for YYYY-MM-DD)
            let matchesDate = true;
            if (startDate || endDate) {
                const saleDateStr = sale.created_at ? sale.created_at.split('T')[0] : '';
                if (startDate && saleDateStr < startDate) matchesDate = false;
                if (endDate && saleDateStr > endDate) matchesDate = false;
            }

            // Payment Method Search
            let matchesPayment = true;
            if (paymentFilter) {
                matchesPayment = (sale.payment_method || '').toLowerCase() === paymentFilter.toLowerCase();
            }

            return matchesSearch && matchesDate && matchesPayment;
        });
    }, [allTransactions, searchFilter, startDate, endDate, paymentFilter]);

    // 5. CLIENT-SIDE PAGINATION
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // 6. INSTANT PDF EXPORT (Uses memory data)
    const exportPDF = async () => {
        setIsExporting(true);
        try {
            const exportData = filteredTransactions;

            if (!exportData || exportData.length === 0) {
                Swal.fire('No Data', 'No transactions found to export.', 'info');
                setIsExporting(false);
                return;
            }

            const doc = new jsPDF('landscape');
            const pageWidth = doc.internal.pageSize.width;

            // --- PROFESSIONAL HEADER DESIGN ---
            const storeName = settings?.store_name || 'POS Store System';
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
            doc.text('Sales & Transaction Report', 14, currentY);

            currentY += 6;
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.setFont(undefined, 'normal');

            let filterParts = [];
            if (startDate || endDate) filterParts.push(`Period: ${startDate || 'Start'} to ${endDate || 'Present'}`);
            if (paymentFilter) filterParts.push(`Payment: ${formatPaymentName(paymentFilter).toUpperCase()}`);
            if (searchFilter) filterParts.push(`Search: "${searchFilter}"`);

            const filterText = filterParts.length > 0 ? filterParts.join(' | ') : 'Period: All Time';
            doc.text(filterText, 14, currentY);

            const generatedText = `Generated: ${new Date().toLocaleString()}`;
            const textWidth = doc.getTextWidth(generatedText);
            doc.text(generatedText, pageWidth - 14 - textWidth, currentY);

            const tableStartY = currentY + 8;
            // --- END HEADER DESIGN ---

            // Table Setup
            const tableColumns = ["Invoice #", "Date", "Cashier", "Payment Method", "Status", "Total Items", "Total Amount"];
            const tableRows = [];
            let totalValidAmount = 0;
            let totalVoidedAmount = 0;
            let validCount = 0;
            let voidedCount = 0;
            const paymentBreakdown = {};

            exportData.forEach(sale => {
                const safeItems = sale.items || [];
                const totalItemsCount = safeItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                const itemsSummary = totalItemsCount > 0 ? `${totalItemsCount} item(s)` : '0 items';

                const refNum = sale.payment_reference || sale.reference_number;

                let formattedMethod = (sale.payment_method || 'Unknown').toUpperCase();
                if (sale.payment_method === 'credit_card') formattedMethod = 'CREDIT CARD';
                if (sale.payment_method === 'debit_card') formattedMethod = 'DEBIT CARD';

                const paymentMethodText = formattedMethod
                    + (sale.is_senior ? ' (PWD/SR)' : '')
                    + (refNum ? `\nRef: ${refNum}` : '');

                const total = (sale.total_amount || 0) / 100;
                const paymentMethod = sale.payment_method || 'cash';

                if (sale.status !== 'void') {
                    totalValidAmount += total;
                    validCount++;
                    if (!paymentBreakdown[paymentMethod]) {
                        paymentBreakdown[paymentMethod] = 0;
                    }
                    paymentBreakdown[paymentMethod] += total;
                } else {
                    totalVoidedAmount += total;
                    voidedCount++;
                }

                tableRows.push([
                    sale.invoice_number || 'N/A',
                    sale.created_at ? new Date(sale.created_at).toLocaleString() : 'N/A',
                    sale.cashier?.name || 'Unknown',
                    paymentMethodText,
                    sale.status === 'void' ? 'VOIDED' : 'PAID',
                    itemsSummary,
                    `PHP ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                ]);
            });

            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: tableStartY,
                theme: 'striped',
                headStyles: { fillColor: '#1A3A69', textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 4, valign: 'middle' },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 4) {
                        if (data.cell.raw === 'VOIDED') {
                            data.cell.styles.textColor = [220, 38, 38];
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [22, 163, 74];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            // -------------------------------------------------------
            // DETAILED TRANSACTION SUMMARY BOX (Bottom of PDF)
            // -------------------------------------------------------
            let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : tableStartY + 20;

            // If the table went too far down, add a new page for the summary so it doesn't cut off
            if (finalY > 165) {
                doc.addPage();
                finalY = 20;
            }

            // Draw Summary Box Background
            doc.setFillColor(249, 250, 251); // bg-gray-50
            doc.setDrawColor(229, 231, 235); // border-gray-200
            doc.rect(14, finalY, pageWidth - 28, 50, 'FD');

            // Summary Box Title
            doc.setFontSize(12);
            doc.setTextColor(31, 41, 55);
            doc.setFont(undefined, 'bold');
            doc.text('Transaction Summary Report', 20, finalY + 8);

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(75, 85, 99);

            // Left Column
            doc.text(`Total Transactions: ${exportData.length}`, 20, finalY + 16);
            doc.text(`Valid Transactions: ${validCount}`, 20, finalY + 23);
            doc.text(`Voided Transactions: ${voidedCount}`, 20, finalY + 30);

            // Middle Column
            doc.text(`Total Valid Sales: PHP ${totalValidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth / 2 - 20, finalY + 16);
            doc.text(`Total Voided Amount: PHP ${totalVoidedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth / 2 - 20, finalY + 23);
            doc.text(`Net Total: PHP ${(totalValidAmount - totalVoidedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth / 2 - 20, finalY + 30);

            // Right Column (Payment Breakdown)
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text('Payment Breakdown:', pageWidth - 70, finalY + 16);

            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            let breakdownY = finalY + 23;
            Object.entries(paymentBreakdown).forEach(([method, amount], index) => {
                const displayMethod = method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ');
                doc.text(`${displayMethod}: PHP ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 70, breakdownY);
                breakdownY += 5;
            });

            const filename = `Sales_Report_${startDate || 'All'}_to_${endDate || 'All'}.pdf`;
            doc.save(filename);
            Swal.fire({ icon: 'success', title: 'PDF Exported!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } catch (error) {
            console.error("PDF Generation Error:", error);
            Swal.fire('Error', 'Failed to generate PDF report. Check console for details.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleVoid = async (sale) => {
        const result = await Swal.fire({
            title: 'Void Transaction?',
            text: `This will cancel Invoice ${sale.invoice_number} and return items to inventory.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, Void it!'
        });

        if (result.isConfirmed) {
            try {
                await axios.post(`/api/transactions/${sale.id}/void`);
                Swal.fire('Voided!', 'Transaction has been voided.', 'success');
                loadAllTransactions(false); // Silent reload to update list instantly
            } catch (error) {
                Swal.fire('Error', error.response?.data?.message || 'Failed to void.', 'error');
            }
        }
    };

    const handleViewDetails = (sale) => {
        setSelectedSale(sale);
        setShowDetails(true);
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800">Transactions</h2>}>
            <Head title="Sales History" />

            <div className="py-4 sm:py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">

                    {/* RESPONSIVE FILTER CARD */}
                    <div className="px-4 sm:px-0">
                        <div className="flex flex-col xl:flex-row gap-3 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100">

                            {/* Search Input - Fixed width on Desktop, expands to full width on mobile */}
                            <div className="relative w-full xl:w-80 shrink-0">
                                <input
                                    type="text"
                                    placeholder="Search Invoice or Cashier..."
                                    className="pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white w-full text-sm font-medium transition-colors"
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-4 top-2.5 sm:top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>

                            {/* Filters & Export Container - Wraps automatically when window is minimized */}
                            <div className="flex flex-col xl:flex-row gap-3 w-full xl:flex-1">

                                {/* Date Filters Container */}
                                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto shrink-0">
                                <div className="flex-1 flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-colors">
                                    <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider w-8">From</span>
                                    <input
                                        type="date"
                                        className="w-full bg-transparent border-none p-0 text-xs sm:text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1 flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-colors">
                                    <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider w-8">To</span>
                                    <input
                                        type="date"
                                        className="w-full bg-transparent border-none p-0 text-xs sm:text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Row for Payment Filter & Export */}
                                <div className="flex gap-3 w-full xl:flex-1 min-w-[260px]">
                                    {/* Payment Method Filter */}
                                    <select
                                        value={paymentFilter}
                                        onChange={(e) => setPaymentFilter(e.target.value)}
                                        className="flex-1 min-w-[140px] bg-white border border-gray-200 rounded-lg px-3 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium text-gray-600 transition-colors cursor-pointer"
                                    >
                                        <option value="">All Payments</option>
                                        <option value="cash">Cash</option>
                                        <option value="gcash">GCash</option>
                                        <option value="maya">Maya</option>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="debit_card">Debit/BancNet</option>
                                    </select>

                                    {/* EXPORT PDF BUTTON */}
                                    {auth.user.is_admin && (
                                        <button
                                            onClick={exportPDF}
                                            disabled={isExporting}
                                            className={`shrink-0 px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs sm:text-sm active:scale-95
                                                ${isExporting
                                                    ? 'opacity-50 cursor-not-allowed bg-green-600 text-white'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                                }`}
                                        >
                                            {isExporting ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 shrink-0 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    <span className="whitespace-nowrap">Exporting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                    </svg>
                                                    <span className="whitespace-nowrap">Export PDF</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TABLE: DESKTOP VIEW */}
                    <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mx-4 sm:mx-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b text-gray-500 uppercase text-[10px] font-black tracking-wider">
                                    <tr>
                                        <th className="p-4">Invoice / Status</th>
                                        <th className="p-4">Date & Time</th>
                                        <th className="p-4">Cashier</th>
                                        <th className="p-4">Payment</th>
                                        <th className="p-4 text-right">Total</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, index) => (
                                            <tr key={`skel-${index}`} className="animate-pulse">
                                                <td className="p-4">
                                                    <div className="h-5 bg-gray-200 rounded-md w-24 mb-1"></div>
                                                    <div className="h-4 bg-gray-200 rounded-md w-12"></div>
                                                </td>
                                                <td className="p-4"><div className="h-4 bg-gray-200 rounded-md w-32"></div></td>
                                                <td className="p-4"><div className="h-4 bg-gray-200 rounded-md w-20"></div></td>
                                                <td className="p-4"><div className="h-5 bg-gray-200 rounded-md w-16"></div></td>
                                                <td className="p-4 flex justify-end"><div className="h-6 bg-gray-200 rounded-md w-24 mt-1"></div></td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-2">
                                                        <div className="w-9 h-9 bg-gray-200 rounded-md"></div>
                                                        {auth.user.is_admin && <div className="w-9 h-9 bg-gray-200 rounded-md"></div>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : paginatedTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center py-6">
                                                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                    </svg>
                                                    <h3 className="text-lg font-bold text-gray-900">No transactions found</h3>
                                                    <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                                                        We couldn't find any transactions matching your current filters.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedTransactions.map((sale) => (
                                            <tr key={sale.id} className={`transition-colors ${sale.status === 'void' ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                                                <td className="p-4">
                                                    <div className={`font-mono font-bold ${sale.status === 'void' ? 'text-red-500 line-through' : 'text-blue-600'}`}>{sale.invoice_number}</div>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded mt-1 text-[9px] font-black uppercase tracking-widest ${sale.status === 'void' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {sale.status === 'void' ? 'VOID' : 'PAID'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-gray-500 font-medium">{new Date(sale.created_at).toLocaleString()}</td>
                                                <td className="p-4 font-bold text-gray-700">{sale.cashier?.name || 'Staff'}</td>
                                                <td className="p-4">
                                                    <div>
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${getPaymentBadgeStyle(sale.payment_method)}`}>
                                                            {formatPaymentName(sale.payment_method)}
                                                        </span>
                                                        {sale.is_senior && <span className="ml-2 bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">Discount</span>}
                                                    </div>
                                                </td>
                                                <td className={`p-4 text-right font-black text-lg ${sale.status === 'void' ? 'text-red-400' : 'text-gray-900'}`}>₱{formatCurrency(sale.total_amount)}</td>
                                                <td className="p-4 flex justify-center gap-2">
                                                    <button onClick={() => handleViewDetails(sale)} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors" title="View Details">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </button>

                                                    {sale.status !== 'void' && (
                                                        <>
                                                            {!auth.user.is_admin && (
                                                                <button onClick={() => handleReprint(sale)} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors" title="Reprint">
                                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                                </button>
                                                            )}
                                                            {auth.user.is_admin && (
                                                                <button onClick={() => handleVoid(sale)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors" title="Void">
                                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
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
                                <div key={`mob-skel-${index}`} className="p-4 flex flex-col gap-3 animate-pulse border-b border-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-1 w-1/2">
                                            <div className="h-6 bg-gray-200 rounded-md w-3/4"></div>
                                            <div className="h-3 bg-gray-200 rounded-md w-1/2"></div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 w-1/3">
                                            <div className="h-4 bg-gray-200 rounded-md w-1/2 mb-1"></div>
                                            <div className="h-6 bg-gray-200 rounded-md w-3/4"></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : paginatedTransactions.length === 0 ? (
                            <div className="p-10 text-center text-gray-500 font-bold text-sm">
                                No transactions found. Adjust filters to see results.
                            </div>
                        ) : (
                            paginatedTransactions.map((sale) => (
                                <div key={sale.id} className={`p-4 flex flex-col gap-3 transition-colors ${sale.status === 'void' ? 'bg-red-50/30' : 'active:bg-gray-50'}`}>
                                    {/* Top Row: Invoice & Status */}
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex flex-col min-w-0">
                                            <div className={`font-mono font-black text-base tracking-tight truncate ${sale.status === 'void' ? 'text-red-500 line-through' : 'text-gray-900'}`}>{sale.invoice_number}</div>
                                            <div className="text-xs text-gray-400 font-medium mt-0.5">{new Date(sale.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0">
                                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mb-1 whitespace-nowrap ${sale.status === 'void' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {sale.status === 'void' ? 'VOID' : 'PAID'}
                                            </span>
                                            <span className="font-black text-lg text-gray-900">₱{formatCurrency(sale.total_amount)}</span>
                                        </div>
                                    </div>

                                    {/* Meta Row: Cashier & Payment */}
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-500 mt-1 py-2 border-t border-gray-100">
                                        <span className="truncate">{sale.cashier?.name || 'Staff'}</span>
                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                            <span className={`px-2 py-0.5 rounded text-[9px] whitespace-nowrap ${getPaymentBadgeStyle(sale.payment_method)}`}>
                                                {formatPaymentName(sale.payment_method)}
                                            </span>
                                            {sale.is_senior && <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[9px] whitespace-nowrap">Discount</span>}
                                        </div>
                                    </div>

                                    {/* Action Buttons: Native App Style */}
                                    <div className={`grid gap-2 pt-2 ${sale.status === 'void' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        <button onClick={() => handleViewDetails(sale)} className="py-2 px-3 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg border border-blue-200 shadow-sm active:scale-95 transition-transform">View Details</button>

                                        {sale.status !== 'void' && (
                                            <>
                                                {!auth.user.is_admin && (
                                                    <button onClick={() => handleReprint(sale)} className="py-2 px-3 text-xs font-bold text-gray-700 bg-white rounded-lg border border-gray-200 shadow-sm active:scale-95 transition-transform">Reprint</button>
                                                )}
                                                {auth.user.is_admin && (
                                                    <button onClick={() => handleVoid(sale)} className="py-2 px-3 text-xs font-bold text-red-600 bg-red-50 rounded-lg border border-red-100 shadow-sm active:scale-95 transition-transform">Void Order</button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* SMOOTH HORIZONTAL PAGINATION WITH SMART PAGE DISPLAY */}
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
                                        <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="px-3.5 py-2 min-h-9 rounded-lg text-xs font-bold border transition-all bg-white text-gray-600 border-gray-200 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap flex items-center">&laquo; Prev</button>
                                        {getPageNumbers().map((num, idx) => (
                                            num === '...' ? (
                                                <span key={`ellipsis-${idx}`} className="px-2 py-2 min-h-9 text-gray-400 font-bold flex items-center">...</span>
                                            ) : (
                                                <button
                                                    key={num}
                                                    onClick={() => { setCurrentPage(num); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                                                    className={`shrink-0 px-3.5 py-2 min-h-9 rounded-lg text-xs font-bold border transition-all flex items-center justify-center
                                                        ${currentPage === num ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    {num}
                                                </button>
                                            )
                                        ))}
                                        <button disabled={currentPage === totalPages} onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="px-3.5 py-2 min-h-9 rounded-lg text-xs font-bold border transition-all bg-white text-gray-600 border-gray-200 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap flex items-center">Next &raquo;</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* TRANSACTION DETAILS MODAL */}
            {showDetails && selectedSale && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
                    <div className="absolute inset-0" onClick={() => setShowDetails(false)}></div>

                    <div className="relative bg-white w-full max-w-lg rounded-t-xl md:rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] md:max-h-[90vh] animate-slide-up sm:animate-fade-in-up">

                        <div className="md:hidden flex justify-center pt-3 pb-1 bg-gray-900 w-full" onClick={() => setShowDetails(false)}>
                            <div className="w-12 h-1.5 bg-white/30 rounded"></div>
                        </div>

                        <div className="bg-gray-900 px-6 py-5 flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="text-xl font-black tracking-tight">Order Details</h3>
                                <div className="text-xs text-blue-400 font-mono mt-0.5">{selectedSale.invoice_number}</div>
                            </div>
                            <button onClick={() => setShowDetails(false)} className="text-white/50 hover:text-white p-2 -mr-2 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-gray-50 custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="text-gray-400 uppercase text-[10px] font-black tracking-widest border-b border-gray-200">
                                    <tr><th className="text-left pb-3">Item</th><th className="text-center pb-3">Qty</th><th className="text-right pb-3">Total</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {selectedSale.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-4 pr-2">
                                                <div className="font-bold text-gray-900 leading-tight">{item.product?.name || item.custom_name || 'Unknown Product'}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 font-medium">₱{formatCurrency(item.unit_price)} / pc</div>
                                            </td>
                                            <td className="py-4 text-center font-black text-gray-500">x{item.quantity}</td>
                                            <td className="py-4 text-right font-black text-gray-900">₱{formatCurrency(item.unit_price * item.quantity)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white p-6 border-t border-gray-100 shrink-0 space-y-3 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Method</span>
                                <span className={`font-black uppercase px-3 py-1 rounded text-xs ${getPaymentBadgeStyle(selectedSale.payment_method)}`}>
                                    {formatPaymentName(selectedSale.payment_method)}
                                </span>
                            </div>

                            {/* HIGHLIGHTED REFERENCE NUMBER DISPLAY (Clean without bg/borders) */}
                            {(selectedSale.payment_reference || selectedSale.reference_number) && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Ref Number</span>
                                    <span className="font-mono font-bold text-gray-700">
                                        {selectedSale.payment_reference || selectedSale.reference_number}
                                    </span>
                                </div>
                            )}

                            {selectedSale.payment_method === 'cash' && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Cash Given</span>
                                        <span className="font-bold text-gray-700">₱{formatCurrency(selectedSale.cash_given || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Change</span>
                                        <span className="font-bold text-gray-700">₱{formatCurrency(selectedSale.change || 0)}</span>
                                    </div>
                                </>
                            )}

                            {selectedSale.is_senior && (
                                <>
                                    {(() => {
                                        const itemsSubtotal = selectedSale.items.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
                                        return (
                                            <>
                                                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                                                    <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Subtotal</span>
                                                    <span className="font-bold text-gray-700">₱{formatCurrency(itemsSubtotal)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-green-600 text-sm font-bold uppercase tracking-wider">Less: 20% Discount</span>
                                                    <span className="font-bold text-green-600">-₱{formatCurrency(selectedSale.discount_amount || 0)}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                                <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Total Paid</span>
                                <span className="text-3xl font-black text-gray-900 tracking-tight">₱{formatCurrency(selectedSale.total_amount)}</span>
                            </div>
                            <button onClick={() => setShowDetails(false)} className="w-full py-4 bg-gray-900 text-white rounded-lg font-bold text-lg hover:bg-black transition-all active:scale-95 shadow-lg mt-4 hidden md:block">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}