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

class SubscriptionReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public $store;

    /**
     * Create a new message instance.
     */
    public function __construct(Store $store)
    {
        // We assume 'plan' is eager-loaded from the Controller
        $this->store = $store;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $appName = 'System Admin';
        if (Schema::hasTable('system_settings')) {
            $appName = SystemSetting::where('key', 'app_name')->value('value') ?: 'System Admin';
        }

        $planName = $this->store->plan->name ?? 'Subscription';

        return new Envelope(
            subject: "Action Required: Renew Your {$planName} [{$appName}]",
        );
    }

    /**
     * Get the message content definition.
     */
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

        // 2. Get Plan & Store Details
        $plan = $this->store->plan;
        $planName = $plan ? $plan->name : 'Standard Plan';
        $formattedPrice = $plan ? number_format($plan->price, 2) : '0.00';
        $date = $this->store->subscription_ends_at
            ? $this->store->subscription_ends_at->format('F d, Y')
            : 'soon';
        $currentYear = date('Y');

        // 3. Define Theme Colors (Amber for Warning/Action Required, Blue for CTA)
        $warningColor = '#ea580c'; // Amber-600
        $warningBg = '#fff7ed'; // Amber-50
        $primaryColor = '#2563eb'; // Blue-600

        // 4. Direct the user to the secure authenticated billing portal
        $paymentUrl = route('tenant.billing.portal');

        // 5. Build the Premium HTML Template
        $html = "
            <div style='background-color: #f3f4f6; padding: 40px 20px; font-family: \"Inter\", \"Helvetica Neue\", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;'>
                <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;'>

                    <div style='text-align: center; padding: 40px 30px 20px 30px; border-bottom: 1px solid #f3f4f6;'>
                        {$logoHtml}
                        <h1 style='color: #111827; font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1.5px;'>{$appName}</h1>
                    </div>

                    <div style='padding: 40px 30px;'>

                        <div style='text-align: center; margin-bottom: 30px;'>
                            <div style='display: inline-block; background-color: {$warningBg}; color: {$warningColor}; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 1px solid {$warningColor}33; margin-bottom: 16px;'>
                                Action Required
                            </div>
                            <h2 style='color: #111827; font-size: 24px; font-weight: 800; margin: 0 0 8px 0;'>Subscription Renewal</h2>
                            <p style='color: #6b7280; font-size: 14px; margin: 0;'>Please settle your account to avoid service interruption.</p>
                        </div>

                        <div style='background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 35px;'>
                            <p style='color: #6b7280; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 10px 0;'>Total Amount Due</p>
                            <p style='color: #111827; font-size: 42px; font-weight: 900; margin: 0; letter-spacing: -1px;'>&#8369;{$formattedPrice}</p>
                        </div>

                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;'>Hello <strong>{$this->store->name}</strong> Team,</p>
                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;'>This is a friendly reminder that your system subscription is scheduled to expire on <strong style='color: #111827;'>{$date}</strong>. To maintain uninterrupted access to your POS terminal and inventory data, please submit your payment via the secure billing portal.</p>

                        <div style='text-align: center; margin: 35px 0;'>
                            <a href='{$paymentUrl}' style='background-color: {$primaryColor}; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); border: 1px solid #1d4ed8;'>
                                Log In & Pay Now
                            </a>
                        </div>

                        <div style='border-top: 1px solid #f3f4f6; padding-top: 25px; margin-top: 10px;'>
                            <h3 style='color: #111827; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0;'>Account Details</h3>
                            <table width='100%' cellpadding='0' cellspacing='0' style='font-size: 14px;'>
                                <tr>
                                    <td style='padding: 14px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;'>Store Name</td>
                                    <td style='padding: 14px 0; color: #111827; font-weight: 700; text-align: right; border-bottom: 1px solid #f3f4f6;'>{$this->store->name}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 14px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;'>Current Plan</td>
                                    <td style='padding: 14px 0; color: #111827; font-weight: 700; text-align: right; border-bottom: 1px solid #f3f4f6;'>{$planName}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 14px 0; color: #6b7280;'>Due Date</td>
                                    <td style='padding: 14px 0; color: {$warningColor}; font-weight: 800; text-align: right;'>{$date}</td>
                                </tr>
                            </table>
                        </div>

                    </div>

                    <div style='background-color: #f9fafb; padding: 35px 30px; text-align: center; border-top: 1px solid #e5e7eb;'>
                        <p style='color: #6b7280; font-size: 13px; margin: 0 0 12px 0;'>Thank you for choosing our platform for your business!</p>

                        <p style='color: #9ca3af; font-size: 12px; margin: 25px 0 10px 0; line-height: 1.5;'>
                            If you require assistance or an extension, please contact our support team at<br>
                            <a href='mailto:{$supportEmail}' style='color: {$primaryColor}; text-decoration: none; font-weight: 700;'>{$supportEmail}</a>
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
