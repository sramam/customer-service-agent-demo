import { expect, type Page, type TestInfo } from "@playwright/test";
import { AI_OUTER_ATTEMPTS } from "../src/lib/ai-retry";
import {
  decideCustomerReplayStepFromScreenshot,
  type CustomerReplayVisionDecision,
} from "../src/lib/showcase-replay-vision";
import type { ShowcaseReplayGuidance } from "../src/lib/showcase-replay-guidance";

export type ReplayDriveContext = {
  guidance: ShowcaseReplayGuidance;
  exportEscalated: boolean;
  escalationReasonForVision: string;
};

export type DrivePreEscalationOptions = {
  /**
   * After explicit scripted customer lines, do not send `guidance.fallbackFirstCustomerMessage`
   * on the non-vision path.
   */
  omitFallbackFirstLine?: boolean;
};

export async function waitForCustomerAiIdle(page: Page) {
  const input = page.getByTestId("demo-customer-input");
  await input.waitFor({ state: "visible" });
  await expect(input).toBeDisabled();
  await expect
    .poll(
      async () => ((await input.isEnabled()) ? "ready" : "busy"),
      { timeout: 180_000 },
    )
    .toBe("ready");
}

/**
 * Ensures the last customer-visible thread message is not from the customer, so the next send
 * alternates customer ↔ assistant (F5 Support / agent). Skips when the thread is empty.
 */
export async function waitUntilThreadAllowsCustomerSend(page: Page) {
  const row = page.locator('[data-testid="demo-customer-thread-message"]');
  const n = await row.count();
  if (n === 0) return;
  await expect
    .poll(
      async () => {
        const role = await row.last().getAttribute("data-thread-role");
        return role !== "user";
      },
      {
        timeout: 180_000,
        message:
          "Expected an assistant or system reply before the next customer message (thread must alternate).",
      },
    )
    .toBe(true);
}

export async function sendCustomerMessage(page: Page, text: string) {
  await waitUntilThreadAllowsCustomerSend(page);
  await page.getByTestId("demo-customer-input").fill(text);
  await page.getByTestId("demo-customer-chat-form").locator('button[type="submit"]').click();
  await waitForCustomerAiIdle(page);
}

export async function clickEmployeeAiSendAndWaitForDone(page: Page) {
  await page.getByTestId("demo-employee-ai-send").click();
  const busy = page.getByTestId("demo-employee-ai-busy");
  const input = page.getByTestId("demo-employee-ai-input");
  try {
    await expect(busy).toBeVisible({ timeout: 30_000 });
  } catch {
    await expect(input).toBeEnabled({ timeout: 120_000 });
    return;
  }
  await expect(busy).toBeHidden({ timeout: 600_000 });
  await expect(input).toBeEnabled({ timeout: 120_000 });
}

export function escalationBanner(page: Page) {
  return page.getByText(/escalated|support specialist/i).first();
}

/**
 * Vision often returns thanks-only replies while Support still has open numbered questions.
 * Substitute a substantive line so the flow can reach escalation or real answers.
 * Override with env `F5_REPLAY_SUBSTANTIVE_CUSTOMER_LINE` (pre-escalation, expectEscalation).
 */
export function substituteIfThanksOnlyClosing(
  text: string,
  opts: {
    phase: "pre_escalation" | "post_agent_reply";
    expectEscalation: boolean;
    guidance?: ShowcaseReplayGuidance;
  },
): string {
  const t = text.trim();
  if (!t) return t;
  if (t.length > 220) return t;

  const hasSubstance =
    /\d/.test(t) ||
    /\b(kubernetes|k8s|nginx|vm|tier|plan|billing|boundary|waf|protect|deploy|subscription|cancel|upgrade|downgrade)\b/i.test(
      t,
    ) ||
    t.split(/\s+/).length > 40;

  if (hasSubstance) return t;

  const looksLikeThanksOnly =
    /^(thanks|thank you|thx\b|much appreciated|i appreciate|sounds good|got it\b|please proceed|go ahead|thank you for|appreciate the help|taking care|that makes sense)\b/i.test(
      t,
    ) || (/^(yes|ok|okay)[\s,!.-]*$/i.test(t) && t.length < 40);

  if (!looksLikeThanksOnly) return t;

  if (opts.phase === "pre_escalation" && opts.expectEscalation) {
    return (
      process.env.F5_REPLAY_SUBSTANTIVE_CUSTOMER_LINE?.trim() ||
      "Kubernetes, higher NGINX One tier if that fits, and next billing boundary—please escalate so a human can finalize this."
    );
  }

  if (opts.phase === "post_agent_reply" && opts.guidance) {
    const fb = opts.guidance.fallbackPostCustomerMessage.trim();
    if (fb.length > 25 && !/^(thanks|thank you|thx)\b/i.test(fb)) {
      return fb;
    }
    return "I confirm what you outlined—please send the next step and I’ll follow from here.";
  }

  return t;
}

