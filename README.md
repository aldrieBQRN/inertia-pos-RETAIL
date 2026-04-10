# 🛒 Laravel React POS System

A modern, full-stack Point of Sale (POS) system built with **Laravel 11**, **React**, and **Inertia.js**. Designed for grocery stores, cafes, and retail businesses with real-time inventory management, sales analytics, and thermal receipt printing.

---

## 🚀 Key Features

### ⚡ Fast POS Terminal
- **Open & Close Shift** – Securely start and end shifts directly from the register
- Barcode Scanning (via Camera or USB Scanner)
- Real-time Product Search & Category Filtering
- **Hold & Recall Orders** – Save a customer's cart and resume it later
- **Senior/PWD Discount** – Automatic 20% discount with VAT-exempt calculation

### 🕒 Shift Management
- **Cash Control** – Track Starting Cash, Cash Sales, and Closing Counts
- **Z-Read Reports** – Print official end-of-day reports for thermal printers
- **Audit History** – View past shifts, shortages, and overages
- **Register Locking** – Prevent concurrent sessions on the same terminal

### 📊 Analytics Dashboard
- Daily Revenue, Profit, and Transaction Counts
- Sales Trend Charts & Peak Hours Heatmap
- Top Selling Products & Payment Method Breakdown

### 📦 Inventory Management
- Add / Edit / Delete Products with Images
- **Low Stock Alerts**
- CSV Export
- Category Management

### 🧾 Transaction History
- Full Sales History with Search Filters
- **Void Transactions** – Automatically return items to inventory
- **Reprint Receipts** – Thermal printer compatible format

### 📱 Fully Responsive Design
- **Mobile Sidebar** – Smooth drawer navigation
- **Tablet Mode** – Optimized icon-only navigation with floating tooltips
- **Desktop Layout** – Full-width data tables and sidebar

### 🔐 Role-Based Access
- **Admin** – Full access to Dashboard, Settings, Shifts, and Inventory
- **Cashier** – Restricted access to POS Terminal only

---

## 🛠️ Tech Stack

### Backend
- Laravel 11
- MySQL

### Frontend
- React.js
- Inertia.js
- Tailwind CSS

### State Management
- Zustand (Persisted Cart)

### UI & Components
- Headless UI
- SweetAlert2
- Recharts

### Hardware Support
- HTML5-QRCode Scanner
- ESC/POS Receipt Styling

---

## ⚙️ Installation & Setup

Follow these steps to get the project running locally.

---

### ✅ Prerequisites

Make sure you have installed:

- PHP >= 8.2
- Composer
- Node.js & NPM
- MySQL (or compatible database)

---

## 📥 Step-by-Step Guide

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name
```

### 2️⃣ Install PHP Dependencies

```bash
composer install
```

### 3️⃣ Install Frontend Dependencies

```bash
npm install
```

### 4️⃣ Environment Configuration

```bash
cp .env.example .env
```

Open the `.env` file and configure your database credentials.

### 5️⃣ Generate Application Key

```bash
php artisan key:generate
```

### 6️⃣ Run Migrations & Seeders

```bash
php artisan migrate --seed
```

This will create all database tables and populate default Admin and Cashier accounts.

### 7️⃣ Link Storage (For Images & Logos)

```bash
php artisan storage:link
```

### 8️⃣ Start Development Servers

Open **two terminal windows**.

Terminal 1 – Backend:

```bash
php artisan serve
```

Terminal 2 – Frontend (Vite):

```bash
npm run dev
```

### 9️⃣ Access the Application

Open your browser and go to:

```
http://localhost:8000
```

---

## 🔐 Default Demo Accounts

If you ran the seeders:

**Admin**
Email: `admin@email.com`
Password: `password`

**Cashier**
Email: `cashier@email.com`
Password: `password`

---
