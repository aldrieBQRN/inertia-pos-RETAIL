import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function Reports({ auth }) {
    const user = auth?.user;

    const [stats, setStats] = useState({
        total_sales: 0,
        total_profit: 0,
        total_orders: 0,
        average_order_value: 0,
        sales_growth: null,
        profit_growth: null,
        orders_growth: null,
        aov_growth: null,
        chart_data: [],
        peak_hours: [],
        peak_days: [],
        peak_months: [],
        payment_methods: [],
        sales_by_category: [],
        top_products: [],
    });

    const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Default to empty (Backend handles falling back to current month)
    const [filters, setFilters] = useState({ start_date: '', end_date: '' });
    const [activePreset, setActivePreset] = useState('this_month');

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

    const fetchReports = async (params = {}) => {
        setLoading(true);
        try {
            const response = await axios.get('/api/reports', { params });
            setStats(response.data);
        } catch (error) {
            console.error("Reports data retrieval error:", error);
            Swal.fire('Error', 'Failed to load report data.', 'error');
        } finally {
            setLoading(false);
            setHasLoaded(true);
        }
    };

    // Auto-refresh reports when date filters change (debounced)
    useEffect(() => {
        const t = setTimeout(() => {
            fetchReports(filters);
        }, 500);
        return () => clearTimeout(t);
    }, [filters.start_date, filters.end_date]);

    // --- QUICK DATE PRESETS LOGIC ---
    const formatDate = (date) => {
        const d = new Date(date);
        const month = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        const year = d.getFullYear();
        return `${year}-${month}-${day}`;
    };

    const formatNumber = (num) => {
        return num.toLocaleString('en-US');
    };

    const formatCurrencyDirect = (amount) => {
        return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatPaymentName = (method) => {
        if (!method) return 'Unknown';
        if (method === 'credit_card') return 'Credit Card';
        if (method === 'debit_card') return 'Debit Card';
        if (method === 'gcash') return 'GCash';
        if (method === 'maya') return 'Maya';
        if (method === 'cash') return 'Cash';
        return method.charAt(0).toUpperCase() + method.slice(1);
    };

    const handlePresetChange = (e) => {
        const preset = e.target.value;
        setActivePreset(preset);

        const today = new Date();
        let start = '';
        let end = '';

        switch (preset) {
            case 'today':
                start = formatDate(today);
                end = start;
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                start = formatDate(yesterday);
                end = start;
                break;
            case 'last_7_days':
                const last7 = new Date(today);
                last7.setDate(last7.getDate() - 6);
                start = formatDate(last7);
                end = formatDate(today);
                break;
            case 'this_month':
                start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
                end = formatDate(today); // Up to today
                break;
            case 'last_month':
                start = formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
                end = formatDate(new Date(today.getFullYear(), today.getMonth(), 0));
                break;
            case 'ytd':
                start = formatDate(new Date(today.getFullYear(), 0, 1));
                end = formatDate(today);
                break;
            default:
                return;
        }
        setFilters({ start_date: start, end_date: end });
    };

    const getProcessedCategoryData = () => {
        const data = stats.sales_by_category || [];
        if (data.length <= 4) return data;
        const sortedData = [...data].sort((a, b) => b.value - a.value);
        const top3 = sortedData.slice(0, 3);
        const othersValue = sortedData.slice(3).reduce((sum, item) => sum + item.value, 0);
        return [...top3, { name: 'Others', value: othersValue }];
    };

    const categoryData = getProcessedCategoryData();
    const hasTrendData = stats.chart_data && stats.chart_data.some(d => d.sales > 0);

    const exportPDF = async () => {
        setIsExporting(true);
        try {
            const [settingsRes] = await Promise.allSettled([
                axios.get('/api/settings')
            ]);

            if (stats.total_orders === 0) {
                Swal.fire({ icon: 'info', title: 'No Data', text: 'No records found for this period to export.', confirmButtonColor: '#111827' });
                setIsExporting(false);
                return;
            }

            const settings = settingsRes.status === 'fulfilled' ? settingsRes.value.data : null;
            const doc = new jsPDF('portrait');
            const pageWidth = doc.internal.pageSize.width;

            const storeName = settings?.store_name || 'POS Store System';
            const storeAddress = settings?.address || '';
            const storeContact = settings?.phone ? `Contact: ${settings.phone}` : '';

            let currentY = 20;

            // Header
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
            doc.text('Business Analytics Report', 14, currentY);

            currentY += 6;
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.setFont(undefined, 'normal');

            const filterText = (filters.start_date || filters.end_date)
                ? `Period: ${filters.start_date || 'Start'} to ${filters.end_date || 'Present'}`
                : 'Period: Current Month (Default)';
            doc.text(filterText, 14, currentY);

            const generatedText = `Generated: ${new Date().toLocaleString()}`;
            const textWidth = doc.getTextWidth(generatedText);
            doc.text(generatedText, pageWidth - 14 - textWidth, currentY);

            const startY = currentY + 8;
            const money = (v) => `PHP ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const num = (v) => Number(v || 0).toLocaleString('en-US');

            // SECTION 1: KPI Summary
            autoTable(doc, {
                head: [['Key Performance Indicator', 'Value']],
                body: [
                    ['Gross Revenue', money(stats.total_sales)],
                    ['Net Profit', money(stats.total_profit)],
                    ['Total Transactions', num(stats.total_orders)],
                    ['Average Ticket Size', money(stats.average_order_value)]
                ],
                startY,
                theme: 'striped',
                headStyles: { fillColor: '#111827', textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
                columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 70 } }
            });

            const nextY = () => (doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : startY + 20);

            // SECTION 2: Payment Split
            const payRows = (stats.payment_methods || []).map((r) => ([
                formatPaymentName(r.payment_method),
                num(r.count)
            ]));
            autoTable(doc, {
                head: [['Payment Method', 'Transactions']],
                body: payRows.length ? payRows : [['No data', '']],
                startY: nextY(),
                theme: 'striped',
                headStyles: { fillColor: '#10b981', textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' }
            });

            // SECTION 3: Category Sales
            const rawCats = Array.isArray(stats.sales_by_category) ? stats.sales_by_category : [];
            const catRows = rawCats.map((r) => ([ r.name || 'Unknown', num(r.value) ]));
            autoTable(doc, {
                head: [['Product Category', 'Items Sold']],
                body: catRows.length ? catRows : [['No data', '']],
                startY: nextY(),
                theme: 'striped',
                headStyles: { fillColor: '#8b5cf6', textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' }
            });

            // SECTION 4: Peak Analytics (Hours, Days, Months)
            const peakHourRows = (stats.peak_hours || []).map((r) => ([ r.hour || 'Unknown', num(r.count) ]));
            autoTable(doc, {
                head: [['Peak Hours', 'Transactions']],
                body: peakHourRows.length ? peakHourRows : [['No data', '']],
                startY: nextY(),
                theme: 'striped',
                headStyles: { fillColor: '#F59E0B', textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' }
            });

            const peakDayRows = (stats.peak_days || []).map((r) => ([ r.day || 'Unknown', num(r.count) ]));
            autoTable(doc, {
                head: [['Peak Days', 'Transactions']],
                body: peakDayRows.length ? peakDayRows : [['No data', '']],
                startY: nextY(),
                theme: 'striped',
                headStyles: { fillColor: '#10B981', textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' }
            });

            const peakMonthRows = (stats.peak_months || []).map((r) => ([ r.month || 'Unknown', num(r.count) ]));
            autoTable(doc, {
                head: [['Peak Months', 'Transactions']],
                body: peakMonthRows.length ? peakMonthRows : [['No data', '']],
                startY: nextY(),
                theme: 'striped',
                headStyles: { fillColor: '#3B82F6', textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' }
            });

            // SECTION 5: Best Sellers
            const topRows = (stats.top_products || []).map((r) => ([ r.name || 'Unknown', num(r.sold) ]));
            autoTable(doc, {
                head: [['Top 5 Best Sellers', 'Quantity Sold']],
                body: topRows.length ? topRows : [['No data', '']],
                startY: nextY(),
                theme: 'striped',
                headStyles: { fillColor: '#0f172a', textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' }
            });

            const filename = `Analytics_Report_${filters.start_date || 'Month'}_to_${filters.end_date || 'Month'}.pdf`;
            doc.save(filename);

            Swal.fire({ icon: 'success', title: 'Report Exported!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });

        } catch (error) {
            console.error("Export Error:", error);
            Swal.fire('Error', 'Failed to generate the PDF report.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const exportExcel = async () => {
        if (stats.total_orders === 0) {
            Swal.fire({ icon: 'info', title: 'No Data', text: 'No records found for this period to export.', confirmButtonColor: '#111827' });
            return;
        }

        try {
            const [settingsRes] = await Promise.allSettled([
                axios.get('/api/settings')
            ]);
            const settings = settingsRes.status === 'fulfilled' ? settingsRes.value.data : null;
            
            const storeName = settings?.store_name || 'POS Store System';
            const storeAddress = settings?.address || '';
            const storeContact = settings?.phone ? `Contact: ${settings.phone}` : '';

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Analytics Report', {
                views: [{ showGridLines: true }]
            });

            // Set column widths
            worksheet.getColumn('A').width = 35; // Metric / Item Name
            worksheet.getColumn('B').width = 25; // Value / Count
            worksheet.getColumn('C').width = 30; // Growth (%)

            // 1. Store Header (Rows 1 to 5)
            // Store Name
            worksheet.mergeCells('A1:C1');
            worksheet.getCell('A1').value = storeName.toUpperCase();
            worksheet.getCell('A1').font = { bold: true, color: { argb: '1B3A69' }, size: 14 };
            worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 24;

            // Address
            worksheet.mergeCells('A2:C2');
            worksheet.getCell('A2').value = storeAddress;
            worksheet.getCell('A2').font = { color: { argb: '555555' }, size: 9 };
            worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(2).height = 16;

            // Contact
            worksheet.mergeCells('A3:C3');
            worksheet.getCell('A3').value = storeContact;
            worksheet.getCell('A3').font = { color: { argb: '555555' }, size: 9, italic: true };
            worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(3).height = 16;

            // Report Title
            worksheet.mergeCells('A4:C4');
            worksheet.getCell('A4').value = 'BUSINESS ANALYTICS REPORT';
            worksheet.getCell('A4').font = { bold: true, color: { argb: '333333' }, size: 11 };
            worksheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(4).height = 20;

            // Period and Generation Time
            worksheet.mergeCells('A5:C5');
            const filterText = (filters.start_date || filters.end_date)
                ? `Period: ${filters.start_date || 'Start'} to ${filters.end_date || 'Present'}`
                : 'Period: Current Month (Default)';
            const generatedText = `Generated: ${new Date().toLocaleString()}`;
            worksheet.getCell('A5').value = `${filterText}  |  ${generatedText}`;
            worksheet.getCell('A5').font = { color: { argb: '777777' }, size: 9 };
            worksheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(5).height = 16;

            // Spacer
            worksheet.getRow(6).height = 12;

            let currentRow = 7;

            // Helper to style section headers
            const addSectionHeader = (title, hexColor) => {
                worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
                const cell = worksheet.getCell(`A${currentRow}`);
                cell.value = title;
                cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: hexColor }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                worksheet.getRow(currentRow).height = 24;
                currentRow++;
            };

            // Helper to style table headers
            const addTableHeaders = (headers, hexColor = '1B3A69') => {
                headers.forEach((h, index) => {
                    const cell = worksheet.getRow(currentRow).getCell(index + 1);
                    cell.value = h;
                    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: hexColor }
                    };
                    cell.alignment = { vertical: 'middle', horizontal: index === 0 ? 'left' : 'right' };
                });
                worksheet.getRow(currentRow).height = 20;
                currentRow++;
            };

            // Helper to add data row
            // Helper to add data row with formatting support
            const addDataRow = (data, rowFormats = []) => {
                data.forEach((val, index) => {
                    const cell = worksheet.getRow(currentRow).getCell(index + 1);
                    cell.value = val;
                    cell.font = { size: 10 };
                    cell.border = {
                        bottom: { style: 'thin', color: { argb: 'E5E7EB' } }
                    };

                    if (rowFormats[index]) {
                        cell.numFmt = rowFormats[index];
                    }

                    if (index === 0) {
                        cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    } else {
                        cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    }
                });
                worksheet.getRow(currentRow).height = 20;
                currentRow++;
            };

            // Formatting schemas
            const currencyFormat = '"PHP " #,##0.00';
            const percentFormat = '0.0%';
            const growthFormat = '+0.0%;-0.0%;0.0%';
            const intFormat = '#,##0';

            const formatGrowthValue = (val) => {
                if (val === null || val === undefined || isNaN(val)) return "N/A";
                return val / 100;
            };

            // 2. Section: KEY METRICS
            addSectionHeader("BUSINESS PERFORMANCE KEY METRICS", "1B3A69");
            addTableHeaders(["Metric", "Value", "Growth vs Last Period"], "2C5282");
            
            addDataRow(["Gross Revenue", stats.total_sales, formatGrowthValue(stats.sales_growth)], [null, currencyFormat, growthFormat]);
            addDataRow(["Net Profit", stats.total_profit, formatGrowthValue(stats.profit_growth)], [null, currencyFormat, growthFormat]);
            addDataRow(["Profit Margin Ratio", stats.total_sales > 0 ? (stats.total_profit / stats.total_sales) : 0, "N/A"], [null, percentFormat, null]);
            addDataRow(["Total Transactions", stats.total_orders, formatGrowthValue(stats.orders_growth)], [null, intFormat, growthFormat]);
            addDataRow(["Average Ticket Size", stats.average_order_value, formatGrowthValue(stats.aov_growth)], [null, currencyFormat, growthFormat]);

            // Spacer
            currentRow++;

            // 3. Section: BEST SELLERS
            addSectionHeader("TOP 5 BEST SELLING PRODUCTS", "10B981");
            addTableHeaders(["Product Name", "Quantity Sold", ""], "059669");
            (stats.top_products || []).forEach(item => {
                addDataRow([item.name, item.sold, ""], [null, intFormat, null]);
            });

            // Spacer
            currentRow++;

            // 4. Section: CATEGORIES
            addSectionHeader("SALES BY PRODUCT CATEGORY", "8B5CF6");
            addTableHeaders(["Category Name", "Quantity Sold", ""], "7C3AED");
            (stats.sales_by_category || []).forEach(item => {
                addDataRow([item.name || 'Uncategorized', item.value, ""], [null, intFormat, null]);
            });

            // Spacer
            currentRow++;

            // 5. Section: PAYMENTS
            addSectionHeader("PAYMENT METHOD DISTRIBUTION", "F59E0B");
            addTableHeaders(["Payment Method", "Transactions Count", ""], "D97706");
            (stats.payment_methods || []).forEach(item => {
                addDataRow([formatPaymentName(item.payment_method), item.count, ""], [null, intFormat, null]);
            });

            // Generate and Save Excel File
            const buffer = await workbook.xlsx.writeBuffer();
            const dateRangeStr = (filters.start_date && filters.end_date)
                ? `${filters.start_date}_to_${filters.end_date}`
                : `Month_Period`;
            const fileBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(fileBlob, `Analytics_Report_${dateRangeStr}.xlsx`);

            Swal.fire({ icon: 'success', title: 'Excel Report Exported!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } catch (error) {
            console.error("Excel Export Error:", error);
            Swal.fire('Error', 'Failed to generate the Excel report.', 'error');
        }
    };

    if (loading && !hasLoaded) return (
        <AuthenticatedLayout user={user} header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">Analytics & Reports</h2>}>
            <ReportsSkeleton />
        </AuthenticatedLayout>
    );

    return (
        <AuthenticatedLayout user={user} header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">Analytics & Reports</h2>}>
            <Head title="Reports" />

            <div className="py-0 sm:py-8 lg:py-12 bg-gray-100 sm:bg-[#FAFAFA] min-h-[calc(100vh-65px)] sm:min-h-screen">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 animate-in fade-in sm:slide-in-from-bottom-4 duration-500 pb-10 sm:pb-0">

                    {/* SMART RESPONSIVE FILTER & EXPORT TOOLBAR */}
                    <div className="px-0 sm:px-0 pt-4 sm:pt-0">
                        <div className="bg-white p-4 sm:rounded-xl border-y sm:border border-gray-200/60 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">

                            <div className="flex flex-col sm:flex-row flex-wrap xl:flex-nowrap gap-3 w-full xl:w-auto items-stretch">

                                {/* Quick Preset Dropdown */}
                                <div className="relative flex items-center bg-blue-50 border border-blue-100 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 transition-colors w-full sm:w-auto sm:min-w-[180px] shrink-0">
                                    <svg className="w-4 h-4 text-blue-600 absolute left-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>

                                    <select
                                        className="appearance-none !bg-none bg-transparent border-none py-2.5 sm:py-3 pl-9 pr-10 text-sm font-bold text-blue-700 focus:ring-0 cursor-pointer w-full"
                                        value={activePreset}
                                        onChange={handlePresetChange}
                                    >
                                        <option value="custom" disabled hidden>Custom Range</option>
                                        <option value="today">Today</option>
                                        <option value="yesterday">Yesterday</option>
                                        <option value="last_7_days">Last 7 Days</option>
                                        <option value="this_month">This Month</option>
                                        <option value="last_month">Last Month</option>
                                        <option value="ytd">Year to Date</option>
                                    </select>
                                    <svg className="w-4 h-4 text-blue-600 absolute right-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>

                                {/* Start Date Input */}
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-colors w-full sm:w-auto flex-1 xl:flex-none">
                                    <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">From</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none p-0 text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer w-full"
                                        value={filters.start_date}
                                        onChange={(e) => {
                                            setActivePreset('custom');
                                            setFilters({ ...filters, start_date: e.target.value });
                                        }}
                                    />
                                </div>

                                {/* End Date Input */}
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-colors w-full sm:w-auto flex-1 xl:flex-none">
                                    <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">To</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none p-0 text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer w-full"
                                        value={filters.end_date}
                                        onChange={(e) => {
                                            setActivePreset('custom');
                                            setFilters({ ...filters, end_date: e.target.value });
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto shrink-0">
                                <button
                                    onClick={exportExcel}
                                    className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 sm:py-3 rounded-md text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5l9 9 9-9M12 22.5V3" />
                                    </svg>
                                    Export Excel Report
                                </button>

                                <button
                                    onClick={exportPDF}
                                    disabled={isExporting}
                                    className={`w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 sm:py-3 rounded-md text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0 ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isExporting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                            </svg>
                                            Export PDF Report
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* KPI SCORECARDS */}
                    {(() => {
                        const marginPercentage = stats.total_sales > 0 ? (stats.total_profit / stats.total_sales) * 100 : 0;
                        return (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 px-2 sm:px-0">
                                <StatCard
                                    title="Period Revenue"
                                    value={`₱${formatCurrencyDirect(stats.total_sales)}`}
                                    trend={stats.sales_growth}
                                    color="blue"
                                    icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                />
                                <StatCard
                                    title="Net Profit"
                                    value={`₱${formatCurrencyDirect(stats.total_profit)}`}
                                    trend={stats.profit_growth}
                                    subtext={`Margin: ${marginPercentage.toFixed(1)}%`}
                                    color="green"
                                    icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                                />
                                <StatCard
                                    title="Transactions"
                                    value={formatNumber(stats.total_orders)}
                                    trend={stats.orders_growth}
                                    color="purple"
                                    icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                                />
                                <StatCard
                                    title="Average Ticket"
                                    value={`₱${formatCurrencyDirect(stats.average_order_value)}`}
                                    trend={stats.aov_growth}
                                    color="orange"
                                    icon={<svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                                />
                            </div>
                        );
                    })()}

                    {/* MAIN TREND CHART (App-like on mobile) */}
                    <div className="px-0 sm:px-0">
                        <div className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 flex flex-col h-[350px] sm:h-[400px]">
                            <h3 className="text-[15px] sm:text-lg font-bold text-gray-800 mb-4 tracking-tight">Revenue Trend</h3>
                            <div className="flex-1 w-full -ml-4 sm:ml-0">
                                {!hasTrendData ? <NoData /> : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₱${val}`} tick={{ fontSize: 11, fill: '#9CA3AF' }} width={50} />
                                            <Tooltip formatter={(val) => `₱${val}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ROW 1: TIME-BASED ANALYTICS (3 COLUMNS) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 px-0 sm:px-0">

                        {/* Peak Hours */}
                        <div className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60">
                            <h3 className="text-[15px] sm:text-lg font-bold text-gray-800 mb-4 tracking-tight">Peak Hours</h3>
                            <div className="h-60 sm:h-72 w-full">
                                {stats.peak_hours.length === 0 ? <NoData /> : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.peak_hours} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="hour" type="category" width={60} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9CA3AF'}} />
                                            <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="count" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Peak Days */}
                        <div className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60">
                            <h3 className="text-[15px] sm:text-lg font-bold text-gray-800 mb-4 tracking-tight">Peak Days</h3>
                            <div className="h-60 sm:h-72 w-full">
                                {(!stats.peak_days || stats.peak_days.length === 0) ? <NoData /> : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.peak_days} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="day" type="category" width={40} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9CA3AF'}} />
                                            <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} barSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Peak Months */}
                        <div className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60">
                            <h3 className="text-[15px] sm:text-lg font-bold text-gray-800 mb-4 tracking-tight">Peak Months</h3>
                            <div className="h-60 sm:h-72 w-full">
                                {(!stats.peak_months || stats.peak_months.length === 0) ? <NoData /> : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.peak_months} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="month" type="category" width={40} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9CA3AF'}} />
                                            <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* ROW 2: SPLIT METRICS (3 COLUMNS) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 px-0 sm:px-0 mt-4 sm:mt-6">

                        {/* Payment Split */}
                        <div className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 flex flex-col items-center">
                            <h3 className="text-[15px] sm:text-lg font-bold text-gray-800 mb-2 w-full tracking-tight">Payment Methods</h3>
                            <div className="h-60 sm:h-72 w-full">
                                {stats.payment_methods.length === 0 ? <NoData /> : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={stats.payment_methods} innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="count" nameKey="payment_method" stroke="none">
                                                {stats.payment_methods.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} formatter={(value) => formatPaymentName(value)}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Category Sales */}
                        <div className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 flex flex-col items-center">
                            <h3 className="text-[15px] sm:text-lg font-bold text-gray-800 mb-2 w-full tracking-tight">Category Breakdown</h3>
                            <div className="h-60 sm:h-72 w-full">
                                {categoryData.length === 0 ? <NoData /> : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={categoryData} innerRadius={0} outerRadius={75} dataKey="value" nameKey="name" stroke="none">
                                                {categoryData.map((entry, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(value) => `${value} items`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* BEST SELLERS TABLE WIDGET */}
                        <div className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 flex flex-col h-full">
                            <h3 className="text-[15px] sm:text-lg font-bold text-gray-800 mb-4 tracking-tight">Top 5 Best Sellers</h3>
                            <div className="w-full flex-1 overflow-x-auto">
                                {stats.top_products.length === 0 ? (
                                    <div className="h-40"><NoData /></div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-500">
                                            <tr>
                                                <th className="px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-tl-lg rounded-bl-lg">Product Name</th>
                                                <th className="px-4 py-2 text-right font-black text-[10px] uppercase tracking-widest rounded-tr-lg rounded-br-lg">Sold</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {stats.top_products.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-gray-800 text-xs sm:text-sm">{item.name}</td>
                                                    <td className="px-4 py-3 text-right font-black text-blue-600 text-xs sm:text-sm">{formatNumber(item.sold)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function StatCard({ title, value, icon, color, subtext, trend }) {
    const bgColors = {
        blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
        green: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
        purple: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100',
        orange: 'bg-orange-50 text-orange-600 ring-1 ring-orange-100'
    };
    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-transform hover:scale-[1.02] gap-3 sm:gap-0">
            <div className="flex-1 order-2 sm:order-1">
                <div className="text-gray-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest">{title}</div>
                <div className="text-xl sm:text-3xl font-black text-gray-900 mt-0.5 sm:mt-1 tracking-tight">{value}</div>
                {trend !== undefined && trend !== null && (
                    <div className={`text-[10px] sm:text-xs font-bold mt-1 flex items-center ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
                    </div>
                )}
                {subtext && <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">{subtext}</div>}
            </div>
            <div className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl shrink-0 order-1 sm:order-2 ${bgColors[color]}`}>
                {icon}
            </div>
        </div>
    );
}

function NoData() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-xs sm:text-sm font-semibold opacity-60 uppercase tracking-widest">No data available.</p>
        </div>
    );
}

function ReportsSkeleton() {
    const PulseBlock = ({ className }) => <div className={`animate-pulse bg-gray-200/70 rounded ${className || ''}`} />;
    return (
        <div className="py-0 sm:py-8 lg:py-12 bg-gray-100 sm:bg-[#FAFAFA] min-h-[calc(100vh-65px)] sm:min-h-screen pb-10 sm:pb-0">
            <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 pt-4 sm:pt-0">
                {/* Toolbar Skeleton */}
                <div className="px-0 sm:px-0">
                    <div className="bg-white p-4 sm:rounded-xl border-y sm:border border-gray-200/60 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                        <div className="flex flex-col sm:flex-row flex-wrap xl:flex-nowrap gap-3 w-full xl:w-auto items-stretch">
                            <PulseBlock className="h-[46px] sm:h-[50px] w-full sm:w-[180px] rounded-md" />
                            <PulseBlock className="h-[46px] sm:h-[50px] w-full sm:w-40 flex-1 xl:flex-none rounded-md" />
                            <PulseBlock className="h-[46px] sm:h-[50px] w-full sm:w-40 flex-1 xl:flex-none rounded-md" />
                        </div>
                        <PulseBlock className="h-[46px] sm:h-[50px] w-full xl:w-48 rounded-md" />
                    </div>
                </div>

                {/* KPI Skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 px-2 sm:px-0">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={`sk-kpi-${idx}`} className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between animate-pulse">
                            <div className="flex-1"><PulseBlock className="h-3 w-16 mb-3" /><PulseBlock className="h-8 w-24 mb-3" /></div>
                            <PulseBlock className="h-12 w-12 rounded-lg" />
                        </div>
                    ))}
                </div>

                {/* Main Chart Skeleton */}
                <div className="px-0 sm:px-0">
                    <div className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 flex flex-col h-[350px] sm:h-[400px]">
                        <PulseBlock className="h-5 w-40 mb-6" /><PulseBlock className="flex-1 w-full" />
                    </div>
                </div>

                {/* 3x3 Grid Row 1 Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 px-0 sm:px-0">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={`sk-row1-${idx}`} className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 h-60 sm:h-72 flex flex-col">
                            <PulseBlock className="h-5 w-32 mb-4" /><PulseBlock className="flex-1 w-full" />
                        </div>
                    ))}
                </div>

                {/* 3x3 Grid Row 2 Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 px-0 sm:px-0 mt-4 sm:mt-6">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={`sk-row2-${idx}`} className="bg-white p-5 sm:p-6 sm:rounded-xl shadow-sm border-y sm:border border-gray-200/60 h-60 sm:h-72 flex flex-col">
                            <PulseBlock className="h-5 w-32 mb-4" /><PulseBlock className="flex-1 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}