/** Attach what the vision model saw + structured decision for HTML report / CI artifacts. */
export async function attachVisionStepArtifacts(
  testInfo: TestInfo,
  args: {
    phase: "pre" | "post";
    step: number;
    visionInputPng: Buffer;
    decision?: CustomerReplayVisionDecision;
    error?: unknown;
  },
) {
  const { phase, step, visionInputPng, decision, error } = args;
  await testInfo.attach(`vision-${phase}-step-${step}-input.png`, {
    body: visionInputPng,
    contentType: "image/png",
  });
  if (decision) {
    await testInfo.attach(`vision-${phase}-step-${step}-decision.json`, {
      body: Buffer.from(JSON.stringify(decision, null, 2), "utf-8"),
      contentType: "application/json",
    });
  }
  if (error !== undefined) {
    const msg =
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
        : String(error);
    await testInfo.attach(`vision-${phase}-step-${step}-error.txt`, {
      body: Buffer.from(msg, "utf-8"),
      contentType: "text/plain",
    });
  }
}

/** No vision: optional opening line + product chip + generic escalate nudge when export expects escalation. */
export async function runEscalationHeuristicOnly(page: Page) {
  const banner = escalationBanner(page);
  const chip = page.getByRole("button", { name: "NGINX One", exact: true });
  if (await chip.isVisible().catch(() => false)) {
    await chip.click();
    await waitForCustomerAiIdle(page);
  }
  if (!(await banner.isVisible().catch(() => false))) {
    await sendCustomerMessage(
      page,
      "Please escalate to a human agent to process this subscription or billing request.",
    );
  }
}

export async function applyCustomerVisionDecision(
  page: Page,
  d: CustomerReplayVisionDecision,
  opts: {
    phase: "pre_escalation" | "post_agent_reply";
    expectEscalation: boolean;
    guidance?: ShowcaseReplayGuidance;
  },
): Promise<"continue" | "banner" | "done"> {
  const banner = escalationBanner(page);

  switch (d.action) {
    case "escalation_banner_visible":
      if (await banner.isVisible().catch(() => false)) return "banner";
      return "continue";
    case "session_goal_met":
      if (opts.phase === "post_agent_reply") return "done";
      if (!opts.expectEscalation && opts.phase === "pre_escalation") return "done";
      return "continue";
    case "send_text": {
      let t = d.primaryText.trim();
      if (!t) return "continue";
      t = substituteIfThanksOnlyClosing(t, {
        phase: opts.phase,
        expectEscalation: opts.expectEscalation,
        guidance: opts.guidance,
      });
      await sendCustomerMessage(page, t);
      return "continue";
    }
    case "click_suggested_chip": {
      const label = d.primaryText.trim();
      if (!label) return "continue";
      const chip = page.getByRole("button", { name: label, exact: true });
      await expect(chip).toBeVisible({ timeout: 20_000 });
      await chip.click();
      await waitForCustomerAiIdle(page);
      return "continue";
    }
    case "request_human_escalation": {
      const t = d.primaryText.trim();
      if (!t) return "continue";
      await sendCustomerMessage(page, t);
      return "continue";
    }
    default:
      return "continue";
  }
}

