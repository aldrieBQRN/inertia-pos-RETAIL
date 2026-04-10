<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Schema;

class EmailVerificationOtp extends Mailable
{
    use Queueable;

    public $otp;
    public $email;
    public $isStaff;

    /**
     * Create a new message instance.
     */
    public function __construct($otp, $email, $isStaff = false)
    {
        $this->otp = $otp;
        $this->email = $email;
        $this->isStaff = $isStaff;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->isStaff ? 'Verify Staff Email Address Change' : 'Verify Your New Email Address',
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

        // Logo Resolution
        $logoHtml = '';
        if (!empty($settings['logo_path'])) {
            $logoUrl = url('storage/' . $settings['logo_path']);
            $logoHtml = "<img src='{$logoUrl}' alt='{$appName} Logo' style='height: 48px; width: 48px; border-radius: 50%; border: 1px solid #e5e7eb; margin-bottom: 12px; object-fit: cover;' />";
        }

        $currentYear = date('Y');
        $primaryColor = '#2563eb';
        $otpFormatted = implode(' ', str_split($this->otp));

        // 2. Build the Premium HTML Template
        $html = "
            <div style='background-color: #f3f4f6; padding: 40px 20px; font-family: \"Inter\", \"Helvetica Neue\", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;'>
                <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;'>

                    <div style='text-align: center; padding: 40px 30px 20px 30px; border-bottom: 1px solid #f3f4f6;'>
                        {$logoHtml}
                        <h1 style='color: #111827; font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1.5px;'>{$appName}</h1>
                    </div>

                    <div style='padding: 40px 30px;'>

                        <div style='text-align: center; margin-bottom: 35px;'>
                            <div style='display: inline-block; background-color: #eff6ff; color: #2563eb; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #dbeafe; margin-bottom: 16px;'>
                                Security Verification
                            </div>
                            <h2 style='color: #111827; font-size: 26px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;'>Verify Your Email</h2>
                            <p style='color: #6b7280; font-size: 15px; margin: 0;'>Secure email verification code</p>
                        </div>

                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;'>Hello,</p>
                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;'>
                            We received a request to verify a new email address <strong>" . htmlspecialchars($this->email) . "</strong> for your account.
                        </p>

                        <p style='color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0;'>
                            Use this one-time verification code to confirm your email address:
                        </p>

                        <div style='background-color: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 16px; padding: 25px 20px; text-align: center; margin: 30px 0;'>
                            <p style='color: #6b7280; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;'>Verification Code</p>
                            <p style='color: #111827; font-size: 36px; font-weight: 900; letter-spacing: 6px; margin: 0; font-family: \"Courier New\", monospace; word-spacing: 8px;'>{$otpFormatted}</p>
                        </div>

                        <div style='background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 16px; margin: 30px 0;'>
                            <p style='color: #92400e; font-size: 12px; font-weight: 700; margin: 0;'>
                                ⏱️ This code expires in 10 minutes. Do not share it with anyone.
                            </p>
                        </div>

                        <p style='color: #6b7280; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0;'>
                            If you didn't request this verification, please ignore this email. Your account remains secure.
                        </p>

                    </div>

                    <div style='background-color: #f9fafb; padding: 35px 30px; text-align: center; border-top: 1px solid #e5e7eb;'>
                        <p style='color: #9ca3af; font-size: 12px; margin: 0 0 10px 0; line-height: 1.5;'>
                            Need help? Contact our support team at<br>
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

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
