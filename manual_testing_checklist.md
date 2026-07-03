# Comprehensive System Verification & Testing Checklist

This checklist defines step-by-step verification flows for **every page and function** inside the Web Inertia POS system. Use this to conduct full-system manual audits across all user roles.

---

## 1. DEV PANEL (Developer / Super Admin)

The Dev Panel is accessed by accounts with the `super_admin` role. All paths are prefixed with `/developer`.

### 1.1 Dashboard (Home)
- [ ] **Overview Page (`/developer`)**:
  - [ ] Verify summary metrics cards load (Total Stores, Active Subscriptions, Pending Review count, Total Revenue).
  - [ ] Verify recent registration logs or audit summary charts load correctly.

### 1.2 Tenant Store Management (`/developer/tenants`)
- [ ] **Provisioning New Stores**:
  - [ ] Click **Create Store / New Tenant**.
  - [ ] Enter a unique Store Name and Owner Email.
  - [ ] Select an initial Pricing Plan.
  - [ ] Submit the form and verify a **Magic Onboarding Link** is generated.
  - [ ] Copy the magic link and confirm it points to `/setup/{signed-route}`.
- [ ] **Listing & Filters**:
  - [ ] Search stores by store name or email.
  - [ ] Filter stores by status (Active, Expired, Suspended).
- [ ] **Store Status Actions**:
  - [ ] Click **Suspend** on an active tenant store. Confirm the store status changes immediately.
  - [ ] Click **Unsuspend / Activate** on a store. Confirm the status changes.
  - [ ] Click **Send Renewal Reminder** to trigger email dispatch.

### 1.3 Billing & Subscription Plans (`/developer/billing`)
- [ ] **Manage Subscription Plans**:
  - [ ] View the list of subscription packages (e.g. Starter, Premium, Enterprise).
  - [ ] Click **Add Plan**.
  - [ ] Input Plan Name, Description, Duration (in months), and Price in PHP.
  - [ ] Submit and verify the new plan appears immediately in the plans list.

### 1.4 Broadcasts & Announcements (`/developer/broadcasts`)
- [ ] **System Announcements**:
  - [ ] Create a system-wide announcement message (e.g. *"System Maintenance on Saturday at 2:00 AM"*).
  - [ ] Select priority level (Info, Warning, Critical).
  - [ ] Click **Broadcast**.
  - [ ] Log in as a Tenant Admin or Cashier and confirm the banner renders at the top of their page.
  - [ ] Click **Clear Broadcast** in the Dev Panel and verify the banner disappears for all users.

### 1.5 Global Audit Trail (`/developer/activity-logs`)
- [ ] **System-Wide Logs**:
  - [ ] View list of global activity logs.
  - [ ] Verify actions are logged with actor name, target store, action type, description, and timestamp.
  - [ ] Use search to filter logs by specific stores or action keywords.
  - [ ] Click **Export CSV** to download a local copy of logs.

### 1.6 Legal Policies (`/developer/policies`)
- [ ] **Policies Editor**:
  - [ ] Navigate to the Policies section.
  - [ ] Edit the rich text for **Terms of Service** and **Privacy Policy**.
  - [ ] Save updates and check the tenant registration setup pages to confirm the terms checkbox links display the updated text.

### 1.7 Super Admin User Accounts (`/developer/users`)
- [ ] **Co-Super Admin Management**:
  - [ ] View the list of active Super Admin users.
  - [ ] Click **Invite Super Admin**.
  - [ ] Fill in Name, Email, Password. Submit to save.
  - [ ] Try updating details of an existing admin user.
  - [ ] Try deleting a Super Admin user and confirm they can no longer log in.

### 1.8 System Configuration (`/developer/system-info`)
- [ ] **Branding details**:
  - [ ] Edit App Name, Support Email, Support Phone, and Official Business Address.
  - [ ] Click the logo upload box, select an image file, and save.
  - [ ] Confirm the logo changes on the login page and email headers.
