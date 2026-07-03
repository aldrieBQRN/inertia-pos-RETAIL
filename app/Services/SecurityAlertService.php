<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SecurityAlertService
{
    /**
     * Send a real-time security alert to Slack or Discord webhook.
     */
    public static function sendAlert(string $action, string $description, ?array $details = null): void
    {
        // 1. Check if alerts are enabled
        if (!env('SECURITY_ALERTS_ENABLED', false)) {
            return;
        }

        // 2. Fetch and validate webhook URL
        $webhookUrl = env('SECURITY_ALERTS_WEBHOOK_URL');
        if (empty($webhookUrl)) {
            Log::warning('Security alerts are enabled, but SECURITY_ALERTS_WEBHOOK_URL is not configured.');
            return;
        }

        try {
            // 3. Resolve alert color based on action type
            $color = self::resolveColor($action);

            // 4. Resolve clean title and emoji
            $titleEmoji = self::resolveEmojiAndTitle($action);

            // 5. Structure payload fields based on transaction/event details
            $fields = [];
            $fields[] = [
                'title' => 'Event Action',
                'value' => "`{$action}`",
                'short' => true,
            ];

            if (!empty($details)) {
                if (isset($details['ip_address'])) {
                    $fields[] = [
                        'title' => 'IP Address',
                        'value' => "`{$details['ip_address']}`",
                        'short' => true,
                    ];
                }

                if (isset($details['email'])) {
                    $fields[] = [
                        'title' => 'Target Account',
                        'value' => $details['email'],
                        'short' => true,
                    ];
                }

                if (isset($details['probed_path'])) {
                    $fields[] = [
                        'title' => 'Probed Path',
                        'value' => "`/{$details['probed_path']}`",
                        'short' => false,
                    ];
                }

                if (isset($details['role'])) {
                    $fields[] = [
                        'title' => 'Role Context',
                        'value' => $details['role'],
                        'short' => true,
                    ];
                }
            }

            // 6. Build final Slack/Discord payload
            $payload = [
                'attachments' => [
                    [
                        'fallback' => "[Security Alert] {$description}",
                        'color' => $color,
                        'pretext' => "{$titleEmoji} *Security Event Alert*",
                        'title' => $description,
                        'fields' => $fields,
                        'footer' => env('APP_NAME', 'Inertia POS'),
                        'ts' => time(),
                    ]
                ]
            ];

            // 7. Dispatch HTTP Post asynchronously or with a short timeout to prevent thread blocking
            Http::timeout(3)
                ->withoutVerifying() // Avoid TLS cert negotiation blocks in local environments
                ->post($webhookUrl, $payload);

        } catch (\Exception $e) {
            // Fail-safe: Never crash main application thread if logging/webhook network fails
            Log::error("Failed to send real-time security alert: " . $e->getMessage());
        }
    }

    /**
     * Resolve color based on severe levels.
     */
    protected static function resolveColor(string $action): string
    {
        // Red for severe attacks
        if (in_array($action, ['ip_blocked', 'login_failed'])) {
            return '#EF4444';
        }

        // Orange for sensitive administrative mutations
        if (in_array($action, ['user.update.role', 'store.suspend', 'payment.reject', 'password_reset'])) {
            return '#F97316';
        }

        // Blue/Green for standard alerts
        return '#3B82F6';
    }

    /**
     * Resolve header emoji based on event.
     */
    protected static function resolveEmojiAndTitle(string $action): string
    {
        if (in_array($action, ['ip_blocked'])) {
            return '🛡️';
        }
        if (in_array($action, ['login_failed'])) {
            return '🔒';
        }
        if (in_array($action, ['user.update.role'])) {
            return '⚠️';
        }
        return '🔔';
    }
}
