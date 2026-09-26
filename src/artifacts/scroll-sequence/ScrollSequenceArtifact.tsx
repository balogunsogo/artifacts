"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./ScrollSequenceArtifact.module.scss";

const steps = [
  { title: "Observe", tag: "Input", copy: "Notice the signal, its context, and the small changes that give it meaning." },
  { title: "Interpret", tag: "Pattern", copy: "Turn what was observed into a clear and useful working direction." },
  { title: "Transition", tag: "Motion", copy: "Move between states while keeping hierarchy and orientation intact." },
  { title: "Accumulate", tag: "Memory", copy: "Let completed states remain visible so progress carries its own history." },
  { title: "Resolve", tag: "Output", copy: "Bring the sequence to a deliberate end with every state accounted for." },
] as const;

export function ScrollSequenceArtifact() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);
  const firstDotRef = useRef<HTMLSpanElement>(null);
  const lastDotRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    const elements = stepRefs.current.filter((step): step is HTMLElement => step !== null);
    if (!root || elements.length !== steps.length) return;

    const visible = new Set<number>();
    const chooseActive = () => {
      if (visible.size === 0) return;
      const center = window.innerHeight / 2;
      let closest = 0;
      let distance = Number.POSITIVE_INFINITY;
      visible.forEach((index) => {
        const bounds = elements[index].getBoundingClientRect();
        const nextDistance = Math.abs(bounds.top + bounds.height / 2 - center);
        if (nextDistance < distance) {
          closest = index;
          distance = nextDistance;
        }
      });
      setActiveIndex(closest);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const index = Number((entry.target as HTMLElement).dataset.stepIndex);
        if (entry.isIntersecting) visible.add(index);
        else visible.delete(index);
      });
      chooseActive();
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const first = firstDotRef.current;
    const last = lastDotRef.current;
    if (!root || !first || !last) return;

    const measure = () => {
      const rootTop = root.getBoundingClientRect().top;
      const firstCenter = first.getBoundingClientRect().top - rootTop + first.offsetHeight / 2;
      const lastCenter = last.getBoundingClientRect().top - rootTop + last.offsetHeight / 2;
      root.style.setProperty("--timeline-top", `${firstCenter}px`);
      setLineHeight(Math.max(0, lastCenter - firstCenter));
    };
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root);
    measure();
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      style={{ "--timeline-height": `${lineHeight}px`, "--timeline-progress": activeIndex / (steps.length - 1) } as CSSProperties}
    >
      <div className={styles.stickyPanel} aria-hidden="true">
        <div className={styles.numberWindow}>
          <div className={styles.numberRoll} style={{ transform: `translateY(${-activeIndex * 1}em)` }}>
            {steps.map((_, index) => <span key={index}>{String(index + 1).padStart(2, "0")}</span>)}
          </div>
        </div>
        <div className={styles.titleWindow}>
          {steps.map((step, index) => (
            <p key={step.title} data-state={index < activeIndex ? "past" : index === activeIndex ? "active" : "next"}>{step.title}</p>
          ))}
        </div>
        <div className={styles.segments}>
          {steps.map((_, index) => <span key={index} data-filled={index <= activeIndex} />)}
        </div>
        <p className={styles.meta}>Scroll</p>
      </div>

      <div className={styles.timeline} aria-hidden="true"><span /></div>
      <div className={styles.steps}>
        {steps.map((step, index) => {
          const state = index < activeIndex ? "past" : index === activeIndex ? "active" : "next";
          return (
            <article
              key={step.title}
              ref={(element) => { stepRefs.current[index] = element; }}
              className={styles.step}
              data-step-index={index}
              data-state={state}
              aria-current={index === activeIndex ? "step" : undefined}
            >
              <span ref={index === 0 ? firstDotRef : index === steps.length - 1 ? lastDotRef : undefined} className={styles.dot} />
              <div className={styles.stepMeta}><span>{String(index + 1).padStart(2, "0")}</span><span>{step.tag}</span></div>
              <h2>{step.title}</h2>
              <p>{step.copy}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
