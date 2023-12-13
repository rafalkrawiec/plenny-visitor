<?php

namespace Plenny\Visitor;


use Closure;
use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Contracts\Cache\Factory as CacheFactory;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Contracts\Routing\ResponseFactory;
use Illuminate\Contracts\Routing\UrlGenerator;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Session\Store;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Enumerable;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Traits\Macroable;
use LogicException;
use Plenny\Framework\Globals\Facades\Globals;
use Plenny\Framework\Toasts\Factory\ToastDraft;
use Plenny\Visitor\Config\VisitorConfiguration;
use Plenny\Visitor\Http\Node\ServerRenderingGateway;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use function Plenny\Framework\Support\Array\array_merge_deep;


class VisitorFactory implements Responsable
{
    use Macroable;


    private const MODE_CSR = 'CSR';


    private const MODE_SSG = 'SSG';


    private const MODE_SSR = 'SSR';


    private AuthFactory $auth;


    private CacheFactory $cache;


    private ?string $cacheKey = null;


    private ?string $component = null;


    private VisitorConfiguration $config;


    private Dispatcher $dispatcher;


    private ?array $errors = null;


    private UrlGenerator $generator;


    private string|null|false $guard = false;


    private string $location;


    private string $manifest;


    private array $merge = [
        'shared' => null,
        'props' => null,
    ];


    private string $mode = self::MODE_CSR;


    private bool $partial = false;


    private Closure|array $props = [];


    private mixed $raw = null;


    private ?string $redirect = null;


    private bool $reload = false;


    private ResponseFactory $response;


    private Store $session;


    private array $shared = [];


    private array $toasts = [];


    private string $version = '';


    private string $view = '';


    public function __construct(
        AuthFactory          $auth,
        CacheFactory         $cache,
        VisitorConfiguration $config,
        Dispatcher           $dispatcher,
        UrlGenerator         $generator,
        ResponseFactory      $response,
        Store                $session,
    ) {
        $this->auth = $auth;
        $this->cache = $cache;
        $this->config = $config;
        $this->dispatcher = $dispatcher;
        $this->generator = $generator;
        $this->session = $session;
        $this->response = $response;
    }


    public function back(): static
    {
        return $this->redirect($this->generator->previous());
    }


    public function getGuard(): string|null|false
    {
        return $this->guard;
    }


    public function setGuard(string|null|false $guard): static
    {
        $this->guard = $guard;

        return $this;
    }


    public function getView(): string
    {
        return $this->view;
    }


    public function setView(string $name): static
    {
        $this->view = $name;

        return $this;
    }


    public function hardRedirect(RedirectResponse|string $url): static
    {
        $this->reload = true;
        $this->redirect($url);

        return $this;
    }


    public function mergePartial(array $props): static
    {
        $this->partial = true;

        if (is_null($this->merge['props'])) {
            $this->merge['props'] = [];
        }

        $this->merge['props'] = array_merge_deep($this->merge['props'], $props);

        return $this;
    }


    public function mergeShared(Arrayable|array|string $key, mixed $value = null): static
    {
        if (is_null($this->merge['shared'])) {
            $this->merge['shared'] = [];
        }

        if (is_array($key)) {
            $this->merge['shared'] = array_merge_deep($this->merge['shared'], $key);
        } elseif ($key instanceof Arrayable) {
            $this->merge['shared'] = array_merge_deep($this->merge['shared'], $key->toArray());
        } else {
            Arr::set($this->merge['shared'], $key, array_merge_deep(Arr::get($this->merge['shared'], $key, []), value($value)));
        }

        return $this;
    }


    public function noContent(): static
    {
        $this->partial = true;

        return $this;
    }


    public function partial(array $props): static
    {
        $this->partial = true;
        $this->props = array_merge_recursive($this->props, $props);

        return $this;
    }


    public function raw(mixed $raw): static
    {
        $this->partial = true;
        $this->raw = $raw;

        return $this;
    }


    public function redirect(RedirectResponse|string $url): static
    {
        $this->partial = true;

        $this->redirect = $url instanceof RedirectResponse
            ? $url->getTargetUrl()
            : $url;

        return $this;
    }


