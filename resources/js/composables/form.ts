import type { WritableComputedRef, ComputedRef, PropType, ExtractPropTypes } from 'vue';
import { inject, computed } from 'vue';
import type { VisitorFormContext } from '../components/form';
import { VisitorFormKey } from '../dependencies/visitor';

export const VisitorControl = {
  label: { type: String, required: false },
  id: { type: String, required: false },
  name: { type: String, required: false },
  required: { type: Boolean, required: false, default: false },
  errors: { type: Array as PropType<string[]>, required: false, default: [] },
  value: { required: false },
  modelValue: { required: false },
  defaultValue: { required: false, default: null },
};

export type VisitorControlProps = ExtractPropTypes<typeof VisitorControl>;
export type VisitorFormControlProps = ExtractPropTypes<typeof VisitorControl> & {
  name: string
};
export type VisitorControlEmit = (event: 'update:modelValue', ...args: any[]) => void;

export type VisitorControl = {
  model: WritableComputedRef<any>,
  errors: ComputedRef<string[]>,
  error: ComputedRef<string | undefined>,
  hasErrors: ComputedRef<boolean>,
}

export function useVisitorForm<T = any>(): VisitorFormContext<T> {
  const form = inject(VisitorFormKey, null);

  if (!form) {
    throw new Error('Cannot access form outside of its context.');
  }

  return form;
}

export function useVisitorControl(props: VisitorControlProps, emit: VisitorControlEmit) {
  const form = inject(VisitorFormKey, null);
  let control: VisitorControl;

  if (form && props.name) {
    control = createFormControlModel(props as VisitorFormControlProps, emit, form);
  } else {
    control = createBasicControlModel(props, emit);
  }

  // Set initial value into model when undefined.
  if (control.model.value == null || control.model.value === props.defaultValue) {
    control.model.value = props.defaultValue;
  }

  return control;
}

function createBasicControlModel(props: VisitorControlProps, emit: VisitorControlEmit) {
  const model = computed({
    get: () => props.modelValue || props.value || props.defaultValue,
    set: (value) => emit('update:modelValue', value),
  });

  const errors = computed(() => props.errors || []);
  const error = computed(() => errors.value.length > 0 ? errors.value[0] : undefined);
  const hasErrors = computed(() => errors.value.length > 0);

  return { model, errors, error, hasErrors };
}

function createFormControlModel(
  props: VisitorFormControlProps,
  emit: VisitorControlEmit,
  form: VisitorFormContext,
) {
  const model = computed({
    get: () => form.get(props.name, props.defaultValue),
    set: (value) => form.set(props.name, value, () => emit('update:modelValue', value)),
  });

  const errors = computed(() => form.errors.value[props.name] || props.errors || []);
  const error = computed(() => errors.value.length > 0 ? errors.value[0] : undefined);
  const hasErrors = computed(() => errors.value.length > 0);

  return { model, errors, error, hasErrors };
}
