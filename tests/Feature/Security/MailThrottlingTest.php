<?php

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('recipient email is throttled after the first request for 60 seconds', function () {
    // 1. Setup a test user
    $user = User::factory()->create([
        'email' => 'victim@example.com',
        'is_active' => true
    ]);

    // 2. First send-otp request to the email address (should pass through, returning JSON)
    $response1 = $this->postJson('/forgot-password/send-otp', [
        'email' => 'victim@example.com'
    ]);
    
    // It should trigger OTP (if it sends email, it will return success message)
    $response1->assertStatus(200);

    // 3. Immediately send a second request to the SAME email address
    $response2 = $this->postJson('/forgot-password/send-otp', [
        'email' => 'victim@example.com'
    ]);

    // It must return 429 Too Many Requests
    $response2->assertStatus(429);
    $response2->assertJsonFragment([
        'message' => 'Too many verification attempts. Please wait 60 seconds before retrying.'
    ]);
});

test('alternate recipient emails are not affected by throttle', function () {
    // 1. Create two test users
    $user1 = User::factory()->create(['email' => 'user1@example.com']);
    $user2 = User::factory()->create(['email' => 'user2@example.com']);

    // 2. Request OTP for user 1 (succeeds)
    $response1 = $this->postJson('/forgot-password/send-otp', ['email' => 'user1@example.com']);
    $response1->assertStatus(200);

    // 3. Request OTP for user 2 (should succeed immediately, since email is different)
    $response2 = $this->postJson('/forgot-password/send-otp', ['email' => 'user2@example.com']);
    $response2->assertStatus(200);
});

test('throttling cooldown expires after 60 seconds', function () {
    $user = User::factory()->create(['email' => 'victim@example.com']);

    // 1. Initial request (succeeds)
    $response1 = $this->postJson('/forgot-password/send-otp', ['email' => 'victim@example.com']);
    $response1->assertStatus(200);

    // 2. Wait 61 seconds (simulated by travelling time or clearing cache keys)
    $cacheKey = 'mail_cooldown:' . sha1('victim@example.com');
    Cache::forget($cacheKey);

    // 3. Request again (should succeed since cooldown expired)
    $response2 = $this->postJson('/forgot-password/send-otp', ['email' => 'victim@example.com']);
    $response2->assertStatus(200);
});
