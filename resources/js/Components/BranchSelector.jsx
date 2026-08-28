import React, { useState, useRef, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';

export default function BranchSelector({ className = '' }) {
    const { auth, settings } = usePage().props;
    const accessibleStores = auth?.accessible_stores || [];
    const activeStoreId = auth?.active_store_id;
    const [isOpen, setIsOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const containerRef = useRef(null);

    // Current active store
    const currentStore = accessibleStores.find((s) => Number(s.id) === Number(activeStoreId)) || {
        id: activeStoreId,
        name: settings?.store_name || 'Main Branch',
    };

    // Close popover when clicking outside the branch selector
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectBranch = (branchId) => {
        if (!branchId || Number(branchId) === Number(activeStoreId) || isSwitching) {
            setIsOpen(false);
            return;
        }

        setIsSwitching(true);
        setIsOpen(false);

        router.post(
            route('branch.switch'),
            { branch_id: branchId },
            {
                preserveScroll: true,
                preserveState: false, // Forces page to reload fresh data for the newly selected branch
                onFinish: () => {
                    setIsSwitching(false);
                },
            }
        );
    };

    // If user has no branches or only 1 branch, render a static badge
    if (accessibleStores.length <= 1) {
        return (
            <div
                className={`no-close-dropdown flex items-center justify-between text-[11px] font-semibold text-gray-700 bg-white border border-gray-200/80 px-2.5 py-1.5 rounded-lg shadow-2xs ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                    <svg
                        className="w-3.5 h-3.5 text-[#1B3B6A] shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.651V9.35m0 0a3.001 3.001 0 003.75-.614A2.993 2.993 0 009 9.35c.66 0 1.28-.214 1.787-.58A3.001 3.001 0 0014.25 9.35c.66 0 1.28-.214 1.787-.58A3.001 3.001 0 0019.5 9.35m-15 0l1.2-5.4A1.5 1.5 0 017.16 2.75h9.68a1.5 1.5 0 011.46 1.2l1.2 5.4"
                        />
                    </svg>
                    <span className="truncate text-gray-800 font-bold">{currentStore.name}</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`no-close-dropdown relative ${className}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Minimal Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                disabled={isSwitching}
                title="Click to switch active store branch"
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200/90 hover:border-blue-400 hover:bg-gray-50/60 shadow-2xs transition-all cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                    isSwitching ? 'opacity-70 cursor-wait' : ''
                }`}
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    <svg
                        className="w-3.5 h-3.5 text-[#1B3B6A] shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.651V9.35m0 0a3.001 3.001 0 003.75-.614A2.993 2.993 0 009 9.35c.66 0 1.28-.214 1.787-.58A3.001 3.001 0 0014.25 9.35c.66 0 1.28-.214 1.787-.58A3.001 3.001 0 0019.5 9.35m-15 0l1.2-5.4A1.5 1.5 0 017.16 2.75h9.68a1.5 1.5 0 011.46 1.2l1.2 5.4"
                        />
                    </svg>
                    <span className="text-[11px] font-bold text-gray-900 truncate">
                        {currentStore.name}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {isSwitching ? (
                        <svg className="animate-spin h-3 w-3 text-blue-600" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                    ) : (
                        <svg
                            className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${
                                isOpen ? 'rotate-180 text-blue-600' : ''
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    )}
                </div>
            </button>

            {/* Minimal Popover List */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1 divide-y divide-gray-50">
                    <div className="px-2 py-1 flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-wider">
                        <span>Branches</span>
                        <span>{accessibleStores.length} total</span>
                    </div>

                    <div className="pt-1 max-h-48 overflow-y-auto space-y-0.5">
                        {accessibleStores.map((branch) => {
                            const isSelected = Number(branch.id) === Number(activeStoreId);

                            return (
                                <button
                                    key={branch.id}
                                    type="button"
                                    onClick={() => handleSelectBranch(branch.id)}
                                    disabled={isSwitching}
                                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-50 text-blue-900 font-bold'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate min-w-0">
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                isSelected ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        />
                                        <span className="truncate">{branch.name}</span>
                                    </div>

                                    {isSelected && (
                                        <svg
                                            className="w-3.5 h-3.5 text-blue-600 shrink-0"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
