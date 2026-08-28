<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- PWA Meta Tags -->
        <meta name="theme-color" content="#0B2545">
        <meta name="description" content="Inertia POS - Premium Retail Point of Sale, Inventory Management, and Multi-Branch System by Inertia Digital Solutions.">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black">
        <meta name="apple-mobile-web-app-title" content="Inertia POS">

        <!-- Social Share, Posts, Comments & Messaging Link Previews (Facebook, Messenger, WhatsApp, Discord, Twitter/X, LinkedIn, iMessage) -->
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="Inertia POS">
        <meta property="og:title" content="Inertia POS - Inertia Digital Solutions">
        <meta property="og:description" content="Inertia POS - Premium Retail Point of Sale, Inventory Management, and Multi-Branch System by Inertia Digital Solutions.">
        <meta property="og:image" content="{{ asset('images/icon-512x512.png') }}">
        <meta property="og:image:secure_url" content="{{ asset('images/icon-512x512.png') }}">
        <meta property="og:image:type" content="image/png">
        <meta property="og:image:width" content="512">
        <meta property="og:image:height" content="512">
        <meta property="og:image:alt" content="Inertia POS Logo">
        <meta property="og:url" content="{{ url()->current() }}">

        <!-- Twitter / X Card Meta Tags -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Inertia POS - Inertia Digital Solutions">
        <meta name="twitter:description" content="Inertia POS - Premium Retail Point of Sale, Inventory Management, and Multi-Branch System by Inertia Digital Solutions.">
        <meta name="twitter:image" content="{{ asset('images/icon-512x512.png') }}">
        <meta name="twitter:image:alt" content="Inertia POS Logo">

        <link rel="icon" type="image/png" href="/images/icon-192x192.png">
        <link rel="shortcut icon" type="image/png" href="/images/icon-192x192.png">
        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="apple-touch-icon" href="/images/icon-512x512.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Google Fonts: Cormorant Garamond & Manrope for Inertia POS Brand -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Manrope:wght@500;600;700&display=swap" rel="stylesheet">

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>