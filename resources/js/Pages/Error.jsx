import React from 'react';
import { Head, usePage } from '@inertiajs/react';

export default function Error({ status }) {
    // We grab the global props we set up earlier in HandleInertiaRequests
    const { auth, csrf_token } = usePage().props;

    const title = {
        503: '503: Service Unavailable',
        500: '500: Server Error',
        404: '404: Page Not Found',
        403: '403: Forbidden',
    }[status] || 'An Error Occurred';

    const description = {
        503: 'Sorry, we are doing some maintenance. Please check back soon.',
        500: 'Whoops, something went wrong on our servers.',
        404: 'Sorry, the page you are looking for could not be found.',
        403: 'Sorry, you do not have permission to access this page.',
    }[status] || 'An unknown error occurred.';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
            <Head title={title} />

            {/* IMPERSONATION RESCUE BANNER */}
            {auth?.is_impersonating && (
                <div className="absolute top-0 left-0 w-full bg-red-600 text-white px-6 py-3 flex justify-between items-center shadow-lg z-50">
                    <span className="font-bold text-sm">⚠️ You hit an error page while impersonating a tenant.</span>
                    <form action="/impersonate/leave" method="POST" className="inline">
                        <input type="hidden" name="_token" value={csrf_token || ''} />
                        <button type="submit" className="bg-white text-red-600 px-4 py-2 rounded font-bold text-xs shadow hover:bg-red-50 transition-colors">
                            RETURN TO ADMIN
                        </button>
                    </form>
                </div>
            )}

            <div className="text-center space-y-6">
                <h1 className="text-9xl font-black text-blue-600 tracking-tighter drop-shadow-sm">
                    {status}
                </h1>

                <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
                    <p className="text-gray-500 max-w-md mx-auto text-lg">{description}</p>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => window.history.back()}
                        className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-black transition-all active:scale-95"
                    >
                        &larr; Go Back
                    </button>
                    <a
                        href="/"
                        className="bg-white text-gray-700 px-8 py-3 rounded-xl font-bold shadow-sm border border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Return Home
                    </a>
                </div>
            </div>

            <div className="absolute bottom-6 text-gray-400 text-sm font-bold">
                POS System &copy; {new Date().getFullYear()}
            </div>
        </div>
    );
}