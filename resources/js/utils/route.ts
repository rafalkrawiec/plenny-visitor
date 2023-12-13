import { toRaw } from 'vue';
import { url } from './url';

type Params = Record<string, any>;

export type Route = {
  uri: string;
  domain: string;
  params: string[];
  binding: Record<string, string>;
}

export function route(name: string, params: Params = {}, hash?: string) {
  if (isI18nAvailable()) {
    name = localizeName(name);
  }

  return build(name, params, hash);
}


function localizeName(name: string) {
  if (name.startsWith(__i18n_fallback)) {
    return name.replace(`${__i18n_fallback}.`, '');
  }

  if (__i18n_available.findIndex(lang => name.startsWith(lang)) >= 0) {
    return name;
  }

  if (__i18n_current !== __i18n_fallback) {
    return `${__i18n_current}.${name}`;
  }

  return name;
}


function isI18nAvailable() {
  return typeof __i18n_current !== 'undefined' &&
    typeof __i18n_fallback !== 'undefined' &&
    typeof __i18n_available !== 'undefined';
}


function build(name: string, params: Params, hash?: string) {
  const route = __routing_routes[name];

  if (!route) {
    throw new Error(`Undefined route: ${name}`);
  }

  const uri = replaceRouteParameters(route, params);

  const search = Object.keys(params).reduce((prev, key) => {
    if (!route.params.includes(key)) {
      prev[key] = toRaw(params[key]);
    }

    return prev;
  }, {});

  return url(uri, search, hash, route.domain);
}


function replaceRouteParameters(route: Route, params: Params) {
  return route.params.reduce((uri, param) => {
    let binding = route.binding[param] || 'id';
    let value = toRaw(params[param]);

    if (typeof value === 'object') {
      value = value[binding];
    }

    if (!value) {
      throw new Error(`Parameter ${param} is required for uri ${route.uri}.`);
    }

    return uri.replace(new RegExp(`\{${param}\??\}`), value);
  }, route.uri);
}
