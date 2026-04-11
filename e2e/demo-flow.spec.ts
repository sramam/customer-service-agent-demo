import { test, expect, type Page } from "@playwright/test";
import { AI_OUTER_ATTEMPTS } from "../src/lib/ai-retry";
import {
  demoTimelineClockStart,
  demoTimelineMark,
  demoTimelineWriteFile,
} from "./demo-timeline-marks";

/** Showcase / Playwright are always run from the repo root (`pnpm showcase:full`, `playwright test`). */
const repoRoot = process.cwd();

/**
 * Scripted walkthrough for demo video + Remotion overlays.
 * Tune copy to match your docs; all steps use real LLM + tools (needs OPENAI_API_KEY).
 */
test.describe.configure({ mode: "serial" });

test.skip(
  !process.env.OPENAI_API_KEY,
  "Set OPENAI_API_KEY to run the LLM-backed demo E2E"
);

async function waitForCustomerAiIdle(page: Page) {
  const input = page.getByTestId("demo-customer-input");
  await input.waitFor({ state: "visible" });
  await input.waitFor({ state: "attached" });
  // Disabled while the model streams or a send is in flight
  await expect(input).toBeDisabled();
  // After the reply: either the field is editable again, or escalation locked it
  // ("Waiting for a human agent…") — that is still a valid "idle" end state.
  await expect
    .poll(
      async () => {
        if (await input.isEnabled()) return "ready";
        const ph = await input.getAttribute("placeholder");
        return ph?.includes("Waiting for a human agent") ? "escalated" : "busy";
      },
      { timeout: 180_000 }
    )
    .toMatch(/ready|escalated/);
}

async function sendCustomerMessage(page: Page, text: string) {
  await page.getByTestId("demo-customer-input").fill(text);
  await page.getByTestId("demo-customer-chat-form").locator('button[type="submit"]').click();
  await waitForCustomerAiIdle(page);
}

/**
 * After clicking send: input is only disabled while `useChat` status is `streaming`.
 * On API errors or very fast completions, streaming may never flip — so we do not rely
 * on disabled. Wait for the /api/agent-chat POST to finish (body drained) instead.
 */
async function clickEmployeeAiSendAndWaitForDone(page: Page) {
  const responsePromise = page.waitForResponse(
    (r) =>
      r.url().includes("/api/agent-chat") &&
      r.request().method() === "POST",
    { timeout: 180_000 }
  );
  await page.getByTestId("demo-employee-ai-send").click();
  const res = await responsePromise;
  try {
    await res.text();
  } catch {
    /* aborted or unreadable body */
  }
  await expect(page.getByTestId("demo-employee-ai-input")).toBeEnabled({
    timeout: 60_000,
  });
}

const EMPLOYEE_DEMO_PROMPT = [
  "Using internal and public docs, produce INTERNAL NOTES with:",
  "(1) Escalation handoff and SOP-style next steps,",
  "(2) a line that references internal runbook material that must NOT be copied to the customer,",
  "(3) a DRAFT CUSTOMER RESPONSE offering to help with BIG-IP LTM cancellation.",
  "Use the required ---INTERNAL NOTES--- / ---DRAFT CUSTOMER RESPONSE--- / ---METADATA--- sections.",
].join(" ");

/** OpenAI may return `server_error` in-stream (HTTP 200); UI then has no parseable draft. Retry sends. */
async function submitEmployeeAiUntilReviewControls(page: Page) {
  for (let attempt = 0; attempt < AI_OUTER_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    await page.getByTestId("demo-employee-ai-input").fill(EMPLOYEE_DEMO_PROMPT);
    await clickEmployeeAiSendAndWaitForDone(page);
    if (
      await page
        .getByTestId("demo-review-controls")
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }
  }
  await expect(page.getByTestId("demo-review-controls")).toBeVisible({
    timeout: 30_000,
  });
}

/**
 * Slow scroll the agent workspace so the recording shows internal notes first, then the
 * editable draft—timed for voice-over on that distinction (see remotion/src/demo-timeline.ts).
 */
