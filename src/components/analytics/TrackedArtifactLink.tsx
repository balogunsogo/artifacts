"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { event } from "@/lib/analytics";

type TrackedArtifactLinkProps = {
  artifactId: string;
  artifactSlug: string;
  artifactTitle: string;
  children: ReactNode;
};

export function TrackedArtifactLink({
  artifactId,
  artifactSlug,
  artifactTitle,
  children,
}: TrackedArtifactLinkProps) {
  return (
    <Link
      href={`/artifacts/${artifactSlug}`}
      aria-label={`View ${artifactId} — ${artifactTitle}`}
      onClick={() => event("artifact_open", {
        artifact_id: artifactId,
        artifact_slug: artifactSlug,
        artifact_title: artifactTitle,
        source: "homepage",
      })}
    >
      {children}
    </Link>
  );
}
