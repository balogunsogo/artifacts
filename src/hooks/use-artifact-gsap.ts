"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Reference pattern for future artifact animation.
 * Selectors are scoped to the returned ref; useGSAP reverts its GSAP context
 * automatically, and matchMedia handles both cleanup and reduced motion.
 */
export function useArtifactGsap(selector = "[data-animate]") {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(selector, { opacity: 0, y: 12, duration: 0.55, stagger: 0.06, ease: "power2.out" });
    });
    return () => media.revert();
  }, { scope });

  return scope;
}
