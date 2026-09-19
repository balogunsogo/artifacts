import { sendGAEvent } from "@next/third-parties/google";

export type AnalyticsEventName = "artifact_open" | "theme_change" | "information_open";
export type AnalyticsParameters = Record<string, unknown>;

function analyticsAvailable(): boolean {
  return process.env.NODE_ENV === "production"
    && typeof window !== "undefined"
    && Boolean(window.dataLayer);
}

export function event(name: AnalyticsEventName, parameters?: AnalyticsParameters): void {
  if (!analyticsAvailable()) return;
  sendGAEvent("event", name, parameters ?? {});
}
