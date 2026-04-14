/**
 * Demo video timeline: **sequential** voice-over beats over `playwright-demo.webm`.
 *
 * Each beat’s **start** is `videoAnchorSec` (seconds into the recording). We **play** the WebM at
 * 1:1 from that point until the earlier of: (a) the next beat’s anchor, (b) the **actual WebM
 * duration** (from `getVideoMetadata` in Remotion, passed as `sourceDurationSec`), or (c) the end
 * of this beat’s VO (`beatEffectiveDurationSec`). If the VO is longer than that play budget, we
 * **hold the last frame** of the play segment for the rest of the beat — motion first, then
 * static extend. Pauses between beats freeze on the last frame shown.
 *
 * **Source of truth** — keep `videoAnchorSec` / `durationSec` aligned with `e2e/demo-flow.spec.ts`
 * and wall-clock marks (`DEMO_TIMELINE_LOG=1` → `test-results/demo-timeline-actual.json`).
 * Set each anchor to the moment you want on screen for that narration; increase `durationSec` if
 * ElevenLabs audio runs longer than the window.
 *
 * Voice-over: one MP3 per beat (`voice/beat-01.mp3` … `beat-09.mp3`) in order. After
 * `pnpm voiceover:generate`, `voice-beat-durations.generated.ts` stores measured MP3
 * lengths so timeline segments are at least as long as the audio (avoids clipping).
 *
 * **Pauses** (`PAUSE_BETWEEN_BEATS_SEC`): short silent gaps between beats; the frozen frame stays on the
 * previous beat’s anchor so the video layer does not remount (avoids flashing).
 */
import { VOICE_BEAT_DURATION_SEC } from "./voice-beat-durations.generated";

/** Must match `remotion/src/Root.tsx` composition FPS for duration math. */
export const SHOWCASE_COMPOSITION_FPS = 30;

/** Small pad after measured MP3 length so decode/end silence does not clip. */
const VOICE_DURATION_PAD_SEC = 0.25;

/**
 * Wall-clock duration for beat `i` on the output timeline.
 * With measured MP3 lengths, uses **audio + pad** only (no extra hold when `durationSec` was
 * larger than TTS — that used to add dead air before each inter-beat pause). Without
 * measurements, falls back to `SHOWCASE_BEATS[i].durationSec`.
 */
export function beatEffectiveDurationSec(beatIndex: number): number {
  const b = SHOWCASE_BEATS[beatIndex];
  if (!b) return 12;
  const nominal = b.durationSec;
  const raw = VOICE_BEAT_DURATION_SEC[beatIndex];
  const measured =
    typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : null;
  if (measured === null) return nominal;
  return measured + VOICE_DURATION_PAD_SEC;
}

/**
 * Fallback if `sourceDurationSec` is not passed from `getVideoMetadata` (e.g. Studio edge case).
 */
export const SHOWCASE_SOURCE_VIDEO_DURATION_FALLBACK_SEC = 50;

/** Silent gap after each beat (except the last). Keep small to avoid long “empty” stretches. */
export const PAUSE_BETWEEN_BEATS_SEC = 0.55;

export const DEMO_TIMELINE_PHASES = [
  "selfServiceDocs",
  "billingView",
  "splitPaneIntro",
  "escalation",
  "agentWorkspace",
  "internalNotes",
  "draftCustomer",
  "approveSend",
  "closingCta",
] as const;

export type DemoTimelinePhaseId = (typeof DEMO_TIMELINE_PHASES)[number];

/** Maps each beat to the Playwright `test.step` / moment used when tuning `videoAnchorSec`. */
export const PHASE_PLAYWRIGHT_HINT: Record<
  DemoTimelinePhaseId,
  string
> = {
  selfServiceDocs: 'Step "1–3: Technical questions (public documentation)".',
  billingView: 'Step "3: Invoices — account data they can only read".',
  splitPaneIntro:
    'Step "Escalation + agent panel" — when `demo-agent-column` is visible (split-pane disclaimer).',
  escalation:
    'Immediately after split-pane beat in the same step — why work is in the agent queue.',
  agentWorkspace:
    'Step "5: Agent context — customer card & workspace" — customer info card visible.',
  internalNotes:
    'Step "Slow scroll" — mark fires at **scroll start** (`demo-timeline-actual.json`); Remotion uses `play` from here.',
  draftCustomer:
    'Same step; after scroll — freeze on draft (tune `videoAnchorSec` after internalNotes `play` ends).',
  approveSend: 'Step "Send approved reply to customer".',
  closingCta:
    'After send — outro over agent workspace (internal notes + draft); thank-you / try the demo below.',
};

