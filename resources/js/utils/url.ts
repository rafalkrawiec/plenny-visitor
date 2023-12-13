import { toRaw } from 'vue';

export function url(uri: string, params: Record<string, any>, hash?: string, base?: string | null) {
  const url = new URL(uri, base || __routing_host);

  attachSearchParameters(url.searchParams, params);

  if (hash) {
    url.hash = hash;
  }

  return url.toString();
}


function attachSearchParameters(search: URLSearchParams, params: Record<string, any>) {
  Object.keys(params).forEach((key) => {
    appendSearchParameter(search, key, toRaw(params[key]));
  });
}


function appendSearchParameter(search: URLSearchParams, name: string, value: any, prev?: string) {
  if (prev) {
    name = prev + '[' + name + ']';
  }

  if (value == null) {
    search.append(name, '');
    return search;
  }

  if (Array.isArray(value)) {
    value.forEach((arrValue, arrIndex) => {
      appendSearchParameter(search, arrIndex.toString(), arrValue, name);
    });

    return search;
  }

  if (typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      appendSearchParameter(search, key, value[key], name);
    });

    return search;
  }

  if (typeof value === 'boolean') {
    value = Number(value);
  }

  if (value == null) {
    value = '';
  }

  search.append(name, value);

  return search;
}
