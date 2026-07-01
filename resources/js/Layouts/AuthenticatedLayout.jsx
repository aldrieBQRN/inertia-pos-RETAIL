import { useState, useEffect } from 'react';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import usePrinterStore from '@/Stores/usePrinterStore';

// IMPORT THE NEW GLOBAL BANNER
import GlobalBanner from '@/Components/GlobalBanner';

export default function AuthenticatedLayout({ header, children, navBtn }) {
    const { url } = usePage();
    const { auth, settings } = usePage().props;
    const user = auth.user;

    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [logoError, setLogoError] = useState(false);

    const autoConnectUsb = usePrinterStore((state) => state.autoConnectUsb);
    const setupUsbListeners = usePrinterStore((state) => state.setupUsbListeners);

    useEffect(() => {
        setupUsbListeners();
        autoConnectUsb();
    }, [url]);

    // Dynamically pull the global app name or tenant-specific store branding based on role
    const isSuperAdmin = user.role === 'super_admin';
    const appName = isSuperAdmin 
        ? (settings?.app_name || 'System Control Panel')
        : (settings?.store_name || 'Smart Retail POS');

    const logoUrl = isSuperAdmin
        ? (settings?.logo_path ? `/storage/${settings.logo_path}` : null)
        : (settings?.store_logo_path || null);

    // Reset logoError if the logo URL changes (e.g. settings updated)
    useEffect(() => {
        setLogoError(false);
    }, [logoUrl]);

    // Helper component for Desktop Nav items
    const NavItem = ({ href, active, icon, label }) => {
        const [mounted, setMounted] = useState(false);
        useEffect(() => {
            const timer = setTimeout(() => setMounted(true), 250);
            return () => clearTimeout(timer);
        }, []);

        return (
            <Link
                href={href}
                className={`group flex items-center justify-center h-10 px-3 sm:px-3.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ease-in-out select-none
                    ${active 
                        ? 'bg-indigo-50 text-indigo-600' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
            >
                <div className="flex items-center">
                    <div className={`shrink-0 transition-colors duration-300 ${active ? 'text-indigo-600' : 'text-gray-550 group-hover:text-gray-900'}`}>
                        {icon}
                    </div>
                    <div className={`overflow-hidden
                        ${active 
                            ? 'max-w-[160px] opacity-100 ml-2' 
                            : `max-w-0 opacity-0 group-hover:max-w-[160px] group-hover:opacity-100 group-hover:ml-2 ${mounted ? 'transition-all duration-300 ease-in-out' : ''}`
                        }`}
                    >
                        <span className="whitespace-nowrap font-bold text-xs uppercase tracking-wider">
                            {label}
                        </span>
                    </div>
                </div>
            </Link>
        );
    };

    const isPosTerminal = url === '/pos';

    return (
        <div className={isPosTerminal ? "h-screen overflow-hidden flex flex-col bg-gray-100" : "min-h-screen bg-gray-100"}>

            {/* FIX: Only show the broadcast banner to Tenants (Admins/Cashiers), never to Super Admin */}
            {user.role !== 'super_admin' && <GlobalBanner />}

            {/* Nav remains z-40 so it stays above page content, but below modals (z-50) */}
            <nav className={`border-b bg-white sticky top-0 z-40 ${isPosTerminal ? 'border-gray-100 md:border-b-2 md:border-gray-300' : 'border-gray-100'}`}>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link href="/" className="flex items-center gap-2 sm:gap-4">
                                    {!logoError && logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="block h-9 w-9 sm:h-10 sm:w-10 object-cover rounded-full border border-gray-200 shadow-sm" onError={() => setLogoError(true)} />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-blue-600">
                                            <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    <span className="font-black text-base sm:text-xl text-gray-900 uppercase tracking-wider sm:tracking-[0.15em] block truncate max-w-[340px] sm:max-w-none">
                                        {appName}
                                    </span>
                                </Link>
                            </div>

                            <div className="hidden sm:flex sm:items-center sm:ms-6 sm:space-x-1 lg:space-x-4">
                                {user.role !== 'super_admin' && (
                                    <>
                                        {user.is_admin && (
                                            <>
                                                <NavItem href={route('dashboard')} active={route().current('dashboard')} label="Dashboard" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>} />

                                                {/* NEW: Reports Navigation Link */}
                                                <NavItem href={route('reports')} active={route().current('reports')} label="Reports" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>} />
                                            </>
                                        )}

                                        {!user.is_admin && <NavItem href="/pos" active={window.location.pathname === '/pos'} label="POS Terminal" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>} />}

                                        {/* USERS LINK FOR ADMINS */}
                                        {user.is_admin && <NavItem href={route('users.index')} active={route().current('users.*')} label="Users" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>} />}

                                        <NavItem href="/inventory" active={window.location.pathname === '/inventory'} label="Inventory" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>} />
                                        <NavItem href="/transactions" active={window.location.pathname === '/transactions'} label="Transactions" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>} />

                                        {/* SHIFTS HIDDEN FROM STAFF */}
                                        {user.is_admin && <NavItem href={route('shifts.index')} active={route().current('shifts.index')} label="Shifts" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />}
                                    </>
                                )}

                                {user.role === 'super_admin' && (
                                    <>
                                        <NavItem href={route('developer.index')} active={route().current('developer.index')} label="Overview" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>} />
                                        <NavItem href={route('developer.tenants')} active={route().current('developer.tenants')} label="Tenants" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>} />
                                        <NavItem href={route('developer.users.index')} active={route().current('developer.users.*')} label="Users" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>} />

                                        <div className="relative h-full flex items-center">
                                            <Dropdown>
                                                <Dropdown.Trigger>
                                                    <button className={`inline-flex items-center px-3 py-2 text-sm font-medium transition h-full border-b-2 ${route().current('developer.payments.*') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.5A2.25 2.25 0 014.5 5.25h15A2.25 2.25 0 0121.75 7.5v9A2.25 2.25 0 0119.5 18.75h-15A2.25 2.25 0 012.25 16.5v-9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 9.75h19.5M6.75 14.25h3" /></svg>
                                                            <span className="hidden lg:block">Finance</span>
                                                            <svg className="ms-1 -me-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                        </div>
                                                    </button>
                                                </Dropdown.Trigger>
                                                <Dropdown.Content align="right" width="56">
                                                    <div className="block px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Collections</div>
                                                    <Dropdown.Link href={route('developer.payments.pending')}>Pending Approvals</Dropdown.Link>
                                                    <Dropdown.Link href={route('developer.payments.history')}>Transaction History</Dropdown.Link>
                                                    <div className="border-t border-gray-100 my-1"></div>
                                                    <div className="block px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monitoring</div>
                                                    <Dropdown.Link href={route('developer.payments.overdue')}><span className="text-red-600">Overdue Payments</span></Dropdown.Link>
                                                    <Dropdown.Link href={route('developer.payments.upcoming')}>Upcoming Renewals</Dropdown.Link>
                                                </Dropdown.Content>
                                            </Dropdown>
                                        </div>

                                        <NavItem href={route('developer.billing')} active={route().current('developer.billing')} label="Plans" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                                        <NavItem href={route('developer.broadcasts')} active={route().current('developer.broadcasts')} label="Broadcasts" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>} />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:ms-6 sm:flex sm:items-center gap-4">
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button type="button" className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 hover:text-gray-700 transition duration-150 ease-in-out focus:outline-none">
                                                <span>{user.name}</span>
                                                <svg className="-me-0.5 ms-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content>
                                        <div className="block px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">My Account</div>
                                        <Dropdown.Link href={route('profile.edit')}>
                                            <span className="inline-flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                                                My Profile
                                            </span>
                                        </Dropdown.Link>

                                        {/* SYSTEM INFO MOVED TO DROPDOWN */}
                                        {user.role === 'super_admin' ? (
                                            <>
                                                <Dropdown.Link href={route('developer.system.info')}>
                                                    <span className="inline-flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.041.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.005-.828a1.125 1.125 0 01-.26-1.43l1.298-2.247a1.125 1.125 0 011.369-.491l1.217.456c.356.133.751.072 1.076-.124.072-.044.145-.086.22-.128.332-.183.582-.495.644-.869l.213-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        System Settings
                                                    </span>
                                                </Dropdown.Link>
                                                <Dropdown.Link href={route('developer.policies')}>
                                                    <span className="inline-flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-7.5a2.25 2.25 0 00-2.25-2.25h-10.5A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5h5.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6-3h6m-6 6h3m6.75 1.5l1.5 1.5 3-3" /></svg>
                                                        Policy Documents
                                                    </span>
                                                </Dropdown.Link>
                                                <Dropdown.Link href={route('developer.activity-logs')}>
                                                    <span className="inline-flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V6.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9M7.5 12h5.25M7.5 15.75h7.5" /></svg>
                                                        Activity Logs
                                                    </span>
                                                </Dropdown.Link>
                                            </>
                                        ) : (
                                            <Dropdown.Link href={route('settings')}>Store Settings</Dropdown.Link>
                                        )}

                                        <Dropdown.Link href={route('logout')} method="post" as="button"><span className="text-red-600 font-bold">Log Out</span></Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button onClick={() => setShowingNavigationDropdown(true)} className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* MOBILE NAVIGATION */}
            <div className={`fixed inset-0 z-[60] sm:hidden transition-all duration-300 ${showingNavigationDropdown ? 'visible' : 'invisible'}`}>
                <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${showingNavigationDropdown ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowingNavigationDropdown(false)} />
                <div className={`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${showingNavigationDropdown ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                        <span className="font-bold text-lg text-gray-800 uppercase tracking-widest">{appName}</span>
                        <button onClick={() => setShowingNavigationDropdown(false)} className="p-2 text-gray-500"><svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {user.role !== 'super_admin' && (
                            <>
                                {user.is_admin && (
                                    <>
                                        <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>}>Dashboard</ResponsiveNavLink>
                                        <ResponsiveNavLink href={route('reports')} active={route().current('reports')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>}>Reports</ResponsiveNavLink>
                                    </>
                                )}

                                {/* ADDED POS TERMINAL FOR MOBILE */}
                                {!user.is_admin && <ResponsiveNavLink href="/pos" active={window.location.pathname === '/pos'} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>}>POS Terminal</ResponsiveNavLink>}

                                {/* ADDED STORE USERS LINK FOR ADMINS MOBILE */}
                                {user.is_admin && <ResponsiveNavLink href={route('users.index')} active={route().current('users.*')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}>Users</ResponsiveNavLink>}

                                <ResponsiveNavLink href="/inventory" active={window.location.pathname === '/inventory'} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>}>Inventory</ResponsiveNavLink>
                                <ResponsiveNavLink href="/transactions" active={window.location.pathname === '/transactions'} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}>Transactions</ResponsiveNavLink>

                                {/* SHIFTS HIDDEN FROM STAFF ON MOBILE */}
                                {user.is_admin && <ResponsiveNavLink href={route('shifts.index')} active={route().current('shifts.index')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>Shifts</ResponsiveNavLink>}
                            </>
                        )}
                        {user.role === 'super_admin' && (
                            <>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-1 mt-2">Admin Console</div>
                                <ResponsiveNavLink href={route('developer.index')} active={route().current('developer.index')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>}>Overview</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('developer.tenants')} active={route().current('developer.tenants')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>}>Tenants</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('developer.users.index')} active={route().current('developer.users.*')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}>Users</ResponsiveNavLink>
                                <div className="border-t border-gray-100 my-2"></div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-1 mt-2">Finance</div>
                                <ResponsiveNavLink href={route('developer.payments.pending')} active={route().current('developer.payments.pending')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.5A2.25 2.25 0 014.5 5.25h15A2.25 2.25 0 0121.75 7.5v9A2.25 2.25 0 0119.5 18.75h-15A2.25 2.25 0 012.25 16.5v-9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 9.75h19.5M6.75 14.25h3" /></svg>}>Pending Approvals</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('developer.payments.history')} active={route().current('developer.payments.history')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.5A2.25 2.25 0 014.5 5.25h15A2.25 2.25 0 0121.75 7.5v9A2.25 2.25 0 0119.5 18.75h-15A2.25 2.25 0 012.25 16.5v-9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 9.75h19.5M6.75 14.25h3" /></svg>}>Payment History</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('developer.payments.overdue')} active={route().current('developer.payments.overdue')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.5A2.25 2.25 0 014.5 5.25h15A2.25 2.25 0 0121.75 7.5v9A2.25 2.25 0 0119.5 18.75h-15A2.25 2.25 0 012.25 16.5v-9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 9.75h19.5M6.75 14.25h3" /></svg>}><span className="text-red-600">Overdue Payments</span></ResponsiveNavLink>
                                <ResponsiveNavLink href={route('developer.payments.upcoming')} active={route().current('developer.payments.upcoming')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.5A2.25 2.25 0 014.5 5.25h15A2.25 2.25 0 0121.75 7.5v9A2.25 2.25 0 0119.5 18.75h-15A2.25 2.25 0 012.25 16.5v-9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 9.75h19.5M6.75 14.25h3" /></svg>}>Upcoming Renewals</ResponsiveNavLink>

                                <div className="border-t border-gray-100 my-2"></div>
                                <ResponsiveNavLink href={route('developer.billing')} active={route().current('developer.billing')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>Pricing Engine</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('developer.broadcasts')} active={route().current('developer.broadcasts')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>}>Broadcasts</ResponsiveNavLink>
                            </>
                        )}

                        <div className="border-t border-gray-100 my-4"></div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-1">My Account</div>
                        <ResponsiveNavLink href={route('profile.edit')} active={route().current('profile.edit')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}>My Profile</ResponsiveNavLink>
                        {user.role === 'super_admin' ? (
                            <>
                                <ResponsiveNavLink href={route('developer.system.info')} active={route().current('developer.system.info')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.041.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.005-.828a1.125 1.125 0 01-.26-1.43l1.298-2.247a1.125 1.125 0 011.369-.491l1.217.456c.356.133.751.072 1.076-.124.072-.044.145-.086.22-.128.332-.183.582-.495.644-.869l.213-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>System Settings</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('developer.policies')} active={route().current('developer.policies')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-7.5a2.25 2.25 0 00-2.25-2.25h-10.5A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5h5.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6-3h6m-6 6h3m6.75 1.5l1.5 1.5 3-3" /></svg>}>Policy Documents</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('developer.activity-logs')} active={route().current('developer.activity-logs')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V6.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9M7.5 12h5.25M7.5 15.75h7.5" /></svg>}>Activity Logs</ResponsiveNavLink>
                            </>
                        ) : (
                            <ResponsiveNavLink href={route('settings')} active={route().current('settings')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.041.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.005-.828a1.125 1.125 0 01-.26-1.43l1.298-2.247a1.125 1.125 0 011.369-.491l1.217.456c.356.133.751.072 1.076-.124.072-.044.145-.086.22-.128.332-.183.582-.495.644-.869l.213-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>Store Settings</ResponsiveNavLink>
                        )}
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto">
                        <ResponsiveNavLink method="post" href={route('logout')} as="button" className="w-full text-center text-red-600 font-bold">Sign Out</ResponsiveNavLink>
                    </div>
                </div>
            </div>

            {/* REMOVED: relative z-20. The header will now sit behind fixed modals correctly. */}
            {header && (
                <header className="bg-white shadow-sm border-b border-gray-100">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{header}</div>
                </header>
            )}

            {/* REMOVED: relative z-0. Main content will now allow modals to escape. */}
            <main className={`animate-in fade-in duration-500 ${isPosTerminal ? 'flex-1 h-0 overflow-hidden' : ''}`}>{children}</main>
        </div>
    );
}