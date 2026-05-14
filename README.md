# 🛒 Inertia POS System

A modern, full-stack Point of Sale (POS) system built with **Laravel 11**, **React**, and **Inertia.js**. Designed for grocery stores, cafes, and retail businesses with real-time inventory management, sales analytics, and thermal receipt printing. Enterprise-ready with multi-tenant support and comprehensive reporting.

**Live Demo:** https://demo-inertiapos.page.gd

---

## 🎯 Complete Feature List

### ⚡ **Fast POS Terminal**
- **Quick Checkout** – Sell items in seconds with intuitive interface
- **Barcode Scanning** – Via USB Scanner or Mobile Camera (QR/Barcode Reader)
- **Product Search** – Real-time search with category filtering
- **Hold & Recall Orders** – Save customer's cart and resume later (unlimited holds)
- **Quantity Adjustments** – Modify quantities with +/- buttons or manual input
- **Senior/PWD Discount** – Automatic 20% discount with VAT-exempt calculation
- **Multiple Payment Methods** – Cash, Card, E-Wallet support
- **Receipt Printing** – Thermal printer compatible ESC/POS formatting
- **Cart Persistence** – Cart data persists during shift (Zustand state management)

### 🕒 **Comprehensive Shift Management**
- **Start Shift** – Initialize with opening cash amount
- **Close Shift** – End-of-day cash reconciliation
- **Cash Control Tracking** – Monitor starting cash, total sales, closing counts
- **Z-Read Reports** – Generate official end-of-day thermal printer reports
- **Shift Audit History** – View all past shifts with discrepancies
- **Cash Shortage/Overage Detection** – Automatic calculation of differences
- **Register Locking** – Prevent concurrent sessions on same terminal
- **Shift Duration Tracking** – Automatic timestamp logging

### 📊 **Advanced Analytics Dashboard**
- **Real-time KPIs** – Daily Revenue, Profit, Transaction Count
- **Sales Trend Charts** – Line graphs showing sales over time
- **Peak Hours Heatmap** – Visual representation of busiest times
- **Top Selling Products** – Best performing items with quantities
- **Category Performance** – Revenue breakdown by product category
- **Payment Method Analysis** – Cash vs Card vs E-Wallet comparison
- **Custom Date Range Filtering** – Select specific periods for analysis
- **Profit Margin Calculation** – Track actual profit with cost data
- **Visual Export** – Export charts as PNG via html2canvas

### 📦 **Complete Inventory Management**
- **Product CRUD** – Create, edit, delete products with full details
- **Product Images** – Upload and manage product photos
- **SKU & Barcode** – Track products by SKU and barcode
- **Stock Levels** – Monitor current inventory quantities
- **Low Stock Alerts** – Get notified when items fall below threshold
- **Cost Tracking** – Record product cost for profit calculations
- **Category Management** – Organize products by categories
- **Bulk Operations** – Manage multiple products efficiently
- **CSV Import/Export** – Bulk import products or export current inventory
- **Stock History** – Track inventory changes over time

### 🧾 **Complete Transaction Management**
- **Full Sales History** – View all completed transactions
- **Advanced Search Filters** – Filter by date, amount, payment method, cashier
- **Transaction Details** – View itemized breakdown of each sale
- **Void Transactions** – Reverse sales with automatic inventory return
- **Receipt Reprint** – Reprint any past transaction receipt
- **Transaction Status** – Track completed, voided, pending transactions
- **Customer Receipts** – Email or print customer receipts
- **Transaction Timestamps** – Automatic recording of all transaction times
- **Cashier Attribution** – Know which cashier handled each transaction

### 👥 **User Management & Admin Controls**
- **Multi-User System** – Add/manage multiple cashiers and admins
- **Role-Based Access** – Admin and Cashier roles with different permissions
- **User Authentication** – Secure login with email verification
- **Profile Management** – Update personal information and password
- **Avatar Support** – Upload and manage user profile pictures
- **User Listing** – Admin view of all system users
- **User Status Tracking** – Active/inactive user management
- **Shift Assignment** – Link users to specific terminals/registers
- **Activity Logging** – Audit trail of user actions (prepared for future)

