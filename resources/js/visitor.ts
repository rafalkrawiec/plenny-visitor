import lodashMerge from 'lodash.merge';
import { type Component } from 'vue';
import { Request, type Method, type Body } from './client/request';
import { type Response } from './client/response';
import { type Toast } from './composables/toasts';

export { default as VisitorForm } from './components/form';
export { default as VisitorLink } from './components/link';

export * from './composables/context';
export * from './composables/form';
export * from './composables/toasts';
export * from './app/factory';
export * from './app/plugin';
export * from './utils/route';
export * from './utils/url';

export type Meta = {
  type: 'title',
  content: string;
} | {
  type: 'meta',
  name: string;
  content: string;
} | {
  type: 'snippet',
  content: string;
};

export type Session = {
  is_authenticated: boolean;
  user: any;
  via_remember: boolean;
  flash: Record<string, any>;
};

export type ResponseState = State & {
  merge?: {
    shared?: Record<string, any>;
    props?: Record<string, any> & { meta?: Meta[] };
  }
}

export type State = {
  // Redirect URL to perform after partial state update.
  redirect?: { target: string; reload: boolean; } | null;

  // Request query parameters processed from backend.
  query: Record<string, any>;

  // Session state from server.
  session: Session;

  // Location returned by backend.
  location: string;

  // Path to view component for given page.
  view: string;

  // Shared props updates.
  shared: Record<string, any>;

  // Props passed to component once it's resolved.
  props: Record<string, any> & { meta?: Meta[] };

  toasts: Toast[];

  // Page assets version.
  version: string;
}

export type ComponentWithLayout = Component & {
  inheritAttrs?: boolean;
  layout?: ComponentWithLayout;
}

export type ComponentState = {
  component: ComponentWithLayout;
  state: State;
};

export type Finder = (view: string) => Promise<Component>;
export type UpdateHandler = (state: ComponentState) => void;

type Init = {
  initial: State;
  finder: Finder;
  update: UpdateHandler;
}

type Options = {
  method: Method;
  url: string;
  body?: Body;
  replace?: boolean;
  keepPosition?: boolean;
}

let channel: BroadcastChannel;

class Visitor {
  protected finder!: Finder;
  protected onUpdate!: UpdateHandler;

  protected state!: State;
  protected request: Request | undefined;

  public init({ initial, finder, update }: Init): void {
    this.finder = finder;
    this.onUpdate = update;

    this.initializeFirstVisit(initial);
    this.initializeStateEvents();
    this.initializePreviewBroadcast();
  };

  protected initializePreviewBroadcast() {
    channel = new BroadcastChannel('visitor_preview');
    channel.onmessage = (event) => {
      if (event.data.cmd === 'REFRESH') {
        this.refresh();
      }
    };
  }

  protected initializeStateEvents() {
    window.addEventListener('popstate', this.handlePopstateEvent.bind(this));
  }

  protected initializeFirstVisit(state: State) {
    this.replaceHistoryState(state);
  }

  protected fireEvent(name: string, options = {}) {
    return document.dispatchEvent(new CustomEvent(`visitor:${name}`, options));
  }

  public dispatch({ method, url, body = null, replace = false, keepPosition = false }: Options) {
    if (this.request !== undefined) {
      this.request.abort();
    }

    this.fireEvent('start');
    let request = new Request(method, url, body);

    return request.send()
      .then((res) => {
        // First we want to merge state within visitor to apply any partial
        // changes to the state props/shared parts.
        this.mergeState(res.data, res.partial, res.raw);

        // Now once state is merged, we can call redirect when provided.
        // There are two modes for redirect, with or without a hard reload.
        //
        // When hard reload option is provided, we simply change window location,
        // and we return promise which never resolves. This will block unnecessary
        // further code execution.
        if (res.redirect) {
          if (res.redirect.reload) {
            return new Promise(() => {
              window.location.href = res.redirect.target;
            });
          }

          return this.dispatch({
            method: 'GET',
            url: res.redirect.target,
            replace: false,
          });
        }

        // Otherwise, we can simply update the component with fresh state.
        return this.updateComponent(
          this.state,
          res.partial || replace,
          res.partial || keepPosition,
        ).then((state) => {
          if (res.raw) {
            return res.data.raw;
          }

          return state;
        });
      })
      .catch((error: Response) => {
        console.error(error);

        this.fireEvent('error');

        if (error.status === 419) {
          window.location.reload();
          return Promise.reject(error);
        }

        this.mergeState(error.data, error.partial, error.raw);
        this.updateComponent(this.state, error.partial, error.raw);

        return Promise.reject(error);
      })
      .finally(() => {
        this.fireEvent('done');
      });
  }

  public toasts(fresh: Toast[]) {
    this.state.toasts = fresh;
  }

