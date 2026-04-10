# InfinityFree Deployment Guide for POS System

## Overview

This guide covers deploying the Smart Retail POS System to InfinityFree with **automatic email scheduling** for subscription reminders and renewal notices.

### What Gets Automated
- **Subscription Reminders**: Email sent 5 days before subscription expires
- **Due Date Warnings**: Email sent on the day subscription expires
- **Queue Processing**: Handles background email delivery

## Prerequisites
- InfinityFree account (free signup at [infinityfree.net](https://infinityfree.net))
- FTP client (FileZilla recommended) or use File Manager
- Local development environment with Node.js and PHP Composer
- Gmail account (for SMTP email)
- Git installed

## Step 1: Create InfinityFree Account & Setup Hosting

1. Sign up at [infinityfree.net](https://infinityfree.net)
2. After registration, go to **Account** → **Your Domains**
3. Click **Create New Domain** or use the provided subdomain
4. **Keep note of these credentials:**
   - **FTP Host**: `ftp.infinityfree.com` (usually)
   - **FTP Username**: Your account username
   - **FTP Password**: Your account password
   - **MySQL Database**: `infinityfree_dbname`
   - **MySQL Username**: `infinityfree_username`
   - **MySQL Password**: Your MySQL password

**Get Exact Credentials:**
1. Log in to InfinityFree Control Panel
2. Click **Client Area** → **Account** → **MySQL Database**
3. Copy exact hostname, username, and password

## Step 2: Prepare Application Locally

### Build Frontend Assets

```bash
# Install dependencies
composer install --optimize-autoloader --no-dev
npm install

# Build frontend assets
npm run build

# Verify the build folder exists
ls -la public/build/
```

### Generate APP_KEY

```bash
php artisan key:generate --show
# This outputs: base64:XXXXXXXXXXX...
# Copy this value - you'll need it for the .env file
```

### Run Migrations Locally (Optional, to Test)

```bash
# Test that migrations work
php artisan migrate --seed
```

### Create .env for InfinityFree

Copy `.env.infinityfree` to `.env`:

```bash
cp .env.infinityfree .env
```

Then edit `.env` and update:

```env
APP_KEY=base64:YOUR_KEY_FROM_php_artisan_key_generate_ABOVE
APP_URL=https://your-domain.infinityfree.app  # Your domain

DB_HOST=localhost                    # IMPORTANT: Must be localhost
DB_DATABASE=infinityfree_dbname      # From InfinityFree panel
DB_USERNAME=infinityfree_username    # From InfinityFree panel
DB_PASSWORD=your_mysql_password      # From InfinityFree panel

MAIL_USERNAME=your_email@gmail.com   # Your Gmail address
MAIL_PASSWORD=your_app_password      # Gmail App Password (NOT your regular password)
MAIL_FROM_ADDRESS=admin@your-domain  # Change to your domain
```

### Gmail App Password Setup

If using Gmail SMTP:
1. Enable **2-Step Verification** on your Google Account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Select **Mail** and **Windows Computer** (or your device)
4. Copy the generated 16-character password
5. Paste into `.env` as `MAIL_PASSWORD`

### Commit Built Assets

```bash
git add public/build/
git commit -m "Build frontend assets for InfinityFree deployment"
```

## Step 4: Upload All Files via FTP

Since InfinityFree doesn't have terminal access, you need to upload **all files including `vendor/`** via FTP.

### Important for InfinityFree (No Terminal):
- **You MUST include the `vendor/` folder** in your FTP upload
- Run `composer install --optimize-autoloader --no-dev` **locally first**
- Then upload the entire project including `vendor/`

### Prepare Locally Before Upload:

```bash
# Install all dependencies locally
composer install --optimize-autoloader --no-dev

# Build frontend
npm run build

# Verify vendor folder exists
ls -la vendor/
```

### Upload via FileZilla

1. Download and install [FileZilla](https://filezilla-project.org/)
2. Open FileZilla
3. Click **File** → **Site Manager** → **New Site**
4. Enter credentials:
   - **Host**: Your FTP host
   - **Username**: Your FTP username
   - **Password**: Your FTP password
   - **Port**: 21
5. Click **Connect**
6. Navigate to `htdocs` folder on remote
7. Upload **ALL files including:**
   - ✅ `vendor/` folder (must include dependencies)
   - ✅ `public/build/` (frontend assets)
   - ✅ `app/`, `config/`, `database/`, `routes/`, etc.
8. **Exclude these folders:**
   - ❌ `node_modules/`
   - ❌ `.git/`
   - ❌ `.env.local`
9. Right-click local project → **Upload**
10. Wait for upload to complete (15-30 minutes with vendor included)

### Setup After Upload

Since you don't have terminal access, create a setup file:

1. Create file: `htdocs/setup.php`

```php
<?php
// Only run once, then delete this file
try {
    // Set error reporting
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    echo "Starting setup...<br>";

    // Copy .env file if it doesn't exist
    if (!file_exists(__DIR__ . '/.env')) {
        copy(__DIR__ . '/.env.example', __DIR__ . '/.env');
        echo "✓ Created .env file<br>";
    }

    // Load Laravel
    require __DIR__ . '/vendor/autoload.php';
    $app = require_once __DIR__ . '/bootstrap/app.php';

    // Get the Artisan kernel
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

    // Clear cache
    $kernel->call('cache:clear');
    echo "✓ Cache cleared<br>";

    // Cache config
    $kernel->call('config:cache');
    echo "✓ Config cached<br>";

    // Cache routes
    $kernel->call('route:cache');
    echo "✓ Routes cached<br>";

    // Run migrations
    $kernel->call('migrate', ['--force' => true]);
    echo "✓ Migrations completed<br>";

    echo "<br><strong style='color: green;'>Setup complete!</strong><br>";
    echo "<strong>Important: Delete the setup.php file now!</strong>";

} catch (Exception $e) {
    echo "<strong style='color: red;'>Error: " . $e->getMessage() . "</strong><br>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?>
```

2. Visit: `https://your-domain.infinityfree.app/setup.php`
3. Wait for it to complete (should see green "Setup complete!" message)
4. **Delete setup.php immediately** via FTP (security risk)

## Step 7: Set Up Automatic Email Scheduling

### How It Works

The POS system has two automatic emails (via Laravel Scheduler):

1. **Subscription Renewal Reminder** (`subscription:remind`)
   - Sent 5 days before subscription expires
   - Runs daily at 8:00 AM UTC

2. **Subscription Due Warning** (`subscription:due`)
   - Sent on the day subscription expires
   - Runs daily at 9:00 AM UTC

3. **Queue Worker** (`queue:work`)
   - Processes any queued emails
   - Runs every minute

### Setup HTTP-Based Cron Job

Since InfinityFree doesn't have terminal, use a **free HTTP cron service**:

1. Go to [easycron.com](https://www.easycron.com/)
2. Sign up (free)
3. Click **Create Cron Job**
4. Enter:
   - **URL**: `https://your-domain.infinityfree.app/scheduler.php`
   - **Cron Expression**: `* * * * *` (every minute)
   - **Execution Type**: URL
5. Click **Create**
6. EasyCron will automatically ping your scheduler every minute

### Verify Scheduler Is Working

1. Wait 5 minutes after setup
2. Check logs:
   - Via FTP, download `storage/logs/laravel.log`
   - Look for entries like: `"Subscription reminder email sent successfully"`
3. Or check manually:
   - Visit `https://your-domain.infinityfree.app/scheduler.php` in your browser
   - Should see Laravel schedule run output

## Step 5: Final Configuration

### Set Permissions

Most hosting already has correct permissions, but if needed via FTP:
- Right-click file → Properties → Numeric value should be `644` for files, `755` for folders

### Verify Installation

1. Visit `https://your-domain.infinityfree.app`
2. You should see the login page
3. Try logging in with credentials
4. If error: check `storage/logs/laravel.log`

### Test Email Sending

Create file `test-email.php` in `htdocs/public/`:

```php
<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

use Illuminate\Support\Facades\Mail;

try {
    Mail::raw('Test email from InfinityFree!', function ($message) {
        $message->to('your-email@gmail.com')
                ->subject('Test Email from POS System');
    });
    echo "Email sent! Check your inbox.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

Visit: `https://your-domain.infinityfree.app/test-email.php`

Then **delete test-email.php** via FTP.

## Step 6: Post-Deployment

### Create Backups

1. Download database via cPanel **phpMyAdmin**
2. Download important files via File Manager
3. Set a reminder to backup monthly

### Monitor Logs

1. Regularly check `storage/logs/laravel.log` for errors
2. Monitor InfinityFree resource usage in Control Panel

### Test Automatic Emails

1. Add a test store with subscription ending soon
2. Wait for scheduled email to be sent
3. Check `storage/logs/laravel.log` for confirmation

## Troubleshooting

### 403 Forbidden Error (Most Common on InfinityFree)

**The Problem:** Your domain is pointing to the wrong folder.

**Solution: Set Domain Public Root Correctly**

1. Log into InfinityFree Control Panel
2. Go to **Account** → **Manage Domains**
3. Find your domain and click **Manage**
4. Look for **Document Root** or **Web Root** setting
5. Change it from `/public_html` to `/public_html/public` or `/htdocs/public`
6. Save/Apply changes
7. Wait 5-10 minutes for changes to take effect
8. Visit your domain again - should now show the login page

**If InfinityFree doesn't allow changing Document Root:**
- Contact InfinityFree support and ask to set document root to the `/public` folder
- This is a standard request on shared hosting and they should accommodate it

```
PDOException: SQLSTATE[HY000]: General error: 1030
```

**Solution:**
- Verify `DB_HOST=localhost` in `.env` (NOT 127.0.0.1)
- Verify exact credentials match InfinityFree panel:
  - Log in → Client Area → MySQL Database
  - Copy exact hostname, username, password
- Verify `.env` file was uploaded in root folder

### 500 Internal Server Error

1. Check `storage/logs/laravel.log` via FTP
2. Verify `.htaccess` exists in `htdocs/public/` folder
3. Verify `vendor/` folder was uploaded completely
4. Check file permissions (may be in FTP File Manager)
5. Verify `.env` file exists in root with correct settings

### Emails Not Sending

1. Check `MAIL_USERNAME` and `MAIL_PASSWORD` in `.env`
2. Verify Gmail account has 2-Step Verification enabled
3. Verify you're using **App Password**, not regular password
4. Check `storage/logs/laravel.log` for SMTP errors:
   ```bash

1. Verify `npm run build` was run locally
2. Verify `/public/build/` folder exists on server (download to check)
3. Verify `/public/manifest.json` exists
4. Clear browser cache (Ctrl+Shift+Delete)
5. Check that `.htaccess` is in `public/` folder
3. Verify `/public/manifest.json` exists
4. Clear browser cache (Ctrl+Shift+Delete)
5. Check that `.htaccess` is in `public/` folderexists on server
3. Verify `/public/manifest.json` exists
4. Run: `php artisan config:cache`
 (shared hosting)
- Reduce database queries and complex operations
- Monitor `storage/logs/laravel.log` for slow queries (download via FTP)
- Disable unneeded features in `.env`
- Consider upgrading hosting if performance is critical
- Reduce database queries
- Use `PAGE_CACHING` if available
- Monitor `storage/logs/laravel.log` for slow queries

## Important Files

### Environment Files
- `.env.infinityfree` - Template for InfinityFree (.env)
- `.env.example` - Reference configuration

### Scheduler Files
- `app/Console/Kernel.php` - Defines scheduled tasks
- `public/scheduler.php` - HTTP endpoint for cron trigger
- `app/Console/Commands/SendRenewalReminders.php` - Sends emails 5 days before
- `app/Console/Commands/SendDueDateWarnings.php` - Sends emails on due date

### Database
- `database/migrations/0001_01_01_000002_create_jobs_table.php` - Queue table schema

## Key Differences from Traditional Hosting

⚠️ **What's NOT Available on InfinityFree:**
- **No terminal/SSH access** - Use FTP and PHP scripts instead
- **No automatic dependency installation** - Must upload `vendor/` folder
- **Database performance limited** to shared resources
- **No automated backups** - Must backup manually via FTP
- **File upload limits** on FTP (~100MB per file, upload in batches if needed)
- **No GitHub Actions/CI-CD** integration
- **Limited CPU and memory** for background tasks

✅ **Best Practices for InfinityFree:**
- **Run `composer install` locally** before uploading, then upload `vendor/` folder
- Always build assets locally: `npm run build` before uploading
- Keep `.env` file safe - don't commit to public repo, upload only at the end
- Use HTTP-based cron (EasyCron) for task scheduling
- Monitor logs regularly for errors (download `storage/logs/laravel.log` via FTP)
- Test everything locally before deploying
- Use `.htaccess` properly for clean URLs
- Backup database and files monthly via FTP
- Use PHP setup scripts (like `setup.php`) for server-side tasks

```bash
# On your LOCAL machine, run these:
composer install --optimize-autoloader --no-dev
npm run build

# Then upload everything including vendor/ folder
```

## Maintenance

### Before First Deployment - CRITICAL

```bash
# On your LOCAL machine, run these:
composer install --optimize-autoloader --no-dev
npm run build

# Then upload everything including vendor/ folder
```

### Monthly Tasks
1. Download database via phpMyAdmin (in InfinityFree Control Panel)
2. Backup important files via FTP
3. Download `storage/logs/laravel.log` and check for errors
4. Test that automated emails are still being sent (check Gmail sent folder)

### Updating Code
1. Make changes locally
2. If frontend changed: Run `npm run build` locally
3. Upload only modified files via FTP (keeping vendor/ consistent)
4. If database changed: Upload migration files and manually run via setup.php if needed
5. Clear cache by uploading new `storage/framework/cache/` filesnt.google.com/apppasswords
- **Laravel Queue Documentation**: https://laravel.com/docs/queues
- **Laravel Scheduler**: https://laravel.com/docs/scheduling
