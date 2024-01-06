import { inject } from 'vue';
import { VisitorContextKey } from '../dependencies/visitor';


export function useQuery() {
  const ctx = inject(VisitorContextKey);

  if (!ctx) {
    throw new Error('Missing visitor context!');
  }

  return ctx.query;
}

export function useLocation() {
  const ctx = inject(VisitorContextKey);

  if (!ctx) {
    throw new Error('Missing visitor context!');
  }

  return ctx.location;
}

export function useSession() {
  const ctx = inject(VisitorContextKey);

  if (!ctx) {
    throw new Error('Missing visitor context!');
  }

  return ctx.session;
}

export function useShared() {
  const ctx = inject(VisitorContextKey);

  if (!ctx) {
    throw new Error('Missing visitor context!');
  }

  return ctx.shared;
}
