<?php
    // Fetch global settings for the PDF
    $settings = \App\Models\SystemSetting::pluck('value', 'key')->toArray();
    $appName = $settings['app_name'] ?? 'POS SYSTEM';
    $supportEmail = $settings['support_email'] ?? 'support@yourdomain.com';
    $companyAddress = $settings['company_address'] ?? 'Philippines';

    // Note: PDF engines sometimes struggle with local paths.
    // We use the public_path if the logo exists.
    $logoPath = null;
    if (!empty($settings['logo_path']) && file_exists(public_path('storage/' . $settings['logo_path']))) {
        $logoPath = public_path('storage/' . $settings['logo_path']);
    }
?>
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        /* Base Styles */
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #1f2937; line-height: 1.4; margin: 0; padding: 0; }
        .receipt-container { padding: 40px; }

        /* Typography */
        h1, h2, h3 { margin: 0; padding: 0; }
        .text-uppercase { text-transform: uppercase; }
        .text-right { text-align: right; }
        .font-black { font-weight: 900; }
        .tracking-widest { letter-spacing: 2px; }

        /* Layout */
        .header-table { width: 100%; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; }
        .info-table { width: 100%; margin-top: 30px; }

        /* Branding */
        .brand-name { font-size: 20px; color: #111827; margin-bottom: 4px; }
        .support-info { color: #6b7280; font-size: 10px; }
        .receipt-label { font-size: 18px; color: #9ca3af; font-weight: 300; }

        /* Status Badge */
        .badge { display: inline-block; background: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 12px; font-size: 9px; font-weight: bold; border: 1px solid #d1fae5; }

        /* Items Table */
        .details-table { width: 100%; margin-top: 40px; border-collapse: collapse; }
        .details-table th { background: #f9fafb; color: #6b7280; text-align: left; padding: 12px; font-size: 9px; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
        .details-table td { padding: 15px 12px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }

        /* Total Section */
        .total-box { margin-top: 30px; float: right; width: 250px; background: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #e5e7eb; }
        .total-row { display: block; margin-bottom: 5px; }
        .total-label { color: #6b7280; font-size: 9px; font-weight: bold; }
        .total-amount { font-size: 24px; font-weight: 900; color: #111827; display: block; margin-top: 5px; }

        /* Footer */
        .footer { clear: both; margin-top: 100px; text-align: center; font-size: 9px; color: #9ca3af; }
        .signature-rule { width: 150px; border-bottom: 1px solid #e5e7eb; margin: 40px auto 10px auto; }

        .logo { height: 50px; width: 50px; border-radius: 50%; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="receipt-container">
        <table class="header-table">
            <tr>
                <td width="60%">
                    <?php if($logoPath): ?>
                        <img src="<?php echo e($logoPath); ?>" class="logo">
                    <?php endif; ?>
                    <div class="brand-name font-black text-uppercase tracking-widest"><?php echo e($appName); ?></div>
                    <div class="support-info">
                        <?php echo e($companyAddress); ?><br>
                        <?php echo e($supportEmail); ?>

                    </div>
                </td>
                <td width="40%" class="text-right">
                    <div class="receipt-label text-uppercase tracking-widest font-black">Official Receipt</div>
                    <div style="margin-top: 10px; font-size: 10px; color: #6b7280;">
                        Date: <strong><?php echo e(now()->format('M d, Y')); ?></strong><br>
                        Ref No: <strong style="color: #111827;"><?php echo e($payment->reference_number); ?></strong>
                    </div>
                    <div style="margin-top: 10px;">
                        <span class="badge text-uppercase tracking-widest">Paid In Full</span>
                    </div>
                </td>
            </tr>
        </table>

        <table class="info-table">
            <tr>
                <td width="50%">
                    <div style="font-size: 9px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 5px;">Customer Details</div>
                    <div style="font-size: 13px; font-weight: 900; color: #111827;"><?php echo e($payment->full_name); ?></div>
                    <div style="color: #6b7280;"><?php echo e($payment->store->name); ?></div>
                </td>
                <td width="50%" class="text-right">
                    <div style="font-size: 9px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 5px;">Payment Method</div>
                    <div style="font-size: 11px; font-weight: bold; color: #111827;">Manual Bank/E-Wallet Transfer</div>
                    <div style="color: #6b7280;">Verified Transaction</div>
                </td>
            </tr>
        </table>

        <table class="details-table">
            <thead>
                <tr>
                    <th width="45%">Description</th>
                    <th width="20%">Plan Type</th>
                    <th width="15%">Duration</th>
                    <th width="20%" class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong style="color: #111827;">Software Subscription Renewal</strong><br>
                        <span style="color: #9ca3af; font-size: 9px;">Cloud Access & POS Terminal Maintenance</span>
                    </td>
                    <td><?php echo e($payment->plan->name); ?></td>
                    <td><?php echo e($payment->plan->duration_months); ?> Month(s)</td>
                    <td class="text-right font-black">&#8369;<?php echo e(number_format($payment->amount, 2)); ?></td>
                </tr>
            </tbody>
        </table>

        <div class="total-box">
            <div class="total-row">
                <span class="total-label text-uppercase tracking-widest">Total Amount Paid</span>
                <span class="total-amount">&#8369;<?php echo e(number_format($payment->amount, 2)); ?></span>
            </div>
            <div style="font-size: 9px; color: #9ca3af; margin-top: 10px;">
                VAT (12%) Included: &#8369;<?php echo e(number_format($payment->amount * 0.12, 2)); ?>

            </div>
        </div>

        <div class="footer">
            <p>Thank you for your business. Your subscription has been successfully extended until <strong><?php echo e($payment->store->subscription_ends_at->format('F d, Y')); ?></strong>.</p>
            <p>This is a computer-generated document authorized by the <strong><?php echo e($appName); ?></strong> Billing Department. No physical signature is required.</p>
            <div class="signature-rule"></div>
            <p class="text-uppercase tracking-widest font-black">Authorized Document</p>
        </div>
    </div>
</body>
</html><?php /**PATH C:\laragon\www\WEB-inertia-pos\resources\views/pdf/official_receipt.blade.php ENDPATH**/ ?>