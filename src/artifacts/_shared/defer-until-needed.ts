/**
 * Runs `callback` once: when `element` comes within `rootMargin` of the viewport, or a
 * short while after the page has loaded, whichever happens first. Keeps below-the-fold
 * preview work (image fetches, palette extraction) off the initial load without leaving
 * it undone for long. Returns a cleanup function.
 */
export function deferUntilNeeded(
  element: Element,
  callback: () => void,
  { rootMargin = "50%", afterLoadMs = 2500 }: { rootMargin?: string; afterLoadMs?: number } = {},
): () => void {
  let done = false;
  let timer: number | null = null;
  let idleHandle: number | null = null;

  const cancelTimers = () => {
    if (timer !== null) window.clearTimeout(timer);
    if (idleHandle !== null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleHandle);
    timer = null;
    idleHandle = null;
  };

  const run = () => {
    if (done) return;
    done = true;
    observer.disconnect();
    window.removeEventListener("load", scheduleAfterLoad);
    cancelTimers();
    callback();
  };

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) run();
  }, { rootMargin });

  function scheduleAfterLoad() {
    timer = window.setTimeout(() => {
      timer = null;
      if (typeof window.requestIdleCallback === "function") idleHandle = window.requestIdleCallback(run, { timeout: 2000 });
      else run();
    }, afterLoadMs);
  }

  observer.observe(element);
  if (document.readyState === "complete") scheduleAfterLoad();
  else window.addEventListener("load", scheduleAfterLoad, { once: true });

  return () => {
    done = true;
    observer.disconnect();
    window.removeEventListener("load", scheduleAfterLoad);
    cancelTimers();
  };
}
