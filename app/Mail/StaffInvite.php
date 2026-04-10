<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Schema;

class StaffInvite extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $setupUrl;

    public function __construct($user, $setupUrl)
    {
        $this->user = $user;
        $this->setupUrl = $setupUrl;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $storeName = $this->user->store->name ?? 'our store';
        return new Envelope(
            subject: "Invitation to join {$storeName}",
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

        // 2. Define Context Variables
        $roleName = strtoupper($this->user->role);
        $storeName = $this->user->store->name ?? 'our store';
        $currentYear = date('Y');
        $primaryColor = '#2563eb';

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
                            <div style='display: inline-block; background-color: #eff6ff; color: #2563eb; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #dbeafe; margin-bottom: 16px;'>
                                {$roleName} Invitation
                            </div>
                            <h2 style='color: #111827; font-size: 26px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;'>Welcome to the Team!</h2>
                            <p style='color: #6b7280; font-size: 15px; margin: 0;'>You have been invited to join {$storeName}</p>
                        </div>

                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;'>Hello <strong>{$this->user->name}</strong>,</p>
                        <p style='color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;'>
                            You have been successfully invited to join <strong>{$storeName}</strong> as a <strong>{$roleName}</strong>.
                            Before you can access the system, you must complete your personal profile and set a secure password.
                        </p>

                        <div style='text-align: center; margin: 35px 0;'>
                            <a href='{$this->setupUrl}' style='background-color: {$primaryColor}; color: #ffffff; padding: 18px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2); border: 1px solid #1d4ed8;'>
                                Complete Your Setup
                            </a>
                        </div>

                        <div style='background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; text-align: center;'>
                             <p style='color: #6b7280; font-size: 12px; margin: 0; line-height: 1.5;'>
                                <strong>Security Notice:</strong> This is a secure, personalized link and will expire in 24 hours.
                                Please do not share this email or setup link with anyone else. Contact your store administrator if you did not expect this invitation.
                             </p>
                        </div>

                    </div>

                    <div style='background-color: #f9fafb; padding: 35px 30px; text-align: center; border-top: 1px solid #e5e7eb;'>
                        <p style='color: #9ca3af; font-size: 12px; margin: 0 0 10px 0; line-height: 1.5;'>
                            Need help getting started? Contact our support team at<br>
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
