# Railway.app Deployment Setup Guide

## Quick Start

1. **Create Railway MySQL Service**
   - Go to your Railway project dashboard
   - Click "Create" → Add MySQL
   - Railway will automatically provision a MySQL database

2. **Configure Environment Variables**
   - After MySQL is created, go to the MySQL service settings
   - Copy these variables: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
   - Add them to your web application's environment variables in Railway

3. **Add Additional Variables**
   - Add the following to your web service environment:
   ```
   APP_NAME=Inertia POS System
   APP_ENV=production
   APP_KEY=base64:M7T0Ylcc4NQ4VD+Yk/HnNxFSE4Bj7SCmUXAyR68Sz30=
   APP_DEBUG=false
   APP_URL=https://your-app-domain.railway.app
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=appmessage.notify@gmail.com
   MAIL_PASSWORD=cloeukcxtctkxcoe
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=inertia.pos.system@gmail.com
   MAIL_FROM_NAME=Inertia POS System
   QUEUE_CONNECTION=database
   CACHE_DRIVER=database
   SESSION_DRIVER=database
   LOG_CHANNEL=single
   LOG_LEVEL=info
   ```

4. **Deploy**
   - Push to GitHub main branch
   - Railway will automatically build and deploy
   - The build script will:
     - Create `.env` from environment variables
     - Install dependencies
     - Build frontend assets
     - Create storage symlink
   - The startup script will:
     - Wait for database to be ready
     - Run migrations automatically
   - Queue worker will start processing jobs

## Troubleshooting

### Database Error: "database.sqlite does not exist"
- **Cause**: Environment variables not set or database not ready
- **Fix**: Verify all `DATABASE_*` variables are set in Railway dashboard

### App starts but no images display
- **Cause**: Storage symlink not created
- **Fix**: This is handled automatically by the build and app startup

### Migrations fail
- **Cause**: Database credentials wrong or MySQL service not running
- **Fix**: Check MySQL service status in Railway dashboard

### Queue worker fails
- **Cause**: Same as database errors
- **Fix**: Ensure database environment variables are set

## Manual Deployment Checks

If you need to manually check the deployment:

1. **SSH into Railway**
   ```bash
   railway shell
   ```

2. **Check .env file**
   ```bash
   cat .env | grep DB_
   ```

3. **Test database connection**
   ```bash
   php artisan migrate:status
   ```

4. **Check storage symlink**
   ```bash
   ls -la public/storage
   ```

5. **Monitor logs**
   ```bash
   railway logs
   ```
