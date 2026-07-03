# Exhaustive System Verification & Testing Checklist

This checklist defines step-by-step verification flows for **every page and function** inside the Web Inertia POS system, explicitly including **Add, View, Edit, Delete, Disable/Enable, Archive/Void, and Export** actions across all user roles.

---

## 1. DEV PANEL (Developer / Super Admin)

The Dev Panel is accessed by accounts with the `super_admin` role. All paths are prefixed with `/developer`.

### 1.1 Dashboard Overview (`/developer`)
- [ ] **View Overview Metrics**:
  - [ ] Confirm summary counters render: Total Stores, Active Subscriptions, Pending Review count, Total Revenue.
  - [ ] Confirm registration charts and audit logs summary widgets load.

### 1.2 Tenant Store Management (`/developer/tenants`)
- [ ] **Add / Provision Store**:
  - [ ] Click **Create Store / New Tenant**.
  - [ ] Fill in Store Name and Owner Email. Select initial Plan.
  - [ ] Submit and verify a unique signed magic onboarding URL (`/setup/{user}`) is generated.
- [ ] **View Store Listing**:
  - [ ] Search stores by name or email.
  - [ ] Filter store list by status (Active, Suspended, Expired).
- [ ] **Edit Store Status / Suspend / Disable**:
  - [ ] Click **Suspend** on an active store. Verify store status changes to inactive immediately.
  - [ ] Click **Unsuspend / Activate** on a store. Verify store status returns to active.
- [ ] **Export / Remind Tenant**:
  - [ ] Click **Send Renewal Reminder** to dispatch notification emails.

### 1.3 Subscription Plans (`/developer/billing`)
- [ ] **Add Pricing Plan**:
  - [ ] Click **Add Plan**.
  - [ ] Enter Plan Name, Description, Duration (in months), and Price (PHP).
  - [ ] Submit and verify it appears in the active plans list.
- [ ] **View Pricing Plans**:
  - [ ] Review pricing packages list with durations and prices.

### 1.4 Announcements & Broadcasts (`/developer/broadcasts`)
- [ ] **Add / Broadcast Announcement**:
  - [ ] Create announcement message text.
  - [ ] Select Alert Level (Info, Warning, Critical).
  - [ ] Click **Broadcast**. Verify banner displays on tenant admin and cashier dashboards.
- [ ] **Delete / Clear Announcement**:
  - [ ] Click **Clear Broadcast** in the Dev Panel.
  - [ ] Verify the warning banner disappears for all users.

### 1.5 Global Audit Trail (`/developer/activity-logs`)
- [ ] **View Action Logs**:
  - [ ] View list of log entries showing Actor Name, Target Store, Action Type, Description, and Timestamp.
  - [ ] Filter logs using search queries.
- [ ] **Export Activity Logs**:
  - [ ] Click **Export CSV** and verify the full activity trail downloads as a CSV file.

### 1.6 Legal Policies (`/developer/policies`)
- [ ] **Edit Policies**:
  - [ ] Modify content text fields for **Terms of Service** and **Privacy Policy**.
  - [ ] Save updates and verify changes reflect on the tenant registration setup pages.

### 1.7 Co-Super Admin Accounts (`/developer/users`)
- [ ] **Add Admin**:
  - [ ] Click **Invite Super Admin**. Fill Name, Email, Password, and save.
- [ ] **Edit Admin**:
  - [ ] Click **Edit** on an admin user, update their Name/Email, and save.
- [ ] **Delete Admin**:
  - [ ] Click **Delete** on an admin user. Confirm deletion and verify they can no longer log in.

### 1.8 System Configuration (`/developer/system-info`)
- [ ] **Edit Global Settings**:
  - [ ] Modify App Name, Support Email, Support Phone, and Official Business Address.
  - [ ] Upload a logo image file. Save and verify branding updates across the app.
