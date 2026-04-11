# 📖 Inertia POS System - User Manual

A complete, easy-to-understand guide for using the Inertia POS System.

---

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [For Cashiers](#for-cashiers)
3. [For Store Managers/Admins](#for-admins)
4. [Common Tasks](#common-tasks)
5. [Troubleshooting](#troubleshooting)
6. [Tips & Tricks](#tips--tricks)

---

## Getting Started

### Login to Your Account

1. Open your browser and go to your store's POS website
2. Enter your **Email Address** and **Password**
3. Click **Sign In**

**Demo Credentials:**
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
- Open your shift at the start of the day
- Sell products to customers
- Close your shift at the end of the day
- Handle customer transactions

### 🔓 Opening Your Shift

**Only ONE shift can be open at a time per register!**

**Steps:**

1. Log in to the system
2. Click **"Open Shift"** button
3. Enter the **Starting Cash Amount** (the money you have in the register at the beginning)
   - Example: If you have ₱500 in the register, enter `500`
4. Click **"Confirm"**
5. You'll see **"✓ Shift Open"** - You're ready to sell!

**Important:**
- You CANNOT process sales until your shift is open
- Write down the time when you opened the shift
- Always open with the actual cash in your register

---

### 💳 Processing a Customer Sale (Main Task)

#### Step 1: Add Products to Cart

**Using Barcode Scanner:**
1. Scan a product's barcode using your scanner
2. The product appears in the **Cart** on the right
3. Repeat for all items the customer wants

**Using Product Search:**
1. Click the **Search Box** at the top
2. Type the product name (example: "Coke" or "Bread")
3. Click the product to add it to cart
4. Adjust the quantity if needed

**Scanning from Camera:**
1. Click **Camera Icon**
2. Point at barcode/QR code
3. Wait for recognition
4. Product auto-adds to cart

#### Step 2: Review the Cart

Look at the right side of the screen. You'll see:
- **Product Name** – What the customer is buying
- **Quantity** – How many
- **Price** – Cost per item
- **Subtotal** – Total for that item

**To Change Quantity:**
- Click **"-"** to decrease by 1
- Click **"+"** to increase by 1
- Or type the number directly

**To Remove an Item:**
- Click the **"X"** or **Trash Icon** next to the item

#### Step 3: Apply Discounts (If Applicable)

**Senior Citizen or PWD Discount (20% off):**
1. Ask customer for valid ID
2. Click **"Senior/PWD"** button
3. This automatically gives 20% discount on the total
4. The total will update

**Manual Discount:**
1. Click **"Discount"** button
2. Enter the discount amount or percentage
3. Click **Apply**

#### Step 4: Select Payment Method

**Choose how the customer pays:**
- **💵 Cash** – Customer pays with cash
- **💳 Card** – Customer uses credit/debit card
- **📱 E-Wallet** – GCash, PayMaya, etc.

Click the payment method button.

#### Step 5: Process Payment

**If Cash Payment:**
1. Customer gives you money
2. System shows **Amount Due** (how much they owe)
3. Enter the **Cash Amount Received**
4. System calculates **Change** automatically
5. Give change to customer
6. Click **"Complete Sale"**

**If Card/E-Wallet:**
1. Customer provides payment (card/phone)
2. Complete the payment outside the system
3. Once confirmed, click **"Complete Sale"**

#### Step 6: Print Receipt

After completing the sale:
- Receipt prints automatically if printer is connected
- System shows **"✓ Receipt Printed"**
- If not, ask manager for help

**Receipt Contains:**
- Store name
- Date & time
- Items purchased
- Amount paid
- Change
- Thank you message

#### Step 7: Next Customer

The cart automatically clears. You're ready for the next customer!

---

### 💾 Holding an Order (Save for Later)

Customer wants to leave but might come back?

**To Hold an Order:**
1. Add all items to cart
2. Click **"Hold Order"** button
3. Give the customer a **ticket number**
4. Customer leaves (they'll return with the number)

**To Recall a Held Order:**
1. Customer returns with their ticket number
2. Click **"Recalls"** or **"Held Orders"**
3. Find the order by ticket number
4. Click to load it back to cart
5. Continue with the sale

---

### 🔒 Closing Your Shift

**Do this at the end of your work day:**

**Steps:**

1. Click **"Close Shift"** button
2. System shows your shift summary:
   - **Total Sales** – How much you sold
   - **Number of Transactions** – How many sales you made
   - **Total Cash** – Total cash received

3. **Count Your Cash**
   - Count all cash in your register
   - Check the amount vs. what system shows

4. **Enter Closing Cash Amount**
   - Enter the total money you counted
   - Example: You counted ₱5,200, enter `5200`

5. **Review Discrepancy**
   - System compares expected vs. actual
   - **Shortage:** You have less than expected (lost money)
   - **Overage:** You have more than expected (found money)
   - This is normal if small amounts

6. **Confirm Closure**
   - Review all numbers
   - Click **"Close Shift"**

7. **Print Z-Report** (Optional)
   - This is your official shift report
   - Give to manager

**After Closing:**
- You CANNOT make new sales
- You CANNOT void transactions
- Only a manager can reopen if needed

**Important:**
- Always match your physical cash to closing amount
- Report significant discrepancies to manager
- Keep your shift receipt for records

---

## For Admins

### Your Role
As an admin/manager, you have full access to:
- View all sales and reports
- Manage inventory (products)
- Manage users (cashiers)
- Configure store settings
- View analytics and trends

### 📊 Dashboard - Overview

When you log in, you see the **Dashboard** with:

**Key Numbers at Top:**
- **Daily Revenue** – Total money made today
- **Today's Transactions** – Number of sales
- **Total Profit** – Money earned after costs
- **Top Products** – Best-selling items today

**Charts & Graphs:**
- **Sales Trend** – Line graph showing sales over days
- **Peak Hours** – When customers shop most
- **Top Selling Products** – Best items sold
- **Payment Methods** – Cash vs Card vs E-Wallet

**How to Use:**
- Click on any chart to drill down into details
- Hover over chart points to see exact numbers
- Use date filters to view specific periods
- Export reports as PNG or PDF

---

### 📦 Inventory Management

#### View All Products

1. Click **"Inventory"** menu
2. See all products in a table with:
   - **Product Name**
   - **SKU** – Item code
   - **Category**
   - **Stock** – How many in inventory
   - **Price**
   - **Cost** – What you paid for it
   - Status (In Stock / Low Stock / Out of Stock)

#### Add New Product

1. Click **"Inventory"** → **"+ Add Product"**
2. Fill in the form:
   - **Product Name** – What it's called (required)
   - **Category** – Type of product (required)
   - **SKU** – Unique code (optional but recommended)
   - **Barcode** – For scanner (optional)
   - **Price** – Selling price
   - **Cost** – What you paid (for profit calculation)
   - **Stock** – How many you have
   - **Low Stock Alert** – Notify when below this amount
   - **Image** – Product photo (optional)

3. Click **"Create"** or **"Save"**

**Example:**
```
Name: Coca-Cola Can
Category: Beverages
SKU: COKE-250ML
Price: 45.00
Cost: 30.00 (your profit: 15.00 per item)
Stock: 120
Low Stock Alert: 20
```

#### Edit a Product

1. Click **"Inventory"**
2. Find the product in the list
3. Click the **Edit/Pencil Icon**
4. Change the information
5. Click **"Update"** or **"Save"**

Reasons to edit:
- Price increase/decrease
- New stock added
- Product details correction
- Update product image

#### Delete a Product

⚠️ **WARNING:** This removes the product from sales!

1. Click **"Inventory"**
2. Find the product
3. Click **"Delete"** (usually represented by trash icon)
4. Confirm you want to delete
5. Product is removed

**Better Alternative:**
Instead of deleting, set **Stock = 0** so it doesn't appear for sale but records remain.

#### Search & Filter Products

1. Use the **Search Box** to find products by name
2. Use **Category Filter** to show only one type
3. Use **Stock Status** to find:
   - Low Stock items → Time to reorder
   - Out of Stock items → Need to order
   - In Stock items → Available for sale

---

### 👤 User Management

#### View All Staff

1. Click **"Users"** menu
2. See list of all staff with:
   - **Name**
   - **Email**
   - **Role** – Admin or Cashier
   - **Status** – Active or Inactive
   - **Last Login** – When they last used system

#### Add New Staff Member

1. Click **"Users"** → **"+ Add User"**
2. Fill in:
   - **Full Name** (required)
   - **Email** (required, must be unique)
   - **Role** – Choose Admin or Cashier (required)
   - **Password** – Initial password (they can change it later)

3. Click **"Create"**
4. Notify the person of their login details
5. Send them login instructions

**Roles Explained:**
- **Admin:** Can see everything, manage inventory, users, settings, view reports
- **Cashier:** Can ONLY use POS terminal to sell

#### Edit Staff Information

1. Click **"Users"**
2. Find the person
3. Click **"Edit"** icon
4. Update information (name, role, etc.)
5. Click **"Save"**

#### Deactivate/Remove Staff

1. Click **"Users"**
2. Find the person
3. Click **"Deactivate"** (they can't login anymore)
4. Or click **"Delete"** to remove completely

**Recommendation:**
Deactivate instead of deleting so their sales history remains in records.

---

### 💰 Transaction Management

#### View All Sales

1. Click **"Transactions"** menu
2. See all sales in a table with:
   - **Date & Time** – When sale happened
   - **Cashier** – Who processed it
   - **Amount** – Total sale amount
   - **Items** – Number of items sold
   - **Payment Method** – Cash/Card/E-Wallet
   - **Status** – Complete or Voided

#### Search Transactions

Find specific sales using filters:
1. **By Date Range** – Select "From" and "To" dates
2. **By Cashier** – Filter by staff member
3. **By Amount** – Find sales between amounts
4. **By Payment Method** – Show only cash, card, etc.
5. **By Status** – Show complete or voided sales

Click **"Search"** or **"Filter"** to apply.

#### View Transaction Details

1. Find the transaction in the list
2. Click on it to open details
3. See:
   - All items purchased with quantities
   - Prices and subtotals
   - Discounts applied
   - Final amount
   - Payment method
   - Timestamp

#### Void (Reverse) a Transaction

**Use case:** Customer returns item, wrong sale, etc.

1. Find the transaction
2. Click **"Void"** button
3. Confirm you want to void
4. System:
   - Removes the sale from records
   - Returns items to inventory
   - Refunds the customer
   - Marks as "Voided" in history

**Important:**
- This CANNOT be undone
- Use carefully!
- Inventory automatically restocked

#### Print Receipt Again

1. Find the transaction
2. Click **"Reprint Receipt"**
3. Receipt prints again
4. Give to customer if needed

---

### 📈 Reports & Analytics

#### Sales Report

1. Click **"Reports"** menu
2. Click **"Sales Report"**
3. Default shows today's sales
4. Change date range:
   - Enter **From Date** and **To Date**
   - Or click **"This Week,"** **"This Month,"** **"This Year"** buttons
5. Click **"Generate"**
6. See:
   - Total sales amount
   - Number of transactions
   - Average transaction amount
   - Best selling products
   - Sales by category
7. Click **"Export PDF"** or **"Export CSV"** to save

#### Product Sales Report

1. Click **"Reports"** → **"Product Sales"**
2. Shows which products sold most in a period
3. See:
   - Product name
   - Quantity sold
   - Total revenue
   - Profit earned
4. Sort by quantity or revenue
5. Export to PDF for records

#### Shift Summary Report

1. Click **"Reports"** → **"Shift Summary"**
2. Select date range
3. See all shifts with:
   - Cashier name
   - Shift duration
   - Total sales
   - Cash reconciliation
   - Shortage/overage amount

#### Voided Transactions Report

1. Click **"Reports"** → **"Voided Transactions"**
2. Shows all reversed sales
3. Helps audit unusual activity
4. See who voided and when

#### Export Reports

All reports can be exported:
- **PDF** – For printing or sharing
- **CSV** – For Excel analysis
- **Image** – For presentations

Steps:
1. Generate report
2. Look for **"Export"** button
3. Choose format
4. Report downloads automatically

---

### ⚙️ Settings & Configuration

#### Store Information

1. Click **"Settings"**
2. Click **"Store Information"**
3. Update:
   - **Store Name** – Your business name
   - **Store Address** – Full address
   - **Phone Number** – Contact number
   - **Email** – Store email
   - **Store Logo** – Upload PNG/JPG image
   - **Website** – If you have one

4. Click **"Save"**

This info appears on receipts and reports.

#### Tax Settings

1. Click **"Settings"** → **"Tax"**
2. Set **VAT Rate** (Value Added Tax)
   - Standard is 12% in Philippines
   - Enter as decimal: 0.12 for 12%
3. Click **"Save"**

The system automatically calculates tax on all sales.

#### Discount Settings

1. Click **"Settings"** → **"Discounts"**
2. Set **Senior/PWD Discount %**
   - Default: 20%
   - This is what cashiers can apply
3. Click **"Save"**

#### Printer Configuration

1. Click **"Settings"** → **"Printer"**
2. **Printer Name** – Your printer model
3. **Paper Width** – Usually 80mm for thermal printers
4. **Auto-print** – Enable to print receipts automatically
5. Click **"Save"**

**Common Thermal Printers:**
- Epson TM-M30
- Star Micronics
- Sewoo LK-P200
- Xprinter 58mm

#### Email Settings

1. Click **"Settings"** → **"Email"**
2. Configure:
   - Email provider (Gmail, Outlook, etc.)
   - Sender email
   - Sender name
3. Click **"Save"**

Used for password resets and receipts.

---

## Common Tasks

### How to Check Daily Sales

1. **Quick View:** Look at Dashboard when you login
2. **Detailed Report:**
   - Click **"Reports"** → **"Sales Report"**
   - Select today's date
   - See total, breakdown by product, etc.

### How to Reorder Low Stock Items

1. Click **"Inventory"**
2. Use **"Low Stock"** filter
3. See items below alert threshold
4. Contact suppliers to order
5. When items arrive, **Edit Product** and update stock

### How to Handle Customer Returning Item

**Option 1 - If Still Same Day (Not Yet Shift Closed):**
1. Click **"Transactions"**
2. Find the sale
3. Click **"Void Transaction"**
4. Confirm
5. Items returned to inventory
6. Refund customer

**Option 2 - If Previous Day:**
1. Find transaction in history
2. Click **"Void"**
3. Refund from cash register
4. Process return manually

### How to See How Much Money Cashier Made

1. Click **"Reports"** → **"Shift Summary"**
2. Select the date
3. See each cashier's shift:
   - Total sales
   - Payment breakdown
   - Cash vs expected

### How to Find Who Voided a Sale

1. Click **"Reports"** → **"Voided Transactions"**
2. Filter by date
3. See user who voided
4. Click to see reason (if noted)

### How to Train a New Cashier

1. Add them in **"Users"** menu
2. Give temporary password
3. Have them login on first shift
4. Change password on first login
5. Show them:
   - How to open shift
   - How to add products to cart
   - How to take payment
   - How to close shift

---

## Troubleshooting

### "I Forgot My Password"

1. Click **"Forgot Password"** on login
2. Enter email
3. Check email for reset link
4. Create new password
5. Try logging in again

**If you don't receive email:**
- Check spam folder
- Ask admin to reset for you
- Try different email address

### "I Can't Process Sales - Shift Not Open"

**Solution:**
1. Click **"Open Shift"**
2. Enter starting cash
3. Try sale again

**If already open somewhere:**
- Only ONE shift per register allowed
- Another cashier might have it open
- Ask manager to close it first

### "Barcode Scanner Not Working"

Try these steps:

1. **Check Connection:**
   - Is scanner plugged in?
   - Battery charged (if wireless)?

2. **Test Barcode:**
   - Try scanning a different barcode
   - Barcode might be damaged/unreadable

3. **Use Camera Instead:**
   - Click **Camera Icon**
   - Hold product barcode to camera
   - Wait for recognition

4. **Manual Entry:**
   - Use **Search** to find product by name
   - Click to add to cart

5. **Ask Manager:**
   - If scanner still won't work, report to manager

### "Receipt Won't Print"

1. **Check Printer:**
   - Is it plugged in?
   - Is there paper?
   - Is it online/connected?

2. **Try Again:**
   - Click **"Reprint Receipt"**
   - Sometimes delayed

3. **Manual Print:**
   - Ask customer to email receipt
   - Or hand-write receipt

4. **Tell Manager:**
   - Inform supervisor
   - They'll check printer

### "Wrong Item Added to Cart"

1. Click the **"X"** or **"Delete"** button next to item
2. Item removed from cart
3. Add correct item instead

**If Already Paid:**
1. Offer to accept return
2. Process **"Void Transaction"** (manager permission)
3. Process correct sale

### "Discount Not Applying"

**For Senior/PWD:**
1. Customer showed proper ID?
2. Click **"Senior/PWD"** button before payment
3. Discount appears automatically

**For Manual Discount:**
1. Click **"Discount"** button
2. Enter percentage (20) or amount (100)
3. Check if applied to total

**If Still Not Working:**
- Ask manager to help
- Might need manual adjustment

### "I Can't See a Product in Search"

**Possible Reasons:**
1. Product is **Out of Stock** (removed from display)
2. Product name spelled differently
3. Product deleted from inventory

**Solutions:**
1. Try different search term
2. Ask manager to check inventory
3. Add product to inventory if missing
4. Check if product is active

### "Cash Count Doesn't Match at Close"

**Common Causes:**
- Miscounted cash (recount)
- Gave wrong change (check)
- Lost receipt/transaction
- Forgot to record customer payment

**What to Do:**
1. Recount all cash slowly
2. Report discrepancy to manager
3. Check last few transactions
4. Don't close shift with major discrepancy
5. Ask manager to investigate

---

## Tips & Tricks

### ⚡ Speed Tips for Cashiers

**Go Faster:**
- **Use Barcode Scanner** – Much faster than searching
- **Know Your Products** – Can scan without looking at system
- **Pre-scan Items** – Scan as customer puts items on counter
- **Keyboard Shortcuts:**
  - **Tab Key** – Jump to next field
  - **Enter Key** – Confirm/Process

### 💾 Running Out of Inventory?

1. Keep eye on low stock alerts
2. Order when at 30% stock (don't wait until 0)
3. Update stock immediately when items arrive
4. Communicate with manager about popular items

### 📊 Check Daily Performance

**For Managers:**
Add this to your daily routine:
1. Check Dashboard first thing
2. Review afternoon sales
3. Check for any voided transactions (unusual?)
4. Confirm team's performance

### 🎯 Improve Sales

**Use the Reports to:**
- See best-selling products → Stock more
- See peak hours → Staff more during busy times
- See payment methods → Ensure card reader works
- See customer trends → Plan promotions

### 🔒 Keep Your Login Safe

**Protect Your Account:**
- Never share password
- Log out when leaving
- Don't let others see password entry
- Change password monthly
- Report suspicious activity to manager

### 📞 When to Contact Manager

You MUST contact manager for:
- Voiding large transactions
- System issues/errors
- Opening two shifts in one terminal
- Printer problems
- Low stock of frequently bought items
- Unusual discrepancies
- Password reset
- Adding/removing staff

### ✅ End of Day Checklist

**For Cashiers:**

- [ ] All sales processed
- [ ] Cart is empty
- [ ] Close shift by clicking "Close Shift"
- [ ] Count cash in register
- [ ] Enter closing amount
- [ ] Review discrepancy (shortage/overage)
- [ ] Print Z-Report
- [ ] Give report to manager
- [ ] Return keys/hardware if applicable
- [ ] Log out of system

**For Managers:**

- [ ] Review all sales reports
- [ ] Check for unusual voided transactions
- [ ] Verify all cashier reconciliations
- [ ] Check inventory alerts
- [ ] Plan next day's staffing
- [ ] Prepare orders for low stock items
- [ ] Back up system (if applicable)

---

## Quick Reference

### Button Legend

| Icon | Meaning | Use |
|------|---------|-----|
| ➕ | Add | Create new item |
| ✏️ | Edit | Modify existing item |
| 🗑️ | Delete | Remove item |
| 👁️ | View | See details |
| ⏸️ | Hold | Save for later |
| 📋 | Copy | Duplicate |
| 🎥 | Camera | Scan with phone camera |
| 🔊 | Sound | Audio feedback |
| 🖨️ | Print | Print receipt/report |
| 📊 | Chart | View graph/Analytics |
| ⚙️ | Settings | Configure |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Esc** | Cancel / Close dialog |
| **Enter** | Confirm / Submit |
| **Tab** | Next field |
| **Shift Tab** | Previous field |
| **Ctrl S** | Save (some pages) |

---

## Getting Help

**Can't figure something out?**

1. **Check this manual** – Might answer your question
2. **Ask a coworker** – They might know
3. **Contact your manager** – They can help
4. **System Help Icon** – Click **"?"** in system (if available)
5. **Contact system admin** – For technical issues

---

## Final Tips

✅ **Do:**
- Read this manual thoroughly
- Ask questions if unsure
- Practice on slow days
- Keep password private
- Report errors immediately
- Thank customers
- Handle money carefully

❌ **Don't:**
- Play around with settings
- Delete transactions without reason
- Share login credentials
- Process sales after shift closes
- Leave cash unattended
- Forget to backup data

---

**Document Version:** 1.0
**Last Updated:** April 2026
**For:** Inertia POS System v1.0

**Questions?** Contact your system administrator or store manager.
