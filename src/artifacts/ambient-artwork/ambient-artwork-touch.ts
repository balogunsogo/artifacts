// Touch artwork depth + fullscreen artwork viewer for Artifact 005.
// Only ever created while `(pointer: coarse)` matches, so the fine-pointer hover in
// AmbientArtworkArtifact never shares an element state, listener or CSS variable with it.

export type AmbientArtworkTouchElements = {
  stage: HTMLElement;
  artwork: HTMLElement;
  viewer: HTMLElement;
  backdrop: HTMLElement;
  frame: HTMLElement;
  close: HTMLButtonElement;
};

type SpringParams = { omega: number; zeta: number };
type Spring = { value: number; velocity: number; target: number; params: SpringParams; epsilon: number };
type Profile = {
  tiltRatio: number;
  referenceSize: number;
  sizeFactorRange: [number, number];
  press: number;
  shift: number;
  follow: SpringParams;
  release: SpringParams;
};
type Gesture = {
  id: number;
  mode: "slot" | "viewer";
  surface: HTMLElement;
  tilts: boolean;
  bounds: DOMRect | null;
  profile: Profile;
  captured: boolean;
  startX: number;
  startY: number;
  startTime: number;
  isTap: boolean;
};
type ViewerState = "closed" | "opening" | "open" | "closing";

const easeCinematic = "cubic-bezier(0.22, 0.72, 0.2, 1)";
const openDurationMs = 520;
const closeDurationMs = 460;
const tapSlopPx = 10;
const tapMaxMs = 500;

// The full-mode desktop hover peaks at ±6.4deg; every touch range below is derived from it.
const desktopMaxTilt = 6.4;

const followSpring = { omega: 19, zeta: 1 };
const releaseSpring = { omega: 10.5, zeta: 0.84 };
const viewerFollowSpring = { omega: 14, zeta: 1 };
const viewerReleaseSpring = { omega: 8.5, zeta: 0.8 };
const closeSettleSpring = { omega: 13, zeta: 1 };
const pressInSpring = { omega: 30, zeta: 1 };
const pressOutSpring = { omega: 13, zeta: 0.8 };

// In the page: controlled and anchored. Fullscreen: the strongest version, isolated on black.
const slotProfile: Profile = {
  tiltRatio: 1.75,
  referenceSize: 320,
  sizeFactorRange: [0.8, 1.1],
  press: 0.972,
  shift: 0,
  follow: followSpring,
  release: releaseSpring,
};
const viewerProfile: Profile = {
  tiltRatio: 2.6,
  referenceSize: 400,
  sizeFactorRange: [0.85, 1.05],
  press: 0.962,
  shift: 3.5, // % of the artwork's own size, toward the finger
  follow: viewerFollowSpring,
  release: viewerReleaseSpring,
};
const reflectionShiftPerDegree = 5.7;
const reflectionOpacityPerDegree = 0.025;
// Same light response as the desktop hover: the shadow slides away from the raised edge.
const shadowShiftPerDegree = -1.15;

const motionProperties = [
  "--touch-tilt-x",
  "--touch-tilt-y",
  "--touch-shift-x",
  "--touch-shift-y",
  "--touch-press",
  "--touch-reflection-shift",
  "--touch-reflection-opacity",
  "--touch-shadow-x",
];
const triggerAttributes = ["role", "tabindex", "aria-label", "aria-haspopup"];

function createSpring(value: number, epsilon: number): Spring {
  return { value, velocity: 0, target: value, params: releaseSpring, epsilon };
}

function stepSpring(spring: Spring, dt: number) {
  const { omega, zeta } = spring.params;
  const acceleration = omega * omega * (spring.target - spring.value) - 2 * zeta * omega * spring.velocity;
  spring.velocity += acceleration * dt;
  spring.value += spring.velocity * dt;
}

// Linear through the middle, then increasing resistance, capped at the edge and beyond.
function resist(value: number) {
  const knee = 0.75;
  const magnitude = Math.abs(value);
  if (magnitude <= knee) return value;
  return Math.sign(value) * (knee + (1 - knee) * Math.tanh((magnitude - knee) / (1 - knee)));
}

