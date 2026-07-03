const SCROLL_PADDING_PX = 8;

export function scrollItemIntoContainer(
  container: HTMLElement,
  item: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();

  if (itemRect.top < containerRect.top + SCROLL_PADDING_PX) {
    const delta = itemRect.top - containerRect.top - SCROLL_PADDING_PX;
    container.scrollTo({ top: container.scrollTop + delta, behavior });
    return;
  }

  if (itemRect.bottom > containerRect.bottom - SCROLL_PADDING_PX) {
    const delta = itemRect.bottom - containerRect.bottom + SCROLL_PADDING_PX;
    container.scrollTo({ top: container.scrollTop + delta, behavior });
  }
}
