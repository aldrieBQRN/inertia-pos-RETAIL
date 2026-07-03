<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\SecurityAlertMail;

class SecurityAlertService
{
    /**
     * Send a real-time security alert via configured channel (email and/or webhook).
     */
    public static function sendAlert(string $action, string $description, ?array $details = null): void
    {
        // 1. Check if alerts are enabled
        if (!env('SECURITY_ALERTS_ENABLED', false)) {
            return;
        }

        $channel = env('SECURITY_ALERTS_CHANNEL', 'email');

        // 2. Handle Email alerts
        if ($channel === 'email' || $channel === 'both') {
            $recipient = env('SECURITY_ALERTS_EMAIL_RECIPIENT');
            if (!empty($recipient)) {
                try {
                    // Send queued email (non-blocking)
                    Mail::to($recipient)->send(new SecurityAlertMail($action, $description, $details));
                } catch (\Exception $e) {
                    Log::error("Failed to queue security alert email: " . $e->getMessage());
                }
            } else {
                Log::warning('Security alerts are configured via email, but SECURITY_ALERTS_EMAIL_RECIPIENT is not configured.');
            }
        }

        // 3. Handle Webhook alerts
        if ($channel === 'webhook' || $channel === 'both') {
            $webhookUrl = env('SECURITY_ALERTS_WEBHOOK_URL');
            if (empty($webhookUrl)) {
                Log::warning('Security alerts are configured via webhook, but SECURITY_ALERTS_WEBHOOK_URL is not configured.');
                return;
            }

            try {
                // Resolve alert color based on action type
                $color = self::resolveColor($action);

                // Resolve clean title and emoji
                $titleEmoji = self::resolveEmojiAndTitle($action);

                // Structure payload fields based on transaction/event details
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

                // Build final Slack/Discord payload
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

                // Dispatch HTTP Post asynchronously or with a short timeout to prevent thread blocking
                Http::timeout(3)
                    ->withoutVerifying() // Avoid TLS cert negotiation blocks in local environments
                    ->post($webhookUrl, $payload);

            } catch (\Exception $e) {
                // Fail-safe: Never crash main application thread if logging/webhook network fails
                Log::error("Failed to send real-time security alert webhook: " . $e->getMessage());
            }
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