function maxTiltFor(profile: Profile, artSize: number) {
  const [minFactor, maxFactor] = profile.sizeFactorRange;
  const sizeFactor = Math.max(minFactor, Math.min(maxFactor, Math.sqrt(profile.referenceSize / artSize)));
  return desktopMaxTilt * profile.tiltRatio * sizeFactor;
}

function currentTransform(element: Element) {
  return getComputedStyle(element).transform || "none";
}

function currentOpacity(element: Element) {
  return Number.parseFloat(getComputedStyle(element).opacity);
}

/** Wires the touch interaction onto Artifact 005's own elements and returns a full teardown. */
export function createAmbientArtworkTouch({ stage, artwork, viewer, backdrop, frame, close }: AmbientArtworkTouchElements) {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const motion = {
    tiltX: createSpring(0, 0.01),
    tiltY: createSpring(0, 0.01),
    shiftX: createSpring(0, 0.005),
    shiftY: createSpring(0, 0.005),
    press: createSpring(1, 0.0003),
    maxTilt: desktopMaxTilt * slotProfile.tiltRatio,
    frame: null as number | null,
    lastTime: 0,
  };
  const springs = [motion.tiltX, motion.tiltY, motion.shiftX, motion.shiftY, motion.press];

  let gesture: Gesture | null = null;
  let suppressClickUntil = 0;
  let viewerState: ViewerState = "closed";
  let viewerAnimations: Animation[] = [];
  let lockedScroll: { y: number; htmlOverflow: string; bodyOverflow: string } | null = null;
  let inertRegions: Element[] = [];
  let openedByPointer = false;

  // Touch motion: pointer input only sets spring targets; a single rAF loop renders them.
  function writeMotion() {
    const limit = motion.maxTilt * 1.08;
    const tiltX = Math.max(-limit, Math.min(limit, motion.tiltX.value));
    const tiltY = Math.max(-limit, Math.min(limit, motion.tiltY.value));

    artwork.style.setProperty("--touch-tilt-x", `${tiltX.toFixed(3)}deg`);
    artwork.style.setProperty("--touch-tilt-y", `${tiltY.toFixed(3)}deg`);
    artwork.style.setProperty("--touch-shift-x", `${motion.shiftX.value.toFixed(3)}%`);
    artwork.style.setProperty("--touch-shift-y", `${motion.shiftY.value.toFixed(3)}%`);
    artwork.style.setProperty("--touch-press", motion.press.value.toFixed(4));
    // Driven by the actual angle, so the highlight stays locked to the surface in both ranges.
    artwork.style.setProperty("--touch-reflection-shift", `${(tiltY * reflectionShiftPerDegree).toFixed(2)}%`);
    artwork.style.setProperty(
      "--touch-reflection-opacity",
      (0.12 + Math.min(0.4, Math.abs(tiltY) * reflectionOpacityPerDegree)).toFixed(3),
    );
    artwork.style.setProperty("--touch-shadow-x", `${(tiltY * shadowShiftPerDegree).toFixed(2)}px`);
  }

  function renderMotion(time: number) {
    const dt = motion.lastTime ? Math.min(0.05, (time - motion.lastTime) / 1000) : 1 / 60;
    motion.lastTime = time;
    let settled = true;

    for (const spring of springs) {
      for (let remaining = dt; remaining > 0; remaining -= 1 / 120) {
        stepSpring(spring, Math.min(remaining, 1 / 120));
      }

      if (Math.abs(spring.target - spring.value) > spring.epsilon || Math.abs(spring.velocity) > spring.epsilon) {
        settled = false;
      } else {
        spring.value = spring.target;
        spring.velocity = 0;
      }
    }

    writeMotion();

    if (settled) {
      motion.frame = null;
      motion.lastTime = 0;
    } else {
      motion.frame = requestAnimationFrame(renderMotion);
    }
  }

  function requestMotionFrame() {
    if (motion.frame === null) motion.frame = requestAnimationFrame(renderMotion);
  }

  function settleMotion(release: SpringParams = releaseSpring) {
    [motion.tiltX, motion.tiltY, motion.shiftX, motion.shiftY].forEach((spring) => {
      spring.target = 0;
      spring.params = release;
    });
    motion.press.target = 1;
    motion.press.params = release === closeSettleSpring ? closeSettleSpring : pressOutSpring;
    requestMotionFrame();
  }

  function clearMotion() {
    if (motion.frame !== null) cancelAnimationFrame(motion.frame);
    motion.frame = null;
    motion.lastTime = 0;
    springs.forEach((spring) => {
      spring.value = spring.target = spring === motion.press ? 1 : 0;
      spring.velocity = 0;
    });
    motionProperties.forEach((property) => artwork.style.removeProperty(property));
  }

  function aimAt(clientX: number, clientY: number) {
    if (!gesture?.bounds) return;
    const { bounds, profile } = gesture;
    const horizontal = resist(((clientX - bounds.left) / bounds.width) * 2 - 1);
    const vertical = resist(((clientY - bounds.top) / bounds.height) * 2 - 1);

    // Same direction as the desktop hover: the side under the finger tips away.
    motion.tiltX.target = -vertical * motion.maxTilt;
    motion.tiltY.target = horizontal * motion.maxTilt;
    motion.shiftX.target = horizontal * profile.shift;
    motion.shiftY.target = vertical * profile.shift;
    [motion.tiltX, motion.tiltY, motion.shiftX, motion.shiftY].forEach((spring) => {
      spring.params = profile.follow;
    });
    requestMotionFrame();
  }

  function releaseGesture(release: SpringParams = gesture?.profile.release ?? releaseSpring) {
    if (gesture?.captured && gesture.surface.hasPointerCapture(gesture.id)) {
      gesture.surface.releasePointerCapture(gesture.id);
    }
    gesture = null;
    settleMotion(release);
  }

  // mode "slot": the artwork in the page (tap opens, drag tilts, bounds = the slot).
  // mode "viewer": fullscreen (the viewport is the surface, no tap semantics, never closes).
  function startGesture(
    event: PointerEvent,
    options: { mode: Gesture["mode"]; surface: HTMLElement; tilts: boolean; bounds: DOMRect | null; profile: Profile; artSize: number },
  ): Gesture {
    const { mode, surface, tilts, bounds, profile, artSize } = options;
    const started: Gesture = {
      id: event.pointerId,
      mode,
      surface,
      tilts,
      bounds,
      profile,
      captured: false,
      startX: event.clientX,
      startY: event.clientY,
      startTime: event.timeStamp,
      isTap: true,
    };
    gesture = started;

    if (tilts) {
      motion.maxTilt = maxTiltFor(profile, artSize);
      motion.press.target = profile.press;
      motion.press.params = pressInSpring;
      aimAt(event.clientX, event.clientY);
    }
    return started;
  }

  const onArtworkPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") return;
    // Expanded: the fullscreen surface below owns the gesture (this event bubbles to it).
    if (viewerState === "opening" || viewerState === "open") return;
    // Suppresses compatibility mouse events (which would steal focus from the viewer); scrolling and click are unaffected.
    event.preventDefault();

    // A second contact means pinch/multi-touch: neither a tap nor a tilt.
    if (gesture) {
      releaseGesture();
      return;
    }
    if (!event.isPrimary) return;

    // While closing, a tap on the flying artwork reopens it; it does not tilt.
    const tilts = !reducedMotion.matches && viewerState === "closed";
    // Measured once per gesture from the untilted slot, then reused for every move.
    const bounds = tilts ? stage.getBoundingClientRect() : null;
    startGesture(event, { mode: "slot", surface: artwork, tilts, bounds, profile: slotProfile, artSize: bounds?.width ?? 0 });
  };

  const onViewerPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") return;
    if (viewerState !== "opening" && viewerState !== "open") return;
    if (close.contains(event.target as Node)) return;
    event.preventDefault();

    // A second finger hands the gesture to the browser (pinch-zoom).
    if (gesture) {
      releaseGesture();
      return;
    }
    if (!event.isPrimary) return;

    const started = startGesture(event, {
      mode: "viewer",
      surface: viewer,
      tilts: !reducedMotion.matches,
      // The whole viewport is the interaction area: centre is neutral, edges are full range.
      bounds: viewer.getBoundingClientRect(),
      profile: viewerProfile,
      artSize: frame.offsetWidth,
    });
    // Keep receiving moves wherever the finger goes until it lifts.
    viewer.setPointerCapture(event.pointerId);
    started.captured = true;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id) return;

    if (gesture.isTap && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > tapSlopPx) {
      gesture.isTap = false;
    }
    if (gesture.tilts) aimAt(event.clientX, event.clientY);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id) return;

    const opensViewer = gesture.mode === "slot" && gesture.isTap && event.timeStamp - gesture.startTime <= tapMaxMs;
    releaseGesture();
    suppressClickUntil = performance.now() + 600;
    if (opensViewer) openViewer({ byPointer: true });
  };

  // Fires when the browser takes the gesture over (scroll on the page, pinch in fullscreen) or interrupts it.
  const onPointerCancel = (event: PointerEvent) => {
    if (gesture && event.pointerId === gesture.id) releaseGesture();
  };

  // Mouse on a touch device, switch control and screen readers arrive as a plain click.
  const onArtworkClick = () => {
    if (performance.now() < suppressClickUntil) return;
    openViewer();
  };

  const onArtworkKeyDown = (event: KeyboardEvent) => {
    if (viewerState !== "closed" || event.target !== artwork) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openViewer();
  };

  // Fullscreen viewer: the real .artwork moves into the overlay, laid out at its final size,
  // and a FLIP transform on the frame carries it from its measured slot and back.
  function hasArtwork() {
    const image = artwork.querySelector("img");
    return Boolean(image?.complete && image.naturalWidth > 0);
  }

  function syncTrigger() {
    if (viewerState === "closed") {
      artwork.setAttribute("role", "button");
      artwork.setAttribute("tabindex", "0");
      artwork.setAttribute("aria-label", "Expand artwork");
      artwork.setAttribute("aria-haspopup", "dialog");
    } else {
      triggerAttributes.forEach((name) => artwork.removeAttribute(name));
    }
  }

  function syncTouchAction() {
    // Vertical drags stay with the page when it can scroll; otherwise they are free to drive the tilt.
    const pageScrolls = root.scrollHeight > window.innerHeight + 1;
    artwork.toggleAttribute("data-tilt-exclusive", !pageScrolls);
  }

  function setPageInert(isInert: boolean) {
    if (isInert) {
      inertRegions = Array.from(document.body.children).filter(
        (region) => region !== viewer && !region.hasAttribute("inert"),
      );
      inertRegions.forEach((region) => region.setAttribute("inert", ""));
    } else {
      inertRegions.forEach((region) => region.removeAttribute("inert"));
      inertRegions = [];
    }
  }

  // Same inline-overflow lock the Information panel uses, so the two never fight over a class.
  function lockScroll() {
    lockedScroll = {
      y: window.scrollY,
      htmlOverflow: root.style.overflow,
      bodyOverflow: document.body.style.overflow,
    };
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function unlockScroll() {
    if (!lockedScroll) return;
    root.style.overflow = lockedScroll.htmlOverflow;
    document.body.style.overflow = lockedScroll.bodyOverflow;
    if (window.scrollY !== lockedScroll.y) window.scrollTo(0, lockedScroll.y);
    lockedScroll = null;
  }

  function cancelViewerAnimations() {
    viewerAnimations.forEach((animation) => animation.cancel());
    viewerAnimations = [];
  }

  function whenViewerAnimationsFinish(expectedState: ViewerState, done: () => void) {
    const animations = viewerAnimations;
    Promise.all(animations.map((animation) => animation.finished)).then(
      () => {
        if (viewerAnimations === animations && viewerState === expectedState) done();
      },
      () => {},
    );
  }

  // The frame has no transform while this runs, so its rect is the final fullscreen layout.
  function measureFlip() {
    const slot = stage.getBoundingClientRect();
    const target = frame.getBoundingClientRect();
    const scale = slot.width / target.width;
    const deltaX = slot.left + slot.width / 2 - (target.left + target.width / 2);
    const deltaY = slot.top + slot.height / 2 - (target.top + target.height / 2);
    return { scale, transform: `translate(${deltaX}px, ${deltaY}px) scale(${scale})` };
  }

  // The fullscreen artwork is scaled down to the slot, so lengths that don't scale with layout
  // (perspective, reflection depth, corner radius, shadow) are scaled up by the same factor in CSS.
  function applySlotCompensation(scale: number) {
    artwork.style.setProperty("--touch-depth-scale", (1 / scale).toFixed(4));
  }

  function clearSlotCompensation() {
    artwork.style.removeProperty("--touch-depth-scale");
  }

  // Reparenting restarts CSS animations; the arrival fade has already played for these images.
  function markImagesArrived() {
    artwork.querySelectorAll("img").forEach((image) => image.setAttribute("data-arrived", ""));
  }

  function openViewer({ byPointer = false } = {}) {
    if (!hasArtwork()) return;
    if (viewerState === "opening" || viewerState === "open") return;

    const reversing = viewerState === "closing";
    let from: { transform: string; backdrop: number; close: number; viewer: number };

    if (reversing) {
      from = {
        transform: currentTransform(frame),
        backdrop: currentOpacity(backdrop),
        close: currentOpacity(close),
        viewer: currentOpacity(viewer),
      };
      cancelViewerAnimations();
    } else {
      openedByPointer = byPointer;
      lockScroll();
      setPageInert(true);
      viewer.setAttribute("data-active", "");
      // Measured before the move, and compensation is written in the same style pass as the
      // reparent, so the artwork's shadow transition never animates the size change.
      const flip = measureFlip();
      markImagesArrived();
      applySlotCompensation(flip.scale);
      frame.append(artwork);
      from = { transform: flip.transform, backdrop: 0, close: 0, viewer: 0 };
    }

    viewerState = "opening";
    viewer.setAttribute("data-open", "");
    syncTrigger();
    // A live tilt/press eases to neutral on the inner element while the frame flies: one blended motion.
    releaseGesture();
    // Keyboard/assistive opens land on the close control; a finger tap focuses the dialog itself so no focus ring flashes.
    (openedByPointer ? viewer : close).focus({ preventScroll: true });

    if (reducedMotion.matches) {
      viewerAnimations = [
        viewer.animate([{ opacity: from.viewer }, { opacity: 1 }], { duration: 160, easing: "ease-out", fill: "forwards" }),
      ];
    } else {
      viewerAnimations = [
        frame.animate([{ transform: from.transform }, { transform: "none" }], {
          duration: openDurationMs,
          easing: easeCinematic,
          fill: "forwards",
        }),
        backdrop.animate([{ opacity: from.backdrop }, { opacity: 1 }], {
          duration: openDurationMs * 0.7,
          easing: "cubic-bezier(0.33, 0, 0.2, 1)",
          fill: "forwards",
        }),
        close.animate([{ opacity: from.close }, { opacity: 1 }], {
          duration: 260,
          delay: reversing ? 0 : openDurationMs * 0.45,
          easing: "ease-out",
          fill: "both",
        }),
      ];
    }

    whenViewerAnimationsFinish("opening", () => {
      cancelViewerAnimations();
      viewerState = "open";
    });
  }

  function finishClose({ restoreFocus: allowFocus = true } = {}) {
    cancelViewerAnimations();
    const restoreFocus = allowFocus
      && (viewer.contains(document.activeElement) || document.activeElement === document.body);

    stage.append(artwork);
    clearSlotCompensation();
    viewer.removeAttribute("data-open");
    viewer.removeAttribute("data-active");
    setPageInert(false);
    unlockScroll();
    viewerState = "closed";
    syncTrigger();

    if (!restoreFocus) return;
    if (!openedByPointer) artwork.focus({ preventScroll: true });
    else (document.activeElement as HTMLElement | null)?.blur();
  }

  function closeViewer({ immediate = false } = {}) {
    if (viewerState === "closing" && immediate) {
      finishClose();
      return;
    }
    if (viewerState !== "opening" && viewerState !== "open") return;

    const from = {
      transform: currentTransform(frame),
      backdrop: currentOpacity(backdrop),
      close: currentOpacity(close),
      viewer: currentOpacity(viewer),
    };
    cancelViewerAnimations();
    viewerState = "closing";
    viewer.removeAttribute("data-open");
    // Whatever tilt/shift the fullscreen artwork has now eases out during the flight: no flat snap first.
    releaseGesture(closeSettleSpring);

    if (immediate) {
      finishClose();
      return;
    }

    if (reducedMotion.matches) {
      viewerAnimations = [
        viewer.animate([{ opacity: from.viewer }, { opacity: 0 }], { duration: 140, easing: "ease-out", fill: "forwards" }),
      ];
    } else {
      const flip = measureFlip();
      applySlotCompensation(flip.scale);
      viewerAnimations = [
        frame.animate([{ transform: from.transform }, { transform: flip.transform }], {
          duration: closeDurationMs,
          easing: easeCinematic,
          fill: "forwards",
        }),
        backdrop.animate([{ opacity: from.backdrop }, { opacity: 0 }], {
          duration: closeDurationMs * 0.85,
          delay: closeDurationMs * 0.15,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "both",
        }),
        close.animate([{ opacity: from.close }, { opacity: 0 }], {
          duration: 140,
          easing: "ease-out",
          fill: "forwards",
        }),
      ];
    }

    whenViewerAnimationsFinish("closing", finishClose);
  }

  const onCloseClick = () => closeViewer();

  // Belt and braces for iOS versions that still rubber-band a fixed overlay; two-finger pinch-zoom stays available.
  const onViewerTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 1) event.preventDefault();
  };

  // Capture phase so Escape closes only the viewer, not anything hidden behind it.
  const onKeyDown = (event: KeyboardEvent) => {
    if (viewerState === "closed") return;

    // The close control is the dialog's only focusable element, so Tab stays on it.
    if (event.key === "Tab") {
      event.preventDefault();
      close.focus({ preventScroll: true });
      return;
    }
    if (event.key !== "Escape") return;
    event.stopPropagation();
    closeViewer();
  };

  const onResize = () => {
    syncTouchAction();
    if (gesture) releaseGesture();

    // A FLIP measured against the old viewport would land in the wrong place; jump to its end state instead.
    if (viewerState === "opening") {
      cancelViewerAnimations();
      viewerState = "open";
    } else if (viewerState === "closing") {
      finishClose();
    }
  };

  const onReducedMotionChange = () => {
    releaseGesture();
    clearMotion();
  };

  const resizeObserver = new ResizeObserver(syncTouchAction);

  artwork.addEventListener("pointerdown", onArtworkPointerDown);
  artwork.addEventListener("click", onArtworkClick);
  artwork.addEventListener("keydown", onArtworkKeyDown);
  viewer.addEventListener("pointerdown", onViewerPointerDown);
  viewer.addEventListener("touchmove", onViewerTouchMove, { passive: false });
  close.addEventListener("click", onCloseClick);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", onResize);
  reducedMotion.addEventListener("change", onReducedMotionChange);
  resizeObserver.observe(document.body);
  syncTrigger();
  syncTouchAction();

  return () => {
    artwork.removeEventListener("pointerdown", onArtworkPointerDown);
    artwork.removeEventListener("click", onArtworkClick);
    artwork.removeEventListener("keydown", onArtworkKeyDown);
    viewer.removeEventListener("pointerdown", onViewerPointerDown);
    viewer.removeEventListener("touchmove", onViewerTouchMove);
    close.removeEventListener("click", onCloseClick);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("resize", onResize);
    reducedMotion.removeEventListener("change", onReducedMotionChange);
    resizeObserver.disconnect();

    if (gesture?.captured && gesture.surface.hasPointerCapture(gesture.id)) {
      gesture.surface.releasePointerCapture(gesture.id);
    }
    gesture = null;
    // Puts the artwork back in its slot and releases inert, the scroll lock and the compensation.
    if (viewerState !== "closed") finishClose({ restoreFocus: false });
    cancelViewerAnimations();
    clearMotion();
    triggerAttributes.forEach((name) => artwork.removeAttribute(name));
    artwork.removeAttribute("data-tilt-exclusive");
  };
}
