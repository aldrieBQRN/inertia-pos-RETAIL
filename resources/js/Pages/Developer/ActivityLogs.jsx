import React, { useState, useEffect, useRef } from 'react';
import { Head, usePage, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ActivityLogs() {
    const { auth, logs, actions, categories, modelTypes, filters } = usePage().props;
    const [localFilters, setLocalFilters] = useState(filters || {});
    const [expandedLog, setExpandedLog] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showUnchangedFields, setShowUnchangedFields] = useState(false);
    const isMounted = useRef(false);

    // --- REAL-TIME POLLING (5 SECONDS) ---
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['logs'],
                preserveScroll: true,
                preserveState: true
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // --- AUTO-APPLY FILTERS WITH DEBOUNCE (500ms) ---
    useEffect(() => {
        // Prevent running on initial page load
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        setLoading(true);
        const timer = setTimeout(() => {
            router.get(route('developer.activity-logs'),
                {
                    search: localFilters.search || undefined,
                    action: localFilters.action || undefined,
                    category: localFilters.category || undefined,
                    model_type: localFilters.model_type || undefined,
                    from_date: localFilters.from_date || undefined,
                    to_date: localFilters.to_date || undefined
                },
                {
                    preserveState: true,
                    replace: true,
                    preserveScroll: true,
                    only: ['logs', 'filters']
                }
            );
            setLoading(false);
        }, 500);

        return () => {
            clearTimeout(timer);
        };
    }, [localFilters]);

    useEffect(() => {
        setShowUnchangedFields(false);
    }, [expandedLog]);

    // Handle filter changes
    const handleFilterChange = (key, value) => {
        setLocalFilters(prev => ({
            ...prev,
            [key]: value || undefined
        }));
    };

    // Clear filters
    const clearFilters = () => {
        setLocalFilters({});
    };
    const getCategoryColor = (category) => {
        const colorMap = {
            'Security': 'bg-red-100 text-red-700 border border-red-200',
            'User Management': 'bg-blue-100 text-blue-700 border border-blue-200',
            'Store Settings': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
            'Product Management': 'bg-indigo-100 text-indigo-700 border border-indigo-200',
            'Category Management': 'bg-violet-100 text-violet-700 border border-violet-200',
            'Sales': 'bg-amber-100 text-amber-700 border border-amber-200',
            'Payments': 'bg-green-100 text-green-700 border border-green-200',
            'System': 'bg-gray-100 text-gray-700 border border-gray-200',
        };
        return colorMap[category] || 'bg-gray-100 text-gray-700 border border-gray-200';
    };
    // Format timestamp
    const formatTime = (datetime) => {
        return new Date(datetime).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // Get action badge color
    const getActionBadgeColor = (action) => {
        const colorMap = {
            'create': 'bg-blue-100 text-blue-700 border border-blue-200',
            'update': 'bg-amber-100 text-amber-700 border border-amber-200',
            'delete': 'bg-red-100 text-red-700 border border-red-200',
            'approve': 'bg-green-100 text-green-700 border border-green-200',
            'reject': 'bg-red-100 text-red-700 border border-red-200',
            'view': 'bg-gray-100 text-gray-700 border border-gray-200',
            'login_failed': 'bg-red-100 text-red-700 border border-red-200',
            'password_reset': 'bg-orange-100 text-orange-700 border border-orange-200',
            'stock_adjust': 'bg-indigo-100 text-indigo-700 border border-indigo-200',
        };
        return colorMap[action] || 'bg-gray-100 text-gray-700 border border-gray-200';
    };

    const formatFieldLabel = (key) => {
        return key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const isPolicyField = (key) => {
        if (!key) {
            return false;
        }

        return [
            'terms_of_service',
            'privacy_policy',
            'staff_terms_of_service',
            'staff_privacy_policy',
        ].includes(key);
    };

    const looksLikeHtml = (value) => {
        return typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value);
    };

    const htmlToReadableText = (html) => {
        if (!looksLikeHtml(html)) {
            return String(html ?? '');
        }

        const container = document.createElement('div');
        container.innerHTML = html;

        const lines = [];

        Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6')).forEach((heading) => {
            heading.textContent = `\n${heading.textContent}\n`;
        });

        Array.from(container.querySelectorAll('li')).forEach((item) => {
            item.textContent = `• ${item.textContent}`;
        });

        container.querySelectorAll('br').forEach((node) => {
            node.replaceWith('\n');
        });

        const rawText = container.innerText || container.textContent || '';

        rawText
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map((line) => line.trim())
            .forEach((line) => {
                const previous = lines[lines.length - 1] ?? '';
                if (line.length === 0 && previous.length === 0) {
                    return;
                }
                lines.push(line);
            });

        return lines.join('\n').trim();
    };

    const formatFieldValue = (value) => {
        if (value === null || value === undefined || value === '') {
            return 'N/A';
        }

        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }

        return String(value);
    };

    const isEqualFieldValue = (left, right) => {
        if (left === right) {
            return true;
        }

        if ((left === null || left === undefined || left === '') && (right === null || right === undefined || right === '')) {
            return true;
        }

        if (typeof left === 'object' || typeof right === 'object') {
            return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
        }

        return String(left ?? '') === String(right ?? '');
    };

    const isPaymentMethodShape = (value) => {
        return value
            && typeof value === 'object'
            && !Array.isArray(value)
            && ('type' in value || 'label' in value || 'number' in value || 'name' in value);
    };

    const renderPaymentMethodCard = (method, key) => (
        <div key={key} className="bg-white border border-gray-200 rounded-md px-3 py-2">
            <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{method.icon || '💳'}</span>
                <p className="text-sm font-bold text-gray-900">{method.label || method.type || 'Payment Method'}</p>
            </div>
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">Type:</span> {method.type || 'N/A'}</p>
                <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">Number:</span> {method.number || 'N/A'}</p>
                <p className="text-xs text-gray-600 sm:col-span-2"><span className="font-semibold text-gray-700">Name:</span> {method.name || 'N/A'}</p>
            </div>
        </div>
    );

    const renderSmartFieldValue = (value, fieldKey = null) => {
        if (isPolicyField(fieldKey) && typeof value === 'string') {
            const readableValue = htmlToReadableText(value);

            return (
                <pre className="text-xs text-gray-800 bg-white border border-gray-200 rounded-md p-3 whitespace-pre-wrap break-words overflow-x-auto font-sans leading-6">
                    {readableValue || 'N/A'}
                </pre>
            );
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return <p className="text-sm text-gray-500">No items</p>;
            }

            if (value.every(isPaymentMethodShape)) {
                return (
                    <div className="space-y-2">
                        {value.map((method, index) => renderPaymentMethodCard(method, `pm-${index}`))}
                    </div>
                );
            }

            return (
                <pre className="text-xs text-gray-800 bg-white border border-gray-200 rounded-md p-2 whitespace-pre-wrap break-words overflow-x-auto font-mono">
                    {formatFieldValue(value)}
                </pre>
            );
        }

        if (isPaymentMethodShape(value)) {
            return renderPaymentMethodCard(value, 'pm-single');
        }

        if (value && typeof value === 'object') {
            return (
                <div className="bg-white border border-gray-200 rounded-md divide-y divide-gray-100">
                    {Object.entries(value).map(([subKey, subValue]) => (
                        <div key={subKey} className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{formatFieldLabel(subKey)}</p>
                            <p className="text-xs text-gray-800 sm:col-span-2 break-all">{formatFieldValue(subValue)}</p>
                        </div>
                    ))}
                </div>
            );
        }

        return <p className="text-sm text-gray-800 break-all">{formatFieldValue(value)}</p>;
    };

    const renderAuditValues = (values, compareValues = null, mode = 'neutral') => {
        if (!values || typeof values !== 'object') {
            return null;
        }

        const entries = Object.entries(values);
        const changedEntries = compareValues
            ? entries.filter(([key, value]) => !isEqualFieldValue(value, compareValues?.[key]))
            : entries;
        const visibleEntries = compareValues && !showUnchangedFields ? changedEntries : entries;

        if (visibleEntries.length === 0) {
            return <p className="text-sm text-gray-500">No changed fields</p>;
        }

        if (entries.length === 0) {
            return <p className="text-sm text-gray-500">No data</p>;
        }

        return (
            <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                {visibleEntries.map(([key, value]) => (
                    <div
                        key={key}
                        className={`px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 ${
                            compareValues && !isEqualFieldValue(value, compareValues?.[key])
                                ? mode === 'before'
                                    ? 'bg-red-50'
                                    : mode === 'after'
                                        ? 'bg-green-50'
                                        : 'bg-amber-50'
                                : ''
                        }`}
                    >
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {formatFieldLabel(key)}
                        </p>
                        <div className="sm:col-span-2">
                            {renderSmartFieldValue(value, key)}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 uppercase tracking-widest truncate">Activity Logs</h2>}
        >
            <Head title="Activity Logs" />

            <div className="pb-24 sm:pb-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 space-y-4 sm:space-y-6 lg:space-y-8 py-4 sm:py-6 lg:py-12">

                    {/* SEARCH & FILTER HEADER */}
                    <div className="w-full space-y-3 sm:space-y-4 mb-6">
                        {/* Search on its own row */}
                        <div className="relative w-full group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search description, user name, or account number..."
                                value={localFilters.search || ''}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-none sm:rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium shadow-sm"
                            />
                        </div>

                        {/* Filters on bottom row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 w-full">
                            <select
                                value={localFilters.action || ''}
                                onChange={(e) => handleFilterChange('action', e.target.value)}
                                className="w-full py-3 px-4 border border-gray-200 rounded-none sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-black text-gray-600 uppercase tracking-widest shadow-sm cursor-pointer"
                            >
                                <option value="">All Actions</option>
                                {actions?.map(action => (
                                    <option key={action} value={action}>
                                        {action.toUpperCase()}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={localFilters.category || ''}
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                                className="w-full py-3 px-4 border border-gray-200 rounded-none sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-black text-gray-600 uppercase tracking-widest shadow-sm cursor-pointer"
                            >
                                <option value="">All Categories</option>
                                {categories?.map(category => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={localFilters.model_type || ''}
                                onChange={(e) => handleFilterChange('model_type', e.target.value)}
                                className="w-full py-3 px-4 border border-gray-200 rounded-none sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-black text-gray-600 uppercase tracking-widest shadow-sm cursor-pointer"
                            >
                                <option value="">All Models</option>
                                {modelTypes?.map(type => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={localFilters.from_date || ''}
                                onChange={(e) => handleFilterChange('from_date', e.target.value)}
                                className="w-full py-3 px-4 border border-gray-200 rounded-none sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-600 shadow-sm"
                            />

                            <input
                                type="date"
                                value={localFilters.to_date || ''}
                                onChange={(e) => handleFilterChange('to_date', e.target.value)}
                                className="w-full py-3 px-4 border border-gray-200 rounded-none sm:rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-600 shadow-sm"
                            />

                        </div>
                    </div>

                    {/* Activity Logs Table */}

                    <div className="bg-white rounded-none sm:rounded-xl border-y sm:border-y-0 border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        {logs?.data && logs.data.length > 0 ? (
                            <>
                                {/* DESKTOP VIEW (Table) */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Model</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {logs.data.map((log) => (
                                                <React.Fragment key={log.id}>
                                                    <tr className="hover:bg-gray-50/50 transition-colors group">
                                                        <td className="px-6 py-4 text-xs text-gray-600 whitespace-nowrap font-semibold">
                                                            <div className="text-[10px] text-gray-900 font-bold">
                                                                {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </div>
                                                            <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                                                {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                                                            <div>{log.user?.name || 'Unknown'}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                                #{log.user?.account_number || 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getActionBadgeColor(log.action)}`}>
                                                                {log.action}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getCategoryColor(log.category)}`}>
                                                                {log.category}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            <span className="font-bold">{log.model_type}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-sm truncate">
                                                            {log.description}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    setShowUnchangedFields(false);
                                                                    setExpandedLog(log.id);
                                                                }}
                                                                className="inline-flex items-center justify-center p-2 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                                                                title="View Details"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* MOBILE/TABLET VIEW (Cards) */}
                                <div className="lg:hidden space-y-3 p-4 sm:p-6">
                                    {logs.data.map(log => (
                                        <div key={log.id} className="bg-white p-4 sm:p-5 rounded-none sm:rounded-lg border border-gray-100 shadow-sm space-y-3">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-black text-sm text-gray-900 truncate">{log.user?.name || 'Unknown'}</h3>
                                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">#{log.user?.account_number || 'N/A'}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                                                        {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getActionBadgeColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded-none sm:rounded-lg space-y-2 text-[9px] font-bold border border-gray-100">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400 uppercase tracking-widest">Category:</span>
                                                    <span className={`px-2 py-0.5 rounded-full border ${getCategoryColor(log.category)}`}>{log.category}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400 uppercase tracking-widest">Model:</span>
                                                    <span className="text-gray-900">{log.model_type}</span>
                                                </div>
                                                <div className="text-[8px] text-gray-600 truncate">
                                                    {log.description}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setShowUnchangedFields(false);
                                                    setExpandedLog(log.id);
                                                }}
                                                className="w-full text-blue-600 hover:text-blue-800 font-black text-[9px] uppercase tracking-wider transition-colors py-2 border-t border-gray-100"
                                            >
                                                View Details
                                            </button>

                                            {expandedLog === log.id && (
                                                <div className="space-y-3 border-t border-gray-100 pt-3">
                                                    {log.old_values && (
                                                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                                            <h4 className="font-black text-[9px] uppercase tracking-wider text-gray-900 mb-2">Before</h4>
                                                            <pre className="text-[7px] overflow-auto max-h-32 font-mono text-gray-600 bg-white p-2 rounded border border-gray-100">
                                                                {JSON.stringify(log.old_values, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {log.new_values && (
                                                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                                            <h4 className="font-black text-[9px] uppercase tracking-wider text-gray-900 mb-2">After</h4>
                                                            <pre className="text-[7px] overflow-auto max-h-32 font-mono text-gray-600 bg-white p-2 rounded border border-gray-100">
                                                                {JSON.stringify(log.new_values, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {log.user_agent && (
                                                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                                            <h4 className="font-black text-[9px] uppercase tracking-wider text-gray-900 mb-1">User Agent</h4>
                                                            <p className="text-[7px] text-gray-600 font-mono break-all">{log.user_agent}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                        Showing {logs.from || 0} to {logs.to || 0} of {logs.total || 0} logs
                                    </div>
                                    <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-1.5">
                                        {logs.links?.map((link, i) => {
                                            const currentIndex = logs.links.findIndex(l => l.active);
                                            const isFirst = i === 0;
                                            const isLast = i === logs.links.length - 1;
                                            const isCurrent = link.active;
                                            const isAdjacent = Math.abs(i - currentIndex) <= 1;
                                            const isNavButton = link.label === '&laquo; Previous' || link.label === 'Next &raquo;' || link.label === '&laquo;' || link.label === '&raquo;';

                                            const show = isFirst || isLast || isCurrent || isAdjacent || isNavButton;

                                            if (!show) {
                                                if (i > 1 && i < currentIndex - 1) {
                                                    if (i === 2 && !logs.links[1]?.active) return <span key={`ellipsis-${i}`} className="px-1 text-gray-400 font-bold text-[8px] sm:text-[9px]">...</span>;
                                                }
                                                if (i < logs.links.length - 2 && i > currentIndex + 1) {
                                                    if (i === currentIndex + 2) return <span key={`ellipsis-${i}`} className="px-1 text-gray-400 font-bold text-[8px] sm:text-[9px]">...</span>;
                                                }
                                                return null;
                                            }

                                            return (
                                                <Link
                                                    key={i}
                                                    href={link.url || '#'}
                                                    preserveScroll
                                                    preserveState
                                                    className={`px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-[8px] sm:text-[9px] font-black rounded-none sm:rounded-md lg:rounded-lg border transition-all whitespace-nowrap min-h-8 sm:min-h-9 flex items-center justify-center ${
                                                        link.active
                                                            ? 'bg-gray-900 text-white border-gray-900 scale-105 shadow-sm'
                                                            : link.url
                                                                ? 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                                                                : 'bg-transparent text-gray-300 border-transparent cursor-not-allowed'
                                                    }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white p-8 sm:p-12 lg:p-20 rounded-none sm:rounded-xl text-center border-2 border-dashed border-gray-100 animate-in fade-in duration-300 border-y sm:border-y-0">
                                <div className="bg-gray-50 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest italic">No activity logs found</h3>
                                <p className="text-gray-400 text-[10px] uppercase tracking-wider font-bold mt-2">Try adjusting your filters</p>
                                {(localFilters.search || localFilters.action || localFilters.category || localFilters.model_type || localFilters.from_date || localFilters.to_date) && (
                                    <button
                                        onClick={clearFilters}
                                        className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                                    >
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL */}
            {expandedLog && logs?.data && (
                <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-3xl rounded-none sm:rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] sm:max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="bg-white border-b border-gray-100 px-6 sm:px-10 py-6 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">
                                    Activity Details
                                </h2>
                                <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">
                                    {logs.data.find(l => l.id === expandedLog)?.model_type} • {logs.data.find(l => l.id === expandedLog)?.action}
                                </p>
                            </div>
                            <button onClick={() => setExpandedLog(null)}
                                    onMouseDown={() => setShowUnchangedFields(false)}
                                    className="bg-gray-50 hover:bg-gray-100 p-2.5 rounded-none sm:rounded-lg text-gray-500 hover:text-gray-900 transition-colors active:scale-95">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar space-y-6">
                            {logs.data.find(l => l.id === expandedLog) && (() => {
                                const log = logs.data.find(l => l.id === expandedLog);
                                return (
                                    <>
                                        {/* Summary */}
                                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">User</p>
                                                    <p className="text-lg font-black text-gray-900">{log.user?.name || 'Unknown'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Account Number</p>
                                                    <p className="text-sm font-mono font-bold text-gray-900">{log.user?.account_number || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Role</p>
                                                    <p className="text-sm font-bold text-gray-900 uppercase">{log.user?.role || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Action</p>
                                                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getActionBadgeColor(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Category</p>
                                                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getCategoryColor(log.category)}`}>
                                                        {log.category}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Store Handled</p>
                                                    <p className="text-sm font-bold text-gray-900">{log.user?.store?.name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Model</p>
                                                    <p className="text-lg font-bold text-gray-900">{log.model_type}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Timestamp</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Description</p>
                                                <p className="text-sm text-gray-700">{log.description}</p>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-300 pt-4">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">IP Address</p>
                                                    <p className="text-sm font-mono text-gray-900">{log.ip_address}</p>
                                                </div>
                                                {log.user_agent && (
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Browser</p>
                                                        <p className="text-[10px] font-mono text-gray-600 break-all whitespace-normal">{log.user_agent}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Before/After Values */}
                                        {(log.old_values || log.new_values) && (
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Before / After Changes</p>
                                                {(log.old_values && log.new_values) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowUnchangedFields(prev => !prev)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
                                                    >
                                                        {showUnchangedFields ? 'Hide unchanged' : 'Show unchanged'}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {log.old_values && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Before</p>
                                                {renderAuditValues(log.old_values, log.new_values, 'before')}
                                            </div>
                                        )}

                                        {log.new_values && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">After</p>
                                                {renderAuditValues(log.new_values, log.old_values, 'after')}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50/80 px-6 sm:px-10 py-5 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setExpandedLog(null)}
                                    className="px-6 py-3 text-gray-600 font-semibold bg-white border border-gray-300 hover:bg-gray-50 rounded-none sm:rounded-lg text-sm transition-all active:scale-[0.98]">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