async function demoSlowScrollInternalNotesThenDraft(page: Page) {
  await page.evaluate(async () => {
    const duration1 = 4200;
    const hold1 = 2800;
    const duration2 = 4500;
    const hold2 = 1200;

    const scroll = document.querySelector(
      '[data-testid="demo-agent-work-scroll"]'
    ) as HTMLElement | null;
    const internal = document.querySelector(
      '[data-testid="demo-internal-notes"]'
    ) as HTMLElement | null;
    const draft = document.querySelector(
      '[data-testid="demo-draft-response"]'
    ) as HTMLElement | null;

    if (!scroll || !internal || !draft) return;
    const rootScroll = scroll;

    const scrollTo = (target: HTMLElement, pad: number, duration: number) =>
      new Promise<void>((resolve) => {
        const sr = rootScroll.getBoundingClientRect();
        const tr = target.getBoundingClientRect();
        const dest = Math.max(
          0,
          rootScroll.scrollTop + (tr.top - sr.top) - pad
        );
        const start = rootScroll.scrollTop;
        const delta = dest - start;
        const t0 = performance.now();
        function step(now: number) {
          const t = Math.min(1, (now - t0) / duration);
          const eased = 1 - (1 - t) * (1 - t);
          rootScroll.scrollTop = start + delta * eased;
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });

    await scrollTo(internal, 10, duration1);
    await new Promise((r) => setTimeout(r, hold1));
    await scrollTo(draft, 10, duration2);
    await new Promise((r) => setTimeout(r, hold2));
  });
}

test("F5 support demo — docs, account, escalation, agent workspace", async ({ page }) => {
  demoTimelineClockStart();
  await page.goto("/customer");

  await test.step("Select demo customer (Alice / Acme)", async () => {
    await page.getByTestId("demo-select-customer-alice-acmecorp-com").click();
    await expect(page.getByTestId("demo-customer-input")).toBeVisible();
  });

  await test.step("1–3: Technical questions (public documentation)", async () => {
    await sendCustomerMessage(
      page,
      "What traffic management features does BIG-IP LTM offer?"
    );
    await sendCustomerMessage(
      page,
      "How do health monitors work on BIG-IP LTM?"
    );
    await sendCustomerMessage(
      page,
      "What is the difference between a pool and a pool member on BIG-IP LTM?"
    );
    demoTimelineMark("selfServiceDocs");
  });

  await test.step("3: Read-only account — invoices", async () => {
    await sendCustomerMessage(page, "Can I download my latest invoice?");
    demoTimelineMark("billingView");
  });

  await test.step("4: Account change — clarify then escalate", async () => {
    await sendCustomerMessage(page, "I want to change my subscriptions");
    // Prefer product chip if shown (customer-voice label)
    const chip = page.getByRole("button", { name: "BIG-IP LTM", exact: true });
    if (await chip.isVisible().catch(() => false)) {
      await chip.click();
      await waitForCustomerAiIdle(page);
    }
    const customerInput = page.getByTestId("demo-customer-input");
    // Model may escalate after the first turn; only send the explicit ask if still open
    if (await customerInput.isEnabled()) {
      await sendCustomerMessage(
        page,
        "I want to cancel BIG-IP LTM. Please escalate to a human to process this."
      );
    }
  });

  await test.step("Escalation + agent panel", async () => {
    await expect(page.getByText(/Escalated|escalat/i).first()).toBeVisible({
      timeout: 180_000,
    });
    await expect(page.getByTestId("demo-agent-column")).toBeVisible({
      timeout: 30_000,
    });
    demoTimelineMark("splitPaneIntro");
    demoTimelineMark("escalation");
  });

  await test.step("5: Agent context — customer card & workspace", async () => {
    await expect(page.getByTestId("demo-customer-info-card")).toBeVisible({
      timeout: 60_000,
    });
    demoTimelineMark("agentWorkspace");
  });

  await test.step("Employee AI — internal notes + draft", async () => {
    await submitEmployeeAiUntilReviewControls(page);
    await expect(page.getByTestId("demo-internal-notes")).toBeVisible({
      timeout: 10_000,
    });
    demoTimelineMark("internalNotes");
    const draft = page.getByTestId("demo-draft-response");
    await expect(draft).toBeVisible();
    await expect(draft).not.toHaveValue("", { timeout: 10_000 });
    await test.step("Slow scroll: internal notes → customer draft (demo video)", async () => {
      await demoSlowScrollInternalNotesThenDraft(page);
    });
    demoTimelineMark("draftCustomer");
    await draft.fill(
      (await draft.inputValue()) +
        "\n\n— Edited by agent for demo video."
    );
    demoTimelineMark("approveSend");
  });

  await test.step("Send approved reply to customer", async () => {
    await page.getByTestId("demo-send-to-customer").click();
    await expect(page.getByText(/Agent \(You\)/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  demoTimelineWriteFile(repoRoot);
});
