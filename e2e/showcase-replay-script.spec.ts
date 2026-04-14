import { resolve } from "node:path";
import { test, expect, type TestInfo } from "@playwright/test";
import {
  loadShowcaseReplayScriptFile,
  type ShowcaseReplayScript,
} from "../src/lib/showcase-replay-script";
import {
  drivePostAgentCustomer,
  drivePreEscalation,
  sendCustomerMessage,
  submitEmployeeAiUntilReviewControls,
  type ReplayDriveContext,
} from "./showcase-replay-drive";

/**
 * Declarative showcase replay from YAML or Markdown (YAML front matter).
 *
 *   pnpm showcase:replay-live replay/my-showcase.yaml
 *   pnpm showcase:replay-live replay/my-showcase.md
 *
 * Env: same as export replay (`OPENAI_API_KEY`, optional `F5_REPLAY_USE_VISION`, vision model, etc.).
 */
test.describe.configure({ mode: "serial" });

test.skip(
  !process.env.OPENAI_API_KEY || !process.env.F5_REPLAY_SCRIPT,
  "Set OPENAI_API_KEY and pass a script path: pnpm showcase:replay-live replay/showcase-example.yaml (or set F5_REPLAY_SCRIPT)",
);

let scriptPath: string;
let script: ShowcaseReplayScript;
let customerEmail: string;
let ctx: ReplayDriveContext;
let employeeAiPrompt: string;

test.beforeAll(async () => {
  scriptPath = resolve(process.cwd(), process.env.F5_REPLAY_SCRIPT!);
  script = loadShowcaseReplayScriptFile(scriptPath);
  customerEmail = script.customerEmail;

  const guidance = {
    ...script.guidance,
    employeeAiGuidance:
      script.employeeAiPrompt?.trim() || script.guidance.employeeAiGuidance,
  };

  ctx = {
    guidance,
    exportEscalated: script.expectEscalation,
    escalationReasonForVision: script.escalationReason,
  };
  employeeAiPrompt = guidance.employeeAiGuidance;
});

test("Showcase replay — script (YAML/MD) /customer", async ({ page }, testInfo: TestInfo) => {
  await page.goto("/customer");

  const testId = `demo-select-customer-${customerEmail.replace(/[@.]/g, "-")}`;
  await test.step("Select customer", async () => {
    const picker = page.getByTestId(testId);
    await expect(picker).toBeEnabled({ timeout: 30_000 });
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
          `If 409, add E2E_BYPASS_DEMO_CLAIM=1 to .env (Playwright webServer sets this for showcase:replay-live).`,
      );
    }
    await expect(page.getByTestId("demo-customer-input")).toBeVisible();
  });

  await test.step("Pre-escalation (per script)", async () => {
    switch (script.preEscalation.mode) {
      case "scripted":
        for (const line of script.preEscalation.messages) {
          await sendCustomerMessage(page, line);
        }
        await drivePreEscalation(page, testInfo, ctx, {
          omitFallbackFirstLine: true,
        });
        break;
      case "vision":
        await drivePreEscalation(page, testInfo, ctx);
        break;
      case "fallback_heuristic":
        await drivePreEscalation(page, testInfo, ctx, {
          omitFallbackFirstLine: false,
        });
        break;
      default:
        throw new Error(
          `Unhandled preEscalation mode: ${JSON.stringify(script.preEscalation)}`,
        );
    }
  });

  if (!script.expectEscalation) {
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

  await test.step("Employee AI", async () => {
    await submitEmployeeAiUntilReviewControls(page, employeeAiPrompt);
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

  await test.step("Post-agent customer (per script)", async () => {
    switch (script.postAgent.mode) {
      case "scripted": {
        const lines = script.postAgent.messages.filter((l) => l.trim());
        if (lines.length === 0) break;
        /** One customer send so the thread stays customer ↔ agent alternating (no back-to-back customer). */
        const body = lines.join("\n\n");
        await sendCustomerMessage(page, body);
        break;
      }
      case "vision":
        await drivePostAgentCustomer(page, testInfo, ctx);
        break;
      case "none":
        await drivePostAgentCustomer(page, testInfo, ctx);
        break;
      default:
        throw new Error(
          `Unhandled postAgent mode: ${JSON.stringify(script.postAgent)}`,
        );
    }
  });
});
