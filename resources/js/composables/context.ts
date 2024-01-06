import { inject, computed } from 'vue';
import { VisitorContextKey } from '../dependencies/visitor';


export function useQuery() {
  const ctx = inject(VisitorContextKey);

  if (!ctx) {
    throw new Error('Missing visitor context!');
  }

  return computed(() => ctx.value.query);
}

export function useLocation() {
  const ctx = inject(VisitorContextKey);

  if (!ctx) {
    throw new Error('Missing visitor context!');
  }

  return computed(() => ctx.value.location);
}

export function useSession() {
  const ctx = inject(VisitorContextKey);

  if (!ctx) {
    throw new Error('Missing visitor context!');
  }

  return computed(() => ctx.value.session);
}

export function useShared() {
  const ctx = inject(VisitorContextKey);

  if (!ctx) {
    throw new Error('Missing visitor context!');
  }

  return computed(() => ctx.value.shared);
}