### ⚙️ **Settings & Configuration**
- **Store Information** – Business name, address, contact details
- **Store Logo** – Upload and customize store branding
- **Thermal Printer Setup** – Configure receipt printer settings
- **Tax Configuration** – Set VAT rates for automatic calculation
- **Discount Rules** – Configure senior/PWD discount percentages
- **Currency Settings** – Display currency and decimal places
- **Business Hours** – Set store opening/closing times
- **Email Configuration** – Receipt and notification settings
- **System Announcements** – Post messages visible to all users

### 📱 **Fully Responsive Design**
- **Mobile Optimized** – Works on smartphones (iOS/Android)
- **Mobile Sidebar** – Smooth drawer navigation for touch screens
- **Tablet Mode** – Optimized icon-only navigation with floating tooltips
- **Stealth Layout** – Minimal UI option for POS terminals
- **Touch-Friendly Buttons** – Large touch targets for accuracy
- **Responsive Tables** – Data tables adapt to screen size
- **Desktop Layout** – Full-width data tables and sidebar for workstations
- **Landscape Support** – Optimized for both portrait and landscape
- **Dark Mode Ready** – Tailwind CSS supports light/dark themes

### 📈 **Comprehensive Reports**
- **Sales Report** – Detailed sales data with filters
- **Daily Revenue Report** – Day-by-day revenue tracking
- **Product Sales Report** – Which products sold and quantities
- **Category Performance** – Revenue by category
- **Shift Summary Report** – Details of each shift with balances
- **Voided Transactions Report** – Track all reversed sales
- **Export Capabilities** – Export reports as PDF or CSV
- **Custom Date Ranges** – Generate reports for specific periods
- **Charts & Graphs** – Visual representation of data

### 🔐 **Security & Access Control**
- **Role-Based Access** – Admin vs Cashier permissions
- **Admin Dashboard** – Only admins see full dashboard
- **Cashier Isolation** – Cashiers can only access POS terminal
- **Authentication** – Email/password with session security
- **Email Verification** – Verify user accounts before access
- **Password Reset** – Secure password recovery flow
- **Activity Audit** – Trail of important system actions (ready for implementation)
- **Data Encryption** – Sensitive data encrypted in database
- **CSRF Protection** – All forms protected against attacks

### 🎨 **Modern UI/UX**
- **Tailwind CSS Styling** – Clean, modern design system
- **React Components** – Reusable, maintainable components
- **Smooth Animations** – Transitions and effects for better UX
- **Toast Notifications** – User feedback for actions (SweetAlert2)
- **Loading States** – Visual feedback during processing
- **Error Handling** – User-friendly error messages
- **Form Validation** – Client and server-side validation
- **Helpful Icons** – Intuitive iconography throughout

### 🚀 **Technical Features**
- **Real-time Updates** – Instant data refresh without page reload
- **State Management** – Zustand for client-side state (persistent cart)
- **Inertia.js Integration** – Seamless SPA experience
- **Laravel Components** – Server-side rendering with advantage of SPA
- **REST API** – All features accessible via API
- **Database Transactions** – Atomic operations for data consistency
- **Eager Loading** – Optimized queries with Eloquent relationships
- **Pagination** – Handle large datasets efficiently

---

## 🛠️ Complete Tech Stack

### **Backend**
- **Laravel 11** – Modern PHP framework with Eloquent ORM
- **MySQL 8.0+** – Relational database for data persistence
- **PHP 8.2+** – Server-side language
- **Composer** – Dependency management

### **Frontend**
- **React.js** – UI library for interactive components
- **Inertia.js** – Bridge between Laravel server and React frontend
- **Tailwind CSS** – Utility-first CSS framework
- **Vite** – Fast build tool and dev server

### **State Management & Utilities**
- **Zustand** – Lightweight state management (persistent cart)
- **React Router** – Client-side routing integration via Inertia
- **Axios** – HTTP client for API requests

### **UI Components & Libraries**
- **Headless UI** – Unstyled, accessible components
- **SweetAlert2** – Beautiful, responsive modal alerts
- **Recharts** – React charting library for analytics
- **html2canvas** – Export charts and reports as images
- **jsPDF** – PDF generation for receipts and reports
- **purify** – HTML sanitization for security

