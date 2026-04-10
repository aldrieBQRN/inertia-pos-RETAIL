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

class StoreSuspendedMail extends Mailable
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
            subject: "URGENT: {$this->store->name} Account Suspended [{$appName}]",
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

        // Ensure the logo resolves to an absolute URL
        $logoHtml = '';
        if (!empty($settings['logo_path'])) {
            $logoUrl = url('storage/' . $settings['logo_path']);
            $logoHtml = "<img src='{$logoUrl}' alt='{$appName} Logo' style='height: 48px; width: 48px; border-radius: 50%; border: 1px solid #e5e7eb; margin-bottom: 12px; object-fit: cover;' />";
        }

        // 2. Define Theme Colors (High Alert Dark/Red Theme)
        $alertRed = '#ef4444';
        $darkPrimary = '#111827';
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
                                High Priority Notice
                            </div>
                            <h2 style='color: #111827; font-size: 26px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;'>Account Suspended</h2>
                            <p style='color: #6b7280; font-size: 15px; margin: 0;'>System access for <strong>{$this->store->name}</strong> has been restricted.</p>
                        </div>

                        <div style='background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 25px; margin-bottom: 30px;'>
                            <p style='margin: 0; color: #374151; font-size: 14px; line-height: 1.6;'>
                                This is a formal notification that your store has been suspended due to an <strong>overdue subscription balance</strong>.
                                Access to your POS terminal and management dashboard is currently restricted.
                            </p>
                            <p style='margin: 15px 0 0 0; color: #ef4444; font-size: 13px; font-weight: 700;'>
                                ※ Note: Your inventory and transaction data remain safe and have not been deleted.
                            </p>
                        </div>

                        <h3 style='color: #111827; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;'>How to Reactivate</h3>
                        <p style='color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;'>
                            To restore immediate access, please settle your outstanding balance. Once you have made the payment, log in to the portal and upload your proof of payment for administrative verification.
                        </p>

                        <div style='text-align: center; margin: 35px 0;'>
                            <a href='{$this->paymentUrl}' style='background-color: {$darkPrimary}; color: #ffffff; padding: 18px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #000000;'>
                                Log In & Reactivate Store
                            </a>
                        </div>

                        <p style='color: #9ca3af; font-size: 13px; text-align: center;'>
                            If you believe this is an error or have already submitted payment, please contact our billing department immediately.
                        </p>

                    </div>

                    <div style='background-color: #f9fafb; padding: 35px 30px; text-align: center; border-top: 1px solid #e5e7eb;'>
                        <p style='color: #9ca3af; font-size: 12px; margin: 0 0 10px 0; line-height: 1.5;'>
                            Need help? Contact support at<br>
                            <a href='mailto:{$supportEmail}' style='color: {$alertRed}; text-decoration: none; font-weight: 700;'>{$supportEmail}</a>
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
