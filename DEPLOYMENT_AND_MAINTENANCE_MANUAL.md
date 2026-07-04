# 🛠️ CI/CD Deployment & Maintenance Manual (Hostinger)

This guide documents how to manage code deployments, database updates, and general application maintenance for the **Inertia POS System** on Hostinger without SSH access.

---

## 📋 Table of Contents
1. [Pipeline Overview](#-pipeline-overview)
2. [Pushes & Deployments (Standard Flow)](#-pushes--deployments-standard-flow)
3. [Database Maintenance & Seeding](#-database-maintenance--seeding)
4. [Application Maintenance (Using Web Triggers)](#-application-maintenance-using-web-triggers)
5. [Troubleshooting & Logs](#-troubleshooting--logs)

---

## 🔄 Pipeline Overview

Our deployment pipeline is completely automated via **GitHub Actions** and a server-side **PHP Deployment Script** (`deploy-helper.php`). 

```text
Local Commit (Alwin Branch) 
     │
     ▼
Git Push to GitHub
     │
     ▼
GitHub Actions (Compiles CSS/JS, Installs Composer packages, Zips app)
     │
     ▼
FTP Upload to Hostinger (/WEB-inertia-pos/temp/release.zip)
     │
     ▼
Secure Webhook Call to deploy-helper.php (Unzips files, overwrites code, copies public assets, runs migrations)
```

---

## 🚀 Pushes & Deployments (Standard Flow)

Every time you want to deploy code updates, frontend style changes, or database schema additions:

1. **Verify your local branch**:
   Make sure you are on the `Alwin` branch:
   ```bash
   git checkout Alwin
   ```
2. **Stage and commit your changes**:
   ```bash
   git add .
   git commit -m "feat: Describe your changes here"
   ```
3. **Push to GitHub**:
   ```bash
   git push origin Alwin
   ```
4. **Monitor the deployment**:
   Go to your GitHub Repository -> **Actions** tab. You will see a green running circle. In ~1 minute it will turn into a **green checkmark**, meaning your updates are live on production!

---

## 🗄️ Database Maintenance & Seeding

Since you do not have command-line terminal access (SSH) to run `php artisan` commands on the server, you can trigger database actions directly from your web browser using a secure **DEPLOY_TOKEN**.

Your token is: `InertiaDigitalSolutions2026`

### 1. Run Database Migrations
Migrations run **automatically** on every Git push. However, if you ever need to trigger migrations manually without pushing code:
👉 `https://violet-raven-871650.hostingersite.com/deploy-helper.php?token=InertiaDigitalSolutions2026`

### 2. Seeding the Database
To run a specific database seeder (for example, to wipe and re-seed clean POS data using `CleanDatabaseSeeder`):
👉 `https://violet-raven-871650.hostingersite.com/deploy-helper.php?token=InertiaDigitalSolutions2026&seed=CleanDatabaseSeeder`

*(Warning: CleanDatabaseSeeder will delete existing sales, products, and user accounts before recreating them!)*

---

## ⚙️ Application Maintenance (Using Web Triggers)

We have configured `deploy-helper.php` to accept a `command` query parameter. This allows you to execute critical Laravel Artisan commands by simply visiting a URL in your browser.

### 1. Put the Site in Maintenance Mode (Show "Under Construction" page)
If you are doing major updates and want to temporarily prevent users from accessing the POS terminal:
👉 `https://violet-raven-871650.hostingersite.com/deploy-helper.php?token=InertiaDigitalSolutions2026&command=down`

*Users visiting your site will see a clean "503 Service Unavailable" maintenance page.*

### 2. Bring the Site Back Online
To end maintenance mode and bring the POS system back live:
👉 `https://violet-raven-871650.hostingersite.com/deploy-helper.php?token=InertiaDigitalSolutions2026&command=up`

### 3. Clear Application Caches
If you changed settings or configurations and they are not displaying on production, clear all cached assets:
👉 `https://violet-raven-871650.hostingersite.com/deploy-helper.php?token=InertiaDigitalSolutions2026&command=optimize:clear`

---

## 🔍 Troubleshooting & Logs

### How to Check System Error Logs
If the website displays a `500 Internal Server Error` or page rendering fails:
1. Log in to your **Hostinger File Manager**.
2. Navigate to: `WEB-inertia-pos/storage/logs/`
3. Open the **`laravel.log`** file.
4. Scroll to the very bottom to view the latest error details.

### How to Fix "Vite Manifest Not Found" Errors
If the page displays a 500 error complaining about `manifest.json` missing:
* Make sure `AppServiceProvider.php` has the custom public path configuration inside the `register()` method:
  ```php
  if (file_exists(base_path('../public_html'))) {
      $this->app->usePublicPath(realpath(base_path('../public_html')));
  }
  ```
* This tells Laravel to look for CSS and JS assets inside `public_html/build` instead of `WEB-inertia-pos/public/build`.
