import { inject, toRaw } from 'vue';
import { VisitorContextKey } from '../dependencies/visitor';
import { hash } from '@plenny/support';
import { $toasts } from '../visitor';

export type ToastKind = 'primary' | 'transparent' | 'danger' | 'success' | 'severe' | 'warning' | 'info';

export interface Toast {
  id: string,
  description: string,
  kind: ToastKind,
  duration: number,
}

interface ToastCreateOptions {
  id?: string,
  description: string,
  kind?: ToastKind,
  duration?: number,
}

export function useToasts() {
  const ctx = inject(VisitorContextKey);

  if (!ctx) {
    throw new Error('Missing visitor context!');
  }

  function create({ description, id = undefined, kind = 'info', duration = 3 }: ToastCreateOptions) {
    ctx!.toasts.value.push({ id: id || hash(), description, kind, duration });
    $toasts(toRaw(ctx!.toasts.value));
  }

  function remove(id: string) {
    ctx!.toasts.value = ctx!.toasts.value.filter((toast) => toast.id !== id);
    $toasts(toRaw(ctx!.toasts.value));
  }

  function isFirst(id: string) {
    return ctx!.toasts.value[0]?.id === id;
  }

  return { toasts: ctx.toasts, isFirst, create, remove };
}