- [ ] **Add Payment Method**:
  - [ ] Open payment method builder. Select **GCash** or **Maya** button.
  - [ ] Confirm provider type, display label, and icon auto-populate.
  - [ ] Input Account Number and Account/Business Name and save.
- [ ] **Edit Payment Method**:
  - [ ] Click edit icon, modify details (e.g. business name), and save.
- [ ] **Delete Payment Method**:
  - [ ] Click delete icon on a payment method. Save system settings and confirm removal.

### 1.9 Payments Verification (Finance Hub)
- [ ] **Pending Approvals (`/developer/payments/pending`)**:
  - [ ] View list of pending uploads showing GCash/Maya badges next to reference numbers.
  - [ ] Click receipt thumbnail to open the lightbox image overlay.
  - [ ] **Approve Transaction**: Click Approve. Confirm payment status becomes approved, store subscription extension updates, and store status becomes active.
  - [ ] **Reject Transaction**: Click Reject. Input reason (e.g. *Receipt blur*) in the popup modal. Save and confirm status changes to rejected.
  - [ ] **Export Pending list**: Click **Export List PDF** to download the list of pending approvals.
- [ ] **Overdue & Expired Accounts (`/developer/payments/overdue`)**:
  - [ ] View suspended accounts. Verify suspension status.
- [ ] **Upcoming Renewals (`/developer/payments/upcoming`)**:
  - [ ] View list of stores nearing expiration (7/30 days). Send manual email notifications.
- [ ] **Payment History Log (`/developer/payments/history`)**:
  - [ ] View logs of all approved/rejected payments.
  - [ ] Search by reference number, store name, or filter by status.

---

## 2. ADMIN PANEL (Tenant Store Owner)

All pages are accessed by authenticated tenant users with the `admin` role.

### 2.1 Magic Onboarding (`/setup/{user}`)
- [ ] **Add Store & Owner Credentials**:
  - [ ] Open onboarding link. Enter Store Name and Owner Password.
  - [ ] Submit and verify redirect to the **Setup Success Page**.

### 2.2 Dashboard Analytics (`/dashboard`)
- [ ] **View Sales Charts**:
  - [ ] Verify KPI metric counters (Gross Sales, Net Profit, Sales Count) load.
  - [ ] Verify daily sales line graphs and product velocity breakdowns render.
  - [ ] Review low stock alerts.

### 2.3 Reports (`/reports`)
- [ ] **View Sales Summaries**:
  - [ ] Filter sales data by date ranges (Today, Yesterday, Last 7 Days, Month, Custom).
- [ ] **Export Sales Data**:
  - [ ] Click **Export Excel/CSV** to download spreadsheets.
  - [ ] Click **Export PDF** to generate formatted printable report pages.

### 2.4 Inventory Management (`/inventory`)
- [ ] **Categories (Add, View, Edit, Delete)**:
  - [ ] **Add**: Create a new category (e.g. *Beverages*).
  - [ ] **View**: Check category display in the inventory sidebar.
  - [ ] **Edit**: Select category, rename it, and save changes.
  - [ ] **Delete**: Click delete category icon. Verify category is removed and products under it update.
- [ ] **Products (Add, View, Edit, Delete, Disable, Adjust Stock, Export)**:
  - [ ] **Add**: Click Create Product. Verify a unique SKU code is generated. Enter Name, Cost, Retail Price, stock count, and low stock threshold. Save product.
  - [ ] **View**: Confirm the product displays in the active inventory table.
  - [ ] **Edit**: Edit product details (pricing, thresholds) and save changes.
  - [ ] **Delete**: Click delete product. Confirm prompt. Verify product is removed.
  - [ ] **Disable/Enable (Toggle Active)**: Toggle active switch to disabled. Verify the product disappears from the cashier's POS product search. Toggle it back to active.
  - [ ] **Adjust Stock (Audit Logs)**: Adjust stock levels with a custom audit reason (e.g. *Damaged* or *Re-stock*). Verify changes update in inventory.
  - [ ] **Export / Import**: Click **Import Products** to upload a bulk products list via CSV file.
