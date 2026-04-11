═══════════════════════════════════════════════════════════════
   INERTIA POS - INFINITYFREE DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════════════

Domain: https://inertia-pos.page.gd/
Target Folder: htdocs/
Last Updated: April 11, 2026

═══════════════════════════════════════════════════════════════
PRE-DEPLOYMENT VERIFICATION ✓
═══════════════════════════════════════════════════════════════

Local Environment:
  ✓ .env file updated with production settings
  ✓ APP_ENV=production
  ✓ APP_DEBUG=false
  ✓ APP_KEY set
  ✓ Database credentials configured for InfinityFree
  ✓ Mail settings configured (Gmail SMTP)
  ✓ vendor/ folder exists (34 dependencies)
  ✓ public/build/ folder exists with build files
  ✓ public/scheduler.php created for cron jobs
  ✓ public/setup.php created for post-upload setup

Configuration Files:
  ✓ .env - Production configuration
  ✓ .htaccess - URL rewriting configured
  ✓ composer.json - Dependencies locked
  ✓ package.json - Frontend dependencies locked

═══════════════════════════════════════════════════════════════
FTP UPLOAD PREPARATION
═══════════════════════════════════════════════════════════════

FTP Credentials (InfinityFree):
  Host: ftp.infinityfree.com
  Username: Your InfinityFree username
  Password: Your InfinityFree password
  Port: 21

Database Credentials (InfinityFree):
  Host: sql101.infinityfree.com
  Database: if0_41626897_interiapos_system
  Username: if0_41626897
  Password: Inertia15

═══════════════════════════════════════════════════════════════
UPLOAD PLAN (Using FileZilla)
═══════════════════════════════════════════════════════════════

Step 1: PREPARE
  ☐ Download FileZilla from https://filezilla-project.org/
  ☐ Install FileZilla

Step 2: CONNECT
  ☐ Open FileZilla
  ☐ File → Site Manager → New Site
  ☐ Enter FTP credentials
  ☐ Click Connect
  ☐ Navigate to htdocs folder on remote (RIGHT side)

Step 3: DELETE OLD FILES (if re-uploading)
  ☐ On remote right panel, select ALL files EXCEPT vendor/
  ☐ Right-click → Delete
  ☐ Leave vendor/ folder intact

