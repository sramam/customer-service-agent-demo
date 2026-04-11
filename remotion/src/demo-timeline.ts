/**
 * Demo video timeline: voice-over sync + Ken Burns beats (seconds from start of `playwright-demo.webm`).
 *
 * **Source of truth** — keep `startSec` / `durationSec` aligned with `e2e/demo-flow.spec.ts` step order.
 * After a full run, open `test-results/demo-timeline-actual.json` and copy measured seconds into `startSec` where needed.
 *
 * Voice-over uses **one MP3 per beat** (`voice/beat-01.mp3` …) placed on a Remotion `Sequence` at `startSec`.
 */
export const DEMO_TIMELINE_PHASES = [
  "selfServiceDocs",
  "billingView",
  "splitPaneIntro",
  "escalation",
  "agentWorkspace",
  "internalNotes",
  "draftCustomer",
  "approveSend",
] as const;

export type DemoTimelinePhaseId = (typeof DEMO_TIMELINE_PHASES)[number];

/** Maps each beat to the Playwright `test.step` / moment it should align with. */
export const PHASE_PLAYWRIGHT_HINT: Record<
  DemoTimelinePhaseId,
  string
> = {
  selfServiceDocs: 'Step "1–3: Technical questions (public documentation)".',
  billingView: 'Step "3: Read-only account — invoices".',
  splitPaneIntro:
    'Step "Escalation + agent panel" — when `demo-agent-column` is visible (split-pane disclaimer).',
  escalation:
    'Immediately after split-pane beat in the same step — why work is in the agent queue.',
  agentWorkspace:
    'Step "5: Agent context — customer card & workspace" — customer info card visible.',
  internalNotes:
    'Step "Employee AI — …" after review controls; before/during scroll to internal notes.',
  draftCustomer:
    'Same step; during/after scroll to draft textarea (slow scroll sub-step).',
  approveSend: 'Step "Send approved reply to customer".',
};

export type ShowcaseBeat = {
  phase: DemoTimelinePhaseId;
  startSec: number;
  durationSec: number;
  scale: number;
  focus: { x: number; y: number };
  narration: string;
};

/**
 * `startSec` = when this line should **begin** (and when its MP3 starts).
 * Early beats cover the customer-only phase; **splitPaneIntro** is timed for when the agent column appears.
 */
export const SHOWCASE_BEATS: ShowcaseBeat[] = [
  {
    phase: "selfServiceDocs",
    startSec: 2,
    durationSec: 9,
    scale: 1.07,
    focus: { x: 0.32, y: 0.48 },
    narration:
      "Customers self-serve technical answers and account information from trusted, cited sources.",
  },
  {
    phase: "billingView",
    startSec: 12,
    durationSec: 9,
    scale: 1.07,
    focus: { x: 0.35, y: 0.5 },
    narration:
      "They can view billing and account details but not change them—so systems of record stay out of the self-service thread.",
  },
  {
    phase: "splitPaneIntro",
    startSec: 38,
    durationSec: 8,
    scale: 1.09,
    focus: { x: 0.52, y: 0.46 },
    narration:
      "For this demo, customer and agent appear side by side. In production they are separate apps—independent sign-in, permissions, and hosting.",
  },
  {
    phase: "escalation",
    startSec: 47,
    durationSec: 9,
    scale: 1.08,
    focus: { x: 0.55, y: 0.48 },
    narration:
      "Subscription and contract changes route to humans—for accuracy, compliance, and upsell or cross-sell—so this conversation is now in the agent queue.",
  },
  {
    phase: "agentWorkspace",
    startSec: 57,
    durationSec: 10,
    scale: 1.09,
    focus: { x: 0.58, y: 0.46 },
    narration:
      "The agent workspace brings profile, products, invoices, and thread context together on the right.",
  },
  {
    phase: "internalNotes",
    startSec: 68,
    durationSec: 12,
    scale: 1.12,
    focus: { x: 0.72, y: 0.4 },
    narration:
      "The gray block is internal notes—proprietary context and document-backed reasoning. Nothing here is sent to the customer automatically.",
  },
  {
    phase: "draftCustomer",
    startSec: 81,
    durationSec: 14,
    scale: 1.12,
    focus: { x: 0.72, y: 0.58 },
    narration:
      "The draft is an auto-formed customer reply proposed by the AI—the human agent can change any part of it before it goes out. Internal wording still reaches the customer only if you deliberately copy it in—never merged by Send alone.",
  },
  {
    phase: "approveSend",
    startSec: 98,
    durationSec: 10,
    scale: 1.1,
    focus: { x: 0.7, y: 0.55 },
    narration:
      "In practice, the agent reviews and edits that auto-formed response for tone and accuracy—then sends—so only approved, customer-safe text is delivered.",
  },
];

/** Scroll hint for e2e / docs — internal-notes beat start (approx). */
export const AGENT_REVIEW_SCROLL_HINT = 68;

/**
 * Composition must run at least this many seconds after the **last** beat starts, or Remotion
 * ends at the WebM length and the final voice clip is cut off.
 */
export const FINAL_VOICE_TAIL_SEC = 28;

/** Minimum timeline duration (seconds) so all voice segments can finish vs video-only length. */
export function minTimelineSecondsForVoice(): number {
  const last = SHOWCASE_BEATS[SHOWCASE_BEATS.length - 1];
  if (!last) return 0;
  return last.startSec + FINAL_VOICE_TAIL_SEC;
}

/** Concatenated script (e.g. debugging); Remotion uses per-beat MP3s for sync. */
export const VOICEOVER_SCRIPT = SHOWCASE_BEATS.map((b) => b.narration).join("\n\n");
