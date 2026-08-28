<?php

use App\Models\User;
use App\Models\BlockedIp;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guest requesting normal path is not blocked', function () {
    $response = $this->get('/login');
    $response->assertStatus(200);
});

test('guest requesting prohibited scanning path is blocked and recorded', function () {
    // 1. Send request to scanning path
    $response = $this->withServerVariables(['REMOTE_ADDR' => '1.2.3.4'])
        ->get('/.env');

    // 2. Assert blocked
    $response->assertStatus(403);

    // 3. Assert DB record exists
    $this->assertDatabaseHas('blocked_ips', [
        'ip_address' => '1.2.3.4',
    ]);
});

test('blocked ip is blocked from regular pages', function () {
    // 1. Create a blocked IP record in database
    BlockedIp::create([
        'ip_address' => '9.9.9.9',
        'reason' => 'Scan probe',
        'blocked_until' => now()->addHours(1),
    ]);

    // 2. Try to load login page from that IP
    $response = $this->withServerVariables(['REMOTE_ADDR' => '9.9.9.9'])
        ->get('/login');

    // 3. Assert 403 Forbidden
    $response->assertStatus(403);
});

test('logged in user bypasses the block even if their ip is blocked', function () {
    // 1. Create a blocked IP record
    BlockedIp::create([
        'ip_address' => '8.8.8.8',
        'reason' => 'Scan probe',
        'blocked_until' => now()->addHours(1),
    ]);

    // 2. Create a user and log them in
    $user = User::factory()->create(['role' => 'cashier']);

    // 3. Request profile page as logged-in user from the blocked IP
    $response = $this->actingAs($user)
        ->withServerVariables(['REMOTE_ADDR' => '8.8.8.8'])
        ->get('/profile');

    // 4. Should bypass block and succeed (not be a 403)
    $response->assertOk();
    $this->assertNotEquals(403, $response->getStatusCode());
});
