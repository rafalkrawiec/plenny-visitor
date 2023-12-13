<?php

namespace Plenny\Visitor\Http\Node;


use Illuminate\Support\Facades\Http;
use Plenny\Visitor\Config\VisitorConfiguration;
use Plenny\Visitor\Exceptions\ServerRenderingException;
use Throwable;


class ServerRenderingGateway
{
    private VisitorConfiguration $config;


    public function __construct(VisitorConfiguration $config)
    {
        $this->config = $config;
    }


    public function render(array $visit): ?string
    {
        if (! $this->config->isServerRenderingEnabled()) {
            throw new ServerRenderingException("Invalid SSR configuration or JS bundle missing!");
        }

        $url = rtrim($this->config->getServerRenderingHost(), '/') . '/render';

        try {
            $rendered = Http::post($url, $visit)->throw()->body();
        }
        catch (Throwable $e) {
            throw new ServerRenderingException("SSR request failed!", previous: $e);
        }

        if (is_null($rendered)) {
            throw new ServerRenderingException("Empty SSR response detected!");
        }

        return $rendered;
    }
}
