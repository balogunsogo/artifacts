"use client";

import { useEffect, useRef, type ReactNode } from "react";

type HorizontalArchiveProps = {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  labelledBy: string;
};

export function HorizontalArchive({ children, className, trackClassName, labelledBy }: HorizontalArchiveProps) {
  const scrollerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const desktop = window.matchMedia("(min-width: 901px)");
    const onWheel = (event: WheelEvent) => {
      if (!desktop.matches || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const maximum = scroller.scrollWidth - scroller.clientWidth;
      if (maximum <= 0) return;
      const direction = Math.sign(event.deltaY);
      const canMove = direction > 0 ? scroller.scrollLeft < maximum - 1 : scroller.scrollLeft > 1;
      if (!canMove) return;
      event.preventDefault();
      scroller.scrollBy({ left: event.deltaY, behavior: "auto" });
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <section ref={scrollerRef} className={className} aria-labelledby={labelledBy} tabIndex={0}>
      <div className={trackClassName}>{children}</div>
    </section>
  );
}
