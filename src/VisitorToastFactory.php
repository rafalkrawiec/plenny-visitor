<?php

namespace Plenny\Visitor;


use Plenny\Framework\Toasts\Enums\ToastKind;
use Plenny\Framework\Toasts\Factory\ToastDraft;


class VisitorToastFactory
{
    private ToastDraft $toast;


    public function __construct(ToastDraft $toast)
    {
        $this->toast = $toast;
    }


    public function danger(): self
    {
        $this->toast->setKind(ToastKind::DANGER);

        return $this;
    }


    public function description(string $description): self
    {
        $this->toast->setDescription($description);

        return $this;
    }


    public function info(): self
    {
        $this->toast->setKind(ToastKind::INFO);

        return $this;
    }


    public function severe(): self
    {
        $this->toast->setKind(ToastKind::SEVERE);

        return $this;
    }


    public function showFor(int $seconds): self
    {
        $this->toast->setDuration($seconds);

        return $this;
    }


    public function success(): self
    {
        $this->toast->setKind(ToastKind::SUCCESS);

        return $this;
    }


    public function warning(): self
    {
        $this->toast->setKind(ToastKind::WARNING);

        return $this;
    }
}
