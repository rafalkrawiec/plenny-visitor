<?php

return [

    'ssr' => [
        'enabled' => env('VISITOR_SSR_ENABLED', false),
        'url' => env('VISITOR_SSR_URL', 'http://127.0.0.1:2137'),
        'port' => env('VISITOR_SSR_PORT', 2137),
        'bundle' => env('VISITOR_SSR_BUNDLE', 'bootstrap/ssr/server.js'),
    ],

];
