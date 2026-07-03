<?php
    // Fetch global settings for the PDF
    $settings = \App\Models\SystemSetting::pluck('value', 'key')->toArray();
    $appName = $settings['app_name'] ?? 'POS SYSTEM';
    $supportEmail = $settings['support_email'] ?? 'support@yourdomain.com';

    // Resolve logo path for DomPDF
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
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #1f2937; line-height: 1.5; margin: 0; padding: 0; }
        .container { padding: 30px; }

        /* Header */
        .header-table { width: 100%; border-bottom: 2px solid #f3f4f6; padding-bottom: 15px; margin-bottom: 20px; }
        .brand-name { font-size: 18px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 1px; }
        .report-title { font-size: 16px; color: #6b7280; font-weight: 300; text-transform: uppercase; letter-spacing: 2px; }
        .logo { height: 40px; width: 40px; border-radius: 50%; margin-bottom: 5px; }

        /* Stats Summary */
        .stats-table { width: 100%; margin-bottom: 25px; }
        .stat-card { background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center; }
        .stat-label { font-size: 8px; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .stat-value { font-size: 16px; font-weight: 900; color: #111827; }

        /* Table Styles */
        table.main-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .main-table th { background: #111827; color: #ffffff; text-align: left; padding: 10px; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .main-table td { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 10px; vertical-align: middle; }
        .main-table tr:nth-child(even) { background-color: #fcfcfc; }

        .store-name { font-weight: 800; color: #111827; }
        .ref-no { font-family: monospace; color: #4f46e5; font-weight: bold; }
        .amount { text-align: right; font-weight: 800; color: #111827; }

        /* Footer */
        .footer { margin-top: 50px; text-align: center; font-size: 8px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <table class="header-table">
            <tr>
                <td width="50%">
                    <?php if($logoPath): ?>
                        <img src="<?php echo e($logoPath); ?>" class="logo">
                    <?php endif; ?>
                    <div class="brand-name"><?php echo e($appName); ?></div>
                    <div style="color: #6b7280; font-size: 9px;">Administrative Financial Report</div>
                </td>
                <td width="50%" style="text-align: right; vertical-align: bottom;">
                    <div class="report-title">Pending Approvals</div>
                    <div style="color: #9ca3af; font-size: 9px;">Generated: <?php echo e(now()->format('M d, Y h:i A')); ?></div>
                </td>
            </tr>
        </table>

        <table class="stats-table">
            <tr>
                <td width="32%" style="padding-right: 10px;">
                    <div class="stat-card">
                        <div class="stat-label">Total Requests</div>
                        <div class="stat-value"><?php echo e($payments->count()); ?></div>
                    </div>
                </td>
                <td width="36%">
                    <div class="stat-card" style="border-color: #dbeafe; background: #eff6ff;">
                        <div class="stat-label" style="color: #3b82f6;">Total Volume</div>
                        <div class="stat-value" style="color: #2563eb;">&#8369;<?php echo e(number_format($payments->sum('amount'), 2)); ?></div>
                    </div>
                </td>
                <td width="32%" style="padding-left: 10px;">
                    <div class="stat-card">
                        <div class="stat-label">Report Status</div>
                        <div class="stat-value" style="font-size: 12px; text-transform: uppercase;">Awaiting Review</div>
                    </div>
                </td>
            </tr>
        </table>

        <table class="main-table">
            <thead>
                <tr>
                    <th width="30%">Store & Administrator</th>
                    <th width="20%">Reference Number</th>
                    <th width="20%">Target Plan</th>
                    <th width="15%">Duration</th>
                    <th width="15%" style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <?php $__currentLoopData = $payments; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $p): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <tr>
                        <td>
                            <div class="store-name"><?php echo e($p->store->name); ?></div>
                            <div style="font-size: 8px; color: #6b7280;">Admin: <?php echo e($p->full_name); ?></div>
                        </td>
                        <td class="ref-no"><?php echo e($p->reference_number); ?></td>
                        <td>
                            <div style="font-weight: bold;"><?php echo e($p->plan->name); ?></div>
                        </td>
                        <td><?php echo e($p->plan->duration_months); ?> Month(s)</td>
                        <td class="amount">&#8369;<?php echo e(number_format($p->amount, 2)); ?></td>
                    </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </tbody>
        </table>

        <div class="footer">
            <p>This report contains sensitive financial data for administrative use only.</p>
            <p>&copy; <?php echo e(date('Y')); ?> <?php echo e($appName); ?> Internal Control Panel • <?php echo e($supportEmail); ?></p>
        </div>
    </div>
</body>
</html><?php /**PATH C:\laragon\www\WEB-inertia-pos\resources\views/pdf/pending_list.blade.php ENDPATH**/ ?>