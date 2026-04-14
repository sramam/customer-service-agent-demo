import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect, type TestInfo } from "@playwright/test";
import type { CustomerConversationExportPayload } from "../src/lib/customer-conversation-export";
import { enrichCustomerExportPayloadWithAi } from "../src/lib/resolve-export-speakers-ai";
import {
  buildShowcaseReplayGuidanceFromExport,
  type ShowcaseReplayGuidance,
} from "../src/lib/showcase-replay-guidance";
import {
  drivePostAgentCustomer,
  drivePreEscalation,
  submitEmployeeAiUntilReviewControls,
  type ReplayDriveContext,
} from "./showcase-replay-drive";

/**
 * Live replay: load a conversation export JSON, derive **guidance** (intent + facts), then drive
 * `/customer` with vision + APIs (real app, new conversation). Not a verbatim transcript replay.
 *
 * Usage (repo root, dev server via Playwright webServer unless PLAYWRIGHT_SKIP_WEBSERVER=1):
 *   pnpm showcase:replay-live replay/david-replay1.json
 *   OPENAI_API_KEY and optional vars live in `.env` (see `.env.example`); Playwright loads them via `playwright.config.ts`.
 * Optional: F5_REPLAY_ENRICH=1 runs the same speaker-resolution pass as export:enrich-ai before guidance.
 * Escalation path: screenshot + vision (`SHOWCASE_REPLAY_VISION_MODEL`, default gpt-4o) decides replies,
 * chip clicks, or explicit escalate; set F5_REPLAY_USE_VISION=0 to use fallbacks + heuristic escalation nudge only.
 *
 * For YAML/Markdown scripts see `e2e/showcase-replay-script.spec.ts` and `pnpm showcase:replay-live replay/foo.yaml`.
 */
test.describe.configure({ mode: "serial" });

test.skip(
  !process.env.OPENAI_API_KEY || !process.env.F5_REPLAY_EXPORT,
  "Set OPENAI_API_KEY and pass a JSON path: pnpm showcase:replay-live replay/david-replay1.json (or set F5_REPLAY_EXPORT)",
);

let guidance: ShowcaseReplayGuidance;
let customerEmail: string;
/** Passed to the vision model so it can answer clarifications vs the real escalation goal. */
let escalationReasonForVision = "";
let exportEscalated = false;

test.beforeAll(async () => {
  const rawPath = process.env.F5_REPLAY_EXPORT!;
  const abs = resolve(process.cwd(), rawPath);
  let payload = JSON.parse(
    readFileSync(abs, "utf-8"),
  ) as CustomerConversationExportPayload;
  if (process.env.F5_REPLAY_ENRICH === "1") {
    payload = await enrichCustomerExportPayloadWithAi(payload);
  }
  customerEmail = payload.customerEmail;
  escalationReasonForVision = payload.escalationReason ?? "";
  exportEscalated = payload.escalated === true;
  guidance = await buildShowcaseReplayGuidanceFromExport(payload);
});

function replayContext(): ReplayDriveContext {
  return {
    guidance,
    exportEscalated,
    escalationReasonForVision,
  };
}

test("Showcase replay — guidance + vision-driven /customer", async ({
  page,
}, testInfo: TestInfo) => {
  await page.goto("/customer");

  const testId = `demo-select-customer-${customerEmail.replace(/[@.]/g, "-")}`;
  await test.step("Select customer from export", async () => {
    const picker = page.getByTestId(testId);
    await expect(picker).toBeEnabled({ timeout: 30_000 });
    // Do not use r.ok() in the predicate — a 409 would never match and the waiter times out.
    const claimPut = page.waitForResponse(
      (r) =>
        r.url().includes("/api/demo/customer-claim") &&
        r.request().method() === "PUT",
      { timeout: 60_000 },
    );
    await picker.click();
    const claimRes = await claimPut;
    if (!claimRes.ok()) {
      const body = await claimRes.text().catch(() => "");
      throw new Error(
        `Demo customer claim failed: HTTP ${claimRes.status()} ${body}. ` +
          `If 409, this profile is locked in another tab. For local dev add E2E_BYPASS_DEMO_CLAIM=1 to .env and restart pnpm dev (Playwright's webServer sets this automatically when it starts the app).`,
      );
    }
    await expect(page.getByTestId("demo-customer-input")).toBeVisible();
  });

  const ctx = replayContext();

  await test.step("Pre-escalation (vision or fallback)", async () => {
    await drivePreEscalation(page, testInfo, ctx);
  });

  if (!exportEscalated) {
    return;
  }

  await test.step("Escalation + agent workspace", async () => {
    await expect(page.getByText(/Escalated|escalat/i).first()).toBeVisible({
      timeout: 180_000,
    });
    await expect(page.getByTestId("demo-agent-column")).toBeVisible({
      timeout: 60_000,
    });
  });

  await test.step("Employee AI (guidance)", async () => {
    await submitEmployeeAiUntilReviewControls(page, guidance.employeeAiGuidance);
    await expect(page.getByTestId("demo-internal-notes")).toBeVisible({
      timeout: 30_000,
    });
    const draft = page.getByTestId("demo-draft-response");
    await expect(draft).toBeVisible();
    await expect(draft).not.toHaveValue("", { timeout: 60_000 });
  });

  await test.step("Send approved reply", async () => {
    const send = page.getByTestId("demo-send-to-customer");
    await expect(send).toBeEnabled({ timeout: 120_000 });
    await send.click();
    await expect(page.getByText(/Agent \(You\)/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  await test.step("Post-agent customer (vision or fallback)", async () => {
    await drivePostAgentCustomer(page, testInfo, ctx);
  });
});
