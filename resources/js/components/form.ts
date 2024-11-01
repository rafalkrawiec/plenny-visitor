import lodashGet from 'lodash.get';
import lodashSet from 'lodash.set';
import lodashCloneDeep from 'lodash.clonedeep';
import type { PropType } from 'vue';
import { h, ref, toValue, toRef, defineComponent, provide, nextTick } from 'vue';
import type { Response } from '../client/response';
import { VisitorFormKey } from '../dependencies/visitor';

function createFormContext<T = any>(initial: T) {
  const data = toRef(initial);
  const errors = ref({} as Record<string, string[]>);
  const submitting = ref(false as boolean);

  function get(name: string, fallback: any = null) {
    return lodashGet(data.value, name, fallback);
  }

  function set(name: string, value: any, callback?: () => void) {
    lodashSet(data.value, name, value);
    errors.value[name] = [];
    callback?.();
  }

  return { data, errors, submitting, get, set };
}

export type VisitorFormContext<T = any> = ReturnType<typeof createFormContext<T>>;
export type VisitorFormHandler = (data: any) => Promise<Response>;

export default defineComponent({
  name: 'VisitorForm',
  props: {
    initial: { type: Object, required: false, default: {} },
    raw: { type: Object, required: false },
    submit: { type: Function as PropType<VisitorFormHandler>, required: false },
    onSubmit: { type: Function as PropType<VisitorFormHandler>, required: false },
  },
  setup(props, { slots, expose }) {
    const context = createFormContext(props.raw || lodashCloneDeep(toValue(props.initial)));

    function submit() {
      let handler = props.submit || props.onSubmit;

      if (!handler) {
        return;
      }

      context.submitting.value = true;
      context.errors.value = {};

      handler(context.data.value)
        .then(() => {
          context.data.value = props.raw || lodashCloneDeep(toValue(props.initial));
        })
        .catch((res: Response) => {
          context.errors.value = res.errors;

          nextTick(() => {
            document.querySelector('.control__wrapper--error')?.scrollIntoView(true);
          });
        })
        .finally(() => {
          context.submitting.value = false;
        });
    }

    function onSubmit(event: Event) {
      event.stopPropagation();
      event.preventDefault();
      submit();
    }

    provide(VisitorFormKey, context);
    expose({ submit, context });

    return () => {
      return h('form', { onSubmit, novalidate: true }, slots.default && slots.default({
        data: context.data.value,
        errors: context.errors.value,
        submitting: context.submitting.value,
      }));
    };
  },
});
