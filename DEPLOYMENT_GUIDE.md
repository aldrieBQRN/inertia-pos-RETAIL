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

## Step 3: Upload Files via FTP

### Using FileZilla (Recommended)

1. Download and install [FileZilla](https://filezilla-project.org/)
2. Open FileZilla
3. Click **File** → **Site Manager** → **New Site**
4. Enter your credentials:
   - **Host**: Your FTP host
   - **Username**: Your FTP username
   - **Password**: Your FTP password
   - **Port**: 21
5. Click **Connect**
6. On the right panel, navigate to `public_html` or `htdocs`
7. On the left, open your local project folder
8. Select all files **EXCEPT**:
   - `node_modules/`
   - `vendor/` (we'll install on server)
   - `.git/`
   - `.env.local`
   - `.env.azure`
9. Right-click → **Upload**
10. Wait for upload to complete (this may take 5-15 minutes)

### Using InfinityFree File Manager

1. Log in to InfinityFree Control Panel
2. Click **File Manager**
3. Navigate to `public_html` folder
4. Click **Upload**
5. Select files (excluding `node_modules/` and `vendor/`)
6. Upload completes

## Step 4: Install Composer Dependencies on Server

After files are uploaded, install PHP dependencies:

### Option A: Using InfinityFree Terminal (If Available)

1. Log in to InfinityFree Control Panel
2. Click **Terminal** (under **Advanced**)
3. Run these commands:

```bash
cd public_html
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan migrate --force
```

### Option B: If Terminal Not Available

1. Upload `composer.phar` from your local vendor directory
2. Create a file `install.php` in `public_html`:

```php
<?php
// Run once, then delete this file
system('cd ' . __DIR__ . ' && php composer.phar install --optimize-autoloader --no-dev');
system('php artisan config:cache');
system('php artisan route:cache');
system('php artisan migrate --force');
echo "Installation complete!";
?>
```

3. Visit `https://your-domain.infinityfree.app/install.php`
4. **Delete `install.php` after it completes** (security risk)

## Step 5: Set Up Automatic Email Scheduling

### How It Works

The POS system has two automatic emails:

1. **Subscription Renewal Reminder** (`subscription:remind`)
   - Sent 5 days before subscription expires
   - Runs daily at 8:00 AM UTC

2. **Subscription Due Warning** (`subscription:due`)
   - Sent on the day subscription expires
   - Runs daily at 9:00 AM UTC

3. **Queue Worker** (`queue:work`)
   - Processes any queued emails
   - Runs every minute

### Setup Cron Job

InfinityFree doesn't have built-in cron, but you can use **HTTP-based cron**:

#### Option A: Use Free Cron Service (Easiest)

1. Go to [easycron.com](https://www.easycron.com/)
2. Click **Create** a new cron job
3. Enter URL: `https://your-domain.infinityfree.app/scheduler.php`
4. Set frequency to **Every 1 minute**
5. Click **Create**
6. EasyCron will ping this URL every minute automatically

#### Option B: Manual Setup (If HTTP Cron Not Available)

Run these commands manually from terminal each day, or create a PHP script in your public folder:

```bash
# In Terminal or via SSH cron
php artisan schedule:run
```

### Verify Scheduler Is Working

1. Check logs:
   - Via FTP, download `storage/logs/laravel.log`
   - Look for entries like: `"Subscription reminder email sent successfully"`

2. Test manually via Terminal:
```bash
php artisan subscription:remind
php artisan subscription:due
php artisan queue:work --max-jobs=5
```

3. Check if emails are being sent in your Gmail sent folder

## Step 6: Final Configuration

### Set Permissions

Via Terminal if available:

```bash
chmod 755 storage
chmod 755 bootstrap/cache
chmod 644 .env
chmod 644 .htaccess
```

Or manually via File Manager (right-click files → Properties)

### Verify Installation

1. Visit `https://your-domain.infinityfree.app`
2. You should see the login page
3. Try logging in with test credentials
4. Check for any errors in `storage/logs/laravel.log`

### Test Email Sending

1. Via Terminal, run:
```bash
php artisan tinker
Mail::raw('Test email from InfinityFree!', function ($message) {
    $message->to('your-email@gmail.com')->subject('Test');
});
exit;
```

2. Check your inbox for the test email

## Step 7: Post-Deployment

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

### Database Connection Error

```
PDOException: SQLSTATE[HY000]: General error: 1030
```

**Solution:**
- Verify `DB_HOST=localhost` (NOT 127.0.0.1)
- Verify credentials match InfinityFree panel exactly
- Run: `php artisan config:cache`

### 500 Internal Server Error

1. Check `storage/logs/laravel.log` via File Manager
2. Verify `.htaccess` exists in `public` folder (it should)
3. Verify `composer install` completed successfully
4. Run: `php artisan cache:clear`

### Emails Not Sending

1. Check `MAIL_USERNAME` and `MAIL_PASSWORD` in `.env`
2. Verify Gmail account has 2-Step Verification enabled
3. Verify you're using **App Password**, not regular password
4. Check `storage/logs/laravel.log` for SMTP errors:
   ```bash
   # Look for entries like:
   "Send: MAIL From:<your-email@gmail.com>"
   ```

### Scheduler Not Running

1. Verify EasyCron is configured and active
2. Check scheduler.php exists in `public/` folder
3. Test scheduler manually: `https://your-domain.infinityfree.app/scheduler.php`
4. Check `storage/logs/laravel.log` for scheduler activity

### Assets Not Loading (404 Errors)

1. Verify `npm run build` was run locally
2. Verify `/public/build/` folder exists on server
3. Verify `/public/manifest.json` exists
4. Run: `php artisan config:cache`

### Slow Performance / Timeouts

- InfinityFree has resource limitations
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
- No automatic dependency installation
- Limited or no SSH/Terminal access
- Database performance limited to shared resources
- No automated backups (must backup manually)
- File upload limits on FTP (~100MB per file)
- No GitHub Actions/CI-CD integration
- Limited CPU and memory for background tasks

✅ **Best Practices for InfinityFree:**
- Always build assets locally before uploading
- Keep `.env` file safe - don't commit to public repo
- Use HTTP-based cron (EasyCron) for task scheduling
- Monitor logs regularly for errors
- Test locally before deploying
- Use `.htaccess` properly for clean URLs
- Keep vendor directory excluded from uploads
- Backup database and files monthly

## Maintenance

### Monthly Tasks
1. Backup database via phpMyAdmin
2. Backup important files via File Manager
3. Clear old logs: `php artisan tinker` → `File::delete(glob(storage_path('logs/*')));`

### Updating Code
1. Make changes locally
2. Run `npm run build` if frontend changed
3. Upload only modified files via FTP
4. Run migrations if needed: `php artisan migrate --force`
5. Clear cache: `php artisan config:cache`

## Additional Resources

- **InfinityFree Docs**: https://dash.infinityfree.net/support/
- **Laravel Documentation**: https://laravel.com/docs
- **FileZilla FTP Client**: https://filezilla-project.org/
- **EasyCron Service**: https://www.easycron.com/
- **Gmail App Passwords**: https://myaccount.google.com/apppasswords
- **Laravel Queue Documentation**: https://laravel.com/docs/queues
- **Laravel Scheduler**: https://laravel.com/docs/scheduling
