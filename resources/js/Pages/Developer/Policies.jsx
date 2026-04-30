import { useEffect, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';

const documentConfig = [
    {
        key: 'terms_of_service',
        label: 'Platform Terms of Service',
        description: 'Shown to customers and store users as the system-wide terms of service.',
    },
    {
        key: 'privacy_policy',
        label: 'Platform Privacy Policy',
        description: 'Shown to customers and store users as the system-wide privacy policy.',
    },
    {
        key: 'staff_terms_of_service',
        label: 'Staff Terms of Service',
        description: 'Displayed to staff members during onboarding and internal policy review.',
    },
    {
        key: 'staff_privacy_policy',
        label: 'Staff Privacy Policy',
        description: 'Displayed to staff members during onboarding and internal policy review.',
    },
];

export default function Policies({ auth, policySettings }) {
    const user = auth?.user;

    const [form, setForm] = useState({
        terms_of_service: '',
        privacy_policy: '',
        staff_terms_of_service: '',
        staff_privacy_policy: '',
    });
    const [saving, setSaving] = useState(false);
    const [activeDocument, setActiveDocument] = useState(documentConfig[0].key);

    const htmlToPlainText = (html) => {
        if (!html) {
            return '';
        }

        const container = document.createElement('div');
        container.innerHTML = html;

        const rawText = container.innerText || container.textContent || '';

        // Clean indentation from seeded HTML and collapse repeated blank lines.
        const normalizedLines = rawText
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map((line) => line.trim())
            .reduce((accumulator, line) => {
                const isEmpty = line.length === 0;
                const previousLine = accumulator[accumulator.length - 1] ?? '';

                if (isEmpty && previousLine.length === 0) {
                    return accumulator;
                }

                accumulator.push(line);
                return accumulator;
            }, []);

        return normalizedLines.join('\n').trim();
    };

    const escapeHtml = (value) => {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const plainTextToHtml = (text) => {
        const cleanedText = (text || '').trim();

        if (!cleanedText) {
            return '';
        }

        return cleanedText
            .split(/\n{2,}/)
            .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
            .join('\n');
    };

    useEffect(() => {
        setForm({
            terms_of_service: htmlToPlainText(policySettings?.terms_of_service),
            privacy_policy: htmlToPlainText(policySettings?.privacy_policy),
            staff_terms_of_service: htmlToPlainText(policySettings?.staff_terms_of_service),
            staff_privacy_policy: htmlToPlainText(policySettings?.staff_privacy_policy),
        });
    }, [policySettings]);

    const activeConfig = documentConfig.find((document) => document.key === activeDocument) || documentConfig[0];

    const handleChange = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const confirmation = await Swal.fire({
            title: 'Save policy changes?',
            text: 'This will update the policy documents for all users.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#111827',
            cancelButtonColor: '#f3f4f6',
            confirmButtonText: 'Yes, Save',
            cancelButtonText: '<span class="text-gray-700 font-bold">Cancel</span>',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-none sm:rounded-xl',
                confirmButton: 'rounded-none sm:rounded-lg px-6 py-3 font-bold text-sm shadow-md',
                cancelButton: 'rounded-none sm:rounded-lg px-6 py-3 font-bold text-sm border border-gray-200 hover:bg-gray-200 transition-all'
            }
        });

        if (!confirmation.isConfirmed) {
            return;
        }

        setSaving(true);

        const payload = {
            terms_of_service: plainTextToHtml(form.terms_of_service),
            privacy_policy: plainTextToHtml(form.privacy_policy),
            staff_terms_of_service: plainTextToHtml(form.staff_terms_of_service),
            staff_privacy_policy: plainTextToHtml(form.staff_privacy_policy),
        };

        try {
            await axios.post(route('developer.policies.update'), payload);

            Swal.fire({
                icon: 'success',
                title: 'Policy Documents Saved',
                text: 'The legal documents were updated successfully.',
                toast: true,
                position: 'top-end',
                timer: 2200,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to save the policy documents.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AuthenticatedLayout
            user={user}
            header={<h2 className="font-semibold text-xl text-gray-800 tracking-tight truncate">Policy Documents</h2>}
        >
            <Head title="Policy Documents" />

            <div className="py-0 sm:py-8 lg:py-14 bg-gray-100 sm:bg-[#FAFAFA] min-h-[calc(100vh-65px)] sm:min-h-screen selection:bg-gray-900 selection:text-white">
                <div className="max-w-6xl mx-auto px-0 sm:px-6 lg:px-8 space-y-2 sm:space-y-6">
                    <div className="bg-white rounded-none sm:rounded-xl border-y sm:border-y-0 border border-gray-200/60 p-6 sm:p-8">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Policy Documents</h1>
                        <p className="text-sm text-gray-500 mt-2 leading-6">
                            Select a document, write your policy in plain language, then save.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                            {documentConfig.map((document) => {
                                const isActive = activeDocument === document.key;

                                return (
                                    <button
                                        key={document.key}
                                        type="button"
                                        onClick={() => setActiveDocument(document.key)}
                                        className={`text-left rounded-none sm:rounded-lg border px-4 py-3 transition ${isActive ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white hover:border-gray-300'}`}
                                    >
                                        <div className="text-sm font-bold">{document.label}</div>
                                        <div className={`text-xs mt-1 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                                            {document.description}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white rounded-none sm:rounded-xl sm:shadow-[0_2px_8px_rgb(0,0,0,0.04)] border-y sm:border-y-0 border border-gray-200/60 overflow-hidden">
                        <div className="px-4 sm:px-8 py-5 border-b border-gray-100/80 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">{activeConfig.label}</h2>
                                <p className="text-sm text-gray-500 mt-1">Keep it clear and easy to read for staff and store users.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={saving}
                                className="inline-flex items-center justify-center rounded-none sm:rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                        <div className="p-4 sm:p-8 space-y-4">
                            <textarea
                                value={form[activeConfig.key]}
                                onChange={(event) => handleChange(activeConfig.key, event.target.value)}
                                rows={20}
                                className="w-full rounded-none sm:rounded-lg border border-gray-200 bg-white px-5 py-4 text-sm leading-7 text-gray-900 shadow-sm focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 min-h-[30rem]"
                                placeholder={`Type the ${activeConfig.label.toLowerCase()} in plain language...`}
                            />

                            <div className="rounded-none sm:rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500 leading-6">
                                Tip: use short sentences and add a blank line between sections for better readability.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}