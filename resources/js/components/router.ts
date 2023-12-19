import { type Finder, type ComponentState, initialize, type State, type Session, type Meta, type ComponentWithLayout } from '../visitor';
import { h, shallowRef, defineComponent, type PropType, provide, ref, type Ref } from 'vue';
import { VisitorContextKey } from '../dependencies/visitor';
import type { Toast } from '../composables/toasts';

export type VisitorContext = {
  query: Ref<Record<string, any>>;
  session: Ref<Session>;
  location: Ref<string>;
  shared: Ref<Record<string, any>>;
  toasts: Ref<Toast[]>;
  properties: Ref<Record<string, any> & { meta?: Meta[] }>;
};

export const Router = defineComponent({
  name: 'VisitorRouter',
  props: {
    finder: { type: Function as PropType<Finder>, required: true },
    component: { type: Object as PropType<ComponentWithLayout>, required: true },
    initial: { type: Object as PropType<State>, required: true },
  },
  setup(props) {
    const isServer = typeof window === 'undefined';

    const component = shallowRef(props.component);
    const query = ref(props.initial.query);
    const session = ref(props.initial.session);
    const location = ref(props.initial.location);
    const shared = ref(props.initial.shared);
    const toasts = ref(props.initial.toasts);
    const properties = ref(props.initial.props);

    if (!isServer) {
      initialize({
        finder: props.finder,
        initial: props.initial,
        update(args: ComponentState) {
          component.value = args.component;
          query.value = args.state.query;
          session.value = args.state.session;
          location.value = args.state.location;
          shared.value = args.state.shared;
          toasts.value = args.state.toasts;
          properties.value = args.state.props;
        },
      });
    }

    provide(VisitorContextKey, {
      query,
      session,
      location,
      shared,
      toasts,
      properties,
    });

    return () => {
      component.value.inheritAttrs = !!component.value.inheritAttrs;

      let children = h(component.value, { ...properties.value, key: location.value });

      if (component.value.layout) {
        return wrap(component.value.layout).concat(children).reverse().reduce((child, layout) => {
          layout.inheritAttrs = !!layout.inheritAttrs;
          return h(layout, properties.value, () => child);
        });
      }

      return children;
    };
  },
});

export type RouterComponent = typeof Router;
export type RouterProps = RouterComponent['$props'];

function wrap(layout) {
  return Array.isArray(layout) ? layout : [layout];
}
