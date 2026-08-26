# 🚀 InfinityFree CI/CD Deployment & Database Maintenance Guide

Comprehensive documentation for continuous deployment (GitHub Actions CI/CD), split-architecture file layout, environment setup, database migrations, and seeding on **InfinityFree Shared Hosting**.

---

## 📋 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [GitHub Repository Secrets Setup](#-github-repository-secrets-setup)
3. [InfinityFree File System Layout](#-infinityfree-file-system-layout)
4. [Environment Configuration (`env.php`)](#-environment-configuration-envphp)
5. [Database Migrations & Seeding via Web Endpoint](#-database-migrations--seeding-via-web-endpoint)
   - [Migration & Seeding URL Examples](#migration--seeding-url-examples)
   - [Command Reference Table](#command-reference-table)
6. [CI/CD Deployment Workflow (`deploy.yml`)](#-cicd-deployment-workflow-deployyml)
7. [Troubleshooting & Gotchas](#-troubleshooting--gotchas)

---

## 🏗 Architecture Overview

Because shared hosting services like **InfinityFree** do not allow SSH command-line access (`php artisan migrate`), we utilize a **Dual-Layer Architecture**:

1. **Split File Deployment**:
   - Private core files (`app/`, `routes/`, `config/`, `storage/`) reside safely inside `/htdocs/inertia-pos-core/`.
   - Public web assets (`index.php`, build bundles `build/assets/`, `.htaccess`) reside directly in `/htdocs/`.
2. **Web-Based Artisan Endpoint (`/artisan-migrate`)**:
   - Allows triggering `migrate`, `db:seed`, `migrate:fresh`, and `optimize:clear` securely via browser HTTPS requests protected by a secret token (`MIGRATION_TOKEN` or `APP_KEY`).

---

## 🔑 GitHub Repository Secrets Setup

To enable automated CI/CD deployment on every `git push` to `main`, configure these repository secrets in GitHub:

1. Navigate to: **GitHub Repo -> Settings -> Secrets and variables -> Actions**.
2. Click **New repository secret** and add:

| Secret Name | Description / Example Value |
| :--- | :--- |
| `FTP_SERVER` | Your InfinityFree FTP Host (e.g., `ftpupload.net`) |
| `FTP_USERNAME` | Your FTP Username (e.g., `if0_38400000`) |
| `FTP_PASSWORD` | Your FTP Password from InfinityFree Client Area |

---

## 📁 InfinityFree File System Layout

```
/htdocs/
├── index.php                         <-- Web entry point (bootstraps core/public/index.php)
├── .htaccess                         <-- Web server rewrite rules
├── storage -> inertia-pos-core/...   <-- Symlink or dynamic asset resolver
├── build/                            <-- Compiled Vite JS & CSS assets
└── inertia-pos-core/                 <-- Private Core Laravel Application
    ├── app/
    ├── config/
    ├── database/
    ├── routes/
    ├── storage/
    ├── env.php                       <-- Your database & app environment config
    └── vendor/
```

---

## ⚙️ Environment Configuration (`env.php`)

On InfinityFree, create or update `inertia-pos-core/env.php` (or `.env`) with your MySQL credentials and custom `MIGRATION_TOKEN`:

```php
<?php

return [
    'APP_NAME' => 'InertiaPos Retail',
    'APP_ENV' => 'production',
    'APP_KEY' => 'base64:YOUR_APP_KEY_HERE=',
    'APP_DEBUG' => false,
    'APP_URL' => 'https://your-domain.infinityfreeapp.com',

    // Security Token for /artisan-migrate
    'MIGRATION_TOKEN' => 'my_super_secret_token_123',

    // InfinityFree Database Credentials
    'DB_CONNECTION' => 'mysql',
    'DB_HOST' => 'sqlXXX.infinityfree.com',
    'DB_PORT' => 3306,
    'DB_DATABASE' => 'if0_XXXXX_pos_db',
    'DB_USERNAME' => 'if0_XXXXX',
    'DB_PASSWORD' => 'YOUR_MYSQL_PASSWORD',

    'SESSION_DRIVER' => 'file',
    'CACHE_DRIVER' => 'file',
];
```

---

## ⚡ Database Migrations & Seeding via Web Endpoint

Since SSH terminal access is disabled on InfinityFree, run migrations and database seeders directly via your web browser or `curl`.

### Migration & Seeding URL Examples

> Replace `https://your-domain.infinityfreeapp.com` with your actual domain and `YOUR_TOKEN` with your `MIGRATION_TOKEN` (or `APP_KEY`).

#### 1. Standard Migration (Keeps existing data):
```http
https://your-domain.infinityfreeapp.com/artisan-migrate?token=YOUR_TOKEN
```

#### 2. Migrate + Seed Default Data:
```http
https://your-domain.infinityfreeapp.com/artisan-migrate?token=YOUR_TOKEN&seed=1
```

#### 3. Fresh Database Wipe + Re-seed Everything (`migrate:fresh --seed`):
```http
https://your-domain.infinityfreeapp.com/artisan-migrate?token=YOUR_TOKEN&fresh=1&seed=1
```

#### 4. Run a Specific Seeder Class (e.g. `DemoSeeder`, `ApiProductSeeder`, or `SystemSettingsSeeder`):
```http
https://your-domain.infinityfreeapp.com/artisan-migrate?token=YOUR_TOKEN&fresh=1&seed=1&class=DemoSeeder
```
*(or seed specific class without wiping existing data)*:
```http
https://your-domain.infinityfreeapp.com/artisan-migrate?token=YOUR_TOKEN&seed=1&class=ApiProductSeeder
```

#### 5. Storage Symlink Resolution (Fix missing images):
```http
https://your-domain.infinityfreeapp.com/artisan-migrate?token=YOUR_TOKEN&storage=1
```

---

### Command Reference Table

| Goal | URL Parameters | Equivalent Artisan Command |
| :--- | :--- | :--- |
| **Run Migrations** | `?token=YOUR_TOKEN` | `php artisan migrate --force` |
| **Migrate + Seed** | `?token=YOUR_TOKEN&seed=1` | `php artisan migrate --force --seed` |
| **Wipe & Fresh Seed** | `?token=YOUR_TOKEN&fresh=1&seed=1` | `php artisan migrate:fresh --force --seed` |
| **Seed Specific Class** | `?token=YOUR_TOKEN&seed=1&class=DemoSeeder` | `php artisan db:seed --class=DemoSeeder --force` |
| **Clear Cache & Config** | Automatic on every call | `php artisan optimize:clear` |

---

## 🔄 CI/CD Deployment Workflow (`.github/workflows/deploy.yml`)

The automated deployment pipeline compiles production Vite assets, installs optimized PHP vendor packages, and deploys via FTP.

```yaml
name: Deploy to InfinityFree (Secure Split Architecture)

on:
  push:
    branches:
      - main
      - master

jobs:
  web-deploy:
    name: Build & Securely Deploy to InfinityFree FTP
    runs-on: ubuntu-latest

    steps:
      - name: 1. Checkout Code
        uses: actions/checkout@v4

      - name: 2. Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          coverage: none

      - name: 3. Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 4. Install Composer Dependencies
        run: composer install --no-dev --optimize-autoloader --no-progress --prefer-dist

      - name: 5. Install NPM Dependencies & Build Vite Assets
        run: |
          npm ci
          npm run build

      - name: 6. Deploy Private Core Files to htdocs/inertia-pos-core/
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          server-dir: htdocs/inertia-pos-core/
          exclude: |
            **/.git*
            **/.git*/**
            **/node_modules/**
            **/vendor/**
            **/public/**
            **/tests/**
            **/*.md
            .env
            env.php

      - name: 7. Deploy Public Assets Only to /htdocs/ (Public Web Root)
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: public/
          server-dir: htdocs/
```

---

---

## 🛡️ Preventing Attacks & DDoS Protection (Cloudflare Setup)

To protect your site from bot attacks, brute-force attempts, scrapers, and DDoS floods (such as adding a **"Checking if you are human" / Turnstile challenge** when users first visit), you should route your domain through **Cloudflare (Free Tier)**.

### 1. How Cloudflare Bot Fight Mode & Turnstile Challenge Works
When Cloudflare is enabled:
- Every incoming visitor passes through Cloudflare’s global edge servers before reaching your InfinityFree hosting.
- Suspicious traffic (bots, scrapers, automated attacks) is blocked or prompted with a **"Verify you are human" / Turnstile checkbox**.
- Genuine users pass seamlessly without slow load times.

---

### 2. Step-by-Step Setup Guide

#### Step 1: Create a Free Cloudflare Account
1. Go to [Cloudflare Signup](https://dash.cloudflare.com/sign-up) and create an account.
2. Click **Add a Site** and enter your domain name (e.g., `yourdomain.com`).
3. Select the **Free Plan** ($0/month).

#### Step 2: Update DNS Nameservers
1. Cloudflare will provide 2 Custom Nameservers (e.g., `ns1.cloudflare.com` & `ns2.cloudflare.com`).
2. Log in to your domain registrar (Namecheap, GoDaddy, Cloudflare Registrar, etc.).
3. Replace your existing nameservers with the Cloudflare nameservers.
4. Wait 5–15 minutes for DNS propagation.

#### Step 3: Enable Security & Bot Challenge Settings
In your Cloudflare Dashboard:
1. **Under Security → WAF (Web Application Firewall)**:
   - Go to **Bots** tab $\rightarrow$ Enable **Bot Fight Mode**.
2. **Under Security → Settings**:
   - Set **Security Level** to **Medium** or **High**.
   - Enable **Challenge Passage** to **`7 Days`** or **`1 Year`** (so cashiers verify once at shift start and never get prompted again during daily operations).
3. **Under Security → WAF → Custom Rules (Cashier Zero-Interruption Rule)**:
   - Create a rule: `URI Path starts with /pos` $\rightarrow$ Action: **Bypass WAF / Security Level**.
   - *Result*: POS terminal cashiers scanning items will **NEVER** face a bot challenge or checkout delay.
4. **Under SSL/TLS → Overview**:
   - Set SSL/TLS encryption mode to **Full** or **Full (Strict)** to ensure end-to-end HTTPS encryption.

---

### 3. Benefits for Shared Hosting (InfinityFree)
- 🔒 **DDoS Protection**: Absorbs malicious traffic spikes at Cloudflare's edge so your InfinityFree account never hits bandwidth / resource limits.
- 🤖 **Automated Bot Blocking**: Stops malicious login brute-force attempts on `/login` and `/artisan-migrate`.
- ⚡ **Global CDN Caching**: Accelerates CSS/JS asset delivery, making page transitions even faster worldwide.

---

*Documentation maintained for InertiaPOS Retail Platform.*