### **Hardware & Printer Support**
- **HTML5-QRCode** – Barcode/QR code scanning via camera
- **ESC/POS Formatting** – Thermal printer recipe printing
- **USB Scanner Support** – Hardware barcode scanner integration

### **Development Tools**
- **Laravel Mix / Vite** – Asset bundling and hot reload
- **npm / yarn** – Frontend package management
- **Git** – Version control

### **Security & Authentication**
- **Laravel Sanctum** – API authentication
- **Bcrypt** – Password hashing
- **CSRF Protection** – Built-in against attacks
- **Email Verification** – Account verification system

---

## ⚙️ Installation & Setup

### ✅ Prerequisites

Before you begin, ensure you have the following installed on your system:

- **PHP >= 8.2** with extensions: OpenSSL, PDO, PDO MySQL, ctype, json, curl, fileinfo, filter, hash, json, mbstring, openssl, xml
- **Composer** (Latest version recommended)
- **Node.js >= 18** with npm or yarn
- **MySQL 8.0+** or compatible database (MariaDB 10.5+)
- **Git** (for cloning repository)

### Additional Requirements
- **Thermal Printer** (optional, for receipt printing)
- **USB Barcode Scanner** or **Mobile Camera** (for barcode scanning)

---

## 📥 Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/inertia-pos.git
cd inertia-pos
```

### Step 2: Install PHP Dependencies

```bash
composer install
```

This installs all Laravel packages and dependencies.

### Step 3: Install Frontend Dependencies

```bash
npm install
```

This installs React, Inertia, Tailwind, and all frontend libraries.

### Step 4: Environment Configuration

```bash
cp .env.example .env
```

Edit the `.env` file with your database credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=inertia_pos
DB_USERNAME=root
DB_PASSWORD=
```

### Step 5: Generate Application Key

```bash
php artisan key:generate
```

This secures your application with a unique encryption key.

### Step 6: Create Database

```bash
# Create the database manually in MySQL, or:
mysql -u root -p -e "CREATE DATABASE inertia_pos;"
```

### Step 7: Run Migrations & Seeders

```bash
php artisan migrate --seed
```

This creates:
- All database tables
- Default admin and cashier accounts
- Sample products and categories

### Step 8: Link Storage (For Images & Logos)

```bash
php artisan storage:link
```

This creates a symbolic link for accessing uploaded images and logos.

### Step 9: Start Development Servers

**Terminal 1 – Start Laravel Backend:**

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

The backend will run on `http://localhost:8000`

**Terminal 2 – Start Vite Frontend Dev Server:**

```bash
npm run dev
```

The frontend development server will run with hot module reloading.

### Step 10: Access the Application

Open your browser and navigate to:

```
http://localhost:8000
```

You should see the login page.

---

## 🚀 Production Deployment

### For InfinityFree (Free Hosting)

See [INFINITYFREE_DEPLOYMENT.md](./INFINITYFREE_DEPLOYMENT.md) for detailed step-by-step instructions.

**Key Steps:**
1. Prepare application with `npm run build`
2. Upload files via FTP
3. Configure database on hosting panel
4. Run setup script (provided in deployment guide)
5. Access at your domain

### For Preferred Hosting (Linode, DigitalOcean, AWS, etc.)

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions on:
- Server setup
- SSL certificate configuration
- Database setup
- Environment variables
- Supervisor/Systemd for queue workers
- Nginx/Apache configuration
- Performance optimization

### For Railway.app

See [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) for:
- Railway.app setup
- Environment configuration
- Database provisioning
- Deployment process

---

## 🔐 Default Demo Accounts

If you ran the seeders, use these credentials:

**Admin Account**
- **Email:** `admin@email.com`
- **Password:** `password`
- **Access:** Full system access (Dashboard, Settings, Users, Inventory)

**Cashier Account**
- **Email:** `cashier@email.com`
- **Password:** `password`
- **Access:** POS Terminal only (restricted to selling)

⚠️ **Important:** Change these passwords immediately in production!

---

## 📋 Database Schema

### Core Tables
- **users** – Store staff accounts (admin, cashier)
- **shifts** – Daily shift records with cash tracking
- **products** – Inventory items with pricing and images
- **categories** – Product organization
- **sales** – Transaction records
- **sale_items** – Itemized breakdown of each transaction
- **held_orders** – Saved customer carts for later
- **system_settings** – Store configuration and preferences

