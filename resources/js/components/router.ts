import { type Finder, type ComponentState, initialize, type State, type ComponentWithLayout } from '../visitor';
import { h, defineComponent, type PropType, provide, ref, nextTick, markRaw, type Ref } from 'vue';
import { VisitorContextKey } from '../dependencies/visitor';
import { findScrollParent } from '../utils/scroll';

export type VisitorContext = Ref<State>;

const component = ref();
const context = ref<State>();

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
    context.value = props.initial;

    const visitorHtmlElement = ref();

    if (!isServer) {
      initialize({
        finder: props.finder,
        initial: props.initial,
        update(args: ComponentState) {
          component.value = markRaw(args.component);
          context.value = args.state;
          return nextTick();
        },
        scroll() {
          findScrollParent(visitorHtmlElement.value)?.scrollTo(0, 0);
        },
      });
    }

    provide(VisitorContextKey, context as VisitorContext);

    return () => {
      component.value.inheritAttrs = !!component.value.inheritAttrs;

      let children = h(component.value, { ...context.value!.props, key: context.value!.location });

      if (component.value.layout) {
        children = wrap(component.value.layout).concat(children).reverse().reduce((child, layout) => {
          layout.inheritAttrs = !!layout.inheritAttrs;
          return h(layout, context.value!.props, () => child);
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
