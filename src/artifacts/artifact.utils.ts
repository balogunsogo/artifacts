import { artifacts } from "./artifact.data";
import type { Artifact } from "./artifact.types";

export function getArtifactBySlug(slug: string): Artifact | undefined {
  return artifacts.find((artifact) => artifact.slug === slug);
}

export function getPreviousArtifact(slug: string): Artifact {
  const index = artifacts.findIndex((artifact) => artifact.slug === slug);
  return artifacts[(index - 1 + artifacts.length) % artifacts.length];
}

export function getNextArtifact(slug: string): Artifact {
  const index = artifacts.findIndex((artifact) => artifact.slug === slug);
  return artifacts[(index + 1) % artifacts.length];
}

export function formatArtifactCount(count = artifacts.length): string {
  return String(count).padStart(3, "0");
}
