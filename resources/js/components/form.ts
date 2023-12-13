import lodashGet from 'lodash.get';
import lodashSet from 'lodash.set';
import lodashCloneDeep from 'lodash.clonedeep';
import type { PropType } from 'vue';
import { h, ref, toValue, toRef, defineComponent, provide, nextTick } from 'vue';
import type { Response } from '../client/response';
import { VisitorFormKey } from '../dependencies/visitor';

function createFormContext(initial: any) {
  const data = toRef(initial);
  const errors = ref({});
  const submitting = ref(false);

  function get(name: string, fallback: any = null) {
    return lodashGet(data.value, name, fallback);
  }

  function set(name: string, value: any, callback: () => void) {
    lodashSet(data.value, name, value);
    errors.value[name] = [];
    callback();
  }

  return { data, errors, submitting, get, set };
}

export type VisitorFormContext = ReturnType<typeof createFormContext>;
export type VisitorFormHandler = (data: any) => Promise<Response>;

export default defineComponent({
  name: 'VisitorForm',
  props: {
    initial: { type: Object, required: false, default: {} },
    raw: { type: Object, required: false },
    submit: { type: Function as PropType<VisitorFormHandler>, required: false },
    onSubmit: { type: Function as PropType<VisitorFormHandler>, required: false },
  },
  setup(props, ctx) {
    const context = createFormContext(props.raw || lodashCloneDeep(toValue(props.initial)));

    function onSubmit(event: Event) {
      event.stopPropagation();
      event.preventDefault();

      let handler = props.submit || props.onSubmit;

      if (!handler) {
        return;
      }

      context.submitting.value = true;
      context.errors.value = {};

      handler(context.data.value).then(() => {
        context.data.value = props.initial;
      }).catch((res: Response) => {
        context.errors.value = res.errors;

        nextTick(() => {
          let err = document.querySelector('.control-error');
          let wrapper = err?.closest('.control-wrapper');

          (wrapper || err)?.scrollIntoView(true);
        });
      }).finally(() => {
        context.submitting.value = false;
      });
    }

    provide(VisitorFormKey, context);

    return () => {
      return h('form', { onSubmit, novalidate: true }, ctx.slots.default && ctx.slots.default({
        data: context.data.value,
        errors: context.errors.value,
        submitting: context.submitting.value,
      }));
    };
  },
});
