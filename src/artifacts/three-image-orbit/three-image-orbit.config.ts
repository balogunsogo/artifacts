export type OrbitMode = "full" | "preview";

export type OrbitOffset = { x: number; y: number };

export type OrbitMetrics = {
  radiusX: number;
  radiusY: number;
  radiusZ: number;
  minScale: number;
  maxScale: number;
  offsets: [OrbitOffset, OrbitOffset, OrbitOffset];
};

const previewOffsets = [
  { x: -0.238235, y: -1.125 },
  { x: 0, y: 1.35 },
  { x: 0.238235, y: -0.45 },
] as const;

const fullOffsets = [
  { x: -90, y: -105 },
  { x: 0, y: 125 },
  { x: 90, y: -58 },
] as const;

export function getOrbitMetrics(stageWidth: number, mode: OrbitMode, viewportWidth: number): OrbitMetrics {
  const radiusX = mode === "preview"
    ? Math.min(34, stageWidth * 0.16)
    : viewportWidth <= 700
      ? Math.min(viewportWidth * 0.2, 76)
      : Math.min(205, stageWidth * 0.31);
  const radiusY = mode === "preview" ? 4 : viewportWidth <= 700 ? 8 : 16;
  const radiusZ = mode === "preview" ? 52 : viewportWidth <= 700 ? 110 : 145;
  const offsets = mode === "preview"
    ? previewOffsets.map((offset) => ({ x: offset.x * radiusX, y: offset.y * radiusY }))
    : (viewportWidth <= 700
      ? fullOffsets.map((offset) => ({ x: offset.x * 0.55, y: offset.y * 0.55 }))
      : fullOffsets);

  return {
    radiusX,
    radiusY,
    radiusZ,
    minScale: mode === "preview" ? 0.86 : 0.88,
    maxScale: mode === "preview" ? 1 : viewportWidth <= 700 ? 1.02 : 1.03,
    offsets: offsets as [OrbitOffset, OrbitOffset, OrbitOffset],
  };
}

export function getOrbitPoint(progress: number, index: number, metrics: OrbitMetrics) {
  const phase = index * ((Math.PI * 2) / 3);
  const angle = progress * Math.PI * 2 + phase;
  const z = Math.sin(angle) * metrics.radiusZ;
  const depth = (z + metrics.radiusZ) / (metrics.radiusZ * 2);
  const x = Math.cos(angle) * metrics.radiusX;
  const y = Math.sin(angle * 2) * metrics.radiusY;
  const offset = metrics.offsets[index];

  return {
    x: x + offset.x,
    y: y + offset.y,
    z,
    scale: metrics.minScale + depth * (metrics.maxScale - metrics.minScale),
    opacity: 0.86 + depth * 0.14,
  };
}
