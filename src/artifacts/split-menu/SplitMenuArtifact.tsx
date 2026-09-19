"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./SplitMenuArtifact.module.scss";

gsap.registerPlugin(useGSAP);

export type SplitMenuArtifactProps = {
  mode?: "preview" | "full";
  className?: string;
  interactive?: boolean;
};

type MenuState = "closed" | "opening" | "open" | "closing";
type CardGeometry = { left: number; bottom: number; width: number; height: number };

const menuItems = [
  { label: "About", image: "/artifacts/split-menu/panel-01.png" },
  { label: "Process", image: "/artifacts/split-menu/panel-02.png" },
  { label: "Work", image: "/artifacts/split-menu/panel-03.png" },
  { label: "Contact", image: "/artifacts/split-menu/panel-04.png" },
] as const;

export function SplitMenuArtifact({
  mode = "full",
  className,
  interactive = true,
}: SplitMenuArtifactProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | HTMLSpanElement>>([]);
  const imageRefs = useRef<HTMLImageElement[]>([]);
  const openMenuRef = useRef<() => void>(() => undefined);
  const closeMenuRef = useRef<() => void>(() => undefined);

  useGSAP(() => {
    const root = rootRef.current;
    const row = rowRef.current;
    const cards = cardRefs.current.filter(Boolean);
    const images = imageRefs.current.filter(Boolean);
    if (!root || !row || cards.length !== menuItems.length) return;

    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const closeButton = closeButtonRef.current;
    const background = backgroundRef.current;
    const header = headerRef.current;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let menuState: MenuState = "closed";
    let activeIndex: number | null = null;
    let lockedGeometry: CardGeometry[] | null = null;
    let hitArea: DOMRect | null = null;
    let layoutTween: gsap.core.Tween | null = null;
    let transitionTimeline: gsap.core.Timeline | null = null;
    let mobileObserver: IntersectionObserver | null = null;
    let previewObserver: IntersectionObserver | null = null;
    let previewVisible = mode === "full";
    let layoutFrame: number | null = null;
    let restoreScroll: (() => void) | null = null;

    const setMenuState = (state: MenuState) => {
      menuState = state;
      if (dialog) dialog.dataset.state = state;
    };

    const lockScroll = () => {
      const scrollY = window.scrollY;
      const previous = {
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
      };
      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      if (scrollbarWidth) document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.position = previous.position;
        document.body.style.top = previous.top;
        document.body.style.width = previous.width;
        document.body.style.overflow = previous.overflow;
        document.body.style.paddingRight = previous.paddingRight;
        window.scrollTo(0, scrollY);
      };
    };

    const unlockCardLayout = () => {
      layoutTween?.kill();
      layoutTween = null;
      lockedGeometry = null;
      row.classList.remove(styles.locked);
      gsap.set(cards, { clearProps: "position,left,bottom,width,height,flex,transform,transformOrigin" });
    };

    const lockCardLayout = () => {
      if (!finePointer.matches || lockedGeometry) return;
      const rowBounds = row.getBoundingClientRect();
      lockedGeometry = cards.map((card) => {
        const bounds = card.getBoundingClientRect();
        return {
          left: bounds.left - rowBounds.left,
          bottom: rowBounds.bottom - bounds.bottom,
          width: bounds.width,
          height: bounds.height,
        };
      });
      row.classList.add(styles.locked);
      gsap.set(cards, {
        position: "absolute",
        left: (index: number) => lockedGeometry![index].left,
        bottom: (index: number) => lockedGeometry![index].bottom,
        width: (index: number) => lockedGeometry![index].width,
        height: (index: number) => lockedGeometry![index].height,
        flex: "none",
        x: 0,
        y: 0,
      });
    };

    const targetGeometry = (nextIndex: number | null) => {
      if (!lockedGeometry) return [];
      const firstLeft = lockedGeometry[0].left;
      const gap = lockedGeometry.length > 1
        ? lockedGeometry[1].left - lockedGeometry[0].left - lockedGeometry[0].width
        : 0;
      const availableWidth = lockedGeometry.reduce((total, geometry) => total + geometry.width, 0);
      const unitWidth = availableWidth / (nextIndex === null ? cards.length : cards.length + 0.5);
      const rowHeight = row.getBoundingClientRect().height;
      let left = firstLeft;

      return cards.map((_, index) => {
        const active = index === nextIndex;
        const width = unitWidth * (active ? 1.5 : 1);
        const height = mode === "preview"
          ? rowHeight * (nextIndex === null ? 0.72 : active ? 0.92 : 0.66)
          : nextIndex === null
            ? Math.min(window.innerHeight * 0.44, 430)
            : active
              ? Math.min(window.innerHeight * 0.58, 560)
              : Math.min(window.innerHeight * 0.42, 410);
        const geometry = { left, bottom: lockedGeometry![index].bottom, width, height };
        left += width + gap;
        return geometry;
      });
    };

    const setActiveCard = (nextIndex: number | null, animate = true) => {
      if (!finePointer.matches || nextIndex === activeIndex) return;
      lockCardLayout();
      activeIndex = nextIndex;
      cards.forEach((card, index) => {
        card.classList.toggle(styles.active, nextIndex === index);
        card.classList.toggle(styles.muted, nextIndex !== null && nextIndex !== index);
      });

      const nextGeometry = targetGeometry(nextIndex);
      layoutTween?.kill();
      layoutTween = null;
      if (nextGeometry.length) {
        const properties = {
          left: (index: number) => nextGeometry[index].left,
          bottom: (index: number) => nextGeometry[index].bottom,
          width: (index: number) => nextGeometry[index].width,
          height: (index: number) => nextGeometry[index].height,
        };
        if (animate && !reducedMotion.matches) {
          layoutTween = gsap.to(cards, {
            ...properties,
            duration: mode === "preview" ? 0.42 : 0.6,
            ease: "power3.inOut",
            overwrite: true,
          });
        } else {
          gsap.set(cards, properties);
        }
      }

      gsap.to(images, {
        scale: (index: number) => index === nextIndex ? (mode === "preview" ? 1.025 : 1.045) : 1,
        opacity: (index: number) => nextIndex !== null && index !== nextIndex ? 0.7 : 1,
        duration: animate && !reducedMotion.matches ? 0.36 : 0,
        ease: "power2.inOut",
        overwrite: true,
      });
    };

    const measureHitArea = () => {
      hitArea = row.getBoundingClientRect();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!interactive || !finePointer.matches || !previewVisible) return;
      if (mode === "full" && menuState !== "open") return;
      if (!hitArea) measureHitArea();
      if (!hitArea) return;
      const progress = (event.clientX - hitArea.left) / hitArea.width;
      const inside = progress >= 0 && progress <= 1
        && event.clientY >= hitArea.top
        && event.clientY <= hitArea.bottom;
      if (!inside) {
        setActiveCard(null);
        return;
      }
      setActiveCard(Math.min(cards.length - 1, Math.max(0, Math.floor(progress * cards.length))));
    };

    const onPointerLeave = () => setActiveCard(null);

    const setupResponsiveBehavior = () => {
      mobileObserver?.disconnect();
      mobileObserver = null;
      cards.forEach((card) => card.classList.remove(styles.nearCenter, styles.active, styles.muted));
      activeIndex = null;
      hitArea = null;
      gsap.killTweensOf(images);
      gsap.set(images, { clearProps: "transform,opacity" });
      unlockCardLayout();

      if (finePointer.matches) {
        if (mode === "preview" || menuState === "open") lockCardLayout();
        measureHitArea();
        return;
      }

      if (mode === "preview") return;
      mobileObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.target.classList.toggle(styles.nearCenter, entry.isIntersecting));
      }, { root: row, rootMargin: "-36% 0px -36% 0px", threshold: 0.01 });
      cards.forEach((card) => mobileObserver?.observe(card));
    };

    const restoreClosedState = () => {
      transitionTimeline?.kill();
      transitionTimeline = null;
      mobileObserver?.disconnect();
      setActiveCard(null, false);
      unlockCardLayout();
      if (dialog?.open) dialog.close();
      setMenuState("closed");
      trigger?.setAttribute("aria-expanded", "false");
      restoreScroll?.();
      restoreScroll = null;
      trigger?.focus();
    };

    const closeMenu = () => {
      if (mode !== "full" || !dialog || menuState !== "open") return;
      setMenuState("closing");
      dialog.inert = true;

      if (reducedMotion.matches || !background || !header) {
        restoreClosedState();
        return;
      }

      transitionTimeline?.kill();
      transitionTimeline = gsap.timeline({ onComplete: restoreClosedState })
        .to(cards, { y: "7vh", opacity: 0, duration: 0.24, stagger: 0.025, ease: "power2.in" })
        .to(header, { opacity: 0, duration: 0.16 }, 0.08)
        .to(background, { scaleX: 0, transformOrigin: "right center", duration: 0.42, ease: "power4.inOut" }, 0.16);
    };

    const openMenu = () => {
      if (mode !== "full" || !dialog || !background || !header || menuState !== "closed") return;
      setMenuState("opening");
      restoreScroll = lockScroll();
      dialog.showModal();
      trigger?.setAttribute("aria-expanded", "true");
      dialog.inert = true;

      const finishOpen = () => {
        setMenuState("open");
        dialog.inert = false;
        setupResponsiveBehavior();
        closeButton?.focus();
      };

      if (reducedMotion.matches) {
        gsap.set([dialog, background, header, cards], { clearProps: "all" });
        gsap.set(dialog, { autoAlpha: 1 });
        finishOpen();
        return;
      }

      transitionTimeline?.kill();
      transitionTimeline = gsap.timeline({ onComplete: finishOpen })
        .set(dialog, { autoAlpha: 1 })
        .set(background, { scaleX: 0, transformOrigin: "right center" })
        .set([header, cards], { opacity: 0 })
        .to(background, { scaleX: 1, duration: 0.62, ease: "power4.inOut" })
        .to(header, { opacity: 1, duration: 0.24, ease: "power2.out" }, 0.16)
        .fromTo(cards, { y: "18vh", opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.055, ease: "power3.out" }, 0.38);
    };

    const onCancel = (event: Event) => {
      event.preventDefault();
      closeMenu();
    };

    const onResize = () => {
      hitArea = null;
      if (mode === "full" && menuState !== "open") return;
      setupResponsiveBehavior();
    };

    row.addEventListener("pointermove", onPointerMove, { passive: true });
    row.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", onResize, { passive: true });
    finePointer.addEventListener("change", setupResponsiveBehavior);
    reducedMotion.addEventListener("change", setupResponsiveBehavior);
    dialog?.addEventListener("cancel", onCancel);
    openMenuRef.current = openMenu;
    closeMenuRef.current = closeMenu;

    if (mode === "preview") {
      previewObserver = new IntersectionObserver(([entry]) => {
        previewVisible = entry.isIntersecting;
        if (!previewVisible) setActiveCard(null, false);
      }, { threshold: 0.04 });
      previewObserver.observe(root);
      layoutFrame = window.requestAnimationFrame(setupResponsiveBehavior);
    }

    return () => {
      transitionTimeline?.kill();
      layoutTween?.kill();
      mobileObserver?.disconnect();
      previewObserver?.disconnect();
      if (layoutFrame !== null) window.cancelAnimationFrame(layoutFrame);
      row.removeEventListener("pointermove", onPointerMove);
      row.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      finePointer.removeEventListener("change", setupResponsiveBehavior);
      reducedMotion.removeEventListener("change", setupResponsiveBehavior);
      dialog?.removeEventListener("cancel", onCancel);
      gsap.killTweensOf([...cards, ...images, background, header].filter(Boolean));
      unlockCardLayout();
      if (dialog?.open) dialog.close();
      restoreScroll?.();
      restoreScroll = null;
      openMenuRef.current = () => undefined;
      closeMenuRef.current = () => undefined;
    };
  }, { scope: rootRef, dependencies: [interactive, mode], revertOnUpdate: true });

  const cards = (
    <div ref={rowRef} className={styles.cards} aria-label={mode === "full" ? "Menu interaction demonstration" : undefined}>
      {menuItems.map((item, index) => {
        const contents = (
          <>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.imageWrap}>
              <Image
                ref={(node) => { if (node) imageRefs.current[index] = node; }}
                src={item.image}
                alt=""
                fill
                sizes={mode === "preview" ? "(max-width: 560px) 24vw, 10rem" : "(max-width: 700px) 86vw, 25vw"}
              />
            </span>
          </>
        );

        return mode === "full" ? (
          <button
            key={item.label}
            ref={(node) => { if (node) cardRefs.current[index] = node; }}
            className={styles.card}
            type="button"
            onClick={() => closeMenuRef.current()}
          >
            {contents}
          </button>
        ) : (
          <span
            key={item.label}
            ref={(node) => { if (node) cardRefs.current[index] = node; }}
            className={styles.card}
          >
            {contents}
          </span>
        );
      })}
    </div>
  );

  return (
    <div ref={rootRef} className={[styles.root, styles[mode], className].filter(Boolean).join(" ")}>
      {mode === "preview" ? (
        <div className={styles.previewFrame} aria-hidden="true">{cards}</div>
      ) : (
        <>
          <div className={styles.closedStage}>
            <span className={styles.decorativeMark} aria-hidden="true" />
            <span className={styles.featureFrame} aria-hidden="true" />
            <button
              ref={triggerRef}
              className={styles.openButton}
              type="button"
              aria-haspopup="dialog"
              aria-expanded="false"
              onClick={() => openMenuRef.current()}
            >
              <span className={styles.triggerLines} aria-hidden="true"><i /><i /></span>
              Menu
            </button>
          </div>

          <dialog ref={dialogRef} className={styles.dialog} data-state="closed" aria-label="Split Menu interaction demonstration">
            <div ref={backgroundRef} className={styles.background} aria-hidden="true" />
            <div className={styles.dialogContent}>
              <div ref={headerRef} className={styles.dialogHeader}>
                <p>Split Menu <span>Artifact 002</span></p>
                <button ref={closeButtonRef} className={styles.closeButton} type="button" onClick={() => closeMenuRef.current()}>
                  Close <span aria-hidden="true">×</span>
                </button>
              </div>
              <nav className={styles.navigation} aria-label="Menu interaction demonstration">{cards}</nav>
            </div>
          </dialog>
        </>
      )}
    </div>
  );
}