export type ShowcaseBeat = {
  phase: DemoTimelinePhaseId;
  /** Seconds into the screen recording: start of this beat’s motion section (then play → freeze extend). */
  videoAnchorSec: number;
  /** Nominal segment length (seconds) when MP3 durations are not measured; must fit ElevenLabs. */
  durationSec: number;
  narration: string;
};

/**
 * Beats play **in order**; each row is one frozen frame + narration.
 * Tune `durationSec` after TTS if clips are cut off.
 */
export const SHOWCASE_BEATS: ShowcaseBeat[] = [
  {
    phase: "selfServiceDocs",
    videoAnchorSec: 2,
    durationSec: 12,
    narration:
      "Customers self-serve technical answers and account information from trusted, cited sources.",
  },
  {
    phase: "billingView",
    videoAnchorSec: 12,
    durationSec: 12,
    narration:
      "They can view billing and account details but not change them—so systems of record stay out of the self-service thread.",
  },
  {
    phase: "splitPaneIntro",
    videoAnchorSec: 38,
    durationSec: 16,
    narration:
      "For this demo, customer and agent appear side by side. In production they are separate apps—independent sign-in, permissions, and hosting.",
  },
  {
    phase: "escalation",
    videoAnchorSec: 47,
    durationSec: 14,
    narration:
      "Subscription and contract changes route to humans—for accuracy, compliance, and upsell or cross-sell—so this conversation is now in the agent queue.",
  },
  {
    phase: "agentWorkspace",
    videoAnchorSec: 57,
    durationSec: 18,
    narration:
      "The agent workspace brings profile, products, invoices, and thread context together on the right.",
  },
  {
    phase: "internalNotes",
    videoAnchorSec: 68,
    durationSec: 25,
    narration:
      "The gray block is internal notes—proprietary context and document-backed reasoning. Nothing here is sent to the customer automatically.",
  },
  {
    phase: "draftCustomer",
    videoAnchorSec: 94,
    durationSec: 22,
    narration:
      "The draft is an auto-formed customer reply proposed by the AI—the human agent can change any part of it before it goes out. Internal wording still reaches the customer only if you deliberately copy it in—never merged by Send alone.",
  },
  {
    phase: "approveSend",
    videoAnchorSec: 98,
    durationSec: 15,
    narration:
      "In practice, the agent reviews and edits that auto-formed response for tone and accuracy—then sends—so only approved, customer-safe text is delivered.",
  },
  {
    phase: "closingCta",
    videoAnchorSec: 108,
    durationSec: 28,
    narration:
      "Once the agent workspace is open, internal notes are where you search and reason over internal documentation—stays in the agent-only lane, separate from the customer thread. The draft is where Employee AI proposes customer-safe wording you can edit before anything is sent. Thanks for watching—open the demo below and try the flow yourself.",
  },
];

/** Approx. WebM time when scroll begins (tune from `demo-timeline-actual.json` → internalNotes). */
export const AGENT_REVIEW_SCROLL_HINT = 68;

/** Extra seconds after the summed beat lengths (rounding / long TTS tail). */
export const TIMELINE_TAIL_PADDING_SEC = 4;

export type VideoHoldSegment = {
  fromFrame: number;
  durationInFrames: number;
  /**
   * Source time (seconds): for `play`, trim start; for `freeze`, single frame at this time.
   */
  anchorSec: number;
  videoMode: "freeze" | "play";
};

function clampAnchorToSource(anchorSec: number, sourceDur: number): number {
  if (sourceDur <= 0) return 0;
  return Math.min(Math.max(0, anchorSec), sourceDur - 1e-3);
}

/**
 * When `videoAnchorSec` values were tuned for a longer recording, scale them down so the last
 * anchor still fits inside the source video duration (keeps relative timing).
 */
export function showcaseAnchorScale(sourceDur: number): number {
  const rawMax = Math.max(
    ...SHOWCASE_BEATS.map((b) => b.videoAnchorSec),
    0,
  );
  if (rawMax <= 0 || rawMax <= sourceDur) return 1;
  return (sourceDur - 0.25) / rawMax;
}

/** Seconds of WebM we can play 1:1 from this beat’s anchor before the next anchor or file end. */
export function sourcePlayBudgetSec(
  beatIndex: number,
  sourceDur: number,
  anchorScale: number,
): { anchorSec: number; maxPlaySec: number } {
  const b = SHOWCASE_BEATS[beatIndex];
  if (!b) return { anchorSec: 0, maxPlaySec: 0 };
  const anchorSec = clampAnchorToSource(
    b.videoAnchorSec * anchorScale,
    sourceDur,
  );
  const nextBoundaryRaw =
    beatIndex < SHOWCASE_BEATS.length - 1
      ? SHOWCASE_BEATS[beatIndex + 1]!.videoAnchorSec * anchorScale
      : sourceDur;
  const sectionEnd = Math.min(nextBoundaryRaw, sourceDur);
  const maxPlaySec = Math.max(0, sectionEnd - anchorSec);
  return { anchorSec, maxPlaySec };
}

