import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';

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
        info: 'bg-blue-600 text-white',
        warning: 'bg-yellow-500 text-black',
        danger: 'bg-red-600 text-white',
    };

    return (
        <div className={`${colors[active_announcement.style] || colors.info} px-4 py-2 flex justify-between items-center shadow-md z-[100] relative`}>
            <div className="flex-1 text-center font-bold text-sm tracking-wide">
                📢 {active_announcement.message}
            </div>
            <button
                onClick={handleDismiss}
                className="opacity-75 hover:opacity-100 font-bold p-1 rounded transition-opacity"
            >
                ✕
            </button>
        </div>
    );
}