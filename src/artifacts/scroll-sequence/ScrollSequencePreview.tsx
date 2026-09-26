"use client";

import { useEffect, useState } from "react";
import styles from "./ScrollSequencePreview.module.scss";

const titles = ["Observe", "Interpret", "Transition", "Accumulate", "Resolve"] as const;

export function ScrollSequencePreview() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % titles.length);
    }, 1450);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.stickyState}>
        <div className={styles.numberWindow}>
          <div className={styles.numberRoll} style={{ transform: `translateY(${-activeIndex}em)` }}>
            {titles.map((_, index) => <span key={index}>{String(index + 1).padStart(2, "0")}</span>)}
          </div>
        </div>
        <div className={styles.titleWindow}>
          {titles.map((title, index) => <b key={title} data-state={index < activeIndex ? "past" : index === activeIndex ? "active" : "next"}>{title}</b>)}
        </div>
        <div className={styles.segments}>{titles.map((title, index) => <i key={title} data-filled={index <= activeIndex} />)}</div>
      </div>
      <div className={styles.stepList}>
        {titles.map((title, index) => (
          <span key={title} data-state={index < activeIndex ? "past" : index === activeIndex ? "active" : "next"}>
            <small>{String(index + 1).padStart(2, "0")}</small>{title}
          </span>
        ))}
      </div>
    </div>
  );
}
