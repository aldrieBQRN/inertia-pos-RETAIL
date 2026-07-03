<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Models\BlockedIp;
use App\Models\User;
use App\Services\ActivityService;

class IpBlacklistMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Safeguard: Authenticated users (cashiers/admins) bypass all checks immediately
        if (Auth::check()) {
            return $next($request);
        }

        $ip = $request->ip();

        // 2. Safeguard: Whitelisted IPs bypass all checks
        if ($this->isWhitelisted($ip)) {
            return $next($request);
        }

        // 3. Check if the IP is already blocked (checked via Cache first, then DB)
        if ($this->isBlocked($ip)) {
            abort(403, 'Access Denied: Your IP has been temporarily blocked due to security violations.');
        }

        // 4. Analyze request for malicious attack patterns
        if ($this->isSuspiciousRequest($request)) {
            $this->blockIp($request, $ip);
            abort(403, 'Access Denied: Your IP has been temporarily blocked due to security violations.');
        }

        return $next($request);
    }

    /**
     * Determine if the IP address is whitelisted.
     */
    protected function isWhitelisted(string $ip): bool
    {
        $whitelistStr = env('SECURITY_IP_WHITELIST', '');
        if (empty($whitelistStr)) {
            return false;
        }

        $whitelistedIps = array_map('trim', explode(',', $whitelistStr));
        return in_array($ip, $whitelistedIps, true);
    }

    /**
     * Determine if the IP address is currently blocked.
     */
    protected function isBlocked(string $ip): bool
    {
        // Check cache first
        if (Cache::has("blocked_ip:{$ip}")) {
            return true;
        }

        // Check database
        $blockedRecord = BlockedIp::where('ip_address', $ip)
            ->where('blocked_until', '>', now())
            ->first();

        if ($blockedRecord) {
            // Cache it until the block expires
            $secondsRemaining = now()->diffInSeconds($blockedRecord->blocked_until);
            if ($secondsRemaining > 0) {
                Cache::put("blocked_ip:{$ip}", true, $secondsRemaining);
            }
            return true;
        }

        return false;
    }

    /**
     * Analyze if request represents scanning or injection threats.
     */
    protected function isSuspiciousRequest(Request $request): bool
    {
        $path = $request->path();
        $queryString = urldecode($request->getQueryString() ?? '');

        // Pattern 1: Crawling for sensitive config/admin panel/git folders
        $prohibitedPatterns = [
            '/\.env/i',
            '/wp-(admin|config|content|includes|login)/i',
            '/xmlrpc\.php/i',
            '/\.git/i',
            '/composer\.(json|lock)/i',
            '/config/i',
            '/setup\.php/i',
            '/actuator\/health/i',
            '/cgi-bin/i',
            '/\.php$/i' // Any raw PHP script requests on a Laravel app is suspicious
        ];

        // Exempt public route setups
        if ($path === 'setup' || str_starts_with($path, 'setup/') || str_starts_with($path, 'setup-account/')) {
            // These routes are valid public onboarding routes
            return false;
        }

        foreach ($prohibitedPatterns as $pattern) {
            if (preg_match($pattern, $path)) {
                return true;
            }
        }

        // Pattern 2: Basic SQL Injection in query string
        $sqlInjectionPattern = '/(union\s+select|select\s+.*\s+from|\'\s+or\s+1\s*=\s*1|"\s+or\s+1\s*=\s*1|--|#)/i';
        if (preg_match($sqlInjectionPattern, $queryString)) {
            return true;
        }

        return false;
    }

    /**
     * Block the malicious IP address and record the event.
     */
    protected function blockIp(Request $request, string $ip): void
    {
        $path = $request->path();
        $reason = "Attempted to access prohibited or suspicious path: /{$path}";
        $blockUntil = now()->addHours(24);

        // 1. Store block record in the database
        BlockedIp::updateOrCreate(
            ['ip_address' => $ip],
            [
                'reason' => $reason,
                'blocked_until' => $blockUntil,
            ]
        );

        // 2. Cache the block for fast lookup on future requests
        Cache::put("blocked_ip:{$ip}", true, $blockUntil);

        // 3. Log a critical audit record of the intrusion
        try {
            // Resolve fallback actor to satisfy non-null DB foreign constraints
            $firstUser = User::orderBy('id')->first();
            $actorUserId = $firstUser ? $firstUser->id : 1;
            $actorStoreId = $firstUser ? $firstUser->store_id : 1;

            ActivityService::logSecurityAction('ip_blocked', "IP {$ip} blocked temporarily for 24h due to probe: /{$path}", [
                'ip_address' => $ip,
                'probed_path' => $path,
                '_actor_user_id' => $actorUserId,
                '_actor_store_id' => $actorStoreId,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to log IP blacklist security action: " . $e->getMessage());
        }
    }
}