- [ ] **Payment Setup (GCash & Maya)**:
  - [ ] Open the **Add Payment Method** modal.
  - [ ] Verify you can only choose between the **GCash** and **Maya** provider buttons.
  - [ ] Confirm selecting a provider auto-populates the type, display label, and icon.
  - [ ] Input the Account Number and Account/Business Name.
  - [ ] Save and confirm GCash (Blue) or Maya (Green) badges render correctly.
  - [ ] Edit and delete payment configurations to verify data syncs.

### 1.9 Payments Verification (Finance Hub)
- [ ] **Pending Approvals (`/developer/payments/pending`)**:
  - [ ] Verify the table shows GCash/Maya badges next to reference numbers.
  - [ ] Click the receipt image to view the high-res zoomable lightbox overlay.
  - [ ] Click **Approve** -> Confirm store updates to active and subscription end date shifts forward.
  - [ ] Click **Reject** -> Input feedback reason -> Confirm record status updates to rejected.
  - [ ] Click **Export List PDF** to download a document of pending approvals.
- [ ] **Overdue Payments (`/developer/payments/overdue`)**:
  - [ ] View the list of all stores with expired subscriptions.
  - [ ] Verify quick suspension toggles are functional here.
- [ ] **Upcoming Renewals (`/developer/payments/upcoming`)**:
  - [ ] View list of stores whose subscriptions will expire within the next 7 or 30 days.
  - [ ] Verify you can send manual reminders from this dashboard.
- [ ] **Payment History Log (`/developer/payments/history`)**:
  - [ ] View lists of all verified payments.
  - [ ] Search by reference number, store name, or filter by approved/rejected.
  - [ ] Verify the GCash/Maya badges render.

---

## 2. ADMIN PANEL (Tenant Store Owner)

All pages are accessed by authenticated tenant users with the `admin` role.

### 2.1 Magic Store Onboarding (`/setup/{user}`)
- [ ] **Initial Configuration Form**:
  - [ ] Access the magic link sent from the Developer Panel.
  - [ ] Confirm you are prompted to input the Store Name and Owner Password.
  - [ ] Submit and verify redirection to the **Setup Success Page** and the automatic creation of the store database record.

### 2.2 Dashboard Analytics (`/dashboard`)
- [ ] **Sales Metrics**:
  - [ ] Verify KPI metric widgets (Gross Sales, Net Profit, Average Ticket, Total Sales Count) update dynamically based on dates.
  - [ ] Verify chart analytics (daily sales line chart, product breakdown charts) render.
- [ ] **Low Stock Alerts**:
  - [ ] Confirm alert lists display products running below their set low-stock thresholds.

### 2.3 Analytics Reports (`/reports`)
- [ ] **Detailed Sales Reports**:
  - [ ] Load sales summaries filtered by date range (Today, Yesterday, Last 7 Days, Month, Custom).
  - [ ] Click **Export PDF** or **Export Excel/CSV**.
  - [ ] Open the exported files to confirm columns match calculations.

### 2.4 Inventory Management (`/inventory`)
- [ ] **Category Config**:
  - [ ] Create a product category (e.g. *Beverages*, *Pastries*).
  - [ ] Update and delete categories, verifying products under them update accordingly.
- [ ] **Product Details**:
  - [ ] Click **Create Product**.
  - [ ] Confirm the system generates a unique **SKU** string automatically.
  - [ ] Select Category, type in Product Name, Cost price, Retail Selling Price, current Stock Quantity, and Low-Stock Alert warning number.
  - [ ] Save product and verify it displays in the main inventory table.
  - [ ] Check SKU uniqueness validation: try creating a product with an already existing SKU and verify error feedback.
- [ ] **Stock Adjustments**:
  - [ ] Edit a product, adjust the stock count (+/-), and provide a reason (e.g. *Inventory Audit* or *Damaged Goods*).
  - [ ] Verify the transaction log reflects the update.
- [ ] **Barcode Thermal Label Printing**:
  - [ ] Select check-boxes next to products.
  - [ ] Click **Print Barcodes**.
  - [ ] Verify the print window opens, presenting correctly sized thermal barcode label sheets.

### 2.5 Transaction Register (`/transactions`)
- [ ] **Review Sales Records**:
  - [ ] View list of all completed checkout receipts.
  - [ ] Search transactions by Receipt ID or Reference Number.
  - [ ] Filter by payment status (Paid, Voided).
