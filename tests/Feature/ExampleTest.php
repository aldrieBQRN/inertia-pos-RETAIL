<?php

it('returns a successful response or redirects unauthenticated visitors to login', function () {
    $response = $this->get('/');

    $response->assertRedirect('/login');
});
