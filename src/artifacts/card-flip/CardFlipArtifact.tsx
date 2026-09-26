"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import type { SpatialService } from "@/artifacts/spatial-services/spatial-services.data";
import { initialCardFlipServices, pickRandomCardFlipServices } from "./card-flip.data";
import styles from "./CardFlipArtifact.module.scss";

function FlipCard({ card, index }: { card: SpatialService; index: number }) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const panelId = `flip-card-${index}-${generatedId.replace(/:/g, "")}`;

  return (
    <article className={styles.card} data-open={open}>
      <div className={styles.media}>
        <div className={styles.rotator}>
          <div className={`${styles.face} ${styles.front}`} aria-hidden={open} inert={open}>
            <div className={styles.artwork}>
              <Image
                src={card.image}
                alt={card.imageAlt}
                fill
                sizes="(max-width: 767px) 82vw, 30vw"
                style={{ objectPosition: card.objectPosition }}
              />
            </div>
          </div>
          <div id={panelId} className={`${styles.face} ${styles.back}`} aria-hidden={!open} inert={!open}>
            <div className={styles.backHeader}><span>Space {String(index + 1).padStart(2, "0")}</span><span>Spatial study</span></div>
            <div><h3>{card.label}</h3><p>{card.imageAlt}.</p></div>
          </div>
        </div>
      </div>
      <div className={styles.caption}>
        <div><h2>{card.label}</h2><p>Spatial study</p></div>
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "Details"}<span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
      </div>
    </article>
  );
}

export function CardFlipArtifact() {
  const [cards, setCards] = useState<readonly SpatialService[]>(initialCardFlipServices);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCards(pickRandomCardFlipServices());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.cards}>
        {cards.map((card, index) => <FlipCard key={card.image} card={card} index={index} />)}
      </div>
    </div>
  );
}
