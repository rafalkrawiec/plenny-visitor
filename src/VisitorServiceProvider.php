<?php

namespace Plenny\Visitor;


use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\ValidationException;
use Plenny\Visitor\Config\VisitorConfiguration;
use Plenny\Visitor\Facades\Visitor;
use Plenny\Visitor\View\Directives\RenderVisitorApp;
use Plenny\Visitor\View\Directives\RenderVisitorHead;
use Plenny\Visitor\View\Directives\RenderVisitorScript;
use Throwable;


class VisitorServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/../config/visitor.php' => $this->app->basePath('config/visitor.php'),
        ], ['config']);
    }


    public function register(): void
    {
        $this->app->singleton(VisitorConfiguration::class);
        $this->app->singleton(VisitorFactory::class);

        $this->mergeConfigFrom(__DIR__ . '/../config/visitor.php', 'visitor');

        $this->registerConsoleCommands();
        $this->registerBladeDirectives();
        $this->registerRequestMacro();

        $this->app->afterResolving(Handler::class, function (Handler $instance) {
            $instance->renderable(function (ValidationException $e, Request $request) {
                if ($request->visitor()) {
                    Visitor::toast(trans('toasts::messages.fix_validation_error'), fn($toast) => $toast->danger());
                    Visitor::validation($e->errors());

                    return Visitor::toResponse($request)->setStatusCode($e->status);
                }

                return null;
            });

            $instance->renderable(function (Throwable $e, Request $request) {
                if (
                    $e instanceof ValidationException ||
                    $e instanceof AuthenticationException ||
                    app()->hasDebugModeEnabled()
                ) {
                    return null;
                }

                $code = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
                $message = $e->getMessage();

                // TODO: Refactor global shareables to be registered in different way.
                //       For know we have issues once error pages are loaded since
                //       global shared state is missing in further pages.

                return Visitor::setView('web')
                    ->renderClient('error', compact('code', 'message'))
                    ->toResponse($request)
                    ->setStatusCode($code);
            });
        });
    }


    protected function registerBladeDirectives(): void
    {
        $this->callAfterResolving('blade.compiler', function ($blade) {
            $blade->directive('visitorApp', [RenderVisitorApp::class, 'compile']);
            $blade->directive('visitorHead', [RenderVisitorHead::class, 'compile']);
            $blade->directive('visitorScript', [RenderVisitorScript::class, 'compile']);
        });
    }


    protected function registerConsoleCommands(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        $this->commands([
            Commands\StartNodeServer::class,
            Commands\StopNodeServer::class,
        ]);
    }


    protected function registerRequestMacro(): void
    {
        Request::macro('visitor', function () {
            return (bool) $this->header('X-Visitor');
        });
    }
}
