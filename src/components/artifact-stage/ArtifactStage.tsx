import type { CSSProperties } from "react";
import { AmbientArtworkArtifact } from "@/artifacts/ambient-artwork/AmbientArtworkArtifact";
import type { Artifact } from "@/artifacts/artifact.types";
import { BlockOrbitArtifact } from "@/artifacts/block-orbit/BlockOrbitArtifact";
import { PaletteShiftArtifact } from "@/artifacts/palette-shift/PaletteShiftArtifact";
import { ScrollCinemaArtifact } from "@/artifacts/scroll-cinema/ScrollCinemaArtifact";
import { SplitMenuArtifact } from "@/artifacts/split-menu/SplitMenuArtifact";
import { TrackTransitionArtifact } from "@/artifacts/track-transition/TrackTransitionArtifact";
import { InformationPanel } from "@/components/information-panel/InformationPanel";
import styles from "./ArtifactStage.module.scss";

export function ArtifactStage({ artifact }: { artifact: Artifact }) {
  const isScrollCinema = artifact.slug === "scroll-cinema";
  const usesCardBackground = artifact.slug === "block-orbit";
  const usesPageBackground = artifact.slug === "split-menu"
    || artifact.slug === "scroll-cinema"
    || artifact.slug === "ambient-artwork";
  const theme = {
    "--stage-bg": usesCardBackground
      ? "var(--card-preview-bg)"
      : usesPageBackground
        ? "var(--color-page)"
        : artifact.theme.background,
    "--stage-fg": usesCardBackground || usesPageBackground ? "var(--color-text)" : artifact.theme.foreground,
    "--color-accent": artifact.theme.accent,
  } as CSSProperties;

  return (
    <section className={`${styles.stage} ${isScrollCinema ? styles.scrollStage : ""}`} data-artifact={artifact.slug} style={theme} aria-labelledby="artifact-title">
      <div className={styles.visual}>
        {artifact.slug === "block-orbit" ? (
          <BlockOrbitArtifact mode="full" />
        ) : artifact.slug === "split-menu" ? (
          <SplitMenuArtifact mode="full" />
        ) : artifact.slug === "scroll-cinema" ? (
          <ScrollCinemaArtifact mode="full" />
        ) : artifact.slug === "ambient-artwork" ? (
          <AmbientArtworkArtifact mode="full" />
        ) : artifact.slug === "palette-shift" ? (
          <PaletteShiftArtifact mode="full" />
        ) : (
          <TrackTransitionArtifact mode="full" footer={<InformationPanel artifact={artifact} />} />
        )}
      </div>
      {artifact.slug !== "track-transition" && (
        <div className={styles.info}><InformationPanel artifact={artifact} /></div>
      )}
    </section>
  );
}