### Relationships
- User has many Shifts
- Shift has many Sales
- Product belongs to Category
- Sale has many SaleItems
- Sale belongs to User (cashier)

---

## 🎮 Usage Guide

### For Cashiers (POS Terminal)

1. **Open Shift** – Click "Open Shift" and enter starting cash amount
2. **Scan Products** – Use barcode scanner or search to add items
3. **Adjust Order** – Modify quantities as needed
4. **Apply Discounts** – Select discount type (Senior/PWD/Custom)
5. **Process Payment** – Collect payment and confirm
6. **End Shift** – Close shift and reconcile cash at day's end

### For Admins (Full Access)

1. **Dashboard** – Monitor business performance with real-time KPIs, sales trends, and analytics at a glance.
2. **Inventory** – Add/edit products and manage stock
3. **Transactions** – View sales history, void transactions, reprint receipts
4. **Shifts** – Review past shifts and cash reconciliation
5. **Reports** – Generate detailed sales and performance reports
6. **Settings** – Configure store information, tax rates, discounts
7. **Users** – Manage staff accounts and permissions

---

## 📊 Reporting & Analytics

### Available Reports
- Daily Sales Report
- Product Sales Analysis
- Category Performance
- Shift Summary
- Voided Transaction Log
- Revenue Trend Analysis
- Payment Method Breakdown

### Export Options
- **PDF** – For printing and archiving
- **CSV** – For Excel analysis and record-keeping
- **Image** – Export charts for presentations

---

## 🔧 Troubleshooting

### Common Issues

**Issue: "Please provide a valid cache path" error**
```bash
# Solution:
php artisan cache:clear
php artisan config:clear
php artisan view:clear
```

**Issue: Images not displaying**
```bash
# Solution:
php artisan storage:link
# Or verify storage directory permissions:
chmod -R 755 storage/
```

**Issue: Database connection error**
- Verify database credentials in `.env`
- Ensure MySQL is running
- Check database exists: `php artisan migrate`

**Issue: Frontend won't load**
```bash
# Clear npm cache and reinstall:
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Issue: Permissions denied on uploads**
```bash
# Fix storage permissions:
chmod -R 775 storage/app/public
```

### Getting Help
- Check logs: `storage/logs/laravel.log`
- Review debug mode: Set `APP_DEBUG=true` in `.env` (development only)
- Check browser console for frontend errors

---

## 🚀 Performance Tips

1. **Database Indexing** – Ensure proper indexes on sales and inventory tables
2. **Caching** – Enable Redis for faster API responses
3. **Image Optimization** – Compress product images before upload
4. **CDN** – Use CDN for static assets in production
5. **Database Cleanup** – Archive old transactions regularly
6. **Supervisor** – Use for background queue jobs

---

## 🐛 Known Limitations

- Barcode scanning works best with USB scanners or good camera quality
- Thermal printer support is ESC/POS standard (verify compatibility)
- Multi-register synchronization requires server-side session handling
- Free hosting (InfinityFree) may have slower response times

---

## 📝 Future Enhancements

Planned features for upcoming versions:
- [ ] Multi-store support with headquarters dashboard
- [ ] Customer loyalty program
- [ ] Advanced inventory forecasting
- [ ] Mobile app for cashiers
- [ ] Real-time multi-register sync
- [ ] Advanced cost tracking
- [ ] Automatic payment processing
- [ ] Email receipt integration

---

## 📄 License

This project is licensed under the **MIT License** – see LICENSE file for details.

---

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support & Contact

For questions, issues, or feedback:
- **Email:** support@inertiapos.local
- **Issues:** GitHub Issues
- **Documentation:** See deployment guides in root directory

---

## 🙏 Acknowledgments

Built with:
- [Laravel](https://laravel.com) – PHP framework
- [React](https://react.dev) – UI library
- [Inertia.js](https://inertiajs.com) – SPA framework
- [Tailwind CSS](https://tailwindcss.com) – Styling
- And many amazing open-source libraries

---

**Last Updated:** April 2026
**Version:** 1.0.0
