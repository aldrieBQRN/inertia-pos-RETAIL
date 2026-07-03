<?php

use App\Services\SecurityAlertService;
use App\Services\ActivityService;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('security alert formats correctly and dispatches http post when enabled', function () {
    // 1. Mock HTTP client and disable SSL validation warning
    Http::fake();

    // 2. Set environment variables dynamically
    config(['app.name' => 'Test Inertia POS']);
    putenv('SECURITY_ALERTS_ENABLED=true');
    putenv('SECURITY_ALERTS_WEBHOOK_URL=https://hooks.slack.com/services/test-webhook');

    // 3. Invoke alert dispatcher directly
    SecurityAlertService::sendAlert('ip_blocked', 'IP 1.2.3.4 was blocked', [
        'ip_address' => '1.2.3.4',
        'probed_path' => '.env'
    ]);

    // 4. Assert HTTP request was sent to the webhook with correct structure
    Http::assertSent(function ($request) {
        $url = $request->url();
        $payload = $request->data();

        $this->assertSame('https://hooks.slack.com/services/test-webhook', $url);
        $this->assertArrayHasKey('attachments', $payload);
        $this->assertSame('#EF4444', $payload['attachments'][0]['color']);
        $this->assertSame('🛡️ *Security Event Alert*', $payload['attachments'][0]['pretext']);
        $this->assertSame('IP 1.2.3.4 was blocked', $payload['attachments'][0]['title']);
        $this->assertSame('Test Inertia POS', $payload['attachments'][0]['footer']);
        
        $fields = $payload['attachments'][0]['fields'];
        $this->assertSame('Event Action', $fields[0]['title']);
        $this->assertSame('`ip_blocked`', $fields[0]['value']);
        $this->assertSame('IP Address', $fields[1]['title']);
        $this->assertSame('`1.2.3.4`', $fields[1]['value']);
        $this->assertSame('Probed Path', $fields[2]['title']);
        $this->assertSame('`/.env`', $fields[2]['value']);

        return true;
    });
});

test('security alert does not dispatch when disabled', function () {
    Http::fake();

    // 1. Set disabled
    putenv('SECURITY_ALERTS_ENABLED=false');
    putenv('SECURITY_ALERTS_WEBHOOK_URL=https://hooks.slack.com/services/test-webhook');

    // 2. Invoke alert
    SecurityAlertService::sendAlert('ip_blocked', 'IP 1.2.3.4 was blocked');

    // 3. Assert no HTTP request was sent
    Http::assertNothingSent();
});
