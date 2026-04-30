<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Store;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Jobs\LogActivityJob;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Config;

class ActivityService
{
    /**
     * Resolve a fallback store id when actor has no direct store context
     * (e.g., super admin global actions).
     */
    private static function resolveFallbackStoreId(
        ?string $modelType,
        ?int $modelId,
        ?array $oldValues,
        ?array $newValues
    ): ?int {
        // Preferred explicit value from payload.
        $explicitStoreId = $newValues['store_id'] ?? $oldValues['store_id'] ?? null;
        if ($explicitStoreId) {
            return (int) $explicitStoreId;
        }

        $type = strtolower((string) $modelType);

        // For Store model logs, model id is the store id.
        if ($type === 'store' && $modelId) {
            return (int) $modelId;
        }

        // For User logs, derive from the affected user.
        if ($type === 'user' && $modelId) {
            $resolved = User::query()->whereKey($modelId)->value('store_id');
            if ($resolved) {
                return (int) $resolved;
            }
        }

        // For payment logs, derive from the payment record.
        if (($type === 'payment' || $type === 'subscriptionpayment') && $modelId) {
            $resolved = SubscriptionPayment::query()->whereKey($modelId)->value('store_id');
            if ($resolved) {
                return (int) $resolved;
            }
        }

        // Global/system actions have no natural tenant context.
        // Fallback to first store so logs are not dropped by non-null constraint.
        $firstStoreId = Store::query()->orderBy('id')->value('id');

        return $firstStoreId ? (int) $firstStoreId : null;
    }

    /**
     * Check if an operation should be logged.
     */
    private static function shouldLog(string $operationKey): bool
    {
        // Critical operations always logged
        if (in_array($operationKey, Config::get('audit.critical_operations', []))) {
            return true;
        }

        // Check if optional operation is enabled
        $optionalOps = Config::get('audit.optional_operations', []);
        return $optionalOps[$operationKey] ?? false;
    }

    /**
     * Check if operation is critical (should be logged synchronously).
     */
    private static function isCritical(string $operationKey): bool
    {
        return in_array($operationKey, Config::get('audit.critical_operations', []));
    }

    /**
     * Filter sensitive data from values.
     */
    private static function filterSensitiveData(array $data): array
    {
        $excludeFields = Config::get('audit.exclude_fields', []);

        return array_filter($data, function ($value, $key) use ($excludeFields) {
            return !in_array(strtolower($key), array_map('strtolower', $excludeFields));
        }, ARRAY_FILTER_USE_BOTH);
    }

