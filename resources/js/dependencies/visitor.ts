import type { InjectionKey } from 'vue';
import type { VisitorFormContext } from '../components/form';
import type { VisitorContext } from '../components/router';

export const VisitorContextKey = Symbol('Visitor') as InjectionKey<VisitorContext>;
export const VisitorFormKey = Symbol('VisitorForm') as InjectionKey<VisitorFormContext>;
