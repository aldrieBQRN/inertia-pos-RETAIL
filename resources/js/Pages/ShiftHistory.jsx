import React, { useState, useEffect, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ShiftHistory({ auth }) {
    // 1. Hybrid Engine States
    const [allShifts, setAllShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    // Modal States
    const [showDetails, setShowDetails] = useState(false);
    const [selectedShiftData, setSelectedShiftData] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Client-Side Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filtering States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Helpers
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
    const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';
    const formatCurrencyPH = (val) => parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const formatNumber = (num) => num.toLocaleString('en-US');
    const formatNumberWithDecimals = (num) => parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tableColSpan = 9;

    const handleViewDetails = async (shift) => {
        setIsLoadingDetails(true);
        setShowDetails(true);
        setSelectedShiftData(null); // clear old data
        try {
            const res = await axios.get(`/api/pos/shift/data/${shift.id}`);
            setSelectedShiftData({ ...res.data, id: shift.id });
        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Failed to load shift details.", "error");
            setShowDetails(false);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // 2. Initial Load & Background Polling Setup
    useEffect(() => {
        fetchSettings();
        loadAllShifts(true);

        const interval = setInterval(() => {
            loadAllShifts(false);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, searchQuery]);

    const fetchSettings = async () => {
        try { const res = await axios.get('/api/settings'); setSettings(res.data); } catch (e) {}
    };

    const loadAllShifts = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const response = await axios.get('/api/shifts', { params: { all: true } });
            const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setAllShifts(data);
        } catch (error) {
            console.error("Critical error loading shifts:", error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const filteredShifts = useMemo(() => {
        return allShifts.filter(shift => {
            let matchesSearch = true;
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                const cashierName = shift.user?.name ? shift.user.name.toLowerCase() : '';
                matchesSearch = cashierName.includes(searchLower);
            }

            let matchesDate = true;
            if (startDate || endDate) {
                const shiftDateStr = shift.start_time ? shift.start_time.split('T')[0] : '';
                if (startDate && shiftDateStr < startDate) matchesDate = false;
                if (endDate && shiftDateStr > endDate) matchesDate = false;
            }

            return matchesSearch && matchesDate;
        });
    }, [allShifts, searchQuery, startDate, endDate]);

    const totalPages = Math.ceil(filteredShifts.length / itemsPerPage);
    const paginatedShifts = filteredShifts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const exportPDF = async () => {
        setIsExporting(true);
        try {
            const exportData = filteredShifts;

            if (!exportData || exportData.length === 0) {
                Swal.fire('No Data', 'No shift records found to export.', 'info');
                setIsExporting(false);
                return;
            }

            const doc = new jsPDF('landscape');
            const pageWidth = doc.internal.pageSize.width;

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

            if (storeAddress) { currentY += 6; doc.text(storeAddress, 14, currentY); }
            if (storeContact) { currentY += 5; doc.text(storeContact, 14, currentY); }

            currentY += 8;
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.5);
            doc.line(14, currentY, pageWidth - 14, currentY);

            currentY += 10;
            doc.setFontSize(16);
            doc.setTextColor(31, 41, 55);
            doc.setFont(undefined, 'bold');
            doc.text('Shift Accountability Report', 14, currentY);

            currentY += 6;
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.setFont(undefined, 'normal');

            let filterParts = [];
            if (startDate || endDate) {
                filterParts.push(`Period: ${startDate ? formatDate(startDate) : 'Start'} to ${endDate ? formatDate(endDate) : 'Present'}`);
            }
            if (searchQuery) filterParts.push(`Search: "${searchQuery}"`);

            const filterText = filterParts.length > 0 ? filterParts.join(' | ') : 'Period: All Time';
            doc.text(filterText, 14, currentY);

            const generatedText = `Generated: ${new Date().toLocaleString()}`;
            const textWidth = doc.getTextWidth(generatedText);
            doc.text(generatedText, pageWidth - 14 - textWidth, currentY);

            const tableStartY = currentY + 8;

            const tableColumns = ["Cashier", "Date & Time", "Starting Cash", "Sales", "Expenses", "Expected", "Actual", "Variance"];
            const tableRows = [];

            // Accumulators for the Grand Summary Report
            let totalVariance = 0;
            let totalStarting = 0;
            let totalSales = 0;
            let totalExpenses = 0;
            let totalExpected = 0;
            let totalActual = 0;

            exportData.forEach(shift => {
                const diff = Number(shift.difference || 0);
                const start = Number(shift.starting_cash || 0);
                const sales = Number(shift.cash_sales || 0);
                const exp = Number(shift.expenses || 0);
                const expected = Number(shift.expected_cash || 0);
                const actual = Number(shift.actual_cash || 0);

                totalVariance += diff;
                totalStarting += start;
                totalSales += sales;
                totalExpenses += exp;
                totalExpected += expected;
                totalActual += actual;

                const timeString = `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`;

                tableRows.push([
                    shift.user?.name || 'Staff',
                    `${formatDate(shift.start_time)}\n${timeString}`,
                    `PHP ${formatCurrencyPH(start)}`,
                    `+ PHP ${formatCurrencyPH(sales)}`,
                    `- PHP ${formatCurrencyPH(exp)}`,
                    `PHP ${formatCurrencyPH(expected)}`,
                    shift.actual_cash ? `PHP ${formatCurrencyPH(actual)}` : 'N/A',
                    `${(diff > 0 ? '+' : '')}${formatNumberWithDecimals(diff)}`
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
                    if (data.section === 'body' && data.column.index === 7) {
                        const val = parseFloat(data.cell.raw);
                        if (val < 0) {
                            data.cell.styles.textColor = [220, 38, 38];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (val > 0) {
                            data.cell.styles.textColor = [22, 163, 74];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            // -----------------------------------------------------
            // DETAILED SHIFT SUMMARY BOX (Bottom of PDF)
            // -----------------------------------------------------
            let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : tableStartY + 20;

            // If the table went too far down, add a new page for the summary so it doesn't cut off
            if (finalY > 165) {
                doc.addPage();
                finalY = 20;
            }

            // Draw Summary Box Background
            doc.setFillColor(249, 250, 251); // bg-gray-50
            doc.setDrawColor(229, 231, 235); // border-gray-200
            doc.rect(14, finalY, pageWidth - 28, 40, 'FD');

            // Summary Box Title
            doc.setFontSize(12);
            doc.setTextColor(31, 41, 55);
            doc.setFont(undefined, 'bold');
            doc.text('Shift Summary Report', 20, finalY + 8);

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(75, 85, 99);

            // Left Column
            doc.text(`Total Shifts: ${exportData.length}`, 20, finalY + 16);
            doc.text(`Total Starting Cash: PHP ${formatCurrencyPH(totalStarting)}`, 20, finalY + 23);
            doc.text(`Total Cash Sales: PHP ${formatCurrencyPH(totalSales)}`, 20, finalY + 30);

            // Middle Column
            doc.text(`Total Expenses: PHP ${formatCurrencyPH(totalExpenses)}`, pageWidth / 2 - 20, finalY + 16);
            doc.text(`Total Expected Cash: PHP ${formatCurrencyPH(totalExpected)}`, pageWidth / 2 - 20, finalY + 23);
            doc.text(`Total Actual Cash: PHP ${formatCurrencyPH(totalActual)}`, pageWidth / 2 - 20, finalY + 30);

            // Right Column (Net Variance Box)
            const varianceColor = totalVariance < 0 ? [220, 38, 38] : [22, 163, 74];
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(31, 41, 55);
            doc.text(`Net Cash Variance:`, pageWidth - 70, finalY + 18);

            doc.setFontSize(14);
            doc.setTextColor(...varianceColor);
            doc.text(`${totalVariance > 0 ? '+' : ''}PHP ${formatNumberWithDecimals(totalVariance)}`, pageWidth - 70, finalY + 28);

            doc.save(`Shift_Report_${startDate || 'All'}_to_${endDate || 'All'}.pdf`);
            Swal.fire({ icon: 'success', title: 'PDF Exported!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } catch (error) {
            console.error("PDF Generation Error:", error);
            Swal.fire('Error', 'Failed to generate PDF report.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800">Shift History</h2>}>
            <Head title="Shift History" />

            <div className="py-4 sm:py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">

                    {/* UNIFIED FULL-WIDTH MEGA TOOLBAR */}
                    <div className="px-4 sm:px-0">
                        <div className="flex flex-col lg:flex-row justify-between gap-3 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100 items-center">
                            <div className="relative w-full lg:flex-1">
                                <input
                                    type="text"
                                    placeholder="Search Staff Name..."
                                    className="pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-4 top-2.5 sm:top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch flex-1 lg:max-w-2xl">
                                <div className="flex-1 flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-colors">
                                    <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">From</span>
                                    <input
                                        type="date"
                                        className="w-full bg-transparent border-none p-0 text-xs sm:text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-colors">
                                    <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">To</span>
                                    <input
                                        type="date"
                                        className="w-full bg-transparent border-none p-0 text-xs sm:text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>

                                {auth.user.is_admin && (
                                    <button
                                        onClick={exportPDF}
                                        disabled={isExporting}
                                        className={`w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-lg font-bold flex items-center justify-center gap-2 border transition-all text-xs sm:text-sm whitespace-nowrap active:scale-95
                                            ${isExporting ? 'opacity-50 cursor-not-allowed bg-green-600 text-white border-green-600' : 'bg-green-600 text-white hover:bg-green-700 border-green-600 shadow-sm'}`}
                                    >
                                        {isExporting ? (
                                            <>
                                                <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                <span>Exporting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                </svg>
                                                <span>Export PDF</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mx-4 sm:mx-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b text-gray-500 uppercase text-[10px] font-black tracking-wider">
                                    <tr>
                                        <th className="p-4">Cashier</th>
                                        <th className="p-4">Period</th>
                                        <th className="p-4 text-right">Starting</th>
                                        <th className="p-4 text-right">Sales</th>
                                        <th className="p-4 text-right">Expenses</th>
                                        <th className="p-4 text-right">Expected</th>
                                        <th className="p-4 text-right">Actual</th>
                                        <th className="p-4 text-center">Variance</th>
                                        <th className="p-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, index) => (
                                            <tr key={`skel-${index}`} className="animate-pulse">
                                                <td className="p-4"><div className="h-5 bg-gray-200 rounded w-24"></div></td>
                                                <td className="p-4"><div className="h-5 bg-gray-200 rounded w-24 mb-1"></div><div className="h-3 bg-gray-200 rounded w-16"></div></td>
                                                <td className="p-4 flex justify-end"><div className="h-5 bg-gray-200 rounded w-16 mt-2"></div></td>
                                                <td className="p-4"><div className="h-5 bg-gray-200 rounded w-16 ml-auto"></div></td>
                                                <td className="p-4"><div className="h-5 bg-gray-200 rounded w-16 ml-auto"></div></td>
                                                <td className="p-4"><div className="h-5 bg-gray-200 rounded w-16 ml-auto"></div></td>
                                                <td className="p-4"><div className="h-5 bg-gray-200 rounded w-16 ml-auto"></div></td>
                                                <td className="p-4"><div className="h-6 bg-gray-200 rounded w-12 mx-auto"></div></td>
                                                <td className="p-4 flex justify-center"><div className="w-9 h-9 bg-gray-200 rounded-md"></div></td>
                                            </tr>
                                        ))
                                    ) : paginatedShifts.length === 0 ? (
                                        <tr>
                                            <td colSpan={tableColSpan} className="p-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center py-6">
                                                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <h3 className="text-lg font-bold text-gray-900">No shifts found</h3>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedShifts.map((shift) => (
                                            <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-800 whitespace-nowrap">{shift.user?.name || 'Staff'}</td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="text-gray-900 font-medium text-sm">{formatDate(shift.start_time)}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</div>
                                                </td>
                                                <td className="p-4 text-right font-black text-gray-700 tracking-tight">₱{formatCurrencyPH(shift.starting_cash)}</td>
                                                <td className="p-4 text-right text-green-600 font-black tracking-tight">+₱{formatCurrencyPH(shift.cash_sales)}</td>
                                                <td className="p-4 text-right text-red-500 font-black tracking-tight">-₱{formatCurrencyPH(shift.expenses || 0)}</td>
                                                <td className="p-4 text-right text-gray-500 font-bold tracking-tight">₱{formatCurrencyPH(shift.expected_cash)}</td>
                                                <td className="p-4 text-right font-black text-blue-600 tracking-tight">{shift.actual_cash ? `₱${formatCurrencyPH(shift.actual_cash)}` : '-'}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded text-xs font-black tracking-widest ${Math.abs(Number(shift.difference)) < 1 ? 'bg-gray-100 text-gray-600' : Number(shift.difference) < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {Number(shift.difference) > 0 ? '+' : ''}{formatNumberWithDecimals(shift.difference)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center flex justify-center gap-2">
                                                    {/* NEW: Clean Eye Icon Action Button */}
                                                    <button onClick={() => handleViewDetails(shift)} className="p-2 text-blue-500 hover:text-blue-700 rounded-lg transition-colors" title="View Summary Details">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

                    {/* MOBILE & TABLET APP-LIKE CARD VIEW */}
                    <div className="lg:hidden flex flex-col divide-y divide-gray-100 bg-white sm:rounded-lg border-y sm:border border-gray-200 shadow-sm">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, index) => (
                                <div key={`mob-skel-${index}`} className="p-4 flex flex-col gap-3 animate-pulse border-b border-gray-50">
                                    <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                                        <div className="flex flex-col gap-1 w-1/2">
                                            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                        </div>
                                    </div>
                                    <div className="mt-1 h-10 bg-gray-200 rounded-lg w-full"></div>
                                </div>
                            ))
                        ) : paginatedShifts.length === 0 ? (
                            <div className="p-10 text-center text-gray-500 font-bold">
                                No shift records found.
                            </div>
                        ) : (
                            paginatedShifts.map((shift) => (
                                <div key={shift.id} className="p-4 flex flex-col gap-4 active:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                                        <div>
                                            <h4 className="font-black text-gray-900 text-lg leading-tight tracking-tight">{shift.user?.name || 'Staff'}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                {formatDate(shift.start_time)} • {formatTime(shift.start_time)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                                        <div className="flex flex-col"><span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Expected</span><span className="font-bold text-gray-600">₱{formatCurrencyPH(shift.expected_cash)}</span></div>
                                        <div className="flex flex-col items-end"><span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Actual</span><span className="font-black text-blue-600 text-lg tracking-tight">{shift.actual_cash ? `₱${formatCurrencyPH(shift.actual_cash)}` : '-'}</span></div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50">
                                        <button onClick={() => handleViewDetails(shift)} className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 text-blue-700 bg-blue-50 rounded-lg border border-blue-200 shadow-sm active:scale-95 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* PAGINATION */}
                    {!loading && totalPages > 1 && (() => {
                        const getPageNumbers = () => {
                            const pages = [];
                            const left = Math.max(2, currentPage - 1);
                            const right = Math.min(totalPages - 1, currentPage + 1);
                            pages.push(1);
                            if (left > 2) pages.push('...');
                            for (let i = left; i <= right; i++) if (i !== 1 && i !== totalPages) pages.push(i);
                            if (right < totalPages - 1) pages.push('...');
                            if (totalPages > 1) pages.push(totalPages);
                            return pages;
                        };

                        return (
                            <div className="py-4 flex flex-col sm:flex-row justify-between items-center gap-4 pb-10 sm:pb-4 w-full">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest shrink-0">
                                    Page <span className="text-gray-900">{currentPage}</span> of {totalPages}
                                </span>
                                <div className="flex gap-1.5 overflow-x-auto px-1 w-full sm:w-auto justify-center">
                                    <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({top:0, behavior:'smooth'}); }} className="px-3 py-2 rounded-lg text-xs font-bold border transition-all bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40">&laquo;</button>
                                    {getPageNumbers().map((num, idx) => (
                                        num === '...' ? <span key={idx} className="px-2 py-2 text-gray-400 font-bold">...</span> : (
                                            <button key={num} onClick={() => { setCurrentPage(num); window.scrollTo({top:0, behavior:'smooth'}); }} className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all ${currentPage === num ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{num}</button>
                                        )
                                    ))}
                                    <button disabled={currentPage === totalPages} onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({top:0, behavior:'smooth'}); }} className="px-3 py-2 rounded-lg text-xs font-bold border transition-all bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40">&raquo;</button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* DETAILED SHIFT MODAL */}
            {showDetails && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
                    <div className="absolute inset-0" onClick={() => setShowDetails(false)}></div>

                    <div className="relative bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                        <div className="sm:hidden flex justify-center pt-4 pb-2 bg-gray-900 w-full shrink-0" onClick={() => setShowDetails(false)}>
                            <div className="w-12 h-1.5 bg-white/20 rounded"></div>
                        </div>

                        <div className="px-6 py-5 border-b text-white flex justify-between items-center bg-gray-900 shrink-0">
                            <h2 className="text-xl font-black tracking-tight">Shift Summary</h2>
                            <button onClick={() => setShowDetails(false)} className="text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full hidden sm:block">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar bg-white">
                            {isLoadingDetails || !selectedShiftData ? (
                                <div className="py-20 flex justify-center items-center">
                                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                </div>
                            ) : (
                                <div className="space-y-4 pb-4 sm:pb-0">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex justify-between items-center gap-3">
                                        <span>Cashier: <span className="text-gray-800">{selectedShiftData.staff_name}</span></span>
                                        <div className="text-right whitespace-nowrap">
                                            <div className="text-gray-800">{formatDate(selectedShiftData.start_time)}</div>
                                            <div className="text-[10px] text-gray-500 mt-0.5">{formatTime(selectedShiftData.start_time)} - {formatTime(selectedShiftData.end_time)}</div>
                                        </div>
                                    </div>

                                    {/* DRAWER MATH */}
                                    <div className="bg-gray-50 p-5 rounded-lg space-y-3 border border-gray-100 text-sm shadow-inner">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium">Starting Cash</span>
                                            <span className="font-bold text-gray-800">₱{formatCurrencyPH(selectedShiftData.starting_cash)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium">Cash Sales</span>
                                            <span className="font-bold text-green-600">+₱{formatCurrencyPH(selectedShiftData.cash_sales)}</span>
                                        </div>

                                        {selectedShiftData.expenses > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500 font-medium">Less: Expenses</span>
                                                <span className="font-bold text-red-500">-₱{formatCurrencyPH(selectedShiftData.expenses)}</span>
                                            </div>
                                        )}

                                        <div className="border-t border-dashed border-gray-300 my-2"></div>

                                        <div className="flex justify-between items-center font-black text-[15px]">
                                            <span className="text-gray-800">Expected in Drawer</span>
                                            <span className="text-gray-900">₱{formatCurrencyPH(selectedShiftData.expected_cash)}</span>
                                        </div>
                                        <div className="flex justify-between items-center font-black text-[15px] text-blue-600">
                                            <span>Actual Count</span>
                                            <span>₱{formatCurrencyPH(selectedShiftData.actual_cash)}</span>
                                        </div>

                                        {/* GROSS SALES BREAKDOWN */}
                                        <div className="border-t border-gray-200 my-3"></div>
                                        <div className="space-y-1.5">
                                            <div className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2">Non-Cash Sales</div>

                                            {selectedShiftData.gcash_sales > 0 && (
                                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">GCash</span><span className="font-bold text-blue-600">+₱{formatCurrencyPH(selectedShiftData.gcash_sales)}</span></div>
                                            )}
                                            {selectedShiftData.maya_sales > 0 && (
                                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Maya</span><span className="font-bold text-green-600">+₱{formatCurrencyPH(selectedShiftData.maya_sales)}</span></div>
                                            )}
                                            {selectedShiftData.credit_card_sales > 0 && (
                                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Credit Card</span><span className="font-bold text-purple-600">+₱{formatCurrencyPH(selectedShiftData.credit_card_sales)}</span></div>
                                            )}
                                            {selectedShiftData.debit_card_sales > 0 && (
                                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Debit/BancNet</span><span className="font-bold text-indigo-600">+₱{formatCurrencyPH(selectedShiftData.debit_card_sales)}</span></div>
                                            )}
                                            {(!selectedShiftData.gcash_sales && !selectedShiftData.maya_sales && !selectedShiftData.credit_card_sales && !selectedShiftData.debit_card_sales) && (
                                                <div className="text-xs text-gray-400 italic">No digital sales recorded.</div>
                                            )}
                                        </div>

                                        <div className="border-t border-dashed border-gray-300 my-2"></div>
                                        <div className="flex justify-between items-center font-black text-base">
                                            <span className="text-gray-900">Total Gross Sales</span>
                                            <span className="text-gray-900">₱{formatCurrencyPH(
                                                Number(selectedShiftData.cash_sales || 0) +
                                                Number(selectedShiftData.gcash_sales || 0) +
                                                Number(selectedShiftData.maya_sales || 0) +
                                                Number(selectedShiftData.credit_card_sales || 0) +
                                                Number(selectedShiftData.debit_card_sales || 0)
                                            )}</span>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-lg text-center border shadow-sm ${Math.abs(selectedShiftData.difference) < 0.01 ? 'bg-green-50 text-green-700 border-green-100' : selectedShiftData.difference > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                                            {Math.abs(selectedShiftData.difference) < 0.01 ? 'Drawer Status' : (selectedShiftData.difference > 0 ? 'Drawer Overage' : 'Drawer Shortage')}
                                        </div>
                                        <div className="text-3xl font-black tracking-tight">
                                            {Math.abs(selectedShiftData.difference) < 0.01 ? 'BALANCED' : `₱${Math.abs(selectedShiftData.difference).toFixed(2)}`}
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button onClick={() => setShowDetails(false)} className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-lg shadow-lg hover:bg-black transition-all active:scale-[0.98]">
                                            Close Details
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}