Step 4: UPLOAD ALL FILES
  ☐ On left panel, navigate to c:\laragon\www\inertia-pos
  ☐ Select ALL files and folders
  ☐ EXCLUDE these (deselect):
      • node_modules/
      • .git/
      • .env (we'll setup separately)
      • .gitignore
      • .github/
      • tests/
  ☐ Right-click → Upload
  ☐ Wait for completion (15-30 minutes with vendor included)

═══════════════════════════════════════════════════════════════
FOLDERS TO UPLOAD (in priority order)
═══════════════════════════════════════════════════════════════

Priority 1 - SMALL (fastest):
  ☐ bootstrap/
  ☐ config/
  ☐ app/
  ☐ routes/
  ☐ database/
  ☐ resources/

Priority 2 - MEDIUM:
  ☐ public/        (includes index.php, .htaccess, build/, setup.php, scheduler.php)

Priority 3 - LARGE:
  ☐ vendor/
  ☐ storage/

═══════════════════════════════════════════════════════════════
FILES TO UPLOAD (Root Level)
═══════════════════════════════════════════════════════════════

Essential Files:
  ☐ artisan
  ☐ composer.json
  ☐ composer.lock
  ☐ phpunit.xml
  ☐ vite.config.js
  ☐ tailwind.config.js
  ☐ postcss.config.js
  ☐ jsconfig.json
  ☐ package.json
  ☐ package-lock.json

═══════════════════════════════════════════════════════════════
POST-UPLOAD SETUP
═══════════════════════════════════════════════════════════════

After all files are uploaded:

Step 1: UPLOAD .env file
  ☐ Create/Upload .env file with production settings (see .env in project root)
  ☐ Upload to htdocs/ root directory

Step 2: RUN SETUP SCRIPT
  ☐ Visit: https://inertia-pos.page.gd/setup.php
  ☐ Wait for green "✅ Setup Complete!" message
  ☐ This will:
      • Clear all caches
      • Cache config and routes
      • Run database migrations
      • Verify file permissions

Step 3: DELETE SETUP.PHP (IMPORTANT!)
  ☐ Via FTP, connect and delete setup.php
  ☐ This is a SECURITY requirement
  ☐ Run one more time if you need to debug

Step 4: VERIFY INSTALLATION
  ☐ Visit: https://inertia-pos.page.gd/
  ☐ Should see POS login page
  ☐ Login with your credentials

═══════════════════════════════════════════════════════════════
TROUBLESHOOTING
═══════════════════════════════════════════════════════════════

If setup.php shows errors:

1. Check Database Connection
   ☐ Verify DB credentials in .env match InfinityFree panel
   ☐ Run setup.php again to see full error

2. Check File Permissions
   ☐ storage/ must be writable
   ☐ bootstrap/cache/ must be writable
   ☐ InfinityFree usually handles this automatically

3. Check Logs
   ☐ Via FTP, download: storage/logs/laravel.log
   ☐ Look for error messages

4. Enable Debug Mode (Temporarily)
   ☐ Edit .env: change APP_DEBUG=false to APP_DEBUG=true
   ☐ Re-run setup.php to see detailed errors
   ☐ Change back to APP_DEBUG=false after fixing

═══════════════════════════════════════════════════════════════
AUTOMATIC EMAIL SCHEDULING (OPTIONAL BUT RECOMMENDED)
═══════════════════════════════════════════════════════════════

POS system sends these emails automatically:
  • Subscription reminders (5 days before expiry)
  • Subscription due warnings (on expiry date)
  • Payment notifications

To enable:

Step 1: Setup EasyCron (free service)
  ☐ Go to https://www.easycron.com/
  ☐ Sign up (free)
  ☐ Click "Create Cron Job"

Step 2: Configure Cron Job
  ☐ URL: https://inertia-pos.page.gd/scheduler.php
  ☐ Cron Expression: * * * * * (every minute)
  ☐ Timezone: UTC

Step 3: Verify It Works
  ☐ Wait 5 minutes
  ☐ Check storage/logs/laravel.log
  ☐ Look for "Subscription reminder email" entries

═══════════════════════════════════════════════════════════════
FINAL VERIFICATION CHECKLIST
═══════════════════════════════════════════════════════════════

After deployment:

General:
  ✓ Application loads at https://inertia-pos.page.gd/
  ✓ Login page appears
  ✓ Can log in with credentials
  ✓ Dashboard loads correctly

Database:
  ✓ Products can be saved and retrieved
  ✓ Sales transactions are recorded
  ✓ User sessions work correctly

Email:
  ✓ Password reset emails send
  ✓ Subscription reminders send (check logs)
  ✓ System announcements send

Files & Storage:
  ✓ Receipt images upload correctly
  ✓ Product images display properly
  ✓ File downloads work

Performance:
  ✓ POS terminal responds quickly
  ✓ Barcode scanning works smoothly
  ✓ No timeout errors

═══════════════════════════════════════════════════════════════
USEFUL LINKS
═══════════════════════════════════════════════════════════════

InfinityFree:
  https://www.infinityfree.net/

Control Panel:
  https://www.infinityfree.net/client-area/

FileZilla Download:
  https://filezilla-project.org/

EasyCron (for scheduling):
  https://www.easycron.com/

═══════════════════════════════════════════════════════════════
NOTES
═══════════════════════════════════════════════════════════════

• Build assets are already compiled in public/build/
• vendor/ folder is included (34 dependencies)
• .htaccess is configured for URL rewriting
• scheduler.php triggers cron jobs via HTTP
• Queue driver set to database for background processing
• Cache driver set to file for InfinityFree compatibility

═══════════════════════════════════════════════════════════════
