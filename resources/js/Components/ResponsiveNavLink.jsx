import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    icon = null,
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={`flex w-full items-center gap-3 border-l-4 py-2 pe-4 ps-3 rounded-r-lg transition-all duration-200 ${
                active
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700 focus:border-indigo-700 focus:bg-indigo-100 focus:text-indigo-800'
                    : 'border-transparent text-gray-600 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-600 focus:border-indigo-300 focus:bg-indigo-100 focus:text-indigo-600'
            } text-base font-medium focus:outline-none active:scale-95 ${className}`}
        >
            {icon && <div className="shrink-0 w-5 h-5">{icon}</div>}
            {children}
        </Link>
    );
}
