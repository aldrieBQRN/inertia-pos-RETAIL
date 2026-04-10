<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SystemSetting;

class LegalSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ---------------------------------------------------------
        // 1. STORE OWNER (TENANT) POLICIES
        // ---------------------------------------------------------
        SystemSetting::updateOrCreate(
            ['key' => 'terms_of_service'],
            ['value' => '
                <h2>1. Acceptance of Terms</h2>
                <p>By accessing and using this Cloud Point-of-Sale (POS) system, the Store Owner ("Tenant") accepts and agrees to be bound by the terms and provisions of this agreement. Any participation in this service will constitute acceptance of this agreement.</p>

                <h2>2. Provision of Service</h2>
                <p>We provide a cloud-based POS system designed to manage sales, inventory, and staff. We reserve the right to modify, suspend, or discontinue the service with or without notice at any time to ensure system integrity and security.</p>

                <h2>3. Data Ownership and Security</h2>
                <ul>
                    <li><strong>Your Data:</strong> The Tenant retains all rights to the data inputted into the system, including sales records and customer data.</li>
                    <li><strong>Security:</strong> We implement industry-standard security measures, but the Tenant is strictly responsible for maintaining the confidentiality of their administrative credentials.</li>
                </ul>

                <h2>4. Limitation of Liability</h2>
                <p>In no event shall the platform providers be liable for any indirect, incidental, special, or consequential damages arising out of the use of or inability to use the system, including hardware failures, connectivity drops, or data loss.</p>
            ']
        );

        SystemSetting::updateOrCreate(
            ['key' => 'privacy_policy'],
            ['value' => '
                <h2>1. Information We Collect</h2>
                <p>We collect information to provide better and more secure services to our Tenants. This includes:</p>
                <ul>
                    <li><strong>Account Information:</strong> Store name, business address, and administrative contact details.</li>
                    <li><strong>Usage Data:</strong> System interaction logs, hardware connection status, and transaction volumes for system optimization and load balancing.</li>
                </ul>

                <h2>2. How We Use Your Information</h2>
                <p>The collected data is used exclusively to maintain and improve the POS platform, provide technical customer support, and ensure billing accuracy. We do not sell your business data to third parties under any circumstances.</p>

                <h2>3. Data Processing and Storage</h2>
                <p>All data is encrypted in transit and at rest. As the Store Owner, you are the primary data controller for your customers\' data, and we act securely as the data processor.</p>
            ']
        );

        // ---------------------------------------------------------
        // 2. STAFF / CASHIER POLICIES
        // ---------------------------------------------------------
        SystemSetting::updateOrCreate(
            ['key' => 'staff_terms_of_service'],
            ['value' => '
                <h2>1. Acceptable Use Policy</h2>
                <p>As an authorized staff member, you agree to use this Point of Sale (POS) system strictly for official business purposes as directed by your store management. You must not process unauthorized transactions, apply unapproved discounts, or attempt to access restricted administrative areas.</p>

                <h2>2. Account Security & Accountability</h2>
                <ul>
                    <li><strong>Credential Protection:</strong> You are responsible for maintaining the confidentiality of your password. Never share your login details with other staff members.</li>
                    <li><strong>System Accountability:</strong> All transactions, voided sales, and cash drawer interactions performed under your account are logged and attributed directly to you.</li>
                </ul>

                <h2>3. Hardware & Equipment</h2>
                <p>You agree to handle the POS terminal, receipt printer, and cash drawer with care. Any technical issues, physical damage, or hardware malfunctions must be reported to the store manager immediately.</p>

                <h2>4. Termination of Access</h2>
                <p>Your store management reserves the right to suspend or terminate your access to this system at any time, for any reason, including violation of store policies, mishandling of funds, or termination of your employment.</p>
            ']
        );

        SystemSetting::updateOrCreate(
            ['key' => 'staff_privacy_policy'],
            ['value' => '
                <h2>1. Employee Data Collection</h2>
                <p>To create and maintain your secure staff account, this system collects your personal information, including your full name, address, and phone number. This data is collected on behalf of your employer (the Store Owner) strictly for operational and payroll tracking purposes.</p>

                <h2>2. Tracking and Monitoring</h2>
                <p>Please be aware that your usage of the POS system is continuously monitored by the system to prevent fraud. This includes:</p>
                <ul>
                    <li>Login and logout timestamps (Shift and attendance tracking).</li>
                    <li>Sales performance, voids, and transaction history.</li>
                    <li>System interaction logs (e.g., deleted cart items, opened cash drawers without a sale).</li>
                </ul>

                <h2>3. Data Visibility and Security</h2>
                <p>Your personal information and daily performance data are visible only to your authorized Store Administrators and the core System Provider. We process this data securely and do not sell your personal information to any third-party marketers.</p>
            ']
        );
    }
}
