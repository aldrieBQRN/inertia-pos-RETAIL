<?php

namespace App\Mail;

use App\Models\SubscriptionPayment;
use App\Models\SystemSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\Schema;

class PaymentRejectedMail extends Mailable
{
    use Queueable;

    public $payment;
    public $reason;
    public $paymentUrl;

    public function __construct(SubscriptionPayment $payment, $reason, $paymentUrl = null)
    {
        $this->payment = $payment;
        $this->reason = $reason;

        // Use the passed URL, or fallback safely to the portal route
        $this->paymentUrl = $paymentUrl ?? route('tenant.billing.portal');
    }

    public function envelope(): Envelope
    {
        $appName = 'System Admin';
        if (Schema::hasTable('system_settings')) {
            $appName = SystemSetting::where('key', 'app_name')->value('value') ?: 'System Admin';
        }

        return new Envelope(
            subject: "Action Required: Payment Verification Failed [{$appName}]",
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

        // 2. Define Theme Colors (Red for Error/Rejection)
        $dangerColor = '#ef4444'; // Red-500
        $dangerBg = '#fef2f2'; // Red-50
        $dangerBorder = '#fca5a5'; // Red-300

        $formattedAmount = number_format($this->payment->amount, 2);
        $dateSubmitted = $this->payment->created_at->format('F d, Y \a\t h:i A');
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

                        <div style='text-align: center; margin-bottom: 30px;'>
                            <div style='display: inline-block; background-color: {$dangerBg}; color: {$dangerColor}; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 1px solid {$dangerBorder}; margin-bottom: 16px;'>
                                Verification Failed
                            </div>
                            <h2 style='color: #111827; font-size: 24px; font-weight: 800; margin: 0 0 8px 0;'>Action Required</h2>
                            <p style='color: #6b7280; font-size: 14px; margin: 0;'>Your recent payment for {$this->payment->store->name} could not be approved.</p>
                        </div>

                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;'>Hello <strong>{$this->payment->full_name}</strong>,</p>
                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;'>Unfortunately, our administrative team was unable to verify your recent subscription payment of <strong style='color: #111827;'>&#8369;{$formattedAmount}</strong>.</p>

                        <div style='background-color: {$dangerBg}; border-left: 4px solid {$dangerColor}; border-radius: 8px; padding: 20px; margin-bottom: 35px;'>
                            <p style='margin: 0 0 8px 0; color: #991b1b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;'>Reason for Rejection:</p>
                            <p style='margin: 0; color: #7f1d1d; font-size: 15px; font-style: italic; line-height: 1.5;'>&ldquo;{$this->reason}&rdquo;</p>
                        </div>

                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 35px 0;'>To ensure your store remains active and avoid any service interruptions, please log in to your secure billing portal and submit a new, clear proof of payment.</p>

                        <div style='text-align: center; margin: 35px 0;'>
                            <a href='{$this->paymentUrl}' style='background-color: {$dangerColor}; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25); border: 1px solid #dc2626;'>
                                Review & Re-Submit
                            </a>
                        </div>

                        <div style='border-top: 1px solid #f3f4f6; padding-top: 25px; margin-top: 10px;'>
                            <h3 style='color: #111827; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0;'>Original Submission Details</h3>
                            <table width='100%' cellpadding='0' cellspacing='0' style='font-size: 14px;'>
                                <tr>
                                    <td style='padding: 14px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;'>Reference Number</td>
                                    <td style='padding: 14px 0; color: #111827; font-weight: 800; font-family: monospace; text-align: right; border-bottom: 1px solid #f3f4f6;'>{$this->payment->reference_number}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 14px 0; color: #6b7280;'>Date Submitted</td>
                                    <td style='padding: 14px 0; color: #111827; font-weight: 700; text-align: right;'>{$dateSubmitted}</td>
                                </tr>
                            </table>
                        </div>

                    </div>

                    <div style='background-color: #f9fafb; padding: 35px 30px; text-align: center; border-top: 1px solid #e5e7eb;'>
                        <p style='color: #6b7280; font-size: 13px; margin: 0 0 12px 0;'>If you believe this is an error, please reply directly to this email.</p>

                        <p style='color: #9ca3af; font-size: 12px; margin: 25px 0 10px 0; line-height: 1.5;'>
                            For further assistance, contact our support team at<br>
                            <a href='mailto:{$supportEmail}' style='color: {$dangerColor}; text-decoration: none; font-weight: 700;'>{$supportEmail}</a>
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
