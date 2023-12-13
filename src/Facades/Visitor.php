<?php

namespace Plenny\Visitor\Facades;


use Illuminate\Support\Facades\Facade;
use Plenny\Visitor\VisitorFactory;


final class Visitor extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return VisitorFactory::class;
    }
}
