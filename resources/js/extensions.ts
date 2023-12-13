import VisitorLink from './components/link';
import VisitorForm from './components/form';
import { route, type Route } from './utils/route';
import { url } from './utils/url';
import { $delete, $dispatch, $get, $patch, $post, $put, $redirect, $refresh, $toasts } from './visitor';

declare global {
  var __i18n_available: string[];
  var __i18n_current: string;
  var __i18n_fallback: string;

  var __routing_host: string;
  var __routing_routes: Record<string, Route>;
}

declare global {
  var __app_timezone: string;
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