export async function drivePreEscalation(
  page: Page,
  testInfo: TestInfo,
  ctx: ReplayDriveContext,
  opts?: DrivePreEscalationOptions,
) {
  const { guidance, exportEscalated } = ctx;
  const useVision = process.env.F5_REPLAY_USE_VISION !== "0";
  const maxSteps = Number(process.env.F5_REPLAY_VISION_MAX_STEPS ?? "10");
  const banner = escalationBanner(page);

  if (!useVision) {
    if (!opts?.omitFallbackFirstLine) {
      const open = guidance.fallbackFirstCustomerMessage.trim();
      if (open) {
        await sendCustomerMessage(page, open);
      }
    }
    if (exportEscalated) {
      await runEscalationHeuristicOnly(page);
    }
    return;
  }

  for (let step = 0; step < maxSteps; step++) {
    if (exportEscalated && (await banner.isVisible().catch(() => false))) {
      return;
    }

    const png = await page.screenshot({ type: "png" });
    const visionInputPng = Buffer.from(png);
    let d: CustomerReplayVisionDecision;
    try {
      d = await decideCustomerReplayStepFromScreenshot({
        pngBuffer: visionInputPng,
        bundle: {
          phase: "pre_escalation",
          escalationReason: ctx.escalationReasonForVision,
          guidance,
          expectEscalation: exportEscalated,
        },
      });
    } catch (err) {
      await attachVisionStepArtifacts(testInfo, {
        phase: "pre",
        step,
        visionInputPng,
        error: err,
      });
      console.error("[showcase-replay] decideCustomerReplayStepFromScreenshot failed", {
        phase: "pre",
        step,
      });
      throw err;
    }

    try {
      const outcome = await applyCustomerVisionDecision(page, d, {
        phase: "pre_escalation",
        expectEscalation: exportEscalated,
        guidance,
      });
      if (outcome === "banner" && exportEscalated) return;
      if (outcome === "done" && !exportEscalated) return;
    } catch (err) {
      await attachVisionStepArtifacts(testInfo, {
        phase: "pre",
        step,
        visionInputPng,
        decision: d,
        error: err,
      });
      console.error("[showcase-replay] applyCustomerVisionDecision failed", {
        phase: "pre",
        step,
        action: d.action,
        primaryText: d.primaryText,
      });
      throw err;
    }
  }

  if (exportEscalated && !(await banner.isVisible().catch(() => false))) {
    await sendCustomerMessage(
      page,
      "Please escalate to a human agent to process this subscription or billing request.",
    );
  }
}

export async function drivePostAgentCustomer(
  page: Page,
  testInfo: TestInfo,
  ctx: ReplayDriveContext,
) {
  const { guidance } = ctx;
  const hasPostGuidance =
    !!guidance.postAgentCustomerGuidance.trim() ||
    !!guidance.fallbackPostCustomerMessage.trim();
  if (!hasPostGuidance) return;

  const useVision = process.env.F5_REPLAY_USE_VISION !== "0";
  const maxSteps = Number(process.env.F5_REPLAY_VISION_MAX_STEPS ?? "8");
  /** Require this many customer actions after the agent reply before allowing session_goal_met. */
  const minCustomerRepliesAfterAgent = Math.max(
    1,
    Number(process.env.F5_REPLAY_POST_AGENT_MIN_CUSTOMER_MESSAGES ?? "1"),
  );

  if (!useVision) {
    const line = guidance.fallbackPostCustomerMessage.trim();
    if (line) {
      await sendCustomerMessage(page, line);
    }
    return;
  }

  let customerRepliesAfterAgent = 0;

  for (let step = 0; step < maxSteps; step++) {
    const png = await page.screenshot({ type: "png" });
    const visionInputPng = Buffer.from(png);
    let d: CustomerReplayVisionDecision;
    try {
      d = await decideCustomerReplayStepFromScreenshot({
        pngBuffer: visionInputPng,
        bundle: {
          phase: "post_agent_reply",
          escalationReason: ctx.escalationReasonForVision,
          guidance,
          expectEscalation: ctx.exportEscalated,
        },
      });
    } catch (err) {
      await attachVisionStepArtifacts(testInfo, {
        phase: "post",
        step,
        visionInputPng,
        error: err,
      });
      console.error("[showcase-replay] decideCustomerReplayStepFromScreenshot failed", {
        phase: "post",
        step,
      });
      throw err;
    }

    try {
      const outcome = await applyCustomerVisionDecision(page, d, {
        phase: "post_agent_reply",
        expectEscalation: ctx.exportEscalated,
        guidance: ctx.guidance,
      });

      if (
        d.action === "send_text" ||
        d.action === "click_suggested_chip" ||
        d.action === "request_human_escalation"
      ) {
        customerRepliesAfterAgent += 1;
      }

      if (outcome === "done") {
        if (customerRepliesAfterAgent < minCustomerRepliesAfterAgent) {
          const fallback = guidance.fallbackPostCustomerMessage.trim();
          const line =
            customerRepliesAfterAgent === 0
              ? fallback || "Thanks — I appreciate the help with this."
              : "Sounds good — thank you again for sorting this out.";
          await sendCustomerMessage(page, line);
          customerRepliesAfterAgent += 1;
          continue;
        }
        return;
      }
    } catch (err) {
      await attachVisionStepArtifacts(testInfo, {
        phase: "post",
        step,
        visionInputPng,
        decision: d,
        error: err,
      });
      console.error("[showcase-replay] applyCustomerVisionDecision failed", {
        phase: "post",
        step,
        action: d.action,
        primaryText: d.primaryText,
      });
      throw err;
    }
  }
}

export async function submitEmployeeAiUntilReviewControls(page: Page, prompt: string) {
  for (let attempt = 0; attempt < AI_OUTER_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    await page.getByTestId("demo-employee-ai-input").fill(prompt);
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