    /**
     * Create activity log data structure.
     */
    private static function createLogData(
        string $action,
        string $modelType,
        ?int $modelId = null,
        ?string $description = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): array {
        // Allow explicit actor context for unauthenticated security events
        $actorUserId = null;
        $actorStoreId = null;

        if (is_array($newValues)) {
            if (isset($newValues['_actor_user_id'])) {
                $actorUserId = (int) $newValues['_actor_user_id'];
                unset($newValues['_actor_user_id']);
            }

            if (isset($newValues['_actor_store_id'])) {
                $actorStoreId = (int) $newValues['_actor_store_id'];
                unset($newValues['_actor_store_id']);
            }
        }

        if (Auth::check()) {
            $user = Auth::user();
            $actorUserId = $user->id;
            $actorStoreId = $user->store_id ?? null;
        }

        if (!$actorStoreId) {
            $actorStoreId = self::resolveFallbackStoreId($modelType, $modelId, $oldValues, $newValues);
        }

        // Activity log schema requires both user_id and store_id
        if (!$actorUserId || !$actorStoreId) {
            return [];
        }

        return [
            'user_id' => $actorUserId,
            'store_id' => $actorStoreId,
            'action' => $action,
            'model_type' => $modelType,
            'model_id' => $modelId,
            'description' => $description,
            'old_values' => $oldValues ? self::filterSensitiveData($oldValues) : null,
            'new_values' => $newValues ? self::filterSensitiveData($newValues) : null,
            'ip_address' => Config::get('audit.log_request_details', true) ? Request::ip() : null,
            'user_agent' => Config::get('audit.log_request_details', true) ? Request::userAgent() : null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * Write activity log (queued or synchronous based on config).
     */
    private static function writeLog(string $operationKey, array $logData): ?ActivityLog
    {
        if (!self::shouldLog($operationKey)) {
            return null;
        }

        // Critical operations: write synchronously (guaranteed)
        if (self::isCritical($operationKey)) {
            return ActivityLog::create($logData);
        }

        // Optional operations: queue if enabled, otherwise skip
        if (Config::get('audit.queue_enabled', true)) {
            LogActivityJob::dispatch($logData);
            return null; // Job will handle DB write asynchronously
        }

        // Queue disabled: write synchronously
        return ActivityLog::create($logData);
    }

    /**
     * Log an activity with operation key.
     */
    public static function log(
        string $operationKey,
        string $action,
        string $modelType,
        ?int $modelId = null,
        ?string $description = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): ?ActivityLog {
        $logData = self::createLogData($action, $modelType, $modelId, $description, $oldValues, $newValues);

        if (empty($logData)) {
            return null;
        }

        return self::writeLog($operationKey, $logData);
    }

    /**
     * Log a create action (optional by default).
     */
    public static function logCreate(string $modelType, int $modelId, ?string $description = null, ?array $values = null)
    {
        $operationKey = strtolower($modelType) . '.create';
        return self::log($operationKey, 'create', $modelType, $modelId, $description, null, $values);
    }

    /**
     * Log an update action (optional by default).
     */
    public static function logUpdate(string $modelType, int $modelId, ?string $description = null, ?array $oldValues = null, ?array $newValues = null)
    {
        $operationKey = strtolower($modelType) . '.update';
        return self::log($operationKey, 'update', $modelType, $modelId, $description, $oldValues, $newValues);
    }

    /**
     * Log a delete action (critical).
     */
    public static function logDelete(string $modelType, int $modelId, ?string $description = null, ?array $values = null)
    {
        $operationKey = strtolower($modelType) . '.delete';
        return self::log($operationKey, 'delete', $modelType, $modelId, $description, null, $values);
    }

    /**
     * Log a view/access action (optional).
     */
    public static function logView(string $modelType, int $modelId, ?string $description = null)
    {
        $operationKey = 'view.' . strtolower($modelType);
        return self::log($operationKey, 'view', $modelType, $modelId, $description);
    }

    /**
     * Log a stock adjustment (optional).
     */
    public static function logStockAdjust(int $productId, int $quantityChanged, ?string $description = null)
    {
        $operationKey = 'product.stock_adjust';
        return self::log($operationKey, 'stock_adjust', 'Product', $productId, $description, null, ['quantity_change' => $quantityChanged]);
    }

    /**
     * Log a custom action (use operation key from config).
     */
    public static function logAction(string $operationKey, string $modelType, ?int $modelId = null, ?string $description = null)
    {
        return self::log($operationKey, 'action', $modelType, $modelId, $description);
    }

    /**
     * Log a security action (always critical).
     */
    public static function logSecurityAction(string $action, ?string $description = null, ?array $details = null)
    {
        $operationKey = 'security.' . $action;
        return self::log($operationKey, $action, 'security', null, $description, null, $details);
    }

    /**
     * Log a payment action (critical).
     */
    public static function logPayment(string $action, int $saleId, ?string $description = null, ?array $details = null)
    {
        $operationKey = 'payment.' . $action;
        return self::log($operationKey, $action, 'payment', $saleId, $description, null, $details);
    }

    /**
     * Log a role change (critical).
     */
    public static function logRoleChange(int $userId, string $oldRole, string $newRole, ?string $description = null)
    {
        return self::log('user.update.role', 'update', 'User', $userId, $description ?? "Role changed from {$oldRole} to {$newRole}", ['role' => $oldRole], ['role' => $newRole]);
    }

    /**
     * Log a password change (critical).
     */
    public static function logPasswordChange(int $userId, ?string $description = null)
    {
        return self::logSecurityAction('password_reset', $description ?? "User {$userId} changed password");
    }

    /**
     * Log an email change (critical).
     */
    public static function logEmailChange(int $userId, string $oldEmail, string $newEmail, ?string $description = null)
    {
        return self::log('user.update.email', 'update', 'User', $userId, $description ?? "Email changed from {$oldEmail} to {$newEmail}", ['email' => $oldEmail], ['email' => $newEmail]);
    }
}