/** `sourceDurationSec` — actual WebM length from `getVideoMetadata` (Remotion). */
export function buildVideoHoldTimeline(
  fps: number,
  sourceDurationSec: number,
): VideoHoldSegment[] {
  const out: VideoHoldSegment[] = [];
  let fromFrame = 0;
  const src = Math.max(
    0.1,
    Number.isFinite(sourceDurationSec) ? sourceDurationSec : SHOWCASE_SOURCE_VIDEO_DURATION_FALLBACK_SEC,
  );
  const anchorScale = showcaseAnchorScale(src);

  for (let i = 0; i < SHOWCASE_BEATS.length; i++) {
    const wallSec = beatEffectiveDurationSec(i);
    const df = Math.max(1, Math.round(wallSec * fps));
    const { anchorSec, maxPlaySec } = sourcePlayBudgetSec(i, src, anchorScale);
    const playSec = Math.min(wallSec, maxPlaySec);
    const playFrames = Math.min(df, Math.max(0, Math.round(playSec * fps)));
    const freezeFrames = df - playFrames;

    let endSourceSec = anchorSec;

    if (playFrames > 0) {
      out.push({
        fromFrame,
        durationInFrames: playFrames,
        anchorSec,
        videoMode: "play",
      });
      fromFrame += playFrames;
      endSourceSec = anchorSec + playFrames / fps;
    }
    if (freezeFrames > 0) {
      const freezeAtSec = playFrames > 0 ? endSourceSec : anchorSec;
      out.push({
        fromFrame,
        durationInFrames: freezeFrames,
        anchorSec: freezeAtSec,
        videoMode: "freeze",
      });
      fromFrame += freezeFrames;
      endSourceSec = freezeAtSec;
    }

    if (i < SHOWCASE_BEATS.length - 1) {
      const pf = Math.max(1, Math.round(PAUSE_BETWEEN_BEATS_SEC * fps));
      out.push({
        fromFrame,
        durationInFrames: pf,
        anchorSec: endSourceSec,
        videoMode: "freeze",
      });
      fromFrame += pf;
    }
  }
  return out;
}

export function getAnchorSecAtFrame(
  frame: number,
  segments: VideoHoldSegment[],
): number {
  for (const seg of segments) {
    const end = seg.fromFrame + seg.durationInFrames;
    if (frame >= seg.fromFrame && frame < end) {
      return seg.anchorSec;
    }
  }
  const last = SHOWCASE_BEATS[SHOWCASE_BEATS.length - 1];
  return last?.videoAnchorSec ?? 0;
}

/** Total output length (sum of VO beats + inter-beat pauses); independent of source WebM duration. */
export function totalTimelineFrames(fps: number): number {
  let f = 0;
  for (let i = 0; i < SHOWCASE_BEATS.length; i++) {
    f += Math.max(1, Math.round(beatEffectiveDurationSec(i) * fps));
    if (i < SHOWCASE_BEATS.length - 1) {
      f += Math.max(1, Math.round(PAUSE_BETWEEN_BEATS_SEC * fps));
    }
  }
  return f;
}

/** `from` frame for beat `i`’s narration (after prior beats + pauses). */
export function getBeatAudioFromFrame(beatIndex: number, fps: number): number {
  let f = 0;
  for (let i = 0; i < beatIndex; i++) {
    f += Math.max(1, Math.round(beatEffectiveDurationSec(i) * fps));
    f += Math.max(1, Math.round(PAUSE_BETWEEN_BEATS_SEC * fps));
  }
  return f;
}

export function getBeatAudioDurationFrames(beatIndex: number, fps: number): number {
  return Math.max(1, Math.round(beatEffectiveDurationSec(beatIndex) * fps));
}

/** Minimum composition duration so every beat + pause + tail fits. */
export function minTimelineSecondsForVoice(): number {
  return (
    totalTimelineFrames(SHOWCASE_COMPOSITION_FPS) / SHOWCASE_COMPOSITION_FPS +
    TIMELINE_TAIL_PADDING_SEC
  );
}

/** Concatenated script (e.g. debugging); Remotion uses per-beat MP3s for sync. */
export const VOICEOVER_SCRIPT = SHOWCASE_BEATS.map((b) => b.narration).join("\n\n");
