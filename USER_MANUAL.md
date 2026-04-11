# 📖 Inertia POS System - User Manual

A complete, easy-to-understand guide for using the Inertia POS System.

---

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [For Cashiers](#for-cashiers)
3. [For Store Managers/Admins](#for-store-managersadmins)
4. [Common Tasks](#common-tasks)
5. [Troubleshooting](#troubleshooting)
6. [Tips & Tricks](#tips--tricks)

---

## Getting Started

### Login to Your Account

1. Open your browser and go to `http://localhost:8000`
2. Enter your **Email Address** and **Password**
3. Click **Sign In**

**Local Development Credentials:**
- **Cashier Account:** cashier@email.com / password
- **Admin Account:** admin@email.com / password

### First Time Login?
- You will be asked to verify your email address
- Click the verification link sent to your email
- Your account is now active!

### Forgot Your Password?
1. Click **"Forgot your password?"** on the login page
2. Enter your email address
3. Check your email for a password reset link
4. Create a new password and sign in

---

## For Cashiers

### Your Role
As a cashier, you have access to the **POS Terminal** only. Your main job is to:
- Log in to access the POS system
- Sell products to customers
- Process various payment methods (Cash, Card, E-Wallet)
- Handle customer transactions efficiently

---

### 🛒 The POS Terminal Interface

When you log in as a cashier, you'll see a clean, modern POS interface:

**Left Side: Product Display**
- Product list organized by categories
- Search box to find items by name or SKU
- Category filter buttons with color coding
- Products update in real-time

**Right Side: Shopping Cart**
- Shows all items the customer is buying
- Displays quantity, price, and total for each item
- Action buttons for: Recall Orders, Clear Cart, Senior/PWD Discount
- **Checkout** button to process payment

---

### 💳 Processing a Customer Sale (Main Task)

#### Step 1: Add Products to Cart

**Using Barcode Scanner (Recommended - Fastest):**
1. Position the barcode scanner near the product barcode
2. Scan the barcode
3. The product appears instantly in the **Cart** on the right side
4. You'll hear a **beep** sound when successfully scanned
5. Repeat for each item the customer wants

**Using Product Search:**
1. Click the **Search Box** at the top left
2. Type the product name or SKU
   - Examples: "Coke", "Bread", "COKE-250ML"
3. Products will filter in real-time as you type
4. Click the product name to add it to cart
5. Item quantity starts at 1

**Using Category Filter:**
1. Click the **Filter Icon** (looks like lines) at the top
2. A dropdown menu appears with all categories
3. Click a category (e.g., "Beverages", "Snacks", "Foods")
4. Products are now filtered to show only that category
5. Click any product to add to cart

#### Step 2: Adjust Quantities

In the **Cart** on the right, you'll see each item with:
- **Product Name** and **Price per unit**
- **Quantity Controls** with **minus (−)** and **plus (+)** buttons
- **Item Total** (price × quantity)

**To Change Quantity:**
- Click the **"−" button** to decrease by 1
- Click the **"+" button** to increase by 1
- System prevents adding more than available stock

**To Remove an Item Entirely:**
- Click the **Trash Icon** (🗑) next to the item
- Item is removed from cart immediately

#### Step 3: Apply Senior/PWD Discount (If Applicable)

**For Senior Citizens or PWD Customers:**
1. Ask customer to show a valid ID (Senior ID or PWD Card)
2. Click the **Senior/PWD Icon** button (looks like a person with accessibility symbol) in the cart header
3. The button will highlight in **yellow**, indicating discount is active
4. The system automatically applies **20% discount** to the entire total
5. In the cart footer, you'll see:
   - **Subtotal** – Original total
   - **Less: Senior/PWD (20%)** – Discount amount
   - **Total Amount** – Final price after discount

**To Toggle Off (Remove Discount):**
- Click the same button again to turn off the discount
- Total updates back to full price

#### Step 4: Review Total Before Payment

In the **Cart Footer**, you'll see:
- **Total Amount** – Bold and large text, in Philippine Pesos (₱)
- Number and types of items in the cart

Make sure everything looks correct before proceeding!

#### Step 5: Complete the Sale (Checkout)

1. Click the green **"Checkout"** button at the bottom right of the cart
2. A **Payment Modal** will appear asking you to select payment method and enter payment details

**Payment Method Options:**
- **💵 Cash** – Customer pays with physical money
- **💳 Credit Card** – Customer uses a credit card
- **💳 Debit Card** – Customer uses a debit card
- **📱 GCash** – Customer uses GCash mobile wallet
- **📱 Maya** – Customer uses Maya mobile wallet

**If Payment is CASH:**
1. Select **"Cash"** button in the payment modal
2. Ask the customer: "How much are you giving?"
3. Enter the **"Cash Given"** amount in the field
   - Example: Customer gives ₱1,000 for ₱750 order
4. System **automatically calculates Change**
   - Example: Change = ₱250
5. A **Success Modal** appears showing:
   - Transaction details
   - Change amount
   - Receipt preview option
6. Click **"New Order"** to clear the cart and start selling to next customer

**If Payment is CARD or E-WALLET:**
1. Select the payment method (Card/GCash/Maya)
2. Collect payment from customer using their device or card
   - Use your card reader, ask them to tap their phone, etc.
3. Verify payment was successfully processed
4. Once payment is confirmed, the success modal appears
5. Receipt will print if printer is configured
6. Click **"New Order"** to clear cart

#### Step 6: Receipt Printing

After a successful sale:
- Receipt **prints automatically** if a thermal printer is connected to the system
- If printer is not available or not connected, notify your manager
- The system still records the sale; you don't need a printed receipt to complete it

**Receipt Contains:**
- Store name and location
- Date & Time of purchase
- Itemized list of products with quantities and prices
- Subtotal, any discounts, and final total
- Payment method and amount paid
- Change amount (if cash payment)
- Thank you message

#### Step 7: Next Customer

The cart automatically clears after successful checkout. You're ready for the next customer!

---

### 💾 Saving Orders for Later (Hold/Recall Orders)

**Perfect for:** Customers who want to leave and come back, or need to check inventory

**To Save (Hold) an Order:**
1. Add all items to the cart
2. Click the **Clock/Watch Icon** button (looks like a history icon) in the cart header
3. A dialog appears asking for a **"Reference Note"** (optional)
   - Examples: "Table 5", "Mr. Smith", "Ms. Juan" - anything to remember the customer
   - You can leave it blank; system will auto-assign a number
4. Click **"Save Order"**
5. System confirms the order is saved
6. Cart clears automatically
7. Give the reference note to the customer (if used)

**To Recall a Saved Order:**
1. When customer returns, click the **Clock/Watch Icon** again (on an empty cart)
2. A **"Held Orders Modal"** appears showing all saved orders
3. Each order shows the reference note (or number) and total amount
4. Find the correct order and click on it
5. Order loads back into the cart with all original items
6. Customer can review, add items, remove items, or proceed to checkout
7. Complete checkout as normal

---

### ⚠️ Clear Cart Button

If you need to discard items from the current cart (start over):

1. Click the **Red Trash Icon** in the cart header
2. A confirmation dialog appears asking: "Remove all items from the current order?"
3. Click **"Yes, clear it!"** to confirm
4. All items are removed from cart
5. Cart is now empty and ready for next customer

---

## For Store Managers/Admins

### Your Role
As a store manager or admin, you have full access to:
- View and analyze all sales data and analytics
- Manage product inventory (add, edit, delete items)
- Manage staff members (users/cashiers)
- Configure store settings
- View comprehensive reports and analytics
- Access the POS Terminal (like a cashier can)

---

### 📊 Dashboard - Your Business Overview

The **Dashboard** is your business control center. It loads when you log in.

**Top Section - Today's Key Numbers (KPIs):**

Four large cards display today's performance:

1. **Today's Revenue**
   - Total amount of money made today
   - Example: ₱15,240
   - Shows % growth vs. yesterday (↑ or ↓)

2. **Net Profit**
   - Money earned after subtracting cost of goods sold
   - Example: ₱3,500
   - Shows today's earnings

3. **Transactions**
   - Number of completed sales today
   - Example: 42 transactions
   - Shows total transaction count

4. **Avg Ticket**
   - Average amount per sale
   - Example: ₱362.86
   - Calculated by: Total Revenue ÷ Number of Transactions

**Charts & Analytics Section:**

1. **Sales Trend Chart (Last 7 Days)**
   - Shows sales pattern as a line or area chart
   - X-axis = Days, Y-axis = Sales amount
   - Hover over points to see exact sales for each day
   - Use to identify busy days vs. slow days
   - Plan staffing and promotions based on patterns

2. **Inventory Alerts Box**
   - Highlights products below reorder threshold
   - Shows product name and quantity remaining
   - Green message: "Stock levels are healthy" = everything is OK
   - Click **"Manage"** link to go to Inventory page and restock
   - Essential for avoiding stockouts

3. **Recent Transactions Feed**
   - Live list of last 10 transactions
   - Shows: Invoice Number, Date & Time, Payment Method, Total Amount
   - On desktop: Full table layout
   - On mobile: Compact card layout
   - **Updates every 5 seconds** in the background
   - Click any transaction to see full details

---

### 📦 Inventory Management

#### View All Products

1. Click **"Inventory"** in the main navigation menu
2. You'll see a sortable/filterable table with all products:
   - **Product Name** – Display name
   - **SKU** – Stock Keeping Unit (unique barcode identifier)
   - **Category** – Product type (Beverages, Snacks, etc.)
   - **Stock** – Current quantity available
   - **Price** – Selling price to customers
   - **Cost** – Your purchase cost
   - **Status** – In Stock / Low Stock / Out of Stock

3. **Search & Filter Tools:**
   - **Search Box**: Type product name or SKU
   - **Category Dropdown**: Filter by product category
   - **Low Stock Checkbox**: Show only items running low
   - **Pagination**: Navigate through 10 products per page

#### Add New Product

1. Look for **"+ Add Product"** or **"New Product"** button (usually at top right)
2. Click it - a form modal appears
3. Fill in the fields:
   - **Product Name** ✓ (required)
     - What the product is called
     - Example: "Coca-Cola 250ML Can"
   - **Category** ✓ (required)
     - Select from dropdown or create new
     - Example: "Beverages"
   - **SKU** (optional but highly recommended)
     - Your internal barcode code
     - Must be unique; used by barcode scanner
     - Example: "COKE-250ML"
   - **Price**
     - Selling price to customers
     - Example: 45.00
   - **Cost Price**
     - Your purchase cost; used to calculate profit
     - Example: 30.00
     - Your profit per sale: 45 - 30 = 15 pesos
   - **Stock Quantity**
     - How many you have right now
     - Example: 120
   - **Image** (optional)
     - Product photo (JPG or PNG)
     - Click to upload a photo
     - Used for visual reference

4. Click **"Create"** button
5. Success message appears
6. Product is now in inventory and available for sale at POS terminal

#### Quick Stock Update (Add Stock)

When you receive new inventory and want to quickly add stock:

1. Find the product in inventory list
2. Click the **"+ Quick Add"** or **"Add Stock"** button (usually on the right)
3. A small dialog appears asking "Quantity to add"
4. Enter the number
   - You received 50 units? Enter: `50`
5. Click **"Update Stock"**
6. Stock quantity increases by 50 (previous stock + 50)
7. No need to edit the entire product form

#### Edit a Product

1. Click **"Inventory"**
2. Find the product in the list
3. Click the **Pencil/Edit Icon** on the right side of the row
4. Form opens showing current information
5. Make your changes (price, stock, category, image, etc.)
6. Click **"Update"** or **"Save"**

**Common Reasons to Edit:**
- Price increase or discount
- Correct SKU or barcode number
- Update stock quantity manually (inventory count mismatch)
- Add or change product image
- Move product to different category
- Adjust cost price

#### Delete a Product

⚠️ **WARNING:** Deleting removes product from list and POS terminal sales.

**Two Options:**

Option 1 - **Better: Set Stock to 0**
- Edit the product
- Change Stock Quantity to 0
- Click Update
- Product is hidden from POS terminal but sales history is preserved
- Can be reactivated later

Option 2 - **Delete Completely**
1. Find the product in inventory
2. Click **Delete** or **Trash Icon**
3. Confirm deletion
4. Product is completely removed

**Recommendation:** Use Option 1 (set stock to 0) to keep sales records.

#### Print Barcode Labels

If you need to print physical labels or barcode stickers for your products:

1. Find a product in inventory
2. Click **"Print Label"** or barcode/printer icon
3. Dialog appears with options:
   - **Quantity** – How many labels to print (1, 5, 10, 50, etc.)
   - **Format** – Choose:
     - **Thermal** – 80mm thermal printer (POS receipts)
     - **A4** – Regular paper printer
4. Click **"Print"**
5. Labels print on your selected printer
6. Stick on products for scanning

---

### 👤 User Management (Staff)

#### View All Staff Members

1. Click **"Users"** in main navigation
2. See a table of all staff with columns:
   - **Name** – Full name
   - **Email** – Email address
   - **Account Number** – Your internal staff ID
   - **Role** – Admin or Cashier
   - **Status** – Active or Inactive
   - **Last Login** – When they last accessed the system

3. **Search & Filter:**
   - **Search Box**: Find by name, email, or account number
   - **Role Filter**: Show only Admins or only Cashiers
   - **Pagination**: Navigate through staff members

#### Add New Staff Member

1. Click **"Users"** → Look for **"+ Add User"** button
2. Click it - a form appears
3. Fill in the information:
   - **Full Name** ✓ (required)
     - Example: "Juan Dela Cruz"
   - **Email** ✓ (required, must be unique)
     - Example: "juan@store.com"
     - Each staff needs different email
   - **Account Number** (auto-generated)
     - System generates next number automatically
     - Can be edited if you prefer different numbering
   - **Role** ✓ (required - choose one)
     - **Admin**: Can manage inventory, users, settings, view reports
     - **Cashier**: Can only use POS terminal to sell
   - **Phone Number** (optional)
     - Staff contact number
   - **Address/City/Province** (optional)
     - Staff contact information
   - **Password** ✓ (required)
     - Initial password for first login
     - Staff can change it after logging in first time

4. Click **"Create"** or **"Save"**
5. Success message confirms staff member added
6. **Notify the new staff** of login credentials:
   - Email address
   - Initial password
   - Link to POS system
7. They can log in and change their password immediately

**Role Explained:**
- **Admin**: Full system access. Can sell, manage inventory, users, settings, view all reports.
- **Cashier**: POS terminal only. Can see nothing else; only goal is to process sales.

#### Edit Staff Information

1. Click **"Users"**
2. Find the staff member in the list
3. Click the **Edit/Pencil Icon** on the right
4. Form opens with current information
5. Update as needed:
   - Name changes
   - Role changes (promotion/demotion: Cashier ↔ Admin)
   - Phone or address updates
   - Password reset
6. Click **"Update"** or **"Save"**

**Common Edits:**
- Change role from Cashier to Admin (promote to supervisor)
- Change role from Admin to Cashier (demote if needed)
- Update phone number or address
- Correct name spelling
- Reset forgotten password

#### Deactivate or Remove Staff

⚠️ **IMPORTANT:** Deactivate is better than delete because it preserves sales history!

**Option 1 - Deactivate (Recommended):**
1. Find the staff member
2. Click **"Deactivate"** button
3. They can no longer log in
4. All their sales history and records are preserved
5. Can be reactivated later if rehired
6. Perfect for: Staff leaves, goes on leave, or fired

**Option 2 - Delete Completely:**
1. Find the staff member
2. Click **"Delete"** button
3. More permanent action
4. Removes all staff info
5. Only use if: Created account by mistake

**Recommendation:** Always Deactivate instead of Delete.

---

### 💼 Transaction Management

#### View All Sales (Transactions)

1. Click **"Transactions"** in main navigation
2. See a table of all sales with:
   - **Invoice Number** – Receipt/transaction ID
   - **Date & Time** – When the sale happened
   - **Cashier** – Which staff member processed it
   - **Amount** – Total sale amount
   - **Items** – Number of items sold
   - **Payment Method** – Cash / Credit / Debit / GCash / Maya
   - **Status** – Complete or Voided

3. Default shows 10 transactions per page
4. Navigate with pagination arrows at bottom

#### Search & Filter Transactions

Find specific sales at the top of the page:

**By Date Range:**
- Enter **"From Date"** – Start date
- Enter **"To Date"** – End date
- Shows only sales within that range

**By Cashier/Staff Name:**
- Type name in search box
- System filters to that person's sales

**By Invoice Number:**
- Type exact invoice number
- Finds that specific receipt

**By Payment Method:**
- Select from dropdown: Cash, Credit Card, Debit Card, GCash, Maya, or All
- Shows only transactions with chosen payment method

Note: Filters apply instantly without clicking a search button

#### View Transaction Details

1. Find the transaction in the list
2. Click on it or click the **View Icon**
3. **Transaction Detail Modal** opens showing:
   - Invoice number
   - Date & time
   - Cashier name who processed it
   - **Itemized Breakdown:**
     - Each product name
     - Quantity sold
     - Unit prices
     - Line item totals
   - **Subtotal**
   - **Discount Applied** (if Senior/PWD discount was used)
   - **Total Amount** – Final price
   - **Payment Method** – Cash/Card/E-Wallet
   - **Cash Given & Change** (if cash payment)

4. From this modal, you can:
   - Click **"Reprint Receipt"** to print receipt again
   - Click **"Void"** to reverse the transaction
   - Click X to close

#### Void (Reverse) a Transaction

Use this when a customer needs a refund or to correct a mistake.

**Situations to void:**
- Customer returns items
- Wrong sale was recorded
- Accidental duplicate transaction
- Customer changed their mind

**Steps:**
1. Find the transaction in the list
2. Click to view details
3. Click **"Void Transaction"** button
4. Confirmation dialog: "Are you sure you want to void?"
5. Confirm by clicking "Yes" or "Void"
6. System:
   - Removes sale from records
   - **Returns all items to inventory** with original quantities
   - Marks transaction as **"Voided"** in history
   - Removes amount from revenue calculations

⚠️ **IMPORTANT:**
- This **CANNOT be undone**
- Use very carefully
- Keep records of why it was voided
- For auditing: Note high-value voids

#### Reprint a Receipt

Customer lost their receipt? Printer wasn't connected? Reprint anytime:

1. Find the transaction in list
2. Click to view details
3. Click **"Reprint Receipt"** button
4. Receipt prints again on configured thermal printer
5. Perfect for: Lost receipt, duplicate for customer, backup copy

#### Export Transactions to PDF

Create a backup or share transaction list:

1. Go to **Transactions** page
2. Apply filters if needed (date range, cashier, etc.)
3. Look for **"Export"** or **"Export PDF"** button (top or bottom)
4. Click it
5. PDF downloads to your computer
6. Perfect for: Backup, email to partner, detailed record-keeping

---

### 📈 Reports & Analytics

The **Reports** page gives you deep insights into business performance.

#### Quick Date Presets

At the top, click to quickly select date ranges:
- **Today** – Today's data only
- **This Week** – Current week (Monday-now or Sunday-now)
- **This Month** – Current month (default view)
- **This Year** – Year-to-date
- **Custom Range** – Use date pickers for exact dates

#### Key Report Summary Numbers

At the top of the report:
- **Total Sales** – Total revenue for selected period
- **Total Profit** – After cost of goods sold
- **Total Orders** – Total number of transactions
- **Average Order Value** – Average sale amount per transaction

#### Report Charts & Visualizations

**1. Sales Trend Chart**
- Line or area graph showing sales over days
- Perfect for: Identifying patterns, peak/slow days
- Hover over points to see exact sales amounts
- Use to plan: Staffing levels, promotions, inventory orders

**2. Peak Hours Chart**
- Bar chart showing which hours are busiest
- Example: 12-1 PM is busiest, 3-4 AM is slowest
- Use to: Schedule more cashiers during busy hours

**3. Peak Days Chart**
- Bar chart showing busiest days of week
- Example: Saturdays busier than Mondays
- Use to: Plan shifts, promotions, inventory

**4. Peak Months Chart**
- Bar chart showing seasonal patterns
- Which months have highest/lowest sales
- Use to: Plan annual inventory, promotions, staffing

**5. Payment Methods Chart**
- Pie chart showing breakdown
- Example: 60% Cash, 30% Card, 10% E-Wallet
- Use to: Ensure proper payment equipment (card reader, e-wallet setup)

**6. Sales by Category Chart**
- Bar chart showing revenue by product category
- Example: Beverages earn most, Snacks second
- Use to: Focus marketing on best categories, stock more winners

**7. Top Products Table/Chart**
- Which items sold most quantity
- Which generated most revenue
- Use to: Stock more of best sellers, order ahead for popular items

#### Export Reports to PDF or CSV

1. Generate the report with your date range
2. Look for **"Export PDF"** or **"Export CSV"** button
3. Click to download
4. Perfect for:
   - Sharing with business partners
   - Keeping official records
   - Detailed analysis in spreadsheet
   - Printing for filing

---

### ⚙️ Settings & Configuration

#### Store Information

Configure your store's details (shown on receipts and reports):

1. Click **"Settings"** in main navigation
2. Look for **"Store Information"** section
3. Edit the following:
   - **Store Name** – Official business name
     - Appears on all receipts
   - **Store Address** – Full location
     - Appears on all receipts
   - **Phone Number** – Contact number
     - Appears on all receipts
   - **Email** – Store email address
   - **Store Logo** – Upload company logo
     - Click to upload PNG or JPG image
     - Appears on digital receipts

4. Click **"Save"**
5. Changes take effect immediately
6. All future receipts will use updated information

#### Printer Configuration

Before receipts can print, configure your thermal printer:

1. Click **"Settings"** → Find **"Printer Connection"** section
2. Choose your connection type:

**For USB Printer:**
1. Click **"Connect USB"** button
2. Your printer list appears
3. Select your printer from the list
4. Click **"Connect"**
5. Message shows "Printer Connected" ✓

**For Bluetooth Printer:**
1. Click **"Connect Bluetooth"** button
2. Make sure printer is in pairing mode
3. System discovers nearby devices
4. Select your printer
5. Click **"Connect"**
6. Message shows "Printer Connected" ✓

3. **Set Paper Width:**
   - Select from dropdown
   - Most thermal receipt printers: **80mm**
   - Some mobile printers: 58mm
   - Check printer specifications

4. Click **"Test Print"**
   - A test receipt prints
   - Verify it works

5. You're done! Receipts will now print automatically after checkout.

#### User Access (for Shift Monitoring)

View current active shifts (if shift management is enabled):
- Shows who has an active shift open
- Displays shift statistics
- Managers can view this for monitoring

---

### 📋 Shift History (Manager Dashboard)

Track all historical shift data and cashier performance:

1. Click **"Shift History"** in navigation
2. See a list of all past shifts (organized by date):
   - **Cashier Name** – Who worked
   - **Start Time** – When they opened
   - **End Time** – When they closed
   - **Duration** – Hours worked
   - **Total Sales** – Revenue during shift
   - **Starting Cash** – Opening amount counted
   - **Closing Cash** – Final amount counted
   - **Shortage/Overage** – Any discrepancy

3. **Click a shift** to view detailed breakdown:
   - All transactions during that shift (complete list)
   - Individual itemized sales
   - Payment method breakdown
   - Detailed cash reconciliation

4. **Filter shifts by:**
   - **From Date / To Date** – View shifts in date range
   - **Cashier Search** – Find specific person's shifts
   - Results update in real-time

**Use this to:**
- Track cashier performance and consistency
- Identify cash handling discrepancies
- Audit cash management
- Resolve conflicts over missing cash
- Verify reported sales against recorded sales
- Calculate commissions (if applicable)

---

## Common Tasks

### How to Check Today's Sales

**Quick View (Fastest):**
1. Log in
2. Look at Dashboard's top 4 cards
3. "Today's Revenue" card shows immediate total
4. Takes 2 seconds!

**Detailed View:**
1. Go to **Reports**
2. Select **"Today"** preset
3. View summary numbers and charts
4. Export to PDF if needed

### How to Reorder Low Stock Items

1. Log in - **Dashboard** shows "Inventory Alerts" box
2. Items shown in red if below alert threshold
3. Click **"Manage"** link to go to Inventory
4. Products with LOW STOCK are highlighted
5. Contact your suppliers to order
6. When items arrive:
   - Edit product or use "Quick Add Stock"
   - Update stock quantity
   - Save

### How to Handle Customer Return (Refund)

**If sale was today (same shift):**
1. Go to **Transactions** page
2. Find the sale in the list
3. Click to view details
4. Click **"Void Transaction"**
5. Confirm
6. System:
   - Reverses the sale
   - Returns items to inventory
   - Stop showing in revenue
7. Give customer their money back from register

**If sale was previous day:**
1. Find transaction in Transactions
2. Click **"Void"** to reverse it
3. Confirm
4. Manually refund customer from cash register (system won't auto-refund)
5. Items return to inventory
6. Sale is marked as voided and out of revenue

### How to See Performance by Staff Member

1. Go to **Reports**
2. Or go to **Shift History**
3. Search for specific cashier name
4. See their:
   - Total sales they processed
   - Number of transactions
   - Cash handling accuracy
   - Time worked
   - Payment methods they handled

### How to Find Who Voided a Sale

1. Go to **Transactions**
2. Look for transactions with Status = **"Voided"**
3. Note shows which staff member voided it
4. Open transaction details to see full info
5. OR go to **Reports** → Look for voided transactions report

### How to Train a New Cashier

**First Day Setup:**
1. Create user in **Users** page
   - Role: **Cashier**
   - Give them initial password
2. Show them POS Terminal
3. Walk through:
   - How to search for products (barcode, search, category)
   - How to adjust quantities
   - How to apply Senior discount
   - How to process cash payment
   - How to complete checkout
4. Let them practice on slow shift with supervisor nearby
5. Answer questions as they arise

**Tips for Training:**
- Start with simple order (1-2 items)
- Practice barcode scanning
- Show them common products by name
- Explain payment modal
- Show how to handle cash and give change
- Have them watch experienced cashier first

---

## Troubleshooting

### "I Forgot My Password"

**Steps:**
1. Go to login page
2. Click **"Forgot your password?"** link
3. Enter your email address
4. Check email inbox for "Password Reset Link"
5. Click link in email
6. Create new password
7. Log in with new password

**If you don't receive email:**
- Check spam/junk folder
- Ask your manager to reset for you
- Verify email is correct in system

### "Barcode Scanner Not Working"

**Troubleshooting steps:**

1. **Is scanner plugged in?**
   - Check USB or wireless connection
   - Try different USB port
   - Replace batteries if wireless

2. **Try different barcode:**
   - Barcode might be damaged or unreadable
   - Try scanning different product

3. **Use alternate methods:**
   - **Keyboard Entry**: Type SKU directly in search
   - **Manual Search**: Click product from list
   - **Camera Scan**: Click camera icon, point at barcode

4. **If still broken:**
   - Tell your manager to troubleshoot
   - Use manual search temporarily

### "Receipt Won't Print"

**Troubleshooting:**

1. **Is printer plugged in?**
   - Check power cable
   - Is power button on?

2. **Is there paper?**
   - Open thermal printer access
   - Check paper roll
   - Add paper if  empty

3. **Is printer online?**
   - Check printer display/lights
   - Some printers have on/off switch
   - Verify in settings

4. **Try again:**
   - Click **"Reprint Receipt"** in transaction details
   - Sometimes just delayed

5. **Manual workaround:**
   - Sale is still recorded
   - Can hand-write receipt if necessary
   - Or ask customer for email to print later

6. **Notify manager:**
   - Tell supervisor aboutprinter issue
   - They'll fix or replace

### "I Can't Add Item to Cart - Says Out of Stock"

**Situation:** Trying to add more items but system says stock limit reached.

**Reason:** Cart already has maximum stock of that product.

**Solution:**
1. Check **Inventory** to verify actual stock
2. If stock is higher than what system shows:
   - Have manager update inventory stock quantity
   - Then try adding to cart again

**Prevent in future:**
- Keep inventory counts accurate
- Update stock when items arrive

### "Tax/Discount Not Calculating Correctly"

1. Check **Settings** for Tax rate
2. Verify Senior discount was properly activated
3. If manual discount was applied, check amount
4. If still wrong, note the transaction and tell manager
5. Manager can investigate and correct if needed

### "I Accidentally Voided Wrong Transaction"

⚠️ **Uh oh!** Voiding cannot be undone.

**Immediate action:**
1. Tell your manager IMMEDIATELY
2. Manager will:
   - View the voided transaction in history
   - See it's marked as "Voided"
   - Can manually adjust records if needed
   - Process refund or reversal

**Prevention:**
- Double-check transaction details before clicking void
- Void only when absolutely sure
- Ask manager if unsure

### "System is Running Slow / Transactions Loading Slow"

1. **Check internet connection:**
   - Is WiFi connected?
   - Try reloading page (F5)

2. **Close unnecessary pages:**
   - Close extra browser tabs
   - Close other applications

3. **Clear browser cache:**
   - Try different browser
   - Or refresh (Ctrl+R or Cmd+R)

4. **Restart computer:**
   - Shut down terminal
   - Restart

5. **Tell manager if persists:**
   - May be server issue
   - Might need IT support

### "Customer Says Amount is Wrong"

**Always verify:**
1. Check receipt for itemization
2. Manually count items listed
3. Verify price of each item in system
4. Add up subtotal
5. Check discount was applied correctly if applicable
6. Verify payment amount matches

**If customer is right:**
1. Apologize
2. Process refund difference or void and repeat
3. Tell manager about the error

**If customer is wrong:**
1. Politely show them the receipt breakdown
2. Explain calculation
3. If they insist: Escalate to manager

### "Product Not Showing in POS Terminal"

**Possible reasons:**
1. **Product is inactive** – Stock set to 0
   - Manager needs to re-activate it
2. **Product doesn't exist** – Never added to inventory
   - Manager needs to create it
3. **Stock is depleted** – But still shows
   - Check inventory; may need restock
4. **Product category is hidden** – Wrong filter applied
   - Clear filters, select "All Categories"

**What to do:**
1. Try searching by name or SKU
2. Check if product exists in Inventory
3. Tell manager if product needs to be added
4. Ask manager if stock levels need updating

---

## Tips & Tricks

### ⚡ Speed Tips for Fast Checkout

**These will make you faster:**

1. **Memorize your product barcodes**
   - Scan without looking at screen
   - Just listen for beep

2. **Master barcode scanner speed**
   - Scan as customer places items on counter
   - Don't wait for customer to hand you all items

3. **Use keyboard shortcuts** (if available)
   - Tab = Jump to next field
   - Enter = Confirm/Process
   - Delete = Remove last item

4. **Prep payment method**
   - Ask "Cash or card?" while they scan items
   - Have card reader ready
   - Reduces waiting time

5. **Batch similar actions**
   - Don't adjust quantity after every scan
   - Scan all items first, then adjust quantities

### 💾 Stock Management Tips

1. **When receiving inventory:**
   - Use "Quick Add Stock" feature
   - Don't manually edit entire product

2. **Monitor low stock daily:**
   - Check Dashboard Inventory Alerts
   - Order when at 30% stock, not 0%

3. **Accurate counts:**
   - Don't estimation; actually count
   - Prevents "mysterious" missing stock

4. **Keep prices current:**
   - Update prices when suppliers change costs
   - Adjust retail prices accordingly

### 📊 Daily Routine for Managers

**Do this every day:**

1. **First Thing:**
   - Check Dashboard
   - Review today's revenue so far
   - Check low stock alerts

2. **Mid-Day:**
   - Spot-check a few transactions
   - Verify any large sales
   - Check for unusual activity

3. **End of Day:**
   - Review all day's sales in Transactions
   - Check for voided transactions (why?)
   - Verify all staff shifts closed properly
   - Count cash and verify reports
   - Plan next day's staffing

### 🎯 Use Reports to Improve Business

**Weekly Actions:**

1. **Check Top Selling Products**
   - Stock more of winners
   - Consider removing slow sellers

2. **Review Peak Hours**
   - Schedule more staff during busy hours
   - Run skeleton crew during slow hours
   - Save labor costs

3. **Analyze Payment Methods**
   - Ensure you support main payment types
   - Card reader working if needed
   - E-wallet setup if 10%+ using

4. **Category Performance**
   - Increase shelf space for top categories
   - Promote low-performing categories
   - Adjust marketing focus

### 🔒 Keep Your Login Safe

**Protect your account:**
- Never share your password
- Log out when leaving terminal/computer
- Don't let others see your password entry
- Change password every month
- Report suspicious activity to manager
- Use strong passwords (mix letters, numbers, special chars)

### 📞 When to Contact Your Manager

You MUST escalate to manager for:
- ✓ System errors or crashes
- ✓ Voiding large transactions (>₱1,000)
- ✓ Printer/hardware problems
- ✓ Adding stock that doesn't match counts
- ✓ Major discrepancies in cash
- ✓ Customer disputes about prices/amounts
- ✓ Adding or training new staff
- ✓ Password resets
- ✓ Access issues (can't log in)
- ✓ Multiple people trying to use one account

### ✅ End of Day Checklist for Cashiers

Before leaving your shift:

**Cart & Sales:**
- [ ] All transactions completed
- [ ] Cart is empty
- [ ] No pending orders

**Daily Close:**
- [ ] Count all cash in your register
- [ ] Note the final amount
- [ ] Compare to system's expected amount
- [ ] Sign off/log out
- [ ] Inform manager of any discrepancies

**Handoff:**
- [ ] Give cash to manager
- [ ] Provide written count of your cash
- [ ] Report any issues from your shift
- [ ] Return any hardware (scanner, etc.)

### ✅ End of Day Checklist for Managers

Before going home:

1. **Sales Review:**
   - [ ] Check all day's transactions
   - [ ] Look for unusual voids
   - [ ] Verify total matches cash received

2. **Cash Audit:**
   - [ ] Count all cash
   - [ ] Verify against system's expected total
   - [ ] Investigate discrepancies (shortage/overage)

3. **Inventory Check:**
   - [ ] Review low stock alerts
   - [ ] Note items to reorder
   - [ ] Spot-check counts if any issues

4. **Staff Audit:**
   - [ ] Review each cashier's transactions
   - [ ] Check shift opening/closing times
   - [ ] Verify all shifts were properly closed

5. **Plan for Tomorrow:**
   - [ ] Schedule staff based on expected traffic
   - [ ] Prepare inventory orders
   - [ ] Note any issues to address
   - [ ] Back up data if applicable

---

## Quick Reference

### Button & Icon Legend

| Icon | Meaning | Use |
|------|---------|-----|
| ➕ | Add | Create new product/staff/order |
| ✏️ | Edit | Modify existing item |
| 🗑️ | Delete | Remove item |
| 👁️ | View | See full details |
| 🔄 | Recall | Bring back saved order |
| 📋 | Copy | Duplicate |
| 📷 | Camera | Scan barcode with phone |
| 🔊 | Sound | Audio feedback toggle |
| 🖨️ | Print | Print receipt/report |
| 📊 | Chart | View analytics |
| ⚙️ | Settings | Configure system |
| 🔍 | Search | Find items |
| 📅 | Calendar | Select date |
| ✓ | Confirm | Approve action |
| ✗ | Cancel | Discard action |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Esc** | Cancel / Close modal |
| **Enter** | Confirm / Submit form |
| **Tab** | Jump to next field |
| **Shift+Tab** | Jump to previous field |
| **Ctrl+S** | Save (some pages) |
| **F5** | Refresh page |

---

## Getting Help

**Can't figure something out?**

1. **Check this manual** – Search for your question
2. **Ask a coworker** – They might know the answer
3. **Contact your manager** – They can help or escalate
4. **In-system help** – Look for **"?"** icon (if available)
5. **Take your time** – Don't rush; getting it right matters more

---

## Final Tips

### ✅ Do These Things:
- Read this manual when confused
- Ask questions if unsure
- Practice during slow shifts
- Keep your password private
- Report errors immediately
- Handle money carefully
- Thank customers always
- Say sorry if you make mistakes
- Pay attention to details

### ❌ Don't Do These:
- Play around with settings you don't understand
- Delete transactions without good reason
- Share your login details
- Process sales after shift closes
- Leave cash unattended
- Make up numbers; always count
- Rush through transactions
- Be rude to customers or staff
- Ignore system errors

---

**Document Version:** 2.0
**Last Updated:** April 2026
**For:** Inertia POS System - Local Development
**Environment:** http://localhost:8000

**Questions or suggestions?** Contact your system administrator or store manager.