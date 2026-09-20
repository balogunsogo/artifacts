"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { spatialServices } from "./spatial-services.data";
import styles from "./SpatialServicesArtifact.module.scss";

gsap.registerPlugin(useGSAP);

const initialMediaSources: [string, string] = [spatialServices[0].image, spatialServices[0].image];

export function SpatialServicesArtifact() {
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dividerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const incomingTransitionRef = useRef<((index: number, layerIndex: number) => void) | null>(null);
  const pendingTransitionRef = useRef<{ index: number; layerIndex: number } | null>(null);
  const currentLayerRef = useRef(0);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mediaSources, setMediaSources] = useState(initialMediaSources);

  useEffect(() => {
    const pending = pendingTransitionRef.current;
    if (!pending) return;
    pendingTransitionRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      incomingTransitionRef.current?.(pending.index, pending.layerIndex);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mediaSources]);

  useGSAP(() => {
    const root = rootRef.current;
    const media = mediaRefs.current.filter((layer): layer is HTMLDivElement => layer !== null);
    const dividers = dividerRefs.current.filter((divider): divider is HTMLSpanElement => divider !== null);
    if (!root || media.length !== 2 || dividers.length !== spatialServices.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let progressTimeline: gsap.core.Timeline | null = null;
    let imageTimeline: gsap.core.Timeline | null = null;
    let isVisible = false;
    let pageIsVisible = document.visibilityState === "visible";

    const canRun = () => isVisible && pageIsVisible;
    const resetProgress = () => gsap.set(dividers, { scaleX: 0 });

    const startProgress = () => {
      if (!canRun()) return;
      const index = activeIndexRef.current;
      progressTimeline?.kill();
      progressTimeline = gsap.timeline({
        onComplete: () => activateService((index + 1) % spatialServices.length),
      });
      if (reducedMotion.matches) {
        progressTimeline.to({}, { duration: 4 });
      } else {
        progressTimeline.to(dividers[index], { scaleX: 1, duration: 4, ease: "none" });
      }
    };

    const pauseAnimations = () => {
      progressTimeline?.pause();
      imageTimeline?.pause();
    };

    const resume = () => {
      if (!canRun()) return;
      if (progressTimeline?.paused()) {
        progressTimeline.resume();
        imageTimeline?.resume();
      } else {
        startProgress();
      }
    };

    const activateService = (nextIndex: number) => {
      const currentIndex = activeIndexRef.current;
      const nextLayerIndex = currentLayerRef.current === 0 ? 1 : 0;

      progressTimeline?.kill();
      imageTimeline?.kill();
      resetProgress();
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);

      if (nextIndex === currentIndex) {
        startProgress();
        return;
      }

      pendingTransitionRef.current = { index: nextIndex, layerIndex: nextLayerIndex };
      setMediaSources((sources) => {
        const nextSources: [string, string] = [...sources] as [string, string];
        nextSources[nextLayerIndex] = spatialServices[nextIndex].image;
        return nextSources;
      });
      currentLayerRef.current = nextLayerIndex;
      startProgress();
    };

    incomingTransitionRef.current = (nextIndex, nextLayerIndex) => {
      const incoming = media[nextLayerIndex];
      const outgoing = media[nextLayerIndex === 0 ? 1 : 0];
      const mobile = window.matchMedia("(max-width: 700px)").matches;
      const incomingScale = mobile ? 1.03 : 1.08;

      gsap.set(outgoing, { autoAlpha: 1, zIndex: 1 });
      gsap.set(incoming, {
        autoAlpha: 1,
        zIndex: 2,
        clipPath: "inset(0 100% 0 0)",
        scale: incomingScale,
      });

      if (reducedMotion.matches) {
        gsap.set(incoming, { clipPath: "inset(0 0% 0 0)", scale: 1 });
        gsap.set(outgoing, { autoAlpha: 0, zIndex: 0 });
        return;
      }

      imageTimeline = gsap.timeline({
        onComplete: () => {
          gsap.set(outgoing, { autoAlpha: 0, zIndex: 0 });
          gsap.set(incoming, { clipPath: "inset(0 0% 0 0)", scale: 1 });
        },
      }).to(incoming, {
        clipPath: "inset(0 0% 0 0)",
        scale: 1,
        duration: 0.8,
        ease: "power3.inOut",
      });
    };

    gsap.set(media, { autoAlpha: 0, zIndex: 0, clipPath: "inset(0 0% 0 0)", scale: 1 });
    gsap.set(media[0], { autoAlpha: 1, zIndex: 1 });
    gsap.set(dividers, { scaleX: 0, transformOrigin: "left center" });

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) resume();
      else pauseAnimations();
    }, { threshold: 0.1 });
    const onPageVisibilityChange = () => {
      pageIsVisible = document.visibilityState === "visible";
      if (pageIsVisible) resume();
      else pauseAnimations();
    };
    const onMotionPreferenceChange = () => activateService(activeIndexRef.current);

    root.querySelectorAll<HTMLButtonElement>("[data-service-index]").forEach((button) => {
      button.addEventListener("click", () => activateService(Number(button.dataset.serviceIndex)));
    });
    visibilityObserver.observe(root);
    document.addEventListener("visibilitychange", onPageVisibilityChange);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);

    return () => {
      progressTimeline?.kill();
      imageTimeline?.kill();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", onPageVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
      incomingTransitionRef.current = null;
    };
  }, { scope: rootRef });

  return (
    <div ref={rootRef} className={styles.artifact}>
      <div className={styles.intro}>
        <h2>Spaces made to feel right</h2>
        <p className={styles.supportingCopy}>Thoughtful spaces, shaped around how people live and gather.</p>
      </div>
      <div className={styles.services}>
        <div className={styles.list} role="tablist" aria-label="Spatial service areas">
          {spatialServices.map((service, index) => (
            <button
              key={service.label}
              className={`${styles.service} ${index === activeIndex ? styles.active : ""}`}
              type="button"
              data-service-index={index}
              role="tab"
              aria-selected={index === activeIndex}
              aria-controls="spatial-services-panel"
            >
              <span className={styles.label}>{service.label}</span>
              <span ref={(element) => { dividerRefs.current[index] = element; }} className={styles.divider} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <div id="spatial-services-panel" className={styles.media} role="tabpanel" aria-live="polite" aria-label={spatialServices[activeIndex].label}>
        {mediaSources.map((source, index) => (
          <div key={index} ref={(element) => { mediaRefs.current[index] = element; }} className={styles.mediaLayer} aria-hidden="true">
            <Image
              src={source}
              alt=""
              fill
              sizes="(max-width: 700px) 100vw, 38vw"
              priority
              style={{ objectFit: "cover", objectPosition: spatialServices.find((service) => service.image === source)?.objectPosition ?? "50% 50%" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