    public function redirectToIntended(string $default = '/'): static
    {
        $this->partial = true;
        $this->redirect = redirect()->intended($default)->getTargetUrl();

        return $this;
    }


    public function redirectToRoute($name, $parameters = [], $absolute = true): static
    {
        $this->partial = true;
        $this->redirect = route($name, $parameters, $absolute);

        return $this;
    }


    public function renderClient(string $component, array $props = []): static
    {
        $this->mode = self::MODE_CSR;
        $this->component = $component;
        $this->props = $props;

        return $this;
    }


    public function renderServer(string $component, array $props = []): static
    {
        if (! $this->config->isServerRenderingEnabled()) {
            return $this->renderClient($component, $props);
        }

        $this->mode = self::MODE_SSR;
        $this->component = $component;
        $this->props = $props;

        return $this;
    }


    public function renderStatic(string $component, Closure $callback = null): static
    {
        if (! $this->config->isServerRenderingEnabled()) {
            return $this->renderClient($component, is_null($callback) ? [] : $callback());
        }

        $this->mode = self::MODE_SSG;
        $this->component = $component;
        $this->props = is_null($callback) ? [] : $callback;

        return $this;
    }


    public function renderStaticLazy(Closure $callback = null): static
    {
        return $this->renderStatic('', $callback);
    }


    public function setCacheKey(Closure|string $key): static
    {
        $this->cacheKey = value($key);

        return $this;
    }


    public function setIntendedUrl(string $url): static
    {
        redirect()->setIntendedUrl($url);

        return $this;
    }


    public function setManifest(string $manifest): static
    {
        if (file_exists($manifest = App::basePath($manifest))) {
            $this->version = md5_file($manifest) ?: '';
        }

        return $this;
    }


    public function share(Arrayable|array|string $key, mixed $value = null): static
    {
        if (is_array($key)) {
            $this->shared = array_merge($this->shared, $key);
        } elseif ($key instanceof Arrayable) {
            $this->shared = array_merge($this->shared, $key->toArray());
        } else {
            Arr::set($this->shared, $key, value($value));
        }

        return $this;
    }


    public function toResponse($request): SymfonyResponse
    {
        $this->location = $this->attachLocation($request);
        $this->cacheKey = $this->cacheKey ?: $this->location;

        $data = $this->resolveVisitData($request);

        // For "X-Visitor" requests we simply return a JSON data with visit
        // details. These requests are sent when in hydrated SPA already,
        // so everything will be rendered on client side.
        if ($request->visitor()) {
            return $this->response->json($this->attachSession($data), 200, $this->attachHeaders());
        }

        // We want to attach globals for the initial page load only.
        // It might provide some global stuff from plugins like,
        // for example translations or routes.
        $data = $this->attachGlobals($data);

        // For initial page load, we have to respond with root view and
        // the initial visit data to be hydrated into SPA by client.
        // Optionally you can pre-render content in SSR in SSG modes
        // for indexing.
        $rendered = $this->resolveVisitView($data);

        // Once initial page is rendered we can now safely attach session
        // information about user. Visitors SSR and SSG always works in
        // anonymous mode to avoid user specific data leaks when content
        // is cached. Instead, we attach the data now, and the client router
        // component is made such way, that it will update its session context
        // just once it's hydrated.
        $data = $this->attachSession($data);

        return $this->response->view($this->view, compact('data', 'rendered'));
    }


    /**
     * @param string|array|Collection|callable(VisitorToastFactory):void $description
     * @param callable(VisitorToastFactory):void|null                    $factory
     *
     * @return $this
     */
    public function toast(mixed $description, callable $factory = null): static
    {
        if (is_array($description) || $description instanceof Enumerable) {
            Collection::wrap($description)->each(function ($message) use ($factory) {
                $this->toast($message, $factory);
            });

            return $this;
        }

        if (is_callable($description)) {
            $factory = $description;
            $description = '';
        }

        $toast = new ToastDraft($description);

        $this->toasts[] = $toast;

        if (! is_null($factory)) {
            $factory(new VisitorToastFactory($toast));
        }

        return $this;
    }


    public function validation(array $errors): static
    {
        $this->partial = true;
        $this->errors = $errors;

        return $this;
    }


