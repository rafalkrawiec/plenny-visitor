import { type Finder, type ComponentState, initialize, type State, type ComponentWithLayout, type Session, $toasts } from '../visitor';
import { h, defineComponent, type PropType, ref, nextTick, markRaw, shallowRef, type Ref, toRaw } from 'vue';
import { findScrollParent } from '../utils/scroll';
import { hash } from '@plenny/support';

export type VisitorContext = {
  query: Ref<Record<string, any>>;
  session: Ref<Session>;
  location: Ref<string>;
  shared: Ref<Record<string, any>>;
  toasts: Ref<Toast[]>;
};

const component = shallowRef();
const query = ref();
const session = ref();
const location = ref();
const shared = ref();
const toasts = ref();
const properties = ref();

export const Router = defineComponent({
  name: 'VisitorRouter',
  props: {
    finder: { type: Function as PropType<Finder>, required: true },
    component: { type: Object as PropType<ComponentWithLayout>, required: true },
    initial: { type: Object as PropType<State>, required: true },
  },
  setup(props) {
    const isServer = typeof window === 'undefined';

    component.value = markRaw(props.component);
    query.value = props.initial.query;
    session.value = props.initial.session;
    location.value = props.initial.location;
    shared.value = props.initial.shared;
    toasts.value = props.initial.toasts;
    properties.value = props.initial.props;

    const visitorHtmlElement = ref();

    if (!isServer) {
      initialize({
        finder: props.finder,
        initial: props.initial,
        update(args: ComponentState) {
          if (args.component) {
            component.value = markRaw(args.component);
            properties.value = args.state.props;
          }

          query.value = args.state.query;
          session.value = args.state.session;
          location.value = args.state.location;
          shared.value = args.state.shared;
          toasts.value = args.state.toasts;

          return nextTick();
        },
        scroll() {
          findScrollParent(visitorHtmlElement.value)?.scrollTo(0, 0);
        },
      });
    }

    return () => {
      component.value.inheritAttrs = !!component.value.inheritAttrs;

      let children = h(component.value, { ...properties.value, key: location.value });

      if (component.value.layout) {
        children = wrap(component.value.layout).concat(children).reverse().reduce((child, layout) => {
          layout.inheritAttrs = !!layout.inheritAttrs;
          return h(layout, properties.value, () => child);
        });
      }

      return h('div', { id: 'visitor', ref: (el) => visitorHtmlElement.value = el }, children);
    };
  },
});

export type RouterComponent = typeof Router;
export type RouterProps = RouterComponent['$props'];

function wrap(layout) {
  return Array.isArray(layout) ? layout : [layout];
}

export function useQuery() {
  return query;
}

export function useLocation() {
  return location;
}

export function useSession() {
  return session;
}

export function useShared() {
  return shared;
}

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
  function create({ description, id = undefined, kind = 'info', duration = 3 }: ToastCreateOptions) {
    toasts.value.push({ id: id || hash(), description, kind, duration });
    $toasts(toRaw(toasts.value));
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
    $toasts(toRaw(toasts.value));
  }

  function isFirst(id: string) {
    return toasts.value[0]?.id === id;
  }

  return { toasts, isFirst, create, remove };
}
