import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Barcode from '@/Components/Barcode';
import MobileScanner from '@/Components/MobileScanner';
import CategoryManager from '@/Components/CategoryManager';
import Swal from 'sweetalert2';
import { printLabels, downloadLabelImage } from '@/Utils/printLabels';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function Inventory({ auth }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [settings, setSettings] = useState(null);
    const [overwriteOnImport, setOverwriteOnImport] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isExporting, setIsExporting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCheckingSku, setIsCheckingSku] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [showLowStock, setShowLowStock] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'archived'
    const [activeDropdownId, setActiveDropdownId] = useState(null);

    const [printState, setPrintState] = useState({
        isOpen: false,
        product: null,
        quantity: 1,
        mode: 'thermal' // 'thermal' or 'a4'
    });

    const lastKeyTimeRef = useRef(0);
    const isScanningRef = useRef(false);

    useEffect(() => {
        if (!showModal) return;

        const handleGlobalKeyDown = (e) => {
            const now = Date.now();
            const timeDiff = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

            // Detect if sequence is typed extremely fast (< 45ms key-to-key)
            if (timeDiff < 45) {
                isScanningRef.current = true;
            }

            // If we are currently in scanning mode (scanner is typing the barcode)
            if (isScanningRef.current) {
                // If the user's cursor is NOT inside the SKU / Barcode input field
                if (document.activeElement && document.activeElement.name !== 'sku') {
                    // Stop character from being input
                    e.preventDefault();

                    // Clean the first character which typed before the speed threshold triggered
                    const activeEl = document.activeElement;
                    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                        if (timeDiff < 45 && !activeEl.dataset.scanCleaned) {
                            activeEl.value = activeEl.value.slice(0, -1);
                            const event = new Event('input', { bubbles: true });
                            activeEl.dispatchEvent(event);
                            activeEl.dataset.scanCleaned = 'true';
                        }
                    }
                }
            }

            // Reset scanner state when key interval is slow (> 100ms)
            if (timeDiff >= 100) {
                isScanningRef.current = false;
                if (document.activeElement) {
                    delete document.activeElement.dataset.scanCleaned;
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown, true);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown, true);
        };
    }, [showModal]);

    const [formData, setFormData] = useState({
        name: '', category_id: '', price: '', cost_price: '', wholesale_price: '', stock_quantity: '', sku: '', image: null
    });

    const formatCurrency = (cents) => {
        return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    useEffect(() => {
        loadCategories();
        fetchSettings();
        loadAllProducts(true);

        const interval = setInterval(() => {
            loadAllProducts(false);
        }, 5000);

        const handleOutsideClick = (e) => {
            if (!e.target.closest('.action-dropdown-container')) {
                setActiveDropdownId(null);
            }
        };
        window.addEventListener('click', handleOutsideClick);

        return () => {
            clearInterval(interval);
            window.removeEventListener('click', handleOutsideClick);
        };
    }, []);

    useEffect(() => {
        setActiveDropdownId(null);
    }, [currentPage]);

    useEffect(() => {
        setCurrentPage(1);
        setActiveDropdownId(null);
    }, [searchTerm, filterCategory, showLowStock, filterStatus]);

    const fetchSettings = async () => {
        try { const res = await axios.get('/api/settings'); setSettings(res.data); } catch (e) {}
    };

    const loadAllProducts = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const response = await axios.get('/api/products', { params: { all: true } });
            const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setProducts(data);
        } catch (error) {
            console.error("Critical error loading inventory:", error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await axios.get('/api/categories');
            setCategories(response.data);
        } catch (e) {
            console.error("Category load failed:", e);
        }
    };

    const handleCategoryUpdate = () => {
        loadCategories();
        loadAllProducts(false);
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = (p.name && p.name.toLowerCase().includes(searchLower)) ||
                                  (p.sku && p.sku.toLowerCase().includes(searchLower));

            const matchesCategory = filterCategory ? p.category_id?.toString() === filterCategory.toString() : true;
            const matchesLowStock = showLowStock ? p.stock_quantity <= 10 : true;

            let matchesStatus = true;
            if (filterStatus === 'active') {
                matchesStatus = p.is_active;
            } else if (filterStatus === 'archived') {
                matchesStatus = !p.is_active;
            }

            return matchesSearch && matchesCategory && matchesLowStock && matchesStatus;
        });
    }, [products, searchTerm, filterCategory, showLowStock, filterStatus]);

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleQuickAdd = async (product) => {
        const costPriceText = product.cost_price 
            ? `₱${formatCurrency(product.cost_price)}` 
            : '—';

        const { value: quantity } = await Swal.fire({
            title: `Restock: ${product.name}`,
            html: `
                <div class="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
                    <div class="flex justify-between text-sm py-1.5">
                        <span class="text-gray-500 font-bold">Cost Price:</span>
                        <span class="text-gray-900 font-black">${costPriceText}</span>
                    </div>
                    <div class="flex justify-between text-sm py-1.5 border-t border-dashed border-gray-200 mt-1">
                        <span class="text-gray-500 font-bold">Current Stock:</span>
                        <span class="text-gray-900 font-black">${product.stock_quantity} Left</span>
                    </div>
                    <div class="flex justify-between text-sm py-1.5 border-t border-dashed border-gray-200 mt-1">
                        <span class="text-indigo-600 font-bold">Total Restock Cost:</span>
                        <span class="text-indigo-600 font-black text-base" id="swal-total-cost">₱0.00</span>
                    </div>
                </div>
            `,
            input: 'number',
            inputLabel: 'Quantity to add to current inventory',
            inputPlaceholder: 'Enter amount...',
            showCancelButton: true,
            confirmButtonText: 'Update Stock',
            confirmButtonColor: '#3085d6',
            inputValidator: (value) => {
                if (!value || value <= 0) return 'Please enter a valid positive number.';
            },
            didOpen: () => {
                const input = Swal.getInput();
                const totalCostEl = document.getElementById('swal-total-cost');
                if (input && totalCostEl) {
                    input.addEventListener('input', (e) => {
                        const qty = parseFloat(e.target.value) || 0;
                        const costPrice = product.cost_price ? product.cost_price / 100 : 0;
                        const totalCost = qty * costPrice;
                        totalCostEl.textContent = `₱${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    });
                }
            }
        });

        if (quantity) {
            try {
                const parsedQuantity = parseInt(quantity, 10);
                await axios.post(`/api/products/${product.id}/stock`, { quantity: parsedQuantity });
                Swal.fire({ icon: 'success', title: 'Stock Updated', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });

                setProducts(prevProducts =>
                    prevProducts.map(p => p.id === product.id ? { ...p, stock_quantity: Number(p.stock_quantity) + parsedQuantity } : p)
                );
            } catch (error) {
                Swal.fire('Error', 'Failed to update stock levels.', 'error');
            }
        }
    };

    const executePrint = () => {
        const { product, quantity, mode } = printState;
        printLabels(product, settings?.store_name || 'POS STORE', quantity, mode);
        setPrintState({ ...printState, isOpen: false });
    };

    const exportPDF = async () => {
        setIsExporting(true);

        try {
            const exportData = filteredProducts;

            if (!exportData || exportData.length === 0) {
                Swal.fire('No Data', 'No records found to export.', 'info');
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
            doc.text('Inventory Status Report', 14, currentY);

            currentY += 6;
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.setFont(undefined, 'normal');

            let filterParts = [];
            if (searchTerm) filterParts.push(`Search: "${searchTerm}"`);
            if (filterCategory) {
                const catName = categories.find(c => c.id.toString() === filterCategory.toString())?.name || 'Filtered Category';
                filterParts.push(`Category: ${catName}`);
            }
            if (showLowStock) filterParts.push('Low Stock Only');

            const filterText = filterParts.length > 0 ? `Filters: ${filterParts.join(' | ')}` : 'Filter: All Inventory Items';
            doc.text(filterText, 14, currentY);

            const generatedText = `Generated: ${new Date().toLocaleString()}`;
            const textWidth = doc.getTextWidth(generatedText);
            doc.text(generatedText, pageWidth - 14 - textWidth, currentY);

            const tableStartY = currentY + 8;
            const tableColumns = ["SKU / Barcode", "Product Name", "Category", "Cost Price", "Wholesale Price", "Retail Price", "Stock", "Status"];
            const tableRows = [];
            let totalRetailValue = 0;
            let totalWholesaleValue = 0;
            let totalCostValue = 0;
            let totalItemsCount = 0;
            let lowStockCount = 0;

            exportData.forEach(p => {
                const status = p.stock_quantity <= 10 ? 'Low Stock' : 'In Stock';
                if (p.stock_quantity <= 10) lowStockCount++;

                const cost = (p.cost_price || 0) / 100;
                const wholesale = (p.wholesale_price || 0) / 100;
                const retail = (p.price || 0) / 100;
                const qty = p.stock_quantity || 0;

                totalCostValue += (cost * qty);
                totalWholesaleValue += (wholesale * qty);
                totalRetailValue += (retail * qty);
                totalItemsCount += qty;

                tableRows.push([
                    p.sku || 'N/A',
                    p.name || 'Unknown Product',
                    p.category?.name || 'Uncategorized',
                    `PHP ${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                    `PHP ${wholesale.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                    `PHP ${retail.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                    qty.toString(),
                    status
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
                        if (data.cell.raw === 'Low Stock') {
                            data.cell.styles.textColor = [220, 38, 38];
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [22, 163, 74];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : tableStartY + 20;

            // If the table went too far down, add a new page for the summary so it doesn't cut off
            if (finalY > 160) {
                doc.addPage();
                finalY = 20;
            }

            // Draw Summary Box Background
            doc.setFillColor(249, 250, 251); // bg-gray-50
            doc.setDrawColor(229, 231, 235); // border-gray-200
            doc.rect(14, finalY, pageWidth - 28, 42, 'FD');

            // Summary Box Title
            doc.setFontSize(12);
            doc.setTextColor(31, 41, 55);
            doc.setFont(undefined, 'bold');
            doc.text('Inventory Valuation & Summary Report', 20, finalY + 8);

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(75, 85, 99);

            // Left Column: Items Stats
            doc.text(`Total Unique Items: ${exportData.length}`, 20, finalY + 18);
            doc.text(`Total Stock Quantity: ${totalItemsCount}`, 20, finalY + 25);
            doc.text(`Low Stock Alerts: ${lowStockCount}`, 20, finalY + 32);

            // Middle Column: Valuation (Cost & Wholesale)
            doc.text(`Total Cost Value: PHP ${totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth / 2 - 40, finalY + 18);
            doc.text(`Total Wholesale Value: PHP ${totalWholesaleValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth / 2 - 40, finalY + 25);
            doc.text(`Total Retail Value: PHP ${totalRetailValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth / 2 - 40, finalY + 32);

            // Right Column: Margins
            const estGrossProfit = totalRetailValue - totalCostValue;
            const avgMargin = totalRetailValue > 0 ? (estGrossProfit / totalRetailValue) * 100 : 0;
            doc.text(`Est. Gross Profit: PHP ${estGrossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - 90, finalY + 18);
            doc.text(`Avg. Expected Margin: ${avgMargin.toFixed(1)}%`, pageWidth - 90, finalY + 25);

            const dateStr = new Date().toISOString().split('T')[0];
            doc.save(`Inventory_Report_${dateStr}.pdf`);
            Swal.fire({ icon: 'success', title: 'PDF Exported!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });

        } catch (error) {
            console.error("PDF Generation Error:", error);
            Swal.fire('Error', 'Failed to generate PDF report.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const downloadTemplate = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Products Template', {
                views: [{ showGridLines: true }]
            });

            // Set column widths
            worksheet.getColumn('A').width = 20; // Barcode/SKU
            worksheet.getColumn('B').width = 30; // Product Name
            worksheet.getColumn('C').width = 25; // Category Name
            worksheet.getColumn('D').width = 15; // Retail Price
            worksheet.getColumn('E').width = 18; // Wholesale Price
            worksheet.getColumn('F').width = 15; // Cost Price
            worksheet.getColumn('G').width = 15; // Stock Quantity

            // Add Store Header (Rows 1 to 4)
            const storeName = settings?.store_name || 'POS Store';
            const storeAddress = settings?.address || '';
            const storeContact = settings?.phone ? `Contact: ${settings.phone}` : '';

            // Store Name
            worksheet.mergeCells('A1:G1');
            worksheet.getCell('A1').value = storeName.toUpperCase();
            worksheet.getCell('A1').font = { bold: true, color: { argb: '1B3A69' }, size: 14 };
            worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 24;

            // Address
            worksheet.mergeCells('A2:G2');
            worksheet.getCell('A2').value = storeAddress;
            worksheet.getCell('A2').font = { color: { argb: '555555' }, size: 9 };
            worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(2).height = 16;

            // Contact (Phone)
            worksheet.mergeCells('A3:G3');
            worksheet.getCell('A3').value = storeContact;
            worksheet.getCell('A3').font = { color: { argb: '555555' }, size: 9, italic: true };
            worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(3).height = 16;

            // Title
            worksheet.mergeCells('A4:G4');
            worksheet.getCell('A4').value = 'PRODUCT DATA IMPORT TEMPLATE';
            worksheet.getCell('A4').font = { bold: true, color: { argb: '333333' }, size: 10 };
            worksheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(4).height = 18;

            // Empty spacing row
            worksheet.getRow(5).height = 10;

            // Header styling (Row 6)
            const headers = ['Barcode/SKU', 'Product Name', 'Category Name', 'Retail Price', 'Wholesale Price', 'Cost Price', 'Stock Quantity'];
            headers.forEach((h, colIndex) => {
                const cell = worksheet.getRow(6).getCell(colIndex + 1);
                cell.value = h;
                cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '1B3A69' }
                };
                cell.alignment = { vertical: 'middle', horizontal: colIndex >= 3 ? 'right' : 'left' };
            });
            worksheet.getRow(6).height = 25;

            // Generate category validation list from active system categories
            const catNames = categories.map(c => c.name).filter(Boolean);
            const listSource = catNames.length > 0 ? catNames : ['Clothing & Apparel', 'Electronics', 'Home & Garden', 'Sports & Outdoors', 'Accessories'];
            const defaultCategory = listSource[0];

            // Create a hidden worksheet to store category validation values
            const categoriesSheet = workbook.addWorksheet('CategoryList');
            categoriesSheet.state = 'hidden';
            listSource.forEach((name, index) => {
                categoriesSheet.getCell(`A${index + 1}`).value = name;
            });

            // Add sample row at Row 7
            worksheet.addRow({
                sku: '88010020',
                name: 'Sample Product A',
                category_name: defaultCategory,
                price: 150.00,
                wholesale_price: 130.00,
                cost_price: 100.00,
                stock_quantity: 50
            });

            // Enable worksheet protection to lock header cells (Rows 1 to 6)
            worksheet.protect('', {
                selectLockedCells: true,
                selectUnlockedCells: true
            });

            // Set styling, validation, and unlock data cells (rows 7 to 206)
            for (let i = 7; i <= 206; i++) {
                const row = worksheet.getRow(i);
                
                // Align columns appropriately
                row.getCell('A').alignment = { horizontal: 'left' };
                row.getCell('B').alignment = { horizontal: 'left' };
                row.getCell('C').alignment = { horizontal: 'left' };
                row.getCell('D').alignment = { horizontal: 'right' };
                row.getCell('E').alignment = { horizontal: 'right' };
                row.getCell('F').alignment = { horizontal: 'right' };
                row.getCell('G').alignment = { horizontal: 'right' };

                // Number formatting
                row.getCell('D').numFmt = '#,##0.00';
                row.getCell('E').numFmt = '#,##0.00';
                row.getCell('F').numFmt = '#,##0.00';
                row.getCell('G').numFmt = '#,##0';

                // Unlock data entry cells for editing on protected sheet
                row.getCell('A').protection = { locked: false };
                row.getCell('B').protection = { locked: false };
                row.getCell('C').protection = { locked: false };
                row.getCell('D').protection = { locked: false };
                row.getCell('E').protection = { locked: false };
                row.getCell('F').protection = { locked: false };
                row.getCell('G').protection = { locked: false };

                // Data Validations (ALL required: allowBlank: false)
                // Barcode/SKU
                row.getCell('A').dataValidation = {
                    type: 'custom',
                    formulae: [`LEN(TRIM(A${i}))>0`],
                    allowBlank: false,
                    showErrorMessage: true,
                    errorTitle: 'Field Required',
                    error: 'Barcode/SKU is required. You cannot leave this field blank.',
                    promptTitle: 'Barcode/SKU',
                    prompt: 'Enter unique Barcode or SKU.'
                };

                // Product Name
                row.getCell('B').dataValidation = {
                    type: 'custom',
                    formulae: [`LEN(TRIM(B${i}))>0`],
                    allowBlank: false,
                    showErrorMessage: true,
                    errorTitle: 'Field Required',
                    error: 'Product Name is required. You cannot leave this field blank.',
                    promptTitle: 'Product Name',
                    prompt: 'Enter product name.'
                };

                // Category dropdown
                row.getCell('C').dataValidation = {
                    type: 'list',
                    allowBlank: false,
                    formulae: [`CategoryList!$A$1:$A$${listSource.length}`],
                    showErrorMessage: true,
                    errorTitle: 'Field Required',
                    error: 'Category Name is required. Please choose one from the dropdown menu.',
                    promptTitle: 'Select Category',
                    prompt: 'Choose a category to ensure correct import matching.'
                };

                // Retail Price
                row.getCell('D').dataValidation = {
                    type: 'decimal',
                    operator: 'greaterThanOrEqual',
                    formulae: [0],
                    allowBlank: false,
                    showErrorMessage: true,
                    errorTitle: 'Field Required',
                    error: 'Retail Price is required and must be a positive number.',
                    promptTitle: 'Retail Price',
                    prompt: 'Enter selling price (e.g. 15.50).'
                };

                // Wholesale Price
                row.getCell('E').dataValidation = {
                    type: 'decimal',
                    operator: 'greaterThanOrEqual',
                    formulae: [0],
                    allowBlank: false,
                    showErrorMessage: true,
                    errorTitle: 'Field Required',
                    error: 'Wholesale Price is required and must be a positive number.',
                    promptTitle: 'Wholesale Price',
                    prompt: 'Enter wholesale price (e.g. 13.00).'
                };

                // Cost Price
                row.getCell('F').dataValidation = {
                    type: 'decimal',
                    operator: 'greaterThanOrEqual',
                    formulae: [0],
                    allowBlank: false,
                    showErrorMessage: true,
                    errorTitle: 'Field Required',
                    error: 'Cost Price is required and must be a positive number.',
                    promptTitle: 'Cost Price',
                    prompt: 'Enter cost price (e.g. 10.00).'
                };

                // Stock Quantity
                row.getCell('G').dataValidation = {
                    type: 'whole',
                    operator: 'greaterThanOrEqual',
                    formulae: [0],
                    allowBlank: false,
                    showErrorMessage: true,
                    errorTitle: 'Field Required',
                    error: 'Stock Quantity is required and must be a positive integer.',
                    promptTitle: 'Stock Quantity',
                    prompt: 'Enter current stock count.'
                };
            }

            // Highlight empty cells in soft red if the row is partially filled
            worksheet.addConditionalFormatting({
                ref: 'A2:G200',
                rules: [
                    {
                        type: 'expression',
                        formulae: ['AND(A2="", COUNTA($A2:$G2)>0)'],
                        style: {
                            fill: {
                                type: 'pattern',
                                pattern: 'solid',
                                bgColor: { argb: 'FEE2E2' },
                                fgColor: { argb: 'FEE2E2' }
                            },
                            font: {
                                color: { argb: '991B1B' },
                                bold: true
                            }
                        }
                    }
                ]
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, 'Aivin_POS_Products_Template.xlsx');
            Swal.fire({ icon: 'success', title: 'Template Downloaded!', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } catch (e) {
            console.error(e);
        }
    };

    const exportExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Inventory Report', {
                views: [{ showGridLines: true }]
            });

            // Set column widths
            worksheet.getColumn('A').width = 20; // Barcode/SKU
            worksheet.getColumn('B').width = 30; // Product Name
            worksheet.getColumn('C').width = 25; // Category Name
            worksheet.getColumn('D').width = 18; // Retail Price
            worksheet.getColumn('E').width = 18; // Wholesale Price
            worksheet.getColumn('F').width = 18; // Cost Price
            worksheet.getColumn('G').width = 15; // Stock Quantity

            // Add Store Header (Rows 1 to 4)
            const storeName = settings?.store_name || 'POS Store';
            const storeAddress = settings?.address || '';
            const storeContact = settings?.phone ? `Contact: ${settings.phone}` : '';

            // Store Name
            worksheet.mergeCells('A1:G1');
            worksheet.getCell('A1').value = storeName.toUpperCase();
            worksheet.getCell('A1').font = { bold: true, color: { argb: '1B3A69' }, size: 16 };
            worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 28;

            // Address
            worksheet.mergeCells('A2:G2');
            worksheet.getCell('A2').value = storeAddress;
            worksheet.getCell('A2').font = { color: { argb: '555555' }, size: 9 };
            worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(2).height = 16;

            // Contact
            worksheet.mergeCells('A3:G3');
            worksheet.getCell('A3').value = storeContact;
            worksheet.getCell('A3').font = { color: { argb: '555555' }, size: 9, italic: true };
            worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(3).height = 16;

            // Title
            worksheet.mergeCells('A4:G4');
            worksheet.getCell('A4').value = `INVENTORY STATUS & BACKUP REPORT (Generated: ${new Date().toLocaleString()})`;
            worksheet.getCell('A4').font = { bold: true, color: { argb: '333333' }, size: 11 };
            worksheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(4).height = 20;

            // Empty spacing row
            worksheet.getRow(5).height = 10;

            // Headers on Row 6
            const headers = ['Barcode/SKU', 'Product Name', 'Category Name', 'Retail Price (PHP)', 'Wholesale Price (PHP)', 'Cost Price (PHP)', 'Stock Quantity'];
            headers.forEach((h, colIndex) => {
                const cell = worksheet.getRow(6).getCell(colIndex + 1);
                cell.value = h;
                cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '1B3A69' } // Sleek navy theme for reports
                };
                cell.alignment = { vertical: 'middle', horizontal: colIndex >= 3 ? 'right' : 'left' };
            });
            worksheet.getRow(6).height = 25;

            // Enable worksheet protection to lock header cells (Rows 1 to 6)
            worksheet.protect('', {
                selectLockedCells: true,
                selectUnlockedCells: true
            });

            // Add product rows starting from Row 7
            products.forEach((p, idx) => {
                const rowIndex = idx + 7;
                const row = worksheet.getRow(rowIndex);

                row.getCell(1).value = p.sku || 'N/A';
                row.getCell(2).value = p.name || 'Unknown';
                row.getCell(3).value = p.category?.name || 'Uncategorized';
                row.getCell(4).value = p.price / 100;
                row.getCell(5).value = p.wholesale_price ? p.wholesale_price / 100 : '';
                row.getCell(6).value = p.cost_price ? p.cost_price / 100 : '';
                row.getCell(7).value = p.stock_quantity;

                // Format cell alignments
                row.getCell(1).alignment = { horizontal: 'left' };
                row.getCell(2).alignment = { horizontal: 'left' };
                row.getCell(3).alignment = { horizontal: 'left' };
                row.getCell(4).alignment = { horizontal: 'right' };
                row.getCell(5).alignment = { horizontal: 'right' };
                row.getCell(6).alignment = { horizontal: 'right' };
                row.getCell(7).alignment = { horizontal: 'right' };

                // Number formats
                row.getCell(4).numFmt = '#,##0.00';
                row.getCell(5).numFmt = '#,##0.00';
                row.getCell(6).numFmt = '#,##0.00';
                row.getCell(7).numFmt = '#,##0';

                // Unlock data rows cells for editing
                row.getCell(1).protection = { locked: false };
                row.getCell(2).protection = { locked: false };
                row.getCell(3).protection = { locked: false };
                row.getCell(4).protection = { locked: false };
                row.getCell(5).protection = { locked: false };
                row.getCell(6).protection = { locked: false };
                row.getCell(7).protection = { locked: false };
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const dateStr = new Date().toISOString().split('T')[0];
            saveAs(blob, `Inventory_Backup_${dateStr}.xlsx`);
            Swal.fire({ icon: 'success', title: 'Export Completed!', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } catch (e) {
            Swal.fire('Error', 'Failed to export inventory data.', 'error');
        }
    };

    const parseCSV = (text) => {
        const lines = text.split(/\r?\n/);
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const clean = (val) => val ? val.replace(/^["']|["']$/g, '').trim() : '';
            const sku = clean(row[0]);
            const name = clean(row[1]);
            const category_name = clean(row[2]);
            const price = parseFloat(clean(row[3])) || 0;
            const wholesale_price = parseFloat(clean(row[4])) || null;
            const cost_price = parseFloat(clean(row[5])) || null;
            const stock_quantity = parseInt(clean(row[6]), 10) || 0;

            if (sku && name) {
                result.push({
                    sku, name, category_name, price, wholesale_price, cost_price, stock_quantity
                });
            }
        }
        return result;
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Swal.fire({
            title: 'Processing File...',
            text: 'Please wait while we validate and import your product list.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const isCsv = file.name.endsWith('.csv');
            const reader = new FileReader();

            reader.onload = async (evt) => {
                try {
                    let importedProducts = [];

                    if (isCsv) {
                        const csvContent = new TextDecoder('utf-8').decode(evt.target.result);
                        importedProducts = parseCSV(csvContent);
                    } else {
                        const workbook = new ExcelJS.Workbook();
                        await workbook.xlsx.load(evt.target.result);
                        const worksheet = workbook.worksheets[0];
                        let headerRowNumber = 1;
                        worksheet.eachRow((row, rowNumber) => {
                            const valA = row.getCell(1).value?.toString() || '';
                            const valB = row.getCell(2).value?.toString() || '';
                            if (valA.includes('Barcode/SKU') || valB.includes('Product Name')) {
                                headerRowNumber = rowNumber;
                            }
                        });

                        worksheet.eachRow((row, rowNumber) => {
                            if (rowNumber <= headerRowNumber) return;

                            const getCellString = (colNum) => {
                                const val = row.getCell(colNum).value;
                                if (val && typeof val === 'object' && val.text) return val.text;
                                return val?.toString() || '';
                            };

                            const sku = getCellString(1);
                            const name = getCellString(2);
                            const category_name = getCellString(3);
                            const price = parseFloat(row.getCell(4).value) || 0;
                            const wholesale_price = parseFloat(row.getCell(5).value) || null;
                            const cost_price = parseFloat(row.getCell(6).value) || null;
                            const stock_quantity = parseInt(row.getCell(7).value, 10) || 0;

                            // Add to list if any product identifier is present (backend will validate completeness)
                            if (sku || name || category_name) {
                                importedProducts.push({
                                    rowNum: rowNumber,
                                    sku: sku.trim(),
                                    name: name.trim(),
                                    category_name: category_name.trim(),
                                    price: price,
                                    wholesale_price: wholesale_price,
                                    cost_price: cost_price,
                                    stock_quantity: stock_quantity
                                });
                            }
                        });
                    }

                    if (importedProducts.length === 0) {
                        Swal.fire('No Data Found', 'Make sure your file has data below the headers and matches the template structure.', 'warning');
                        return;
                    }

                    const response = await axios.post('/api/products/import', { 
                        products: importedProducts, 
                        overwrite: overwriteOnImport 
                    });
                    if (response.data.success) {
                        const { imported_count, skipped_count, skipped_skus, updated_count = 0 } = response.data;
                        
                        let htmlContent = `<div class="text-left font-sans text-sm p-1">`;
                        if (imported_count > 0) {
                            htmlContent += `<p class="font-bold text-gray-800">Successfully imported <span class="text-green-600 font-semibold">${imported_count}</span> new products.</p>`;
                        }
                        if (updated_count > 0) {
                            htmlContent += `<p class="font-bold text-gray-800 ${imported_count > 0 ? 'mt-2' : ''}">Successfully updated/overwritten <span class="text-blue-600 font-semibold">${updated_count}</span> existing products.</p>`;
                        }
                        if (skipped_count > 0) {
                            htmlContent += `
                                <p class="mt-3 text-amber-700 font-semibold">Skipped <span class="font-bold">${skipped_count}</span> duplicate products (Barcode/SKU already exists in database):</p>
                                <div class="mt-2 max-h-32 overflow-y-auto bg-amber-50 p-2 rounded border border-amber-200 font-mono text-xs text-amber-800 select-all">
                                    ${skipped_skus.join('<br>')}
                                </div>
                            `;
                        }
                        htmlContent += `</div>`;

                        Swal.fire({
                            icon: 'success',
                            title: 'Import Processed!',
                            html: htmlContent,
                            confirmButtonColor: '#1B3A69'
                        });
                        loadAllProducts(false);
                    } else {
                        throw new Error(response.data.message);
                    }
                } catch (err) {
                    console.error(err);
                    let errMsg = err.message || 'An error occurred during import. Check file formatting.';
                    
                    // Format structural validation errors returned by Laravel
                    if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
                        errMsg = err.response.data.errors.slice(0, 10).join('\n');
                        if (err.response.data.errors.length > 10) {
                            errMsg += `\n...and ${err.response.data.errors.length - 10} more errors.`;
                        }
                    } else if (err.response?.data?.message) {
                        errMsg = err.response.data.message;
                    }

                    Swal.fire({
                        icon: 'error',
                        title: 'Import Failed',
                        text: errMsg,
                        customClass: {
                        }
                    });
                }
            };

            if (isCsv) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        } catch (err) {
            Swal.fire('Error', 'Could not read the uploaded file.', 'error');
        } finally {
            e.target.value = '';
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setFormData({ ...formData, image: e.target.files[0] });

    const checkSkuExists = (skuToCheck) => {
        return products.some(p => p.sku === skuToCheck && p.id !== editingId);
    };

    const checkNameExists = (nameToCheck) => {
        return products.some(p => p.name.toLowerCase() === nameToCheck.toLowerCase() && p.id !== editingId);
    };

    const generateSKU = async () => {
        setIsCheckingSku(true);
        try {
            const response = await axios.get('/api/products/next-sku');
            if (response.data.success && response.data.next_sku) {
                setFormData(prev => ({ ...prev, sku: response.data.next_sku }));
            } else {
                throw new Error("Invalid next SKU response");
            }
        } catch (error) {
            console.error("SKU generation failed:", error);
            Swal.fire('Error', 'Could not generate next sequential SKU.', 'error');
        } finally {
            setIsCheckingSku(false);
        }
    };

    const handleScan = (data) => {
        setShowScanner(false);

        if (checkSkuExists(data)) {
            Swal.fire({ icon: 'warning', title: 'Duplicate Barcode', text: `The barcode "${data}" is already registered!`, confirmButtonColor: '#3085d6' });
        } else {
            setFormData(p => ({ ...p, sku: data }));
            setShowModal(true);
        }
    };

    const openAddModal = () => {
        setEditMode(false);
        setEditingId(null);
        setFormData({ name: '', category_id: '', price: '', cost_price: '', wholesale_price: '', stock_quantity: '', sku: '', image: null, is_active: true });
        setShowModal(true);
    };

    const openEditModal = (p) => {
        setEditMode(true);
        setEditingId(p.id);
        setFormData({
            name: p.name,
            category_id: p.category_id || '',
            price: (p.price / 100).toFixed(2),
            cost_price: p.cost_price ? (p.cost_price / 100).toFixed(2) : '',
            wholesale_price: p.wholesale_price ? (p.wholesale_price / 100).toFixed(2) : '',
            stock_quantity: p.stock_quantity,
            sku: p.sku,
            image: null,
            is_active: p.is_active !== undefined ? !!p.is_active : true
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const cleanName = formData.name.trim();
            const cleanSku = formData.sku.trim();

            if (checkNameExists(cleanName)) {
                setIsSaving(false);
                return Swal.fire({ icon: 'warning', title: 'Name Already Exists', text: `A product named "${cleanName}" is already in your inventory.`, confirmButtonColor: '#3085d6' });
            }

            if (checkSkuExists(cleanSku)) {
                setIsSaving(false);
                return Swal.fire({ icon: 'warning', title: 'Duplicate Barcode', text: `The barcode "${cleanSku}" is already assigned.`, confirmButtonColor: '#3085d6' });
            }

            const data = new FormData();
            data.append('name', cleanName);
            data.append('category_id', formData.category_id);
            data.append('price', formData.price);
            data.append('cost_price', formData.cost_price);
            data.append('wholesale_price', formData.wholesale_price);
            data.append('stock_quantity', formData.stock_quantity);
            data.append('sku', cleanSku);
            data.append('is_active', formData.is_active ? '1' : '0');
            if(formData.image) data.append('image', formData.image);

            if(editMode) {
                data.append('_method', 'PUT');
                await axios.post(`/api/products/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await axios.post('/api/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            setShowModal(false);
            loadAllProducts(false); // Silent reload
            Swal.fire({ icon: 'success', title: 'Saved!', showConfirmButton: false, timer: 1500 });

        } catch(err) {
            Swal.fire('Error', 'An error occurred while saving the product.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (product) => {
        const action = product.is_active ? 'Archive' : 'Restore';
        const actionPast = product.is_active ? 'archived' : 'restored';
        
        const result = await Swal.fire({
            title: `${action} this product?`,
            text: product.is_active 
                ? `Archiving "${product.name}" will hide it from the POS sales screen, but keep its sales logs.`
                : `Restoring "${product.name}" will make it available again on the POS sales screen.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1B3A69',
            cancelButtonColor: '#d33',
            confirmButtonText: `Yes, ${action}!`
        });

        if (result.isConfirmed) {
            try {
                const res = await axios.patch(`/api/products/${product.id}/toggle-active`);
                if (res.data.success) {
                    Swal.fire('Updated!', `Product has been successfully ${actionPast}.`, 'success');
                    loadAllProducts(false);
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Error', `Failed to ${action.toLowerCase()} the product.`, 'error');
            }
        }
    };

    const handleDelete = async (product) => {
        const id = product.id;
        const result = await Swal.fire({
            title: 'Delete this product?',
            text: "This action will remove the item from the inventory. Note: Items with sales history cannot be deleted.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#1B3A69',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Confirm Delete'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/products/${id}`);
                loadAllProducts(false); // Silent reload
                Swal.fire('Deleted!', 'Product successfully removed.', 'success');
            } catch (error) {
                const isLinked = error.response?.data?.error === 'linked_to_transactions';
                const serverMessage = error.response?.data?.message || error.response?.data?.error;
                
                if (isLinked) {
                    if (!product.is_active) {
                        Swal.fire({
                            title: 'Cannot Delete Product',
                            text: 'This product has sales history and is already archived. It cannot be permanently deleted for auditing purposes.',
                            icon: 'info',
                            confirmButtonColor: '#1B3A69'
                        });
                    } else {
                        const archiveResult = await Swal.fire({
                            title: 'Cannot Delete Product',
                            text: 'This product has sales history and cannot be permanently deleted. Would you like to Archive it instead to hide it from the POS terminal?',
                            icon: 'info',
                            showCancelButton: true,
                            confirmButtonColor: '#1B3A69',
                            cancelButtonColor: '#d33',
                            confirmButtonText: 'Yes, Archive it!',
                            cancelButtonText: 'No'
                        });

                        if (archiveResult.isConfirmed) {
                            try {
                                const res = await axios.patch(`/api/products/${id}/toggle-active`);
                                if (res.data.success) {
                                    Swal.fire('Archived!', 'The product has been archived successfully.', 'success');
                                    loadAllProducts(false);
                                }
                            } catch (e) {
                                Swal.fire('Error', 'Failed to archive the product.', 'error');
                            }
                        }
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Deletion Restricted',
                        text: serverMessage || "This product is linked to sales records and cannot be deleted for auditing purposes.",
                        footer: '<b>Solution:</b> Set stock to 0 or archive the product instead.'
                    });
                }
            }
        }
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800">Inventory</h2>}>
            <Head title="Inventory" />

            <div className="py-4 sm:py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">

                    {/* UNIFIED FULL-WIDTH MEGA TOOLBAR */}
                    <div className="px-4 sm:px-0">
                        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-3 w-full">

                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder="Search SKU or product name..."
                                    className="pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium transition-colors"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3 sm:top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>

                            <div className={`grid grid-cols-2 gap-2 sm:gap-3 w-full ${auth.user.is_admin ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="col-span-1 lg:col-span-1 w-full bg-white border border-gray-200 rounded-lg py-2.5 sm:py-3 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-600 text-xs sm:text-sm font-medium transition-colors"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="col-span-1 lg:col-span-1 w-full bg-white border border-gray-200 rounded-lg py-2.5 sm:py-3 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-600 text-xs sm:text-sm font-medium transition-colors"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="active">Active Only</option>
                                    <option value="archived">Archived Only</option>
                                </select>

                                <button
                                    onClick={() => setShowLowStock(!showLowStock)}
                                    className={`col-span-1 w-full py-2.5 sm:py-3 rounded-lg font-bold flex items-center justify-center gap-1.5 sm:gap-2 border transition-all text-xs sm:text-sm active:scale-95
                                        ${showLowStock ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                                    <span className="hidden sm:inline">{showLowStock ? 'Low Stock Only' : 'Show Low Stock'}</span>
                                    <span className="sm:hidden text-[11px]">Low Stock</span>
                                </button>

                                <button onClick={() => setShowCategoryManager(true)} className={`col-span-1 w-full py-2.5 sm:py-3 flex items-center justify-center bg-white text-gray-700 rounded-lg font-bold border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-xs sm:text-sm whitespace-nowrap`}>
                                    {auth.user.is_admin ? 'Categories' : 'View Categories'}
                                </button>

                                {auth.user.is_admin && (
                                    <button
                                        onClick={exportPDF}
                                        disabled={isExporting}
                                        className={`col-span-1 w-full py-2.5 sm:py-3 rounded-lg font-bold flex items-center justify-center gap-1 sm:gap-2 shadow-sm transition-all text-xs sm:text-sm active:scale-95
                                            ${isExporting
                                                ? 'opacity-50 cursor-not-allowed bg-green-600 text-white'
                                                : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                    >
                                        {isExporting ? (
                                            <>
                                                <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                <span>Wait...</span>
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

                                {auth.user.is_admin && (
                                    <button onClick={openAddModal} className="col-span-1 w-full py-2.5 sm:py-3 flex items-center justify-center bg-gray-900 text-white rounded-lg font-bold hover:bg-black shadow-sm active:scale-95 transition-all text-xs sm:text-sm gap-1.5 sm:gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                        New Product
                                    </button>
                                )}

                            </div>

                            {auth.user.is_admin && (
                                <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center sm:justify-between">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Inventory Data Operations
                                    </div>
                                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                                        {/* Row 1 on mobile: Download Template (full width) */}
                                        <button
                                            onClick={downloadTemplate}
                                            className="col-span-2 sm:col-span-1 px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                            Download Template
                                        </button>

                                        {/* Row 2 on mobile: Import + Export Excel side by side */}
                                        <button
                                            onClick={() => document.getElementById('excel-import-input').click()}
                                            className="col-span-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>
                                            Import Excel/CSV
                                        </button>
                                        <input
                                            id="excel-import-input"
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            className="hidden"
                                            onChange={handleImport}
                                        />

                                        {/* Overwrite duplicate products checkbox */}
                                        <label className="col-span-2 sm:col-span-auto flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg shadow-sm cursor-pointer select-none hover:bg-gray-100 transition-all">
                                            <input
                                                type="checkbox"
                                                checked={overwriteOnImport}
                                                onChange={(e) => setOverwriteOnImport(e.target.checked)}
                                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            Overwrite duplicates
                                        </label>

                                        <button
                                            onClick={exportExcel}
                                            className="col-span-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                                            Export Excel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TABLE: DESKTOP VIEW */}
                    <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 mx-4 sm:mx-0">
                        <div className="overflow-x-auto min-h-[320px]">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b text-gray-500 uppercase text-[10px] font-black tracking-wider">
                                    <tr>
                                        <th className="p-4 w-32">Barcode</th>
                                        <th className="p-4">Product Details</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4 text-right">Cost Price</th>
                                        <th className="p-4 text-right">Price</th>
                                        <th className="p-4 text-center">Inventory</th>
                                        <th className="p-4 text-center w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, index) => (
                                            <tr key={`skel-${index}`} className="animate-pulse">
                                                <td className="p-4"><div className="h-6 bg-gray-200 rounded w-24"></div></td>
                                                <td className="p-4 flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-200 rounded-lg shrink-0"></div>
                                                    <div className="h-4 bg-gray-200 rounded w-40"></div>
                                                </td>
                                                <td className="p-4"><div className="h-6 bg-gray-200 rounded-lg w-20"></div></td>
                                                <td className="p-4 text-right"><div className="h-5 bg-gray-200 rounded w-16 ml-auto"></div></td>
                                                <td className="p-4 flex justify-end"><div className="h-5 bg-gray-200 rounded w-16"></div></td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="h-6 bg-gray-200 rounded-md w-16"></div>
                                                        <div className="h-6 w-6 bg-gray-200 rounded-md"></div>
                                                    </div>
                                                </td>
                                                <td className="p-4 flex justify-center gap-2">
                                                    {auth.user.is_admin && <div className="w-9 h-9 bg-gray-200 rounded-md"></div>}
                                                    <div className="w-9 h-9 bg-gray-200 rounded-md"></div>
                                                    <div className="w-9 h-9 bg-gray-200 rounded-md"></div>
                                                    {auth.user.is_admin && <div className="w-9 h-9 bg-gray-200 rounded-md"></div>}
                                                </td>
                                            </tr>
                                        ))
                                    ) : paginatedProducts.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center py-6">
                                                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                                    </svg>
                                                    <h3 className="text-lg font-bold text-gray-900">No products found</h3>
                                                    <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                                                        {searchTerm || filterCategory || showLowStock
                                                            ? "We couldn't find any products matching your current filters."
                                                            : "Your inventory is currently empty. Start by adding your first product."}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedProducts.map((p, index) => (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4"><Barcode value={p.sku} width={1} height={25} fontSize={10} /></td>
                                                <td className="p-4 flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-50 rounded-md border flex items-center justify-center overflow-hidden shrink-0">
                                                        {p.image_path ? <img src={p.image_path} className="w-full h-full object-cover" loading="lazy"/> : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-800">{p.name}</span>
                                                        {!p.is_active && (
                                                            <span className="inline-flex items-center w-max px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase bg-slate-100 text-slate-500 border border-slate-200 mt-0.5">
                                                                Archived
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {p.category ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-gray-200 text-gray-600 shadow-sm">
                                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.category.color || '#3B82F6' }}></span>
                                                            {p.category.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm italic">Uncategorized</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right tracking-tight">
                                                    <div className="font-semibold text-gray-500">
                                                        {p.cost_price ? `₱${formatCurrency(p.cost_price)}` : '—'}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right tracking-tight">
                                                    <div className="font-black text-gray-900">₱{formatCurrency(p.price)}</div>
                                                    {p.wholesale_price && (
                                                        <div className="text-[10px] text-gray-400 font-bold mt-0.5" title="Wholesale Price">WS: ₱{formatCurrency(p.wholesale_price)}</div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-black tracking-wider uppercase ${p.stock_quantity <= 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                            {p.stock_quantity} Left
                                                        </span>
                                                        <button onClick={() => handleQuickAdd(p)} className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center font-bold transition-all active:scale-95" title="Quick Add Stock">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center action-dropdown-container overflow-visible">
                                                    {auth.user.is_admin ? (
                                                        <div className="relative inline-block text-left">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(activeDropdownId === p.id ? null : p.id);
                                                                }}
                                                                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors inline-flex items-center justify-center"
                                                                title="Actions"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                                                                </svg>
                                                            </button>

                                                            {activeDropdownId === p.id && (
                                                                <div className={`absolute right-0 w-48 bg-white rounded-lg border border-gray-150 shadow-xl z-50 py-1 divide-y divide-gray-50 text-left ${
                                                                    index >= paginatedProducts.length - 3 && paginatedProducts.length > 3 
                                                                        ? 'bottom-full mb-1' 
                                                                        : 'top-full mt-1'
                                                                }`}>
                                                                    <div className="py-1">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setActiveDropdownId(null);
                                                                                openEditModal(p);
                                                                            }} 
                                                                            className="w-full px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-2"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                                                                            Edit Product
                                                                        </button>

                                                                        <button 
                                                                            onClick={() => {
                                                                                setActiveDropdownId(null);
                                                                                setPrintState({ isOpen: true, product: p, quantity: 1, mode: 'thermal' });
                                                                            }} 
                                                                            className="w-full px-3 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                                                            Print Labels
                                                                        </button>

                                                                        <button 
                                                                            onClick={() => {
                                                                                setActiveDropdownId(null);
                                                                                downloadLabelImage(p, settings?.store_name || 'POS STORE');
                                                                            }} 
                                                                            className="w-full px-3 py-2 text-[11px] font-bold text-green-700 hover:bg-green-50 transition-colors flex items-center gap-2"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                                                            Save PNG Barcode
                                                                        </button>
                                                                    </div>

                                                                    <div className="py-1">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setActiveDropdownId(null);
                                                                                handleToggleActive(p);
                                                                            }} 
                                                                            className={`w-full px-3 py-2 text-[11px] font-bold transition-colors flex items-center gap-2 ${p.is_active ? 'text-slate-600 hover:bg-slate-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                                                                        >
                                                                            {p.is_active ? (
                                                                                <>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                                                                    </svg>
                                                                                    Archive Product
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                                                                    </svg>
                                                                                    Restore Product
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </div>

                                                                    <div className="py-1">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setActiveDropdownId(null);
                                                                                handleDelete(p);
                                                                            }} 
                                                                            className="w-full px-3 py-2 text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                                                            Delete Product
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-1.5">
                                                            <button 
                                                                onClick={() => setPrintState({ isOpen: true, product: p, quantity: 1, mode: 'thermal' })} 
                                                                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors inline-flex items-center justify-center" 
                                                                title="Print Labels"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                                            </button>

                                                            <button 
                                                                onClick={() => downloadLabelImage(p, settings?.store_name || 'POS STORE')} 
                                                                className="p-2 text-green-500 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors inline-flex items-center justify-center" 
                                                                title="Save Barcode Image"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                                            </button>
                                                        </div>
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
                                <div key={`mob-skel-${index}`} className="p-4 flex flex-col gap-3 animate-pulse">
                                    <div className="flex gap-4">
                                        <div className="w-20 h-20 bg-gray-200 rounded-lg shrink-0"></div>
                                        <div className="flex-1 flex flex-col justify-center gap-2">
                                            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-200 rounded w-1/3 mt-1"></div>
                                            <div className="flex justify-between items-end mt-1">
                                                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                                                <div className="h-5 bg-gray-200 rounded-md w-1/4"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-1">
                                        <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                                        <div className="h-7 bg-gray-200 rounded-lg w-16"></div>
                                    </div>
                                    <div className={`grid gap-2 pt-1 ${auth.user.is_admin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
                                        {auth.user.is_admin && <div className="h-9 bg-gray-200 rounded-lg"></div>}
                                        <div className="h-9 bg-gray-200 rounded-lg"></div>
                                        <div className="h-9 bg-gray-200 rounded-lg"></div>
                                        {auth.user.is_admin && <div className="h-9 bg-gray-200 rounded-lg"></div>}
                                    </div>
                                </div>
                            ))
                        ) : paginatedProducts.length === 0 ? (
                            <div className="p-10 text-center text-gray-500 font-bold">
                                No products found. Adjust filters to see results.
                            </div>
                        ) : (
                            paginatedProducts.map((p) => (
                                <div key={p.id} className="p-4 flex flex-col gap-3 active:bg-gray-50 transition-colors">
                                    <div className="flex gap-4">
                                        <div className="w-20 h-20 bg-gray-50 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                            {p.image_path ? <img src={p.image_path} className="w-full h-full object-cover" loading="lazy"/> : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center">
                                            <h3 className="font-bold text-gray-900 text-lg leading-tight tracking-tight flex items-center gap-2">
                                                {p.name}
                                                {!p.is_active && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                                        Archived
                                                    </span>
                                                )}
                                            </h3>
                                            {p.category ? (
                                                <div className="flex items-center gap-1.5 mt-1 mb-1">
                                                    <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: p.category.color || '#3B82F6' }}></span>
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{p.category.name}</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 mb-1">Uncategorized</div>
                                            )}
                                             <div className="flex justify-between items-end mt-1.5">
                                                 <div className="flex flex-col items-end">
                                                     <p className="font-black text-gray-900 text-xl tracking-tight">₱{formatCurrency(p.price)}</p>
                                                     {p.wholesale_price && (
                                                         <p className="text-[10px] text-gray-400 font-bold mt-0.5">WS: ₱{formatCurrency(p.wholesale_price)}</p>
                                                     )}
                                                 </div>
                                                 <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${p.stock_quantity <= 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                     {p.stock_quantity} Left
                                                 </span>
                                             </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-1">
                                        <div className="pl-1 scale-90 origin-left opacity-75"><Barcode value={p.sku} width={1} height={20} fontSize={10} /></div>
                                        <button onClick={() => handleQuickAdd(p)} className="text-xs bg-white border border-gray-200 text-blue-700 px-3 py-1.5 rounded-md font-bold shadow-sm active:scale-95 transition-transform">
                                            + Stock
                                        </button>
                                    </div>
                                    <div className={`grid gap-2 pt-1 ${auth.user.is_admin ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2'}`}>
                                        {auth.user.is_admin && (
                                            <button onClick={() => openEditModal(p)} className="py-2 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg border border-blue-200 shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                                                Edit
                                            </button>
                                        )}

                                        {/* OPEN PRINT MODAL BUTTON */}
                                        <button onClick={() => setPrintState({ isOpen: true, product: p, quantity: 1, mode: 'thermal' })} className="py-2 text-xs font-bold text-gray-700 bg-white rounded-lg border border-gray-200 shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                            Print
                                        </button>

                                        <button onClick={() => downloadLabelImage(p, settings?.store_name || 'POS STORE')} className="py-2 text-xs font-bold text-green-700 bg-green-50 rounded-lg border border-green-200 shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                            Save PNG
                                        </button>

                                        {auth.user.is_admin && (
                                            <button 
                                                onClick={() => handleToggleActive(p)} 
                                                className={`py-2 text-xs font-bold rounded-lg border shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5 ${p.is_active ? 'text-slate-700 bg-slate-50 border-slate-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}
                                            >
                                                {p.is_active ? (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                                                        Archive
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                                        </svg>
                                                        Restore
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {auth.user.is_admin && (
                                            <button onClick={() => handleDelete(p)} className="col-span-2 sm:col-span-1 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg border border-red-100 shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {!loading && totalPages > 1 && (
                        <div className="py-4 flex flex-col sm:flex-row justify-between items-center gap-4 pb-10 sm:pb-4 w-full overflow-visible">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest shrink-0">
                                Page <span className="text-gray-900">{currentPage}</span> of {totalPages}
                            </span>
                            <div className="w-full sm:w-auto overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
                                <div className="flex gap-1.5 flex-nowrap w-max mx-auto sm:mx-0 px-1">
                                    <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="px-3.5 py-2 min-h-9 rounded-lg text-xs font-bold border transition-all bg-white text-gray-600 border-gray-200 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap flex items-center">&laquo; Prev</button>
                                    {(() => {
                                        const pages = [];
                                        const delta = 1;
                                        const left = Math.max(2, currentPage - delta);
                                        const right = Math.min(totalPages - 1, currentPage + delta);

                                        pages.push(1);
                                        if (left > 2) pages.push('...');
                                        for (let i = left; i <= right; i++) {
                                            if (i !== 1 && i !== totalPages) pages.push(i);
                                        }
                                        if (right < totalPages - 1) pages.push('...');
                                        if (totalPages > 1) pages.push(totalPages);

                                        return pages;
                                    })().map((num, idx) => (
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
                    )}
                </div>
            </div>

            {/* DUAL-MODE PRINT OPTIONS MODAL */}
            {printState.isOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity">
                    <div className="absolute inset-0" onClick={() => setPrintState({ ...printState, isOpen: false })}></div>
                    <div className="relative bg-white w-full max-w-sm rounded-lg shadow-2xl p-6 animate-slide-up sm:animate-fade-in-up flex flex-col">
                        <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4">
                            <div>
                                <h2 className="text-xl font-black tracking-tight text-gray-900">Print Labels</h2>
                                <p className="text-xs text-gray-500 mt-1 font-medium">{printState.product?.name}</p>
                            </div>
                            <button onClick={() => setPrintState({ ...printState, isOpen: false })} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Quantity Input */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Number of Labels</label>
                                <input
                                    type="number"
                                    min="1" max="200"
                                    value={printState.quantity}
                                    onChange={(e) => setPrintState({ ...printState, quantity: parseInt(e.target.value) || 1 })}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2.5 text-lg font-bold text-center transition-colors"
                                />
                            </div>

                            {/* Mode Selector */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Printer Layout</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPrintState({ ...printState, mode: 'thermal' })}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all ${printState.mode === 'thermal' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                        <div className="text-center">
                                            <span className="block font-bold text-sm">Thermal Roll</span>
                                            <span className="block text-[9px] uppercase tracking-wider opacity-70 mt-0.5">40 x 20mm</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setPrintState({ ...printState, mode: 'a4' })}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all ${printState.mode === 'a4' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                        <div className="text-center">
                                            <span className="block font-bold text-sm">A4 Sheet</span>
                                            <span className="block text-[9px] uppercase tracking-wider opacity-70 mt-0.5">Grid Layout</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 shrink-0">
                            <button onClick={executePrint} className="w-full py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-black shadow-lg shadow-blue-500/30 active:scale-95 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                                Print Now
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* PRODUCT ADD/EDIT MODAL: HIDDEN WHEN SCANNER IS ACTIVE */}
            {showModal && typeof document !== 'undefined' && createPortal(
                <div className={`fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[100] sm:p-6 backdrop-blur-sm animate-in fade-in duration-300 ${showScanner ? 'hidden' : ''}`}>
                    <div className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:rounded-2xl sm:shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

                        {/* Header (Sticky on Mobile) */}
                        <div className="bg-white border-b border-gray-100 px-6 sm:px-8 py-5 sm:py-6 flex justify-between items-center shrink-0 sticky top-0 z-50">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                                {editMode ? 'Update Product' : 'New Product'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="bg-gray-50 hover:bg-gray-100 p-2 sm:p-2.5 rounded-full text-gray-500 hover:text-gray-900 transition-colors active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                            <form id="product-form" onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">SKU / Barcode</label>
                                    <div className="flex gap-2">
                                            <input
                                                name="sku"
                                                required
                                                value={formData.sku}
                                                onChange={handleChange}
                                                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                                className="flex-1 border border-gray-300 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400 font-mono"
                                                placeholder="Scan..."
                                            />
                                        <button type="button" onClick={() => setShowScanner(true)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 px-4 py-3 rounded-lg transition-colors active:scale-95" title="Scan Barcode">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                                        </button>
                                        <button type="button" onClick={generateSKU} disabled={isCheckingSku} className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 px-4 py-3 rounded-lg transition-colors active:scale-95 disabled:opacity-50" title="Generate SKU">
                                            {isCheckingSku ? (
                                                <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Product Name</label>
                                    <input name="name" required value={formData.name} onChange={handleChange} className="w-full border border-gray-300 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400" placeholder="e.g. Classic Cappuccino" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Category</label>
                                        <select name="category_id" value={formData.category_id} onChange={handleChange} className="w-full border border-gray-300 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm" required>
                                            <option value="">Select Category...</option>
                                            {categories.map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))}
                                        </select>
                                    </div>
                                    <div>
                                         <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Initial Stock</label>
                                         <input type="number" name="stock_quantity" required value={formData.stock_quantity} onChange={handleChange} className="w-full border border-gray-300 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400" placeholder="0" />
                                    </div>
                                </div>

                                <div>
                                     <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Cost Price (₱)</label>
                                     <input type="number" step="0.01" name="cost_price" required value={formData.cost_price} onChange={handleChange} className="w-full border border-gray-300 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400" placeholder="0.00" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Retail Price (₱)</label>
                                        <input type="number" step="0.01" name="price" required value={formData.price} onChange={handleChange} className="w-full border border-gray-300 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Wholesale Price (₱)</label>
                                        <input type="number" step="0.01" name="wholesale_price" required value={formData.wholesale_price} onChange={handleChange} className="w-full border border-gray-300 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all py-3 px-4 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-400" placeholder="0.00" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">Product Image (Optional)</label>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 file:hover:bg-gray-200 file:transition-colors bg-gray-50 rounded-lg cursor-pointer border border-gray-300"/>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        id="is_active_checkbox"
                                        checked={!!formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="is_active_checkbox" className="select-none cursor-pointer">
                                        <span className="block text-sm font-bold text-gray-900">Active Status</span>
                                        <span className="block text-[10px] text-gray-500 mt-0.5">If unchecked, this product will be archived and hidden from the POS terminal screen.</span>
                                    </label>
                                </div>
                            </form>
                        </div>

                        {/* Footer Actions (Sticky bottom on mobile) */}
                        <div className="bg-white sm:bg-gray-50/80 px-6 sm:px-8 py-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="order-2 sm:order-1 w-full sm:w-auto px-6 py-3.5 sm:py-3 text-gray-600 font-semibold bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="product-form"
                                disabled={isSaving}
                                className="order-1 sm:order-2 w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-lg shadow-md text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Saving...
                                    </>
                                ) : 'Save Product'}
                            </button>
                        </div>

                    </div>
                </div>,
                document.body
            )}

            {/* AUXILIARY UI COMPONENTS */}
            {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} onUpdate={handleCategoryUpdate} isAdmin={auth.user.is_admin} />}

            {/* FULL SCREEN MOBILE SCANNER PORTAL */}
            {showScanner && typeof document !== 'undefined' && createPortal(
                <MobileScanner onScan={handleScan} onClose={() => setShowScanner(false)} />,
                document.body
            )}
        </AuthenticatedLayout>
    );
}