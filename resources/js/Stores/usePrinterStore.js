import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Swal from 'sweetalert2';
import { router } from '@inertiajs/react';
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';

const encode = (text) => new TextEncoder().encode(text);
const formatCurrency = (amount) => parseFloat(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

/**
 * Global Printer Store (Zustand)
 * Centralized logic for USB/Bluetooth hardware management.
 * Handles persistence, auto-reconnect on plug-in, and real-time disconnection.
 */
const usePrinterStore = create(
    persist(
        (set, get) => ({
            // --- PERSISTENT SETTINGS (Saved in LocalStorage) ---
            paperWidth: '80mm',
            isPrinterEnabled: false, // Tracks if the user INTENTIONALLY wants the printer active
            printAsImage: false, // Enabled for rendering receipt as HTML to image for smaller fonts

            // --- VOLATILE STATE (In-Memory only) ---
            usbDevice: null,
            bluetoothDevice: null,
            isMobile: /Android|iPhone|iPad/i.test(navigator.userAgent),

            setPaperWidth: (width) => set({ paperWidth: width }),
            setPrintAsImage: (enabled) => set({ printAsImage: enabled }),

            _convertCanvasToEscPos: (canvas) => {
                const ctx = canvas.getContext('2d');
                const width = canvas.width;
                const height = canvas.height;
                
                const widthBytes = Math.ceil(width / 8);
                const data = new Uint8Array(widthBytes * height);
                
                const imgData = ctx.getImageData(0, 0, width, height).data;
                
                for (let y = 0; y < height; y++) {
                    for (let xBytes = 0; xBytes < widthBytes; xBytes++) {
                        let byteVal = 0;
                        for (let bit = 0; bit < 8; bit++) {
                            const x = xBytes * 8 + bit;
                            if (x < width) {
                                const idx = (y * width + x) * 4;
                                const r = imgData[idx];
                                const g = imgData[idx + 1];
                                const b = imgData[idx + 2];
                                const a = imgData[idx + 3];
                                
                                // Threshold: alpha > 128 and average color < 180 is black (1), else white (0)
                                const isBlack = a > 128 && (r + g + b) / 3 < 180;
                                if (isBlack) {
                                    byteVal |= (1 << (7 - bit));
                                }
                            }
                        }
                        data[y * widthBytes + xBytes] = byteVal;
                    }
                }
                
                const xL = widthBytes % 256;
                const xH = Math.floor(widthBytes / 256);
                const yL = height % 256;
                const yH = Math.floor(height / 256);
                
                const header = new Uint8Array([0x1D, 0x76, 0x30, 0, xL, xH, yL, yH]);
                const result = new Uint8Array(header.length + data.length);
                result.set(header, 0);
                result.set(data, header.length);
                return result;
            },

            _claimInterfaceForDevice: async (device) => {
                if (!device.opened) {
                    await device.open();
                }
                if (device.configuration === null) {
                    await device.selectConfiguration(1);
                }
                
                // Find interface with direction === 'out' endpoint
                let foundIfaceNumber = null;
                for (const iface of device.configuration.interfaces) {
                    for (const alt of iface.alternates || [iface.alternate]) {
                        const found = alt.endpoints.find(e => e.direction === 'out');
                        if (found) {
                            foundIfaceNumber = iface.interfaceNumber;
                            break;
                        }
                    }
                    if (foundIfaceNumber !== null) break;
                }

                // Default to interface 0 if not found
                const targetInterface = foundIfaceNumber !== null ? foundIfaceNumber : 0;
                await device.claimInterface(targetInterface);
                return targetInterface;
            },

            /**
             * Initializes listeners for physical hardware events.
             * Prevents redundant listeners by removing old ones first.
             */
            setupUsbListeners: () => {
                if (typeof navigator !== 'undefined' && navigator.usb) {
                    // Listen for USB Unplug
                    navigator.usb.removeEventListener('disconnect', get()._handlePhysicalDisconnect);
                    navigator.usb.addEventListener('disconnect', get()._handlePhysicalDisconnect);

                    // Listen for USB Plug-in (Auto-connect for previously paired devices)
                    navigator.usb.removeEventListener('connect', get()._handlePhysicalConnect);
                    navigator.usb.addEventListener('connect', get()._handlePhysicalConnect);
                }
            },

            /**
             * Internal handler for when the USB cable is physically plugged in.
             * This only works if the user has previously granted permission to this specific printer.
             */
            _handlePhysicalConnect: async (event) => {
                const { isPrinterEnabled } = get();

                // Only auto-connect if the user actually has printing enabled in settings
                if (isPrinterEnabled) {
                    try {
                        const device = event.device;
                        await get()._claimInterfaceForDevice(device);

                        set({ usbDevice: device });

                        // Show a quiet toast notification instead of a big alert
                        Swal.fire({ icon: 'success', title: 'Printer Online', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000 });
                    } catch (error) {
                        console.warn("Auto-connect on plug failed:", error);
                    }
                }
            },

            /**
             * Internal handler for when the USB cable is pulled or power is cut.
             */
            _handlePhysicalDisconnect: (event) => {
                const { usbDevice } = get();
                // We check if the device that was disconnected is OUR printer, or if we just lost connection
                if (!usbDevice || (usbDevice && event.device === usbDevice)) {
                    // We set usbDevice to null, but KEEP isPrinterEnabled as true.
                    // This tells the system "The hardware is missing, but the user still wants it when it returns."
                    set({ usbDevice: null });
                    Swal.fire({ icon: 'warning', title: 'Printer Offline', text: 'USB Disconnected', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000 });
                }
            },

            /**
             * Internal handler for Bluetooth signal loss.
             */
            _handleBtDisconnect: () => {
                console.log('Bluetooth connection lost.');
                // We do NOT set bluetoothDevice to null here!
                // We keep it in memory so we can attempt a "Silent Wake-up" later.
                Swal.fire({ icon: 'warning', title: 'Printer Asleep', text: 'Will auto-wake on next print.', toast: true, position: 'bottom-end', timer: 3000, showConfirmButton: false });
            },

            /**
             * Essential for SPA/Inertia: Re-establishes the hardware link
             * when shifting pages or refreshing.
             */
            autoConnectUsb: async () => {
                const { isMobile, isPrinterEnabled, usbDevice } = get();

                // Skip if mobile, manually disabled, or already linked in memory
                if (isMobile || !isPrinterEnabled || usbDevice) return;

                try {
                    const devices = await navigator.usb.getDevices();
                    if (devices.length > 0) {
                        const device = devices[0];

                        await get()._claimInterfaceForDevice(device);
                        set({ usbDevice: device });

                        // Setup listeners in case they refresh the page while it's plugged in
                        get().setupUsbListeners();
                    }
                } catch (err) {
                    console.warn("Auto-connect on refresh failed:", err);
                    set({ usbDevice: null });
                }
            },

            // UPGRADED SMART CONNECT: Quietly attempts known devices before prompting
            connectUsb: async () => {
                try {
                    let device = null;

                    // 1. SMART RECONNECT: Check if the browser already has an authorized printer
                    const existingDevices = await navigator.usb.getDevices();
                    if (existingDevices.length > 0) {
                        try {
                            const knownDevice = existingDevices[0]; // Grab the first authorized device
                            await get()._claimInterfaceForDevice(knownDevice);
                            device = knownDevice; // Silent connection successful!
                        } catch (silentError) {
                            console.warn("Silent reconnect failed, falling back to popup...", silentError);
                            device = null; // Reset to force popup
                        }
                    }

                    // 2. If no authorized printer found (or it failed), show the browser popup
                    if (!device) {
                        device = await navigator.usb.requestDevice({ filters: [] });
                        await get()._claimInterfaceForDevice(device);
                    }

                    // User intentionally connected, so enable it globally
                    set({ usbDevice: device, isPrinterEnabled: true });
                    get().setupUsbListeners();

                    Swal.fire({ icon: 'success', title: 'USB Printer Connected', timer: 1500, showConfirmButton: false });
                } catch (error) {
                    if (error.message.includes('No device selected')) return;

                    let errorTitle = 'Connection Failed';
                    let errorMessage = "Could not connect. Please check if the printer is plugged in and turned on.";

                    if (error.message.includes('claimInterface') || error.message.includes('Access denied') || error.message.includes('protected class')) {
                        errorTitle = 'Wrong Device Selected';
                        errorMessage = "You selected a restricted system device (like a mouse or keyboard). Please click 'Connect' again and make sure to select your actual Receipt Printer.";
                    }

                    Swal.fire({
                        icon: 'error',
                        title: errorTitle,
                        text: errorMessage,
                        confirmButtonColor: '#3B82F6'
                    });
                }
            },

            connectBluetooth: async () => {
                if (Capacitor.isNativePlatform()) {
                    try {
                        await BleClient.initialize();
                        const device = await BleClient.requestDevice({
                            services: ['000018f0-0000-1000-8000-00805f9b34fb']
                        });

                        await BleClient.connect(device.deviceId, () => {
                            Swal.fire({ icon: 'warning', title: 'Printer Offline', text: 'Bluetooth Disconnected', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000 });
                            set({ bluetoothDevice: null });
                        });

                        set({ bluetoothDevice: device, isPrinterEnabled: true });
                        Swal.fire({ icon: 'success', title: 'Bluetooth Printer Connected', timer: 1500, showConfirmButton: false });
                    } catch (error) {
                        console.error("Capacitor Bluetooth connection failed:", error);
                        if (error.message && error.message.includes('cancelled')) return;
                        Swal.fire({
                            icon: 'error',
                            title: 'Bluetooth Failed',
                            text: 'Make sure your printer is turned ON and Bluetooth is enabled.',
                            confirmButtonColor: '#3B82F6'
                        });
                    }
                } else {
                    try {
                        const device = await navigator.bluetooth.requestDevice({
                            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
                        });

                        device.addEventListener('gattserverdisconnected', get()._handleBtDisconnect);
                        await device.gatt.connect();

                        set({ bluetoothDevice: device, isPrinterEnabled: true });
                        Swal.fire({ icon: 'success', title: 'Bluetooth Printer Connected', timer: 1500, showConfirmButton: false });
                    } catch (error) {
                        if (error.message.includes('User cancelled')) return;

                        Swal.fire({
                            icon: 'error',
                            title: 'Bluetooth Failed',
                            text: 'Make sure your printer is turned ON and in pairing mode.',
                            confirmButtonColor: '#3B82F6'
                        });
                    }
                }
            },

            // Manual disconnect button from settings
            disconnect: async () => {
                const { bluetoothDevice } = get();
                if (bluetoothDevice) {
                    if (Capacitor.isNativePlatform()) {
                        try {
                            await BleClient.disconnect(bluetoothDevice.deviceId || bluetoothDevice.id);
                        } catch (err) {
                            console.warn("BleClient disconnect failed:", err);
                        }
                    } else if (bluetoothDevice.gatt && bluetoothDevice.gatt.connected) {
                        bluetoothDevice.gatt.disconnect();
                    }
                }
                // When manually disconnected, we intentionally turn OFF auto-connect
                set({ usbDevice: null, bluetoothDevice: null, isPrinterEnabled: false });
                Swal.fire({ icon: 'info', title: 'Printer Disconnected', timer: 1500, showConfirmButton: false });
            },

            // Hardware action to pop the cash drawer via the RJ11 port
            openCashDrawer: async () => {
                const { executePrint } = get();
                // ESC p m t1 t2 (Standard ESC/POS command to kick drawer pin 2)
                const commands = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
                await executePrint(commands);
            },

            executePrint: async (commands) => {
                const { isMobile, usbDevice, bluetoothDevice, connectBluetooth, connectUsb } = get();
                let { isPrinterEnabled } = get();

                // 1. DYNAMIC IN-LINE PAIRING PROMPT
                if (!isPrinterEnabled) {
                    const result = await Swal.fire({
                        icon: 'warning',
                        title: 'Printer Not Connected',
                        text: 'You need to pair a printer to generate this receipt.',
                        showCancelButton: true,
                        confirmButtonText: isMobile ? 'Pair Bluetooth Printer' : 'Pair USB Printer',
                        cancelButtonText: 'Cancel',
                        confirmButtonColor: '#3B82F6',
                    });

                    if (result.isConfirmed) {
                        if (isMobile) {
                            await connectBluetooth();
                        } else {
                            await connectUsb();
                        }

                        isPrinterEnabled = get().isPrinterEnabled;
                        if (!isPrinterEnabled) return false;
                    } else {
                        return false;
                    }
                }

                try {
                    if (Capacitor.isNativePlatform()) {
                        let device = get().bluetoothDevice;

                        if (!device) {
                            await connectBluetooth();
                            device = get().bluetoothDevice;
                        } else {
                            try {
                                await BleClient.connect(device.deviceId || device.id);
                            } catch (err) {
                                // Already connected or temporary connection issue
                            }
                        }

                        if (!device) throw new Error("Bluetooth connection failed.");

                        const serviceUuid = '000018f0-0000-1000-8000-00805f9b34fb';
                        const characteristicUuid = '00002af1-0000-1000-8000-00805f9b34fb';
                        const chunkSize = 20;

                        for (let i = 0; i < commands.length; i += chunkSize) {
                            const chunk = commands.slice(i, i + chunkSize);
                            await BleClient.write(device.deviceId || device.id, serviceUuid, characteristicUuid, chunk);
                        }
                        return true;
                    } else if (isMobile) {
                        let device = get().bluetoothDevice;

                        if (!device) {
                            await connectBluetooth();
                            device = get().bluetoothDevice;
                        }
                        else if (!device.gatt.connected) {
                            console.log("Printer is asleep. Attempting silent wake-up...");
                            try {
                                await device.gatt.connect();
                            } catch (wakeError) {
                                console.warn("Silent wake-up failed. Printer might be off.", wakeError);
                                await connectBluetooth();
                                device = get().bluetoothDevice;
                            }
                        }

                        if (!device || !device.gatt.connected) throw new Error("Bluetooth connection failed.");

                        const service = await device.gatt.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
                        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
                        const chunkSize = 20;
                        for (let i = 0; i < commands.length; i += chunkSize) {
                            await characteristic.writeValue(commands.slice(i, i + chunkSize));
                        }
                        return true;
                    } else {
                        let deviceToUse = get().usbDevice;

                        if (!deviceToUse) {
                            await get().autoConnectUsb();
                            deviceToUse = get().usbDevice;
                            if (!deviceToUse) throw new Error("Printer not reachable.");
                        }

                        // Re-claim and dynamically find the correct bulk-out printing endpoint
                        const printIfaceNumber = await get()._claimInterfaceForDevice(deviceToUse);
                        const printInterface = deviceToUse.configuration.interfaces.find(i => i.interfaceNumber === printIfaceNumber);
                        const alt = printInterface.alternate;
                        const endpoint = alt.endpoints.find(e => e.direction === 'out');

                        if (!endpoint) throw new Error("No USB print endpoint found on the active interface.");

                        // Send data in chunks of 64 bytes to prevent buffer overflow/transfer errors
                        const chunkSize = 64;
                        for (let i = 0; i < commands.length; i += chunkSize) {
                            const chunk = commands.slice(i, i + chunkSize);
                            await deviceToUse.transferOut(endpoint.endpointNumber, chunk);
                        }

                        return true;
                    }
                } catch (err) {
                    console.error("Print execution failed:", err);

                    Swal.fire({
                        icon: 'error',
                        title: 'Printer Offline',
                        text: 'Connection lost. Ensure the printer is plugged in and turned on.',
                        confirmButtonText: 'Reconnect Now',
                        showCancelButton: true,
                        cancelButtonText: 'Close',
                        confirmButtonColor: '#3B82F6',
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            if (isMobile) {
                                await get().connectBluetooth();
                            } else {
                                await get().connectUsb();
                            }
                        }
                    });

                    return false;
                }
            },

            printReceipt: async (trx, settings) => {
                const { paperWidth, executePrint, printAsImage, _convertCanvasToEscPos } = get();

                // DYNAMIC HTML-TO-IMAGE receipt printing for custom small font sizes
                if (printAsImage && typeof document !== 'undefined') {
                    const container = document.createElement('div');
                    container.style.position = 'absolute';
                    container.style.left = '-9999px';
                    container.style.top = '0';
                    const is80 = paperWidth === '80mm';
                    const widthPx = is80 ? 576 : 384;
                    container.style.width = `${widthPx}px`;
                    container.style.background = '#ffffff';
                    container.style.color = '#000000';
                    container.style.fontFamily = 'Arial, sans-serif';
                    container.style.fontSize = '12px';
                    container.style.lineHeight = '1.3';
                    container.style.padding = '8px';
                    container.style.boxSizing = 'border-box';

                    const storeName = settings?.store_name || "Aivin Variety Store";
                    const storeAddress = settings?.store_address || settings?.address || "";
                    const storePhone = settings?.store_phone || settings?.phone || "";

                    const itemsHtml = trx.items.map(item => {
                        const desc = item.product?.name || item.custom_name || item.name || 'Item';
                        const qty = item.quantity;
                        const price = (item.unit_price || item.price || 0) / 100;
                        const amount = price * qty;
                        return `
                            <div style="display: flex; font-size: 11px; margin-bottom: 3px;">
                                <span style="width: 25px; flex-shrink: 0;">${qty}x</span>
                                <span style="flex: 1; padding-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${desc}</span>
                                <span style="width: 60px; text-align: right; flex-shrink: 0;">${price.toFixed(2)}</span>
                                <span style="width: 70px; text-align: right; font-weight: bold; flex-shrink: 0;">${amount.toFixed(2)}</span>
                            </div>
                        `;
                    }).join('');

                    const totalAmount = trx.total_amount / 100;
                    const cashGiven = (trx.cash_given || trx.total_amount) / 100;
                    const change = (trx.change || 0) / 100;

                    container.innerHTML = `
                        <div style="text-align: center; margin-bottom: 8px;">
                            <h1 style="font-size: 16px; font-weight: bold; margin: 0 0 2px 0; text-transform: uppercase;">${storeName}</h1>
                            ${storeAddress ? `<div style="font-size: 10px; margin-bottom: 1px;">${storeAddress}</div>` : ''}
                            ${storePhone ? `<div style="font-size: 10px; margin-bottom: 2px;">Tel: ${storePhone}</div>` : ''}
                            <div style="border-top: 1px dashed #000; margin-top: 5px;"></div>
                        </div>
                        
                        <div style="font-size: 10px; margin-bottom: 6px; line-height: 1.3;">
                            <div>Invoice: <b>${trx.invoice_number || trx.transaction_code}</b></div>
                            <div>Date: ${new Date(trx.created_at).toLocaleString()}</div>
                            <div>Cashier: ${trx.cashier?.name || "Staff"}</div>
                            <div style="border-top: 1px dashed #000; margin-top: 5px;"></div>
                        </div>
                        
                        <div style="margin-bottom: 6px;">
                            <div style="display: flex; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 3px;">
                                <span style="width: 25px; flex-shrink: 0;">Qty</span>
                                <span style="flex: 1; padding-left: 4px;">Description</span>
                                <span style="width: 60px; text-align: right; flex-shrink: 0;">Price</span>
                                <span style="width: 70px; text-align: right; flex-shrink: 0;">Amount</span>
                            </div>
                            <div style="border-top: 1px dashed #000; margin-bottom: 5px;"></div>
                            ${itemsHtml}
                            <div style="border-top: 1px dashed #000; margin-top: 5px;"></div>
                        </div>
                        
                        <div style="font-size: 10px; line-height: 1.4; margin-bottom: 8px;">
                            ${trx.is_senior ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span>Subtotal:</span>
                                <span>${(trx.subtotal / 100).toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Discount:</span>
                                <span>-${((trx.discount_amount || 0) / 100).toFixed(2)}</span>
                            </div>
                            ` : ''}
                            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 3px;">
                                <span>TOTAL:</span>
                                <span>PHP ${totalAmount.toFixed(2)}</span>
                            </div>
                            ${trx.payment_method === 'cash' ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span>Cash Given:</span>
                                <span>${cashGiven.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                <span>Change:</span>
                                <span>${change.toFixed(2)}</span>
                            </div>
                            ` : `
                            <div style="display: flex; justify-content: space-between;">
                                <span>Payment Method:</span>
                                <span style="text-transform: uppercase; font-weight: bold;">${trx.payment_method}</span>
                            </div>
                            `}
                        </div>
                        
                        <div style="text-align: center; font-size: 9px; margin-top: 12px; border-top: 1px dashed #000; padding-top: 6px;">
                            <div>No Return, No Exchange.</div>
                            <div style="font-weight: bold; margin-top: 1px;">Thank you for shopping!</div>
                        </div>
                    `;

                    document.body.appendChild(container);
                    try {
                        const html2canvas = (await import('html2canvas')).default;
                        const canvas = await html2canvas(container, {
                            scale: 1,
                            useCORS: true,
                            logging: false,
                            backgroundColor: '#ffffff'
                        });
                        document.body.removeChild(container);

                        const escposBytes = _convertCanvasToEscPos(canvas);

                        const initCmds = new Uint8Array([0x1B, 0x40]);
                        let drawerCmds = new Uint8Array([]);
                        if (trx.payment_method === 'cash') {
                            drawerCmds = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
                        }
                        const cutCmds = new Uint8Array([0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41]);

                        const finalCmds = new Uint8Array(initCmds.length + drawerCmds.length + escposBytes.length + cutCmds.length);
                        let offset = 0;
                        finalCmds.set(initCmds, offset); offset += initCmds.length;
                        finalCmds.set(drawerCmds, offset); offset += drawerCmds.length;
                        finalCmds.set(escposBytes, offset); offset += escposBytes.length;
                        finalCmds.set(cutCmds, offset);

                        return await executePrint(finalCmds);
                    } catch (err) {
                        console.error("Image printing failed, falling back to text:", err);
                        if (container.parentNode) document.body.removeChild(container);
                    }
                }

                const is80 = paperWidth === '80mm';
                const lineCap = is80 ? 48 : 30;
                const separator = "-".repeat(lineCap) + "\n";
                const fmt = (cents) => (cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });

                const storeName = settings?.store_name || "Aivin Variety Store";
                const storeAddress = settings?.store_address || settings?.address || "";
                const storePhone = settings?.store_phone || settings?.phone || "";

                let finalCommands = [0x1B, 0x40, 0x1B, 0x33, 22];

                if (trx.payment_method === 'cash') {
                    finalCommands.push(0x1B, 0x70, 0x00, 0x19, 0xFA);
                }

                const header = [
                    0x1B, 0x61, 0x01, // Center align
                    0x1B, 0x45, 0x01, // Bold ON
                    ...encode(storeName.toUpperCase() + "\n"),
                    0x1B, 0x45, 0x00, // Bold OFF
                    ...(storeAddress ? encode(storeAddress + "\n") : []),
                    ...(storePhone ? encode("Tel: " + storePhone + "\n") : []),
                    ...encode(separator),
                    0x1B, 0x61, 0x00, // Align Left
                    ...encode(`Invoice: ${trx.invoice_number || trx.transaction_code}\n`),
                    ...encode(`Date: ${new Date(trx.created_at).toLocaleString()}\n`),
                    ...encode(`Cashier: ${trx.cashier?.name || "Staff"}\n`),
                    ...encode(separator),
                ];
                finalCommands = [...finalCommands, ...header];

                // Item columns header: QTY DESCRIPTION PRICE AMOUNT
                const itemHeader = is80
                    ? "QTY".padEnd(4) + " " + "DESCRIPTION".padEnd(21) + " " + "PRICE".padStart(10) + " " + "AMOUNT".padStart(10) + "\n"
                    : "QTY".padEnd(3) + " " + "ITEM".padEnd(10) + " " + "PRICE".padStart(6) + " " + "AMOUNT".padStart(8) + "\n";
                
                finalCommands.push(...encode(itemHeader));
                finalCommands.push(...encode(separator));

                // Calculate original subtotal from items
                let originalSubtotal = 0;
                trx.items.forEach(item => {
                    const quantity = item.quantity;
                    const priceVal = item.unit_price || item.price || 0;
                    const amountVal = priceVal * quantity;
                    originalSubtotal += amountVal;

                    const desc = item.product?.name || item.custom_name || item.name || 'Item';
                    const formattedPrice = fmt(priceVal);
                    const formattedAmount = fmt(amountVal);

                    if (is80) {
                        const qtyStr = (quantity + "x").padEnd(4);
                        const descStr = desc.substring(0, 21).padEnd(21);
                        const priceStr = formattedPrice.padStart(10);
                        const amountStr = formattedAmount.padStart(10);
                        finalCommands.push(...encode(`${qtyStr} ${descStr} ${priceStr} ${amountStr}\n`));
                    } else {
                        const qtyStr = (quantity + "x").padEnd(3);
                        const descStr = desc.substring(0, 10).padEnd(10);
                        const priceStr = formattedPrice.padStart(6);
                        const amountStr = formattedAmount.padStart(8);
                        finalCommands.push(...encode(`${qtyStr} ${descStr} ${priceStr} ${amountStr}\n`));
                    }
                });

                if (trx.is_senior) {
                    finalCommands.push(
                        ...encode(separator),
                        ...encode("Subtotal:".padEnd(lineCap - 12) + fmt(originalSubtotal).padStart(12) + "\n"),
                        ...encode("Less: 20% Discount:".padEnd(lineCap - 12) + ("-" + fmt(trx.discount_amount || 0)).padStart(12) + "\n")
                    );
                }

                finalCommands.push(...encode(separator));
                finalCommands.push(0x1B, 0x45, 0x01, ...encode("TOTAL".padEnd(10) + fmt(trx.total_amount).padStart(lineCap - 10) + "\n"), 0x1B, 0x45, 0x00);

                if (trx.payment_method === 'cash') {
                    const finalCashGiven = (trx.cash_given > 0 ? trx.cash_given : trx.total_amount);
                    const finalChange = (trx.cash_given > 0 ? trx.change : 0);
                    finalCommands.push(
                        ...encode("Cash Given:".padEnd(lineCap - 12) + fmt(finalCashGiven).padStart(12) + "\n"),
                        ...encode("Change:".padEnd(lineCap - 12) + fmt(finalChange).padStart(12) + "\n")
                    );
                } else {
                    let formattedMethod = trx.payment_method.toUpperCase();
                    if (trx.payment_method === 'credit_card') formattedMethod = 'CREDIT CARD';
                    if (trx.payment_method === 'debit_card') formattedMethod = 'DEBIT CARD';

                    finalCommands.push(
                        ...encode("Payment:".padEnd(15) + (formattedMethod).padStart(lineCap - 15) + "\n")
                    );
                }

                finalCommands.push(
                    0x0A, 0x1B, 0x61, 0x01, // Center align for footer
                    ...encode(separator),
                    ...encode("No Return, No Exchange.\n"),
                    ...encode("Thank you for shopping at\n"),
                    ...encode("Aivin Variety Store!\n"),
                    0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41 // Cut paper
                );

                await executePrint(new Uint8Array(finalCommands));
            },

            printZRead: async (data, settings) => {
                const { paperWidth, executePrint, printAsImage, _convertCanvasToEscPos } = get();

                // DYNAMIC HTML-TO-IMAGE report printing for custom small font sizes
                if (printAsImage && typeof document !== 'undefined') {
                    const container = document.createElement('div');
                    container.style.position = 'absolute';
                    container.style.left = '-9999px';
                    container.style.top = '0';
                    const is80 = paperWidth === '80mm';
                    const widthPx = is80 ? 576 : 384;
                    container.style.width = `${widthPx}px`;
                    container.style.background = '#ffffff';
                    container.style.color = '#000000';
                    container.style.fontFamily = 'Arial, sans-serif';
                    container.style.fontSize = '12px';
                    container.style.lineHeight = '1.3';
                    container.style.padding = '8px';
                    container.style.boxSizing = 'border-box';

                    const diff = Number(data.difference);
                    const gcash = Number(data.gcash_sales || 0);
                    const maya = Number(data.maya_sales || 0);
                    const credit = Number(data.credit_card_sales || 0);
                    const debit = Number(data.debit_card_sales || 0);
                    const totalSales = Number(data.cash_sales) + gcash + maya + credit + debit;

                    let diffLabel = 'BALANCED';
                    if (diff > 0.01) diffLabel = 'OVERAGE (+)';
                    if (diff < -0.01) diffLabel = 'SHORTAGE (-)';

                    const storeName = settings?.store_name || "POS";
                    const storeAddress = settings?.store_address || settings?.address || "";
                    const storePhone = settings?.store_phone || settings?.phone || "";

                    container.innerHTML = `
                        <div style="text-align: center; margin-bottom: 8px;">
                            <h1 style="font-size: 16px; font-weight: bold; margin: 0 0 2px 0; text-transform: uppercase;">${storeName}</h1>
                            ${storeAddress ? `<div style="font-size: 10px; margin-bottom: 1px;">${storeAddress}</div>` : ''}
                            ${storePhone ? `<div style="font-size: 10px; margin-bottom: 2px;">Tel: ${storePhone}</div>` : ''}
                            <div style="font-size: 12px; font-weight: bold; margin-top: 4px; text-transform: uppercase;">Z-READ REPORT</div>
                            <div style="border-top: 1px dashed #000; margin-top: 5px;"></div>
                        </div>

                        <div style="font-size: 10px; margin-bottom: 6px; line-height: 1.3;">
                            <div>Cashier: ${data.user?.name || data.staff_name || "Staff"}</div>
                            <div>Opened: ${new Date(data.start_time || data.start).toLocaleString()}</div>
                            <div>Closed: ${new Date(data.end_time || data.end).toLocaleString()}</div>
                            <div style="border-top: 1px dashed #000; margin-top: 5px;"></div>
                        </div>

                        <div style="font-size: 10px; line-height: 1.4; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Starting Cash:</span>
                                <span>${formatCurrency(data.starting_cash)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>+ Cash Sales:</span>
                                <span>${formatCurrency(data.cash_sales)}</span>
                            </div>
                            ${data.expenses > 0 ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span>- Expenses:</span>
                                <span>${formatCurrency(data.expenses)}</span>
                            </div>
                            ` : ''}
                            <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
                            <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                <span>EXPECTED CASH:</span>
                                <span>${formatCurrency(data.expected_cash)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                <span>ACTUAL COUNT:</span>
                                <span>${formatCurrency(data.actual_cash || data.ending_cash || 0)}</span>
                            </div>
                            <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
                            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
                                <span>DIFFERENCE:</span>
                                <span>${(diff > 0 ? "+" : "") + formatCurrency(data.difference)}</span>
                            </div>
                            <div style="text-align: center; font-weight: bold; margin-top: 6px; font-size: 11px; text-transform: uppercase;">[ ${diffLabel} ]</div>
                        </div>

                        <div style="font-size: 10px; line-height: 1.4; margin-top: 10px; border-top: 1px dashed #000; padding-top: 6px;">
                            <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">GROSS SALES BREAKDOWN</div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Cash Sales:</span>
                                <span>${formatCurrency(data.cash_sales)}</span>
                            </div>
                            ${gcash > 0 ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span>GCash:</span>
                                <span>${formatCurrency(gcash)}</span>
                            </div>
                            ` : ''}
                            ${maya > 0 ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span>Maya:</span>
                                <span>${formatCurrency(maya)}</span>
                            </div>
                            ` : ''}
                            ${credit > 0 ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span>Credit Card:</span>
                                <span>${formatCurrency(credit)}</span>
                            </div>
                            ` : ''}
                            ${debit > 0 ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span>Debit Card:</span>
                                <span>${formatCurrency(debit)}</span>
                            </div>
                            ` : ''}
                            <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
                            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
                                <span>TOTAL GROSS SALES:</span>
                                <span>${formatCurrency(totalSales)}</span>
                            </div>
                        </div>

                        <div style="text-align: center; font-size: 9px; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px;">
                            <div>Printed: ${new Date().toLocaleString()}</div>
                            <div style="margin-top: 25px; border-top: 1px solid #000; display: inline-block; width: 150px; padding-top: 2px;">Manager Signature</div>
                        </div>
                    `;

                    document.body.appendChild(container);
                    try {
                        const html2canvas = (await import('html2canvas')).default;
                        const canvas = await html2canvas(container, {
                            scale: 1,
                            useCORS: true,
                            logging: false,
                            backgroundColor: '#ffffff'
                        });
                        document.body.removeChild(container);

                        const escposBytes = _convertCanvasToEscPos(canvas);

                        const initCmds = new Uint8Array([0x1B, 0x40]);
                        const cutCmds = new Uint8Array([0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41]);

                        const finalCmds = new Uint8Array(initCmds.length + escposBytes.length + cutCmds.length);
                        let offset = 0;
                        finalCmds.set(initCmds, offset); offset += initCmds.length;
                        finalCmds.set(escposBytes, offset); offset += escposBytes.length;
                        finalCmds.set(cutCmds, offset);

                        return await executePrint(finalCmds);
                    } catch (err) {
                        console.error("Z-Read image printing failed, falling back to text:", err);
                        if (container.parentNode) document.body.removeChild(container);
                    }
                }

                const is80 = paperWidth === '80mm';
                const lineCap = is80 ? 42 : 30;
                const separator = "-".repeat(lineCap) + "\n";
                const fmt = (val) => formatCurrency(val);

                const diff = Number(data.difference);
                const gcash = Number(data.gcash_sales || 0);
                const maya = Number(data.maya_sales || 0);
                const credit = Number(data.credit_card_sales || 0);
                const debit = Number(data.debit_card_sales || 0);
                const totalSales = Number(data.cash_sales) + gcash + maya + credit + debit;

                let diffLabel = 'BALANCED';
                if (diff > 0.01) diffLabel = 'OVERAGE (+)';
                if (diff < -0.01) diffLabel = 'SHORTAGE (-)';

                const storeName = settings?.store_name || "POS";
                const storeAddress = settings?.store_address || settings?.address || "";
                const storePhone = settings?.store_phone || settings?.phone || "";

                let finalCommands = [0x1B, 0x40, 0x1B, 0x33, 22];

                finalCommands.push(0x1B, 0x70, 0x00, 0x19, 0xFA);

                const report = [
                    0x1B, 0x61, 0x01, // Center align
                    0x1B, 0x45, 0x01, // Bold ON
                    ...encode(storeName.toUpperCase() + "\n"),
                    0x1B, 0x45, 0x00, // Bold OFF
                    ...(storeAddress ? encode(storeAddress + "\n") : []),
                    ...(storePhone ? encode("Tel: " + storePhone + "\n") : []),
                    ...encode("Z-READ REPORT\n"),
                    ...encode(separator),
                    0x1B, 0x61, 0x00, // Align Left
                    ...encode(`Cashier: ${data.user?.name || data.staff_name || "Staff"}\n`),
                    ...encode(`Opened:  ${new Date(data.start_time || data.start).toLocaleString()}\n`),
                    ...encode(`Closed:  ${new Date(data.end_time || data.end).toLocaleString()}\n`),
                    ...encode(separator),

                    // Cash Math Section (Drawer Accountability)
                    ...encode("Starting Cash:".padEnd(lineCap - 14) + fmt(data.starting_cash).padStart(14) + "\n"),
                    ...encode("+ Cash Sales:".padEnd(lineCap - 14) + fmt(data.cash_sales).padStart(14) + "\n"),
                    ...(data.expenses > 0 ? encode("- Expenses:".padEnd(lineCap - 14) + fmt(data.expenses).padStart(14) + "\n") : []),
                    ...encode(separator),

                    0x1B, 0x45, 0x01, // Bold ON for totals
                    // FIXED: Changed back to "EXPECTED CASH:" (14 chars) so it perfectly fits the 32-char limit
                    ...encode("EXPECTED CASH:".padEnd(lineCap - 14) + fmt(data.expected_cash).padStart(14) + "\n"),
                    ...encode("ACTUAL COUNT:".padEnd(lineCap - 14) + fmt(data.actual_cash || data.ending_cash || 0).padStart(14) + "\n"),
                    ...encode(separator),

                    ...encode("DIFFERENCE:".padEnd(lineCap - 14) + ((diff > 0 ? "+" : "") + fmt(data.difference)).padStart(14) + "\n"),
                    0x1B, 0x61, 0x01, ...encode("\n[ " + diffLabel + " ]\n"), 0x1B, 0x45, 0x00, 0x1B, 0x61, 0x00, // Bold OFF, Center align, then Left align

                    ...encode(separator),

                    // NON-CASH & GROSS SALES SECTION
                    0x1B, 0x45, 0x01, ...encode("GROSS SALES BREAKDOWN\n"), 0x1B, 0x45, 0x00,
                    ...encode("Cash Sales:".padEnd(lineCap - 14) + fmt(data.cash_sales).padStart(14) + "\n"),
                    ...(gcash > 0 ? encode("GCash:".padEnd(lineCap - 14) + fmt(gcash).padStart(14) + "\n") : []),
                    ...(maya > 0 ? encode("Maya:".padEnd(lineCap - 14) + fmt(maya).padStart(14) + "\n") : []),
                    ...(credit > 0 ? encode("Credit Card:".padEnd(lineCap - 14) + fmt(credit).padStart(14) + "\n") : []),
                    ...(debit > 0 ? encode("Debit Card:".padEnd(lineCap - 14) + fmt(debit).padStart(14) + "\n") : []),

                    ...encode(separator),

                    // Total Calculation
                    0x1B, 0x45, 0x01, ...encode("TOTAL GROSS SALES:".padEnd(lineCap - 14) + fmt(totalSales).padStart(14) + "\n"), 0x1B, 0x45, 0x00,

                    ...encode(separator),

                    // FIXED: Re-added the Center Align command before the signature block
                    0x1B, 0x61, 0x01, // Center align
                    ...encode(`Printed: ${new Date().toLocaleString()}\n\n\n`),
                    ...encode("____________________\n"),
                    ...encode("Manager Signature\n"),
                    0x0A, 0x0A, 0x1D, 0x56, 0x41 // Cut paper
                ];

                await executePrint(new Uint8Array([...finalCommands, ...report]));
            }
        }),
        {
            name: 'printer-settings-storage',
            partialize: (state) => ({
                paperWidth: state.paperWidth,
                isPrinterEnabled: state.isPrinterEnabled,
                printAsImage: state.printAsImage
            }),
        }
    )
);

export default usePrinterStore;