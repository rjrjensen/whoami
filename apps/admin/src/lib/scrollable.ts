// A Svelte action for boxes that can scroll sideways (wide tables on a phone, long <pre> text): they become
// keyboard-focusable only while they actually overflow, so keyboard users can scroll them (WCAG 2.1.1).
export function scrollable(node: HTMLElement) {
  const update = () => {
    if (node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight) node.tabIndex = 0;
    else node.removeAttribute("tabindex");
  };
  const observer = new ResizeObserver(update);
  observer.observe(node);
  update();
  return { destroy: () => observer.disconnect() };
}