- [ ] **Voiding Orders**:
  - [ ] Select a paid transaction and click **Void Transaction**.
  - [ ] Confirm voiding prompts for confirmation and updates cash register reports immediately.
  - [ ] Verify voided items are returned to stock counts.

### 2.6 Shift Records & Audits (`/shifts`)
- [ ] **Z-Read & X-Read History**:
  - [ ] View shift entries showing Cashier Name, start/end dates, opening cash, closing cash, total sales, and discrepancies.
  - [ ] Click **View Details** to check cash breakdowns per cashier.

### 2.7 Store Settings (`/settings`)
- [ ] **Receipt Configuration**:
  - [ ] Edit Store Name, Telephone, and Address.
  - [ ] Customize receipt Header Message and Footer/Thank You message.
  - [ ] Save and verify the cash register receipts display the updated text.

### 2.8 Staff & User Management (`/users`)
- [ ] **Invite Cashiers / Admins**:
  - [ ] Click **Invite User**.
  - [ ] Confirm the **Account Number** displays `"Generating..."` and automatically generates a unique numeric ID.
  - [ ] Fill in user Name, Email, Password, and Role (Admin or Cashier).
  - [ ] Save and confirm the onboarding invite email triggers.
  - [ ] Toggle active/inactive switch for staff. Confirm deactivated staff are locked out immediately.

### 2.9 Store Billing & Subscription Portal (`/portal/billing`)
- [ ] **Renewal Submissions**:
  - [ ] Select plan from pricing grid -> verify expiry preview updates.
  - [ ] Select payment method -> input reference number -> upload receipt.
  - [ ] Click submit -> verify page redirects to pending screen.
- [ ] **Real-time status card polling**:
  - [ ] Confirm the card automatically refreshes in the background every 5 seconds until approved by Super Admin.
- [ ] **See More Modal**:
  - [ ] Confirm the Recent History table displays up to 5 items with plans, timestamps, and rejection warnings.
  - [ ] Click **See More** to confirm the scrollable overlay lists all records.

---

## 3. CASHIER ROLE (POS Operator)

These pages are accessed by cashier or admin accounts executing transactions at the checkout register.

### 3.1 Account Onboarding (`/setup-account/{user}`)
- [ ] **Initial Cashier Setup**:
  - [ ] Click the invitation link sent to the cashier's email.
  - [ ] Fill in password and set up security questions.
  - [ ] Verify redirect to the POS login.

### 3.2 Shift Control Gate (`/pos`)
- [ ] **Opening Register Shift**:
  - [ ] Access the POS Terminal page.
  - [ ] Verify you cannot scan products or add to cart until you fill in the **Starting Cash amount** and click **Open Shift**.

### 3.3 Sales Terminal (`/pos`)
- [ ] **Product Selection**:
  - [ ] Click category tabs to filter product grid.
  - [ ] Search products by SKU or Name.
  - [ ] Scan a mock product barcode to verify item is automatically added to cart.
- [ ] **Cart Actions**:
  - [ ] Click `+` or `-` to adjust product quantities.
  - [ ] Remove items from the cart.
  - [ ] Apply percentage/amount discounts.
- [ ] **Park / Hold Orders**:
  - [ ] Add items to cart and click **Hold Order / Park Sale**.
  - [ ] Verify you can name the held sale.
  - [ ] Click **Retrieve Orders** to load the held cart back into the active panel.
- [ ] **Checkout Process**:
  - [ ] Click **Proceed to Payment**.
  - [ ] Select GCash, Maya, Card, or Cash.
  - [ ] Input amount tendered and verify calculated change is accurate.
  - [ ] Click **Submit Transaction** and confirm receipt modal pops up.
  - [ ] Verify item stock count reduces in inventory immediately.

### 3.4 Closing Register Shift (`/pos`)
- [ ] **Closing Register Shift**:
  - [ ] Click **Close Shift / End Session**.
  - [ ] Fill in the closing drawer count.
  - [ ] Print shift report summarizing totals.
  - [ ] Verify you are logged out of the register gate.
