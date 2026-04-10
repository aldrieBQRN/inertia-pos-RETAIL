<?php

namespace App\Mail;

use App\Models\Store;
use App\Models\SystemSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Schema;

class SubscriptionDueMail extends Mailable
{
    use Queueable, SerializesModels;

    public $store;
    public $paymentUrl;

    public function __construct(Store $store)
    {
        $this->store = $store;

        // Direct the user to the secure authenticated billing portal
        $this->paymentUrl = route('tenant.billing.portal');
    }

    public function envelope(): Envelope
    {
        $appName = 'System Admin';
        if (Schema::hasTable('system_settings')) {
            $appName = SystemSetting::where('key', 'app_name')->value('value') ?: 'System Admin';
        }

        return new Envelope(
            subject: "ACTION REQUIRED: {$this->store->name} Subscription is Due Today [{$appName}]",
        );
    }

    public function content(): Content
    {
        // 1. Fetch Dynamic System Settings
        $settings = [];
        if (Schema::hasTable('system_settings')) {
            $settings = SystemSetting::pluck('value', 'key')->toArray();
        }

        $appName = $settings['app_name'] ?? config('app.name');
        $supportEmail = $settings['support_email'] ?? 'support@' . request()->getHost();
        $companyAddress = $settings['company_address'] ?? '';

        // Logo Resolution
        $logoHtml = '';
        if (!empty($settings['logo_path'])) {
            $logoUrl = url('storage/' . $settings['logo_path']);
            $logoHtml = "<img src='{$logoUrl}' alt='{$appName} Logo' style='height: 48px; width: 48px; border-radius: 50%; border: 1px solid #e5e7eb; margin-bottom: 12px; object-fit: cover;' />";
        }

        // 2. Define Theme Colors (Urgent Red/Blue)
        $alertRed = '#ef4444';
        $primaryBlue = '#2563eb';
        $currentYear = date('Y');

        // 3. Build the Premium HTML Template
        $html = "
            <div style='background-color: #f3f4f6; padding: 40px 20px; font-family: \"Inter\", \"Helvetica Neue\", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;'>
                <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;'>

                    <div style='text-align: center; padding: 40px 30px 20px 30px; border-bottom: 1px solid #f3f4f6;'>
                        {$logoHtml}
                        <h1 style='color: #111827; font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1.5px;'>{$appName}</h1>
                    </div>

                    <div style='padding: 40px 30px;'>

                        <div style='text-align: center; margin-bottom: 35px;'>
                            <div style='display: inline-block; background-color: #fef2f2; color: #ef4444; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #fee2e2; margin-bottom: 16px;'>
                                Due Today
                            </div>
                            <h2 style='color: #111827; font-size: 26px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;'>Subscription Renewal</h2>
                            <p style='color: #6b7280; font-size: 15px; margin: 0;'>Verification required for <strong>{$this->store->name}</strong></p>
                        </div>

                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;'>Hello,</p>
                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;'>This is a formal notification that your system subscription has reached its renewal date today.</p>

                        <div style='background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px;'>
                            <p style='margin: 0 0 8px 0; color: #92400e; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;'>Grace Period Active:</p>
                            <p style='margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;'>
                                To ensure your business isn't interrupted, we have applied a <strong>5-day grace period</strong> to your account. If payment isn't verified within this window, access to your store and POS terminal will be restricted.
                            </p>
                        </div>

                        <div style='text-align: center; margin: 35px 0;'>
                            <a href='{$this->paymentUrl}' style='background-color: {$primaryBlue}; color: #ffffff; padding: 18px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2); border: 1px solid #1d4ed8;'>
                                Log In & Renew Subscription
                            </a>
                        </div>

                        <p style='color: #9ca3af; font-size: 13px; text-align: center;'>
                            If you have already submitted your payment and it is currently pending approval, please ignore this email.
                        </p>

                    </div>

                    <div style='background-color: #f9fafb; padding: 35px 30px; text-align: center; border-top: 1px solid #e5e7eb;'>
                        <p style='color: #9ca3af; font-size: 12px; margin: 0 0 10px 0; line-height: 1.5;'>
                            For billing inquiries, contact us at<br>
                            <a href='mailto:{$supportEmail}' style='color: {$primaryBlue}; text-decoration: none; font-weight: 700;'>{$supportEmail}</a>
                        </p>

                        " . ($companyAddress ? "<p style='color: #9ca3af; font-size: 11px; margin: 0 0 10px 0;'>{$companyAddress}</p>" : "") . "

                        <p style='color: #9ca3af; font-size: 11px; margin: 0;'>&copy; {$currentYear} {$appName}. All rights reserved.</p>
                    </div>

                </div>
            </div>
        ";

        return new Content(
            htmlString: $html,
        );
    }
}
