/**
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

declare global {
  interface Window {
    plausible?: (event: string) => void;
  }
}

export type ProductEvent =
  | "workbench_viewed"
  | "assignments_reviewed"
  | "review_queue_exported"
  | "pricing_intent"
  | "feedback_intent";

export function trackEvent(event: ProductEvent): void {
  if (typeof window === "undefined") return;
  window.plausible?.(event);
}
