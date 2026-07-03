<?php

namespace App\Mail;

use App\Models\SystemSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Schema;

class SecurityAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $action;
    public $description;
    public $details;

    /**
     * Create a new message instance.
     */
    public function __construct(string $action, string $description, ?array $details = null)
    {
        $this->action = $action;
        $this->description = $description;
        $this->details = $details;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $appName = 'System';
        if (Schema::hasTable('system_settings')) {
            $appName = SystemSetting::where('key', 'app_name')->value('value') ?: 'System';
        }

        return new Envelope(
            subject: "🚨 SECURITY ALERT: [{$this->action}] - [{$appName}]",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $settings = [];
        if (Schema::hasTable('system_settings')) {
            $settings = SystemSetting::pluck('value', 'key')->toArray();
        }

        $appName = $settings['app_name'] ?? config('app.name', 'Inertia POS');
        $supportEmail = $settings['support_email'] ?? 'admin@' . request()->getHost();
        $currentYear = date('Y');

        // Logo
        $logoHtml = '';
        if (!empty($settings['logo_path'])) {
            $logoUrl = url('storage/' . $settings['logo_path']);
            $logoHtml = "<img src='{$logoUrl}' alt='{$appName} Logo' style='height: 48px; width: 48px; border-radius: 50%; border: 1px solid #e5e7eb; margin-bottom: 12px; object-fit: cover;' />";
        }

        // Color theme based on severe level
        $themeColor = '#3b82f6'; // Blue
        if (in_array($this->action, ['ip_blocked', 'login_failed'])) {
            $themeColor = '#ef4444'; // Red
        } elseif (in_array($this->action, ['user.update.role', 'store.suspend', 'payment.reject', 'password_reset'])) {
            $themeColor = '#f97316'; // Orange
        }

        // Build list of details
        $detailsHtml = '';
        $detailsHtml .= "
            <tr style='border-bottom: 1px solid #f3f4f6;'>
                <td style='padding: 10px 0; color: #4b5563; font-size: 13px; font-weight: 700; width: 140px;'>Action Context</td>
                <td style='padding: 10px 0; color: #1f2937; font-size: 13px; font-family: monospace;'>{$this->action}</td>
            </tr>
        ";

        if (!empty($this->details)) {
            if (isset($this->details['ip_address'])) {
                $detailsHtml .= "
                    <tr style='border-bottom: 1px solid #f3f4f6;'>
                        <td style='padding: 10px 0; color: #4b5563; font-size: 13px; font-weight: 700;'>IP Address</td>
                        <td style='padding: 10px 0; color: #1f2937; font-size: 13px; font-family: monospace;'>{$this->details['ip_address']}</td>
                    </tr>
                ";
            }
            if (isset($this->details['email'])) {
                $detailsHtml .= "
                    <tr style='border-bottom: 1px solid #f3f4f6;'>
                        <td style='padding: 10px 0; color: #4b5563; font-size: 13px; font-weight: 700;'>Target Account</td>
                        <td style='padding: 10px 0; color: #1f2937; font-size: 13px;'>{$this->details['email']}</td>
                    </tr>
                ";
            }
            if (isset($this->details['probed_path'])) {
                $detailsHtml .= "
                    <tr style='border-bottom: 1px solid #f3f4f6;'>
                        <td style='padding: 10px 0; color: #4b5563; font-size: 13px; font-weight: 700;'>Probed URL</td>
                        <td style='padding: 10px 0; color: #1f2937; font-size: 13px; font-family: monospace;'>/{$this->details['probed_path']}</td>
                    </tr>
                ";
            }
            if (isset($this->details['role'])) {
                $detailsHtml .= "
                    <tr style='border-bottom: 1px solid #f3f4f6;'>
                        <td style='padding: 10px 0; color: #4b5563; font-size: 13px; font-weight: 700;'>Role Context</td>
                        <td style='padding: 10px 0; color: #1f2937; font-size: 13px;'>{$this->details['role']}</td>
                    </tr>
                ";
            }
        }

        $detailsHtml .= "
            <tr>
                <td style='padding: 10px 0; color: #4b5563; font-size: 13px; font-weight: 700;'>Occurred At</td>
                <td style='padding: 10px 0; color: #1f2937; font-size: 13px;'>" . now()->toDateTimeString() . "</td>
            </tr>
        ";

        $html = "
            <div style='background-color: #f3f4f6; padding: 40px 20px; font-family: \"Inter\", \"Helvetica Neue\", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;'>
                <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;'>
                    
                    <div style='text-align: center; padding: 30px 20px; border-bottom: 1px solid #f3f4f6;'>
                        {$logoHtml}
                        <h1 style='color: #111827; font-size: 16px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 1px;'>{$appName} Security Control</h1>
                    </div>

                    <div style='padding: 40px 30px;'>
                        <div style='text-align: center; margin-bottom: 30px;'>
                            <div style='display: inline-block; background-color: #fef2f2; color: {$themeColor}; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #fee2e2; margin-bottom: 16px;'>
                                Security Event Detected
                            </div>
                            <h2 style='color: #111827; font-size: 22px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -0.5px;'>{$this->description}</h2>
                        </div>

                        <div style='background-color: #fafafa; border: 1px solid #f0f0f0; border-radius: 16px; padding: 25px; margin-bottom: 30px;'>
                            <h3 style='margin: 0 0 15px 0; color: #111827; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;'>Incident Details</h3>
                            <table style='width: 100%; border-collapse: collapse;'>
                                <tbody>
                                    {$detailsHtml}
                                </tbody>
                            </table>
                        </div>

                        <p style='color: #6b7280; font-size: 13px; text-align: center; line-height: 1.5; margin: 0;'>
                            This is an automated system notification. If this event warrants intervention (e.g. user investigation or whitelisting), please log into your platform developer administrator panel.
                        </p>
                    </div>

                    <div style='background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;'>
                        <p style='color: #9ca3af; font-size: 11px; margin: 0 0 5px 0;'>&copy; {$currentYear} {$appName}. All rights reserved.</p>
                    </div>
                </div>
            </div>
        ";

        return new Content(
            htmlString: $html,
        );
    }
}
