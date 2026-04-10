<?php

namespace App\Mail;

use App\Models\SubscriptionPayment;
use App\Models\SystemSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\Schema;

class PaymentApprovedMail extends Mailable
{
    use Queueable;

    public $payment;
    public $isReactivation;
    public $pdfContent;

    /**
     * @param SubscriptionPayment $payment
     * @param string|null $pdfContent Raw PDF binary data from the controller
     */
    public function __construct(SubscriptionPayment $payment, $pdfContent = null)
    {
        $this->payment = $payment;
        $this->pdfContent = $pdfContent;

        /**
         * Logic: If the previous expiry date (new date minus duration) was in the past,
         * it means the store was suspended/expired before this approval.
         */
        $planMonths = $payment->plan->duration_months ?? 1;
        $previousExpiry = $payment->store->subscription_ends_at->copy()->subMonths($planMonths);

        $this->isReactivation = $previousExpiry->isPast();
    }

    public function envelope(): Envelope
    {
        // Fetch System Settings for the App Name in the subject line
        $appName = 'System Admin';
        if (Schema::hasTable('system_settings')) {
            $appName = SystemSetting::where('key', 'app_name')->value('value') ?: 'System Admin';
        }

        $subject = $this->isReactivation
            ? "Account Reactivated - Welcome Back to {$this->payment->store->name}! [{$appName}]"
            : "Payment Confirmed - Subscription Extended for {$this->payment->store->name} [{$appName}]";

        return new Envelope(subject: $subject);
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

        // Ensure the logo resolves to an absolute URL so it shows up in Gmail/Outlook
        $logoHtml = '';
        if (!empty($settings['logo_path'])) {
            $logoUrl = url('storage/' . $settings['logo_path']);
            $logoHtml = "<img src='{$logoUrl}' alt='{$appName} Logo' style='height: 48px; width: 48px; border-radius: 50%; border: 1px solid #e5e7eb; margin-bottom: 12px; object-fit: cover;' />";
        }

        // 2. Define Theme Colors based on context
        $themeColor = $this->isReactivation ? '#2563eb' : '#10b981'; // Blue for Reactivation, Emerald for standard Renewal
        $badgeBgColor = $this->isReactivation ? '#eff6ff' : '#ecfdf5';
        $statusText = $this->isReactivation ? 'Account Reactivated' : 'Payment Approved';

        // 3. Define the Message
        $message = $this->isReactivation
            ? "Your payment was verified and your account has been <strong style='color: #111827;'>reactivated</strong>. You now have full access to your POS and Admin Dashboard again."
            : "We have successfully verified your payment. Your subscription has been <strong style='color: #111827;'>extended</strong>. Thank you for renewing early and keeping your account in good standing!";

        $formattedAmount = number_format($this->payment->amount, 2);
        $expiryDate = $this->payment->store->subscription_ends_at->format('F d, Y');
        $currentYear = date('Y');

        // 4. Build the Premium HTML Template
        $html = "
            <div style='background-color: #f3f4f6; padding: 40px 20px; font-family: \"Inter\", \"Helvetica Neue\", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;'>
                <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;'>

                    <div style='text-align: center; padding: 40px 30px 20px 30px; border-bottom: 1px solid #f3f4f6;'>
                        {$logoHtml}
                        <h1 style='color: #111827; font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1.5px;'>{$appName}</h1>
                    </div>

                    <div style='padding: 40px 30px;'>

                        <div style='text-align: center; margin-bottom: 30px;'>
                            <div style='display: inline-block; background-color: {$badgeBgColor}; color: {$themeColor}; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 1px solid {$themeColor}33; margin-bottom: 16px;'>
                                {$statusText}
                            </div>
                            <h2 style='color: #111827; font-size: 24px; font-weight: 800; margin: 0 0 8px 0;'>Transaction Confirmed</h2>
                            <p style='color: #6b7280; font-size: 14px; margin: 0;'>An official PDF receipt is attached to this email.</p>
                        </div>

                        <div style='background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 35px;'>
                            <p style='color: #6b7280; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 10px 0;'>Amount Paid</p>
                            <p style='color: #111827; font-size: 42px; font-weight: 900; margin: 0; letter-spacing: -1px;'>&#8369;{$formattedAmount}</p>
                        </div>

                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;'>Hello <strong>{$this->payment->full_name}</strong>,</p>
                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 35px 0;'>{$message}</p>

                        <div style='border-top: 1px solid #f3f4f6; padding-top: 25px;'>
                            <h3 style='color: #111827; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0;'>Subscription Details</h3>
                            <table width='100%' cellpadding='0' cellspacing='0' style='font-size: 14px;'>
                                <tr>
                                    <td style='padding: 14px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;'>Store Name</td>
                                    <td style='padding: 14px 0; color: #111827; font-weight: 700; text-align: right; border-bottom: 1px solid #f3f4f6;'>{$this->payment->store->name}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 14px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;'>Plan Selected</td>
                                    <td style='padding: 14px 0; color: #111827; font-weight: 700; text-align: right; border-bottom: 1px solid #f3f4f6;'>{$this->payment->plan->name}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 14px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6;'>New Expiry Date</td>
                                    <td style='padding: 14px 0; color: #111827; font-weight: 700; text-align: right; border-bottom: 1px solid #f3f4f6;'>{$expiryDate}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 14px 0; color: #6b7280;'>Reference Number</td>
                                    <td style='padding: 14px 0; color: {$themeColor}; font-weight: 800; font-family: monospace; font-size: 15px; text-align: right;'>{$this->payment->reference_number}</td>
                                </tr>
                            </table>
                        </div>

                    </div>

                    <div style='background-color: #f9fafb; padding: 35px 30px; text-align: center; border-top: 1px solid #e5e7eb;'>
                        <p style='color: #6b7280; font-size: 13px; margin: 0 0 12px 0;'>Your system is ready. You can now continue your business operations.</p>

                        <p style='color: #9ca3af; font-size: 12px; margin: 25px 0 10px 0; line-height: 1.5;'>
                            If you have any questions, please contact our support team at<br>
                            <a href='mailto:{$supportEmail}' style='color: {$themeColor}; text-decoration: none; font-weight: 700;'>{$supportEmail}</a>
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

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $attachments = [];

        if ($this->pdfContent) {
            $attachments[] = Attachment::fromData(fn() => $this->pdfContent, 'Receipt-' . $this->payment->reference_number . '.pdf')
                ->withMime('application/pdf');
        }

        return $attachments;
    }
}
