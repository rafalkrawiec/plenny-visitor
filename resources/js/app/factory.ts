import { type Finder, type State } from '../visitor';
import { type RouterProps, Router, type RouterComponent } from '../components/router';
import { renderToString } from '@vue/server-renderer';


type SetupOptions = {
  router: RouterComponent;
  props: RouterProps;
}

type CreateOptions = {
  initial?: State | undefined;
  resolve: (name: string) => Promise<any>;
  setup: (options: SetupOptions) => any;
}

export async function createVisitor({ initial, resolve, setup }: CreateOptions) {
  const isServer = typeof window === 'undefined';
  const { globals, ...state } = initial || readInitials();

  if (!state || !globals) {
    throw new Error('No initial page data was found! Make sure you have used required directives within your Blade root view.');
  }

  Object.keys(globals).forEach((key) => {
    globalThis[key] = globals[key];
  });

  const finder: Finder = (view) => {
    return Promise.resolve(resolve(view)).then((module) => {
      return module.default || module;
    });
  };

  const app = await finder(state.view).then((component) => {
    return setup({ router: Router, props: { finder, component, initial: state } });
  });

  if (!isServer) {
    return '';
  }

  return await renderToString(app);
}

function readInitials() {
  return JSON.parse(document.getElementById('__VISITOR__')?.textContent || '');
}
