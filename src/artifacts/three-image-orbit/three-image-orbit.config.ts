export type OrbitMode = "full" | "preview";

export type OrbitOffset = {
  x: number;
  y: number;
};

export type OrbitMetrics = {
  radiusX: number;
  radiusY: number;
  radiusZ: number;
  minScale: number;
  maxScale: number;
  offsets: [OrbitOffset, OrbitOffset, OrbitOffset];
};

/*
 * Keep the preview geometry exactly as it was.
 * The homepage preview has already been behaving correctly.
 */
const previewOffsets = [
  { x: -0.238235, y: -1.125 },
  { x: 0, y: 1.35 },
  { x: 0.238235, y: -0.45 },
] as const;

/*
 * Restrained offsets for the full artifact.
 *
 * The three full-size cards now have different silhouettes,
 * so we no longer need the exaggerated vertical-lane offsets.
 */
const fullOffsets = [
  { x: -16, y: -18 },
  { x: 0, y: 16 },
  { x: 18, y: -6 },
] as const;

export function getOrbitMetrics(
  stageWidth: number,
  mode: OrbitMode,
  viewportWidth: number
): OrbitMetrics {
  const isMobile = viewportWidth <= 700;

  const radiusX =
    mode === "preview"
      ? Math.min(34, stageWidth * 0.16)
      : isMobile
        ? Math.min(viewportWidth * 0.2, 76)
        : Math.min(205, stageWidth * 0.31);

  const radiusY =
    mode === "preview"
      ? 4
      : isMobile
        ? 8
        : 16;

  const radiusZ =
    mode === "preview"
      ? 52
      : isMobile
        ? 110
        : 145;

  const offsets =
    mode === "preview"
      ? previewOffsets.map((offset) => ({
          x: offset.x * radiusX,
          y: offset.y * radiusY,
        }))
      : isMobile
        ? fullOffsets.map((offset) => ({
            x: offset.x * 0.55,
            y: offset.y * 0.55,
          }))
        : fullOffsets.map((offset) => ({
            ...offset,
          }));

  return {
    radiusX,
    radiusY,
    radiusZ,

    minScale:
      mode === "preview"
        ? 0.86
        : isMobile
          ? 0.88
          : 0.88,

    maxScale:
      mode === "preview"
        ? 1
        : isMobile
          ? 1.02
          : 1.03,

    offsets: offsets as [
      OrbitOffset,
      OrbitOffset,
      OrbitOffset,
    ],
  };
}

export function getOrbitPoint(
  progress: number,
  index: number,
  metrics: OrbitMetrics
) {
  const phase =
    index * ((Math.PI * 2) / 3);

  const angle =
    progress * Math.PI * 2 + phase;

  const z =
    Math.sin(angle) * metrics.radiusZ;

  const depth =
    (z + metrics.radiusZ) /
    (metrics.radiusZ * 2);

  const x =
    Math.cos(angle) * metrics.radiusX;

  /*
   * Restore the original recovered Toby & Tye
   * vertical orbit behaviour.
   */
  const y =
    Math.sin(angle * 2) * metrics.radiusY;

  const offset =
    metrics.offsets[index];

  return {
    x: x + offset.x,
    y: y + offset.y,
    z,

    scale:
      metrics.minScale +
      depth *
        (metrics.maxScale -
          metrics.minScale),

    opacity:
      0.86 + depth * 0.14,
  };
}