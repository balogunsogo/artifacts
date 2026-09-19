import { sendGAEvent } from "@next/third-parties/google";

export type AnalyticsEventName = "artifact_open" | "theme_change" | "information_open";
export type AnalyticsParameters = Record<string, unknown>;

function analyticsAvailable(): boolean {
  return process.env.NODE_ENV === "production"
    && Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
    && typeof window !== "undefined"
    && Boolean(window.dataLayer);
}

export function pageview(url: string): void {
  if (!analyticsAvailable()) return;

  sendGAEvent("event", "page_view", {
    page_location: new URL(url, window.location.origin).toString(),
    page_path: url,
    page_title: document.title,
  });
}

export function event(name: AnalyticsEventName, parameters?: AnalyticsParameters): void {
  if (!analyticsAvailable()) return;
  sendGAEvent("event", name, parameters ?? {});
}