    private function attachGlobals(array $data): array
    {
        if (class_exists(Globals::class)) {
            $data['globals'] = Globals::register()->all();
        }

        return $data;
    }


    private function attachHeaders(): array
    {
        $headers = ['X-Visitor' => 'true'];

        if ($this->partial) {
            $headers['X-Partial'] = 'true';
        }

        if ($this->raw) {
            $headers['X-Raw'] = 'true';
        }

        return $headers;
    }


    /**
     * We want to update location only for GET requests.
     * For other methods, we should provide referrer URL.
     *
     * @param Request $request
     *
     * @return string
     */
    private function attachLocation(Request $request): string
    {
        return $request->isMethod('GET')
            ? $request->fullUrl()
            : $this->generator->previous();
    }


    private function attachSession(array $data): array
    {
        $data['session'] = [
            'is_authenticated' => false,
            'user' => null,
            'via_remember' => true,
            'flash' => (object) $this->session->get('_flash.old', []),
        ];

        if ($this->guard === false) {
            return $data;
        }

        $guard = $this->auth->guard($this->guard);

        $data['session']['is_authenticated'] = $guard->check();
        $data['session']['user'] = $guard->user();
        $data['session']['via_remember'] = $guard->viaRemember();

        return $data;
    }


    private function makeAnonymousSession(): array
    {
        return [
            'is_authenticated' => false,
            'user' => null,
            'via_remember' => false,
        ];
    }


    private function makeVisitorState(Request $request): array
    {
        // Resolve closure before return statement so any other calls
        // to this service within closure might be done.
        $props = value($this->props);
        $component = Arr::get($props, 'component', $this->component);

        throw_if(! $this->partial && empty($component), new LogicException(
            'You must provide component within props when resolving view lazily.'
        ));

        return [
            'redirect' => $this->redirect ? [
                'target' => $this->redirect,
                'reload' => $this->reload,
            ] : null,
            'query' => (object) $request->query(),
            'session' => $this->makeAnonymousSession(),
            'location' => $this->location,
            'view' => $component,
            'shared' => $this->shared,
            'toasts' => collect($this->toasts)->toArray(),
            'props' => $props,
            'errors' => $this->errors,
            'merge' => $this->merge,
            'version' => $this->version,
            'raw' => $this->raw,
        ];
    }


    private function resolveVisitData(Request $request): array
    {
        $isStaticMode = $this->mode === self::MODE_SSG;
        $isProduction = App::environment('production');

        // For SSG we want to cache built data to speed up server response.
        // Cache should be involved only on initial request. For any following
        // visitor request it should avoid cache. This will solve issues with
        // pagination and filters on static pages.
        //
        // We use separate cache store, to optimize cache better.
        // States might be large for specific views, so it's better to keep them
        // separate and be able to configure `file` driver instead `redis`.
        if (! $request->visitor() && ! $this->partial && $isStaticMode && $isProduction) {
            return $this->cache->driver('visitor.data')->rememberForever(
                key: $this->cacheKey,
                callback: fn() => $this->makeVisitorState($request)
            );
        }

        // SSR should be used when you need indexing, but data changes
        // so often there is no point to cache anything.
        // CSR should be used for other cases.
        return $this->makeVisitorState($request);
    }


    private function resolveVisitView(array $data): string
    {
        // For CSR mode we don't render anything since everything will be
        // rendered on the client side. There is no need to waste resources
        // here for rendering on server.
        if ($this->mode === self::MODE_CSR) {
            return '';
        }

        // When in SSG mode we want to cache the rendered view
        // in separate store. We want to keep separate the cached data
        // and views, since when a request is an "X-Visitor" request
        // we don't need view at all, since we're in SPA already,
        // only data will be delivered for client to render client side.
        // This case will be used only for initial page loads.
        if ($this->mode === self::MODE_SSG && App::environment('production')) {
            return $this->cache->driver('visitor.views')->rememberForever(
                key: $this->cacheKey,
                callback: fn() => $this->sendServerRenderingRequest($data),
            );
        }

        // SSR mode is simply the same but without caching.
        // It will be used only for initial page loads.
        return $this->sendServerRenderingRequest($data);
    }


    private function sendServerRenderingRequest(array $data): string
    {
        return App::make(ServerRenderingGateway::class)->render($data);
    }
}
