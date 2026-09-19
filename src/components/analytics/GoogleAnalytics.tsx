import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (process.env.NODE_ENV !== "production" || !measurementId) return null;

  return <NextGoogleAnalytics gaId={measurementId} />;
}
