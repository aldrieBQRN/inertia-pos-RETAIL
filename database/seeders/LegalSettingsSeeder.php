<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class LegalSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $documents = [
            'terms_of_service' => <<<'HTML'
<section>
    <h2>1. Agreement to Terms</h2>
    <p>By creating an account or using this platform, the Store Owner agrees to these Terms of Service. If you do not agree, do not use the service.</p>

    <h2>2. Service Scope</h2>
    <p>The platform provides tools for point-of-sale, inventory tracking, reporting, and staff operations. Features may be updated from time to time to improve reliability, security, and performance.</p>

    <h2>3. Account Responsibility</h2>
    <p>You are responsible for keeping account credentials secure and for activity performed under your account. You must notify support immediately if you suspect unauthorized access.</p>

    <h2>4. Data Ownership</h2>
    <p>You retain ownership of your business data. You grant us permission to process and store that data only to provide and maintain the service.</p>

    <h2>5. Acceptable Use</h2>
    <p>You agree not to misuse the platform, attempt unauthorized access, interfere with system operation, or use the service for unlawful activity.</p>

    <h2>6. Availability and Changes</h2>
    <p>We strive for reliable uptime but do not guarantee uninterrupted service. We may perform maintenance, release updates, or modify features as needed.</p>

    <h2>7. Fees and Billing</h2>
    <p>Subscription plans, billing schedules, and renewal terms are shown in your account. Non-payment may result in account suspension according to your plan terms.</p>

    <h2>8. Suspension and Termination</h2>
    <p>We may suspend or terminate access for security reasons, policy violations, or unpaid balances. You may stop using the service at any time.</p>

    <h2>9. Limitation of Liability</h2>
    <p>To the maximum extent allowed by law, the service is provided as-is and we are not liable for indirect or consequential losses, including business interruption, data loss, or lost profits.</p>

    <h2>10. Contact</h2>
    <p>For questions about these terms, contact support through your system administrator or designated support channel.</p>
</section>
HTML,
            'privacy_policy' => <<<'HTML'
<section>
    <h2>1. Overview</h2>
    <p>This Privacy Policy explains how platform data is collected, used, stored, and protected when you use the service.</p>

    <h2>2. Information We Collect</h2>
    <ul>
        <li><strong>Account Data:</strong> Business name, contact details, and account profile information.</li>
        <li><strong>Operational Data:</strong> Sales records, inventory data, staff activity, and transaction logs entered by authorized users.</li>
        <li><strong>Technical Data:</strong> Device details, IP address, browser metadata, and diagnostic logs required for support and security.</li>
    </ul>

    <h2>3. How We Use Information</h2>
    <p>We use information to provide service functionality, process transactions, secure accounts, troubleshoot issues, send operational notices, and improve product quality.</p>

    <h2>4. Data Sharing</h2>
    <p>We do not sell personal data. Data may be shared only with trusted service providers who support hosting, security, communications, or payment workflows, and only as required to deliver the service.</p>

    <h2>5. Data Security</h2>
    <p>We use reasonable administrative, technical, and organizational safeguards to protect data against unauthorized access, alteration, disclosure, or destruction.</p>

    <h2>6. Data Retention</h2>
    <p>Data is retained as long as needed for operations, compliance, dispute handling, and legitimate business needs, unless a longer period is required by law.</p>

    <h2>7. Your Rights</h2>
    <p>Depending on applicable law, users may request access, correction, or deletion of personal data through the account owner or support channel.</p>

    <h2>8. Policy Updates</h2>
    <p>We may update this policy from time to time. Material changes will be communicated through appropriate in-app or account notices.</p>
</section>
HTML,
            'staff_terms_of_service' => <<<'HTML'
<section>
    <h2>1. Authorized Use</h2>
    <p>Staff accounts are for official business use only. Users must follow store policies and manager instructions while operating the platform.</p>

    <h2>2. Login Security</h2>
    <p>Each staff member must keep credentials private and must not share accounts. Any suspected account misuse must be reported immediately.</p>

    <h2>3. Transaction Integrity</h2>
    <p>All sales, voids, discounts, and cash drawer actions must be performed honestly and according to store rules. Fraudulent or unauthorized activity is strictly prohibited.</p>

    <h2>4. Accountability and Monitoring</h2>
    <p>Actions performed under a staff account are recorded and may be reviewed by authorized managers for audit and compliance.</p>

    <h2>5. Equipment Care</h2>
    <p>Staff must handle POS devices, printers, and connected hardware responsibly and report malfunctions or damage promptly.</p>

    <h2>6. Access Removal</h2>
    <p>Store management may suspend or revoke staff access at any time due to role changes, policy violations, or employment status updates.</p>

    <h2>7. Policy Compliance</h2>
    <p>By using the platform, staff confirm they understand and agree to follow this policy and all related store procedures.</p>
</section>
HTML,
            'staff_privacy_policy' => <<<'HTML'
<section>
    <h2>1. Staff Data We Process</h2>
    <p>To manage user accounts and operations, the system processes staff profile details and job-related activity records.</p>

    <h2>2. Operational Monitoring</h2>
    <p>For security and accountability, the system records operational events such as login times, shift activity, transaction actions, and related audit logs.</p>

    <h2>3. Purpose of Processing</h2>
    <p>Staff data is processed for account administration, fraud prevention, business reporting, and compliance with internal controls.</p>

    <h2>4. Access to Staff Data</h2>
    <p>Staff data is accessible only to authorized administrators, managers, and system operators with a legitimate business need.</p>

    <h2>5. Data Protection</h2>
    <p>Reasonable safeguards are applied to protect staff data from unauthorized access, disclosure, or misuse.</p>

    <h2>6. Retention and Deletion</h2>
    <p>Staff records are retained according to legal, operational, and audit requirements. When retention is no longer required, records are securely removed.</p>

    <h2>7. Questions</h2>
    <p>Staff with questions about data handling should contact their store administrator or the designated support channel.</p>
</section>
HTML,
        ];

        foreach ($documents as $key => $value) {
            SystemSetting::updateOrCreate(
                ['key' => $key],
                ['value' => trim($value)]
            );
        }
    }
}
