<?php

namespace App\Mail;

use App\Models\SystemSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Schema;

class SystemAnnouncementMail extends Mailable
{
    use Queueable, SerializesModels;

    public $messageText;

    /**
     * Create a new message instance.
     */
    public function __construct($messageText)
    {
        $this->messageText = $messageText;
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

        return new Envelope(
            subject: "📢 Important Announcement: [{$appName}]",
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

        // 2. Define Theme Colors (Indigo/Professional)
        $primaryColor = '#4f46e5';
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
                            <div style='display: inline-block; background-color: #eef2ff; color: #4f46e5; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #e0e7ff; margin-bottom: 16px;'>
                                Broadcast Message
                            </div>
                            <h2 style='color: #111827; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;'>System Announcement</h2>
                        </div>

                        <div style='color: #374151; font-size: 16px; line-height: 1.8; margin-bottom: 30px;'>
                            " . nl2br(e($this->messageText)) . "
                        </div>

                        <div style='border-top: 1px solid #f3f4f6; padding-top: 25px; margin-top: 10px;'>
                             <p style='color: #6b7280; font-size: 14px; margin: 0;'>
                                Thank you for your continued trust in our platform.
                                <br><br>
                                Regards,
                                <br>
                                <strong style='color: #111827;'>System Administration</strong>
                             </p>
                        </div>

                    </div>

                    <div style='background-color: #f9fafb; padding: 35px 30px; text-align: center; border-top: 1px solid #e5e7eb;'>
                        <p style='color: #9ca3af; font-size: 12px; margin: 0 0 10px 0; line-height: 1.5;'>
                            This is an automated system broadcast. For inquiries, please email us at<br>
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
