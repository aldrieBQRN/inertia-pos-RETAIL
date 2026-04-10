<?php

namespace App\Mail;

use App\Models\Shift;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Schema;

class EndOfShiftMail extends Mailable
{
    use Queueable, SerializesModels;

    public $shift;

    /**
     * Create a new message instance.
     */
    public function __construct(Shift $shift)
    {
        $this->shift = $shift;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Z-Read Report: ' . $this->shift->user->name . ' (' . now()->format('M d, Y') . ')',
        );
    }

    /**
     * Get the message content definition using a premium HTML template.
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

        // 2. Format all the math and dates
        $cashierName = $this->shift->user->name;
        $started = Carbon::parse($this->shift->start_time)->format('M d, Y h:i A');
        $closed = Carbon::parse($this->shift->end_time)->format('M d, Y h:i A');

        $startCash = number_format($this->shift->starting_cash, 2);
        $cashSales = number_format($this->shift->cash_sales, 2);
        $expenses = number_format($this->shift->expenses, 2);
        $expected = number_format($this->shift->expected_cash, 2);
        $actual = number_format($this->shift->actual_cash, 2);

        // Fetch digital sales
        $gcash = $this->shift->gcash_sales ?? 0;
        $maya = $this->shift->maya_sales ?? 0;
        $credit = $this->shift->credit_card_sales ?? 0;
        $debit = $this->shift->debit_card_sales ?? 0;

        $totalSalesVal = $this->shift->cash_sales + $gcash + $maya + $credit + $debit;
        $totalSales = number_format($totalSalesVal, 2);

        $diff = (float) $this->shift->difference;
        $isBalanced = abs($diff) < 0.01;
        $statusColor = $isBalanced ? '#10b981' : ($diff > 0 ? '#3b82f6' : '#ef4444');
        $statusBg = $isBalanced ? '#ecfdf5' : ($diff > 0 ? '#eff6ff' : '#fef2f2');
        $statusText = $isBalanced ? 'DRAWER BALANCED' : ($diff > 0 ? 'DRAWER OVERAGE: +₱' . number_format($diff, 2) : 'DRAWER SHORTAGE: -₱' . number_format(abs($diff), 2));

        // Digital sales summary
        $digitalSalesHtml = '';
        if ($gcash > 0) $digitalSalesHtml .= '<div style="display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280;"><span>GCash Sales:</span><span style="font-weight: 700; color: #2563eb;">₱' . number_format($gcash, 2) . '</span></div>';
        if ($maya > 0) $digitalSalesHtml .= '<div style="display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280;"><span>Maya Sales:</span><span style="font-weight: 700; color: #059669;">₱' . number_format($maya, 2) . '</span></div>';
        if ($credit > 0) $digitalSalesHtml .= '<div style="display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280;"><span>Credit Card:</span><span style="font-weight: 700; color: #7c3aed;">₱' . number_format($credit, 2) . '</span></div>';
        if ($debit > 0) $digitalSalesHtml .= '<div style="display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280;"><span>Debit/BancNet:</span><span style="font-weight: 700; color: #4f46e5;">₱' . number_format($debit, 2) . '</span></div>';

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
                            <div style='display: inline-block; background-color: #eff6ff; color: #2563eb; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #dbeafe; margin-bottom: 16px;'>
                                Z-Read Report
                            </div>
                            <h2 style='color: #111827; font-size: 26px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;'>Shift Summary</h2>
                            <p style='color: #6b7280; font-size: 15px; margin: 0;'>End of shift report for {$started}</p>
                        </div>

                        <div style='background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; margin-bottom: 25px;'>
                            <div style='display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #374151;'><span><strong>Cashier:</strong></span><span>{$cashierName}</span></div>
                            <div style='display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #374151;'><span><strong>Opened:</strong></span><span>{$started}</span></div>
                            <div style='display: flex; justify-content: space-between; padding: 8px 0; color: #374151;'><span><strong>Closed:</strong></span><span>{$closed}</span></div>
                        </div>

                        <div style='background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; margin-bottom: 25px;'>
                            <p style='color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;'>Cash Count</p>
                            <div style='display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #374151;'><span>Starting Cash:</span><span style='font-weight: 700;'>₱{$startCash}</span></div>
                            <div style='display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #374151;'><span>Cash Sales:</span><span style='font-weight: 700; color: #059669;'>+ ₱{$cashSales}</span></div>
                            <div style='display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #374151;'><span>Expenses:</span><span style='font-weight: 700; color: #dc2626;'>- ₱{$expenses}</span></div>
                            <div style='display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 2px solid #111827; color: #374151;'><span><strong>Expected:</strong></span><span style='font-weight: 900; font-size: 16px;'>₱{$expected}</span></div>
                            <div style='display: flex; justify-content: space-between; padding: 12px 0; color: #374151;'><span><strong>Actual Count:</strong></span><span style='font-weight: 900; font-size: 16px; color: #2563eb;'>₱{$actual}</span></div>
                        </div>

                        <div style='background-color: {$statusBg}; color: {$statusColor}; border: 1px solid {$statusColor}; border-radius: 16px; padding: 16px; text-align: center; margin-bottom: 25px;'>
                            <p style='font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0;'>{$statusText}</p>
                        </div>

                        <div style='background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px;'>
                            <p style='color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;'>Sales Summary</p>
                            <div style='display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #374151;'><span>Cash Sales:</span><span style='font-weight: 700;'>₱{$cashSales}</span></div>
                            {$digitalSalesHtml}
                            <div style='display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #111827; color: #374151; margin-top: 8px;'><span><strong>Total Sales:</strong></span><span style='font-weight: 900; font-size: 16px;'>₱{$totalSales}</span></div>
                        </div>

                    </div>

                    <div style='background-color: #f9fafb; padding: 35px 30px; text-align: center; border-top: 1px solid #e5e7eb;'>
                        <p style='color: #9ca3af; font-size: 12px; margin: 0 0 10px 0; line-height: 1.5;'>
                            Need assistance? Contact us at<br>
                            <a href='mailto:{$supportEmail}' style='color: #2563eb; text-decoration: none; font-weight: 700;'>{$supportEmail}</a>
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