  protected mergeState(fresh: ResponseState, partial: boolean = false, raw: boolean = false): State {
    // We always update shared state, session and version between visitor calls.
    // These are kinda global states kept between calls and should be updated
    // With every requst to the server.
    Object.assign(this.state, {
      shared: { ...this.state.shared, ...fresh.shared },
      toasts: [...this.state.toasts, ...fresh.toasts],
      session: fresh.session,
      version: fresh.version,
    });

    // When shared state partials to merge are provided, we simply deep merge
    // the state, this can be useful when building complex forms where you
    // want to only partially update the state that has changed,
    // without overriding possibly dirty parts of the form.
    if (fresh.merge?.shared) {
      lodashMerge(this.state.shared, fresh.merge.shared);
    }

    // In case of "raw" request which are usually just API calls to get some
    // dynamic data within components, which do not require full visitor update,
    // we only update shared, session and version parts of the state, to keep
    // "globals" in sync. Redirects are still handled for "raw" requests.
    if (raw) {
      return this.state;
    }

    // When it's partial or full visit, we always update location
    // and query state, which might change between those requests and might be
    // responsible for page changes.
    Object.assign(this.state, {
      location: fresh.location,
      query: fresh.query,
    });

    // Partial requests are special kind of requests where we do not want
    // to update all page properties but for example only some of them.
    // This is perfect solution for example when paginating some results.
    if (partial) {
      Object.assign(this.state, {
        props: { ...this.state.props, ...fresh.props },
      });

      if (fresh.merge?.props) {
        lodashMerge(this.state.props, fresh.merge.props);
      }

      return this.state;
    }

    // Finally, when a full visit is done, we update the view, and replace
    // all props instead of merging them. This will make a "full page" reload.
    return Object.assign(this.state, {
      view: fresh.view,
      props: fresh.props,
    });
  }

  public refresh(): Promise<State> {
    return this.dispatch({
      method: 'GET',
      url: this.state.location,
      replace: true,
      keepPosition: true,
    });
  }

  protected pushHistoryState(state: State) {
    this.state = state;

    window.history.pushState(state.location, '', state.location);

    return state;
  }

  protected replaceHistoryState(state: State) {
    this.state = state;

    window.history.replaceState(state.location, '', state.location);

    return state;
  }

  protected handlePopstateEvent(event: PopStateEvent) {
    if (event.state !== null) {
      this.dispatch({ method: 'GET', url: event.state, replace: true });
    } else {
      this.replaceHistoryState(this.state);
    }
  }

  protected updateComponent(state: State, replace: boolean = false, keepPosition: boolean = false) {
    return this.finder(state.view).then((component) => {
      this.resetScrollPosition(keepPosition);
      this.updateHead(state.props.meta);

      if (replace) {
        this.replaceHistoryState(state);
      } else {
        this.pushHistoryState(state);
      }

      this.onUpdate.call(this, { component, state });

      return state;
    });
  }

  protected resetScrollPosition(keepPosition: boolean = false) {
    if (!keepPosition) {
      window.scrollTo(0, 0);
    }
  }

  protected updateHead(meta?: Meta[]) {
    // Do not update meta tags until new one arrives.
    // Otherwise, you'll end with page without metadata.
    if (!meta) {
      return;
    }

    document.head.querySelectorAll('[data-visitor]').forEach((element) => element.remove());

    meta.forEach((tag) => {
      let element: HTMLElement;

      switch (tag.type) {
        case 'title':
          element = document.createElement('title');
          element.innerHTML = tag.content;
          break;

        case 'meta':
          element = document.createElement('meta');
          element.setAttribute('name', tag.name);
          element.setAttribute('content', tag.content);
          break;

        case 'snippet':
          element = document.createElement('script');
          element.setAttribute('type', 'application/ld+json');
          element.innerHTML = tag.content;
          break;
      }

      element.setAttribute('visitor', '');

      document.head.append(element);
    });
  }
}


/**
 * We do not want to export visitor instance from the module.
 * It should not expose its internals outside to avoid unintended usage.
 */

const visitor = new Visitor();


/**
 * Below we have a public API methods exposed outside the module.
 */

export const defaultSession: Session = {
  is_authenticated: false,
  user: null,
  via_remember: false,
  flash: {},
};

export const $get = (url: string) => {
  return visitor.dispatch({ method: 'GET', url });
};

export const $post = (url: string, body?: Body) => {
  return visitor.dispatch({ method: 'POST', url, body });
};

export const $patch = (url: string, body?: Body) => {
  return visitor.dispatch({ method: 'PATCH', url, body });
};

export const $put = (url: string, body?: Body) => {
  return visitor.dispatch({ method: 'PUT', url, body });
};

export const $delete = (url: string) => {
  return visitor.dispatch({ method: 'DELETE', url });
};

export const $dispatch = (method: Method, url: string, body?: Body) => {
  return visitor.dispatch({ method, url, body });
};

export const $refresh = () => {
  return visitor.refresh();
};

export const $redirect = (url: string) => {
  visitor.dispatch({ method: 'GET', url });
};

export const $toasts = (toasts: Toast[]) => {
  visitor.toasts(toasts);
};

export const initialize = (initial: Init) => {
  visitor.init(initial);
};
