<?php

/**
 * Audit & Activity Logging Configuration
 *
 * Define which operations are logged for security and compliance purposes.
 * CRITICAL operations are always logged synchronously.
 * OPTIONAL operations are queued or skipped based on settings.
 */

return [
    /*
    |--------------------------------------------------------------------------
    | Enable Queued Logging
    |--------------------------------------------------------------------------
    |
    | When true, activity logs are processed in background jobs (non-blocking).
    | When false, logs are written synchronously (slightly slower but guaranteed).
    |
    | Queue driver must be configured in config/queue.php
    | Recommended: 'database' or 'redis' queue driver
    |
    */
    'queue_enabled' => env('AUDIT_QUEUE_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Queue Name for Activity Logs
    |--------------------------------------------------------------------------
    |
    | Background job queue for activity logging.
    | Use a separate queue to avoid blocking main application jobs.
    |
    */
    'queue_name' => env('AUDIT_QUEUE_NAME', 'logs'),

    /*
    |--------------------------------------------------------------------------
    | Critical Operations (Always Logged - Synchronously)
    |--------------------------------------------------------------------------
    |
    | These operations are always logged immediately, even if queue is down.
    | Used for security-sensitive actions that must have guaranteed audit trail.
    |
    */
    'critical_operations' => [
        // User Management
        'user.create',
        'user.delete',
        'user.update',
        'user.update.role',
        'user.update.email',
        'user.password_change',

        // Payment Operations
        'payment.approve',
        'payment.reject',
        'payment.refund',

        // Store Management
        'store.suspend',
        'store.reactivate',
        'store.reminder',
        'store.settings.update',

        // Tenant/Plan/Announcement Management
        'tenant.invite',
        'plan.create',
        'announcement.create',
        'announcement.clear',

        // System & Security Management
        'system.update',
        'system.policies.update',
        'system.payment_methods.create',
        'system.payment_methods.update',
        'system.payment_methods.delete',

        // Reporting
        'report.export.pending_payments',

        // Category Management
        'category.create',
        'category.update',
        'category.delete',

        // Security Events
        'security.login_failed',
        'security.login_success',
        'security.logout',
        'security.password_reset',
        'security.otp_generated',
    ],

    /*
    |--------------------------------------------------------------------------
    | Optional Operations (Can Be Queued or Disabled)
    |--------------------------------------------------------------------------
    |
    | These operations are logged asynchronously when queue_enabled is true.
    | You can disable specific operations here to reduce log noise.
    |
    */
    'optional_operations' => [
        // Product Management
        'product.create' => true,
        'product.update' => true,
        'product.delete' => true,
        'product.stock_adjust' => true,

        // Sales (high volume - consider disabling)
        'sale.create' => true,
        'sale.update' => false,  // Too frequent, disable if needed
        'sale.void' => true,

        // Views (informational, low priority)
        'view.product' => false,  // Disabled - creates too much log volume
        'view.sale' => false,     // Disabled - creates too much log volume
    ],

    /*
    |--------------------------------------------------------------------------
    | Log Retention Days
    |--------------------------------------------------------------------------
    |
    | Activity logs older than this many days will be archived to a separate table.
    | Keeps the main activity_logs table fast for audits.
    |
    */
    'retention_days' => env('AUDIT_RETENTION_DAYS', 90),

    /*
    |--------------------------------------------------------------------------
    | Log Categories
    |--------------------------------------------------------------------------
    |
    | Categories are computed from action/model_type and used for filtering
    | and dashboard grouping in the activity log viewer.
    |
    */
    'categories' => [
        'Security',
        'User Management',
        'Store Settings',
        'Product Management',
        'Category Management',
        'Sales',
        'Payments',
        'System',
    ],

    /*
    |--------------------------------------------------------------------------
    | Sensitive Data to Exclude from Logs
    |--------------------------------------------------------------------------
    |
    | Fields containing sensitive data that should be masked in activity logs.
    | Examples: passwords, API keys, payment card numbers
    |
    */
    'exclude_fields' => [
        'password',
        'password_confirmation',
        'card_number',
        'cvv',
        'api_key',
        'secret',
        'token',
    ],

    /*
    |--------------------------------------------------------------------------
    | Include Request Details
    |--------------------------------------------------------------------------
    |
    | Log IP address and user agent for security tracking.
    | Useful for detecting unauthorized access patterns.
    |
    */
    'log_request_details' => env('AUDIT_LOG_REQUEST_DETAILS', true),
];
