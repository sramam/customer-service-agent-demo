/**
 * Text overlays — times are in seconds from the start of the captured WebM.
 * Composition length matches the WebM duration (see Root.tsx). Keep scenes within
 * ~0–(duration−2)s so callouts aren’t clipped; nudge times in Studio after each capture.
 */
export type OverlayScene = {
  startSec: number;
  durationSec: number;
  title: string;
  subtitle?: string;
};

/** ~1m20s–1m45s showcase pacing; fewer, wider windows stay aligned across runs. */
/** @deprecated Text overlays are no longer used in F5Demo; timing + narration live in `showcase-beats.ts`. */
export const OVERLAY_SCENES: OverlayScene[] = [
  {
    startSec: 2,
    durationSec: 14,
    title: "Public documentation",
    subtitle:
      "Technical answers come from searchable public product docs — cited in the thread.",
  },
  {
    startSec: 18,
    durationSec: 12,
    title: "Account & invoices (read-only)",
    subtitle:
      "Customers can see status and invoice downloads without exposing internal systems.",
  },
  {
    startSec: 32,
    durationSec: 13,
    title: "Gather intent before escalation",
    subtitle:
      "Clarifying questions and product chips ensure the handoff includes what & which products.",
  },
  {
    startSec: 47,
    durationSec: 13,
    title: "Escalation + agent workspace",
    subtitle:
      "Conversation moves to the agent — profile, products, and latest invoice surface together.",
  },
  {
    startSec: 62,
    durationSec: 12,
    title: "Employee AI — SOP & internal context",
    subtitle:
      "Internal notes: escalation detail, SOP steps, and runbook lines that never go to the customer.",
  },
  {
    startSec: 72,
    durationSec: 8,
    title: "Edit draft & send to customer",
    subtitle:
      "Private agent↔AI iteration, editable markdown draft, then one click to post as the agent.",
  },
];
