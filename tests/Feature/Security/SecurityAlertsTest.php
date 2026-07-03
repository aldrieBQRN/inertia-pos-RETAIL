<?php

use App\Services\SecurityAlertService;
use App\Services\ActivityService;
use App\Models\User;
use App\Mail\SecurityAlertMail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('security alert formats correctly and dispatches http post when webhook channel is enabled', function () {
    // 1. Mock HTTP client and disable SSL validation warning
    Http::fake();
    Mail::fake();

    // 2. Set environment variables dynamically
    config(['app.name' => 'Test Inertia POS']);
    putenv('SECURITY_ALERTS_ENABLED=true');
    putenv('SECURITY_ALERTS_CHANNEL=webhook');
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

    // Assert no mail was sent
    Mail::assertNothingQueued();
});

test('security alert queues email when email channel is enabled', function () {
    Http::fake();
    Mail::fake();

    // 1. Set environment variables dynamically
    putenv('SECURITY_ALERTS_ENABLED=true');
    putenv('SECURITY_ALERTS_CHANNEL=email');
    putenv('SECURITY_ALERTS_EMAIL_RECIPIENT=admin@test.com');

    // 2. Invoke alert
    SecurityAlertService::sendAlert('login_failed', 'Failed login attempt from IP 5.5.5.5', [
        'ip_address' => '5.5.5.5',
        'email' => 'hacker@test.com'
    ]);

    // 3. Assert mail is queued
    Mail::assertQueued(SecurityAlertMail::class, function ($mail) {
        return $mail->hasTo('admin@test.com') &&
               $mail->action === 'login_failed' &&
               $mail->description === 'Failed login attempt from IP 5.5.5.5';
    });

    // Assert no HTTP request was sent
    Http::assertNothingSent();
});

test('security alert triggers both channels when both channel is enabled', function () {
    Http::fake();
    Mail::fake();

    // 1. Set environment variables dynamically
    putenv('SECURITY_ALERTS_ENABLED=true');
    putenv('SECURITY_ALERTS_CHANNEL=both');
    putenv('SECURITY_ALERTS_EMAIL_RECIPIENT=admin@test.com');
    putenv('SECURITY_ALERTS_WEBHOOK_URL=https://hooks.slack.com/services/test-webhook');

    // 2. Invoke alert
    SecurityAlertService::sendAlert('user.update.role', 'User role escalated to admin', [
        'email' => 'malicious@test.com',
        'role' => 'admin'
    ]);

    // 3. Assert both triggers occurred
    Http::assertSent(function ($request) {
        return $request->url() === 'https://hooks.slack.com/services/test-webhook';
    });

    Mail::assertQueued(SecurityAlertMail::class, function ($mail) {
        return $mail->hasTo('admin@test.com');
    });
});

test('security alert does not dispatch when disabled', function () {
    Http::fake();
    Mail::fake();

    // 1. Set disabled
    putenv('SECURITY_ALERTS_ENABLED=false');
    putenv('SECURITY_ALERTS_WEBHOOK_URL=https://hooks.slack.com/services/test-webhook');

    // 2. Invoke alert
    SecurityAlertService::sendAlert('ip_blocked', 'IP 1.2.3.4 was blocked');

    // 3. Assert no triggers occurred
    Http::assertNothingSent();
    Mail::assertNothingQueued();
});
