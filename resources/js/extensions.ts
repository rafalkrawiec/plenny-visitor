import VisitorLink from './components/link';
import VisitorForm from './components/form';
import { route, type Route } from './utils/route';
import { url } from './utils/url';
import { $delete, $dispatch, $get, $patch, $post, $put, $redirect, $refresh, $toasts } from './visitor';

declare global {
  let __i18n_available: string[];
  let __i18n_current: string;
  let __i18n_fallback: string;

  let __routing_host: string;
  let __routing_routes: Record<string, Route>;

  let __app_timezone: string;

  export interface Paginator<T = any> {
    data: T[];
    first_page_url: string;
    prev_page_url: string | null;
    links: { url: string | null; label: string; active: boolean; }[];
    next_page_url: string | null;
    last_page_url: string;
    path: string;
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
  }
}

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    VisitorLink: typeof VisitorLink,
    VisitorForm: typeof VisitorForm,
  }

  export interface ComponentCustomProperties {
    route: typeof route,
    url: typeof url,
    $delete: typeof $delete,
    $dispatch: typeof $dispatch,
    $get: typeof $get,
    $patch: typeof $patch,
    $post: typeof $post,
    $put: typeof $put,
    $redirect: typeof $redirect,
    $refresh: typeof $refresh,
    $toasts: typeof $toasts,
  }
}
