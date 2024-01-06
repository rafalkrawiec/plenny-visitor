import { defineComponent, ref, computed, h, type PropType } from 'vue';
import { $dispatch, useLocation } from '../visitor';
import { type Body, type Method } from '../client/request';

function shouldInterceptEvent(event: MouseEvent, href: string, target?: string) {
  if (target === '_blank' || isCrossOriginHref(href)) {
    return false;
  }

  return !(
    event.defaultPrevented ||
    event.button > 1 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  );
}

function isCrossOriginHref(href: string) {
  try {
    let currentOrigin = window.location.host;
    let targetOrigin = new URL(href).host;

    return currentOrigin !== targetOrigin;
  } catch (e) {
    return false;
  }
}

export default defineComponent({
  name: 'VisitorLink',
  props: {
    href: { type: String, required: false },
    target: { type: String, required: false },
    method: { type: String as PropType<Method>, required: false, default: 'GET' },
    body: { type: [] as PropType<Body>, required: false },
    explicit: Boolean,
  },
  setup(props, { attrs, slots }) {
    const location = useLocation();
    const pending = ref(false);

    const active = computed(() => {
      let current = location.value.replace(/\/$/, '');
      let target = props.href?.replace(/\/$/, '');
      let explicit = current === target;
      let implicit = (!props.explicit && target && location.value.startsWith(target));

      return explicit || implicit;
    });

    const as = computed(() => props.href ? 'a' : 'button');
    const specific = computed(() => props.href ? { target: props.target } : {});

    function onClick(event: MouseEvent) {
      if (!props.href || !shouldInterceptEvent(event, props.href, props.target)) {
        return;
      }

      event.preventDefault();
      let { method, href, body } = props;
      pending.value = true;

      $dispatch(method, href, body).then(() => {
        pending.value = false;
      });
    }

    return () => h(
      as.value,
      {
        href: props.href,
        onClick,
        ...specific.value,
        ...attrs,
        class: [{ active: active.value, pending: pending.value }],
      },
      // @ts-ignore
      slots.default({ active, pending }),
    );
  },
});
