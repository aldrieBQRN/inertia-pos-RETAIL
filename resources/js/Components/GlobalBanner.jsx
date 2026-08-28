import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';

export default function GlobalBanner() {
    const { active_announcement } = usePage().props;
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (active_announcement) {
            // Check local storage to see if THIS specific announcement was already dismissed
            const dismissedId = localStorage.getItem('dismissed_announcement_id');
            if (dismissedId !== String(active_announcement.id)) {
                setIsVisible(true);
            }
        }
    }, [active_announcement]);

    const handleDismiss = () => {
        setIsVisible(false);
        // Save the ID so we don't show it again until a NEW announcement is made
        localStorage.setItem('dismissed_announcement_id', active_announcement.id);
    };

    if (!isVisible || !active_announcement) return null;

    const colors = {
        info: 'bg-[#0B2545] text-white border-blue-400/20',
        warning: 'bg-amber-500 text-slate-900 border-amber-600/30',
        danger: 'bg-red-600 text-white border-red-700/30',
    };

    return (
        <div className={`${colors[active_announcement.style] || colors.info} px-4 py-2.5 flex justify-between items-center shadow-md z-[100] relative border-b`}>
            <div className="flex-1 flex items-center justify-center gap-3 text-center text-sm">
                <ApplicationLogo size="sm" dark={active_announcement.style !== 'warning'} showSubtitle={false} className="shrink-0 scale-95" />
                <span className="h-3.5 w-px bg-current opacity-30"></span>
                <span className="font-semibold tracking-wide">{active_announcement.message}</span>
            </div>
            <button
                onClick={handleDismiss}
                className="opacity-75 hover:opacity-100 font-bold p-1 rounded transition-opacity cursor-pointer text-sm leading-none"
                aria-label="Dismiss announcement"
            >
                ✕
            </button>
        </div>
    );
}