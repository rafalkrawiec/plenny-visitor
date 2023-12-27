export function findScrollParent(element: HTMLElement | undefined | null) {
  if (!element) {
    return undefined;
  }

  let parent: HTMLElement | null = element;

  while (parent) {
    const { overflow } = window.getComputedStyle(parent);

    if (overflow.split(' ').some((o) => o === 'auto' || o === 'scroll')) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return document.documentElement;
}