- [ ] **Print Barcode Labels**:
  - [ ] Checkboxes next to products. Click **Print Barcodes**.
  - [ ] Confirm layout preview displays correctly aligned thermal labels.

### 2.5 Sales transactions (`/transactions`)
- [ ] **View Transaction History**:
  - [ ] View list of completed checkouts. Search by Receipt ID or Reference Number.
- [ ] **Archive / Void Sale**:
  - [ ] Select a paid transaction. Click **Void Transaction**.
  - [ ] Verify transaction status updates to voided, cash reports update, and products return to inventory.

### 2.6 Shift Records (`/shifts`)
- [ ] **View Shift logs**:
  - [ ] Review historical cashier shift sessions showing opening/closing tallies.
  - [ ] View details showing expected cash vs counted cash and discrepancies.

### 2.7 Store Settings (`/settings`)
- [ ] **Edit receipt info**:
  - [ ] Modify Store Name, Phone, and Address.
  - [ ] Customize receipt Header/Footer text messages. Save changes.

### 2.8 Staff Accounts (`/users`)
- [ ] **Add Staff (Invite)**:
  - [ ] Click **Invite User**. Confirm **Account Number** displays "Generating..." and assigns a unique numeric ID.
  - [ ] Enter Name, Email, Password. Select Role (Admin/Cashier). Save.
- [ ] **Edit Staff**:
  - [ ] Edit user details (Name, Role) and save.
- [ ] **Disable / Enable Staff**:
  - [ ] Toggle user status to inactive. Verify cashier is immediately blocked from logging in.
- [ ] **Delete Staff**:
  - [ ] Click delete on a user. Confirm deletion.

### 2.9 Store Billing & Subscription Portal (`/portal/billing`)
- [ ] **Add / Submit Renewal**:
  - [ ] Select plan from pricing grid -> verify expiry preview updates.
  - [ ] Select payment method -> input reference number -> upload receipt.
  - [ ] Click submit -> verify page redirects to pending screen.
- [ ] **View Recent History**:
  - [ ] Confirm the Recent History table displays up to 5 items with plans, timestamps, and rejection warnings.
- [ ] **View Full History (Modal)**:
  - [ ] Click **See More** to confirm the scrollable overlay lists all records.

---

## 3. CASHIER ROLE (POS Operator)

### 3.1 Onboarding Setup (`/setup-account/{user}`)
- [ ] **Add Credentials**: Open email invite. Fill cashier credentials and security questions to activate.

### 3.2 Shift Gate (`/pos`)
- [ ] **Add / Open Shift**: Access POS. Enter **Starting Cash amount** and click Open Shift. Verify register unlocks.
- [ ] **Close Shift**: Click Close Shift. Enter **Closing Drawer Cash**. Print shift summary and confirm register locks.

### 3.3 POS Sales Terminal (`/pos`)
- [ ] **View / Select Products**: Search products by name/SKU, toggle categories, scan barcode.
- [ ] **Cart Actions (Add, Edit, Delete)**:
  - [ ] **Add**: Click item to add to cart.
  - [ ] **Edit (Quantities/Discounts)**: Click `+` or `-` to edit quantities. Apply discounts.
  - [ ] **Delete**: Click trash icon to remove product from cart. Clear all cart.
- [ ] **Held Orders (Add, Retrieve, Delete)**:
  - [ ] **Add**: Click Hold Order, enter identifier name.
  - [ ] **Retrieve**: Click Retrieve held orders, select order.
  - [ ] **Delete**: Click delete icon on a held order.
- [ ] **Checkout Checkout Payment**:
  - [ ] Click pay. Select Cash, GCash, Maya, or Card.
  - [ ] Input cash tendered, verify change calculation.
  - [ ] Click complete transaction. Confirm thermal receipt modal displays.
