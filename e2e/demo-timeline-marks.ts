import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Wall-clock marks from the start of the test (approx. WebM timeline when recording starts at test start).
 * Set `DEMO_TIMELINE_LOG=1` to write `test-results/demo-timeline-actual.json` for tuning `remotion/src/demo-timeline.ts`.
 */
let marks: Record<string, number> = {};
let t0 = 0;

export function demoTimelineClockStart(): void {
  t0 = Date.now();
  marks = {};
}

export function demoTimelineMark(phase: string): void {
  const sec = (Date.now() - t0) / 1000;
  marks[phase] = sec;
  if (process.env.DEMO_TIMELINE_LOG) {
    console.log(`[demo-timeline] ${phase}: ${sec.toFixed(2)}s`);
  }
}

export function demoTimelineWriteFile(rootDir: string): void {
  const dir = join(rootDir, "test-results");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "demo-timeline-actual.json");
  writeFileSync(out, JSON.stringify(marks, null, 2));
  console.log(`[demo-timeline] wrote ${out}`);
}
