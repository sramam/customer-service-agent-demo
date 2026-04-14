import { z } from "zod";
import { generateObjectMessagesWithAnthropicFallback } from "@/lib/generate-object-anthropic-fallback";
import { zodToAiSchema } from "@/lib/zod-to-ai-json-schema";
import type { ShowcaseReplayGuidance } from "@/lib/showcase-replay-guidance";

export type ReplayDrivePhase = "pre_escalation" | "post_agent_reply";

export type ReplayGuidanceBundle = {
  phase: ReplayDrivePhase;
  escalationReason: string;
  guidance: ShowcaseReplayGuidance;
  /**
   * When true (export was escalated), pre-escalation phase aims for human escalation — do not end
   * with `session_goal_met`. When false, pre phase may end with `session_goal_met` when the goal is met without escalation.
   */
  expectEscalation: boolean;
};

/**
 * Vision + structured output: drive the customer chat toward **guidance** (not a fixed script).
 */
export const customerReplayVisionDecisionSchema = z.object({
  observation: z.string(),
  action: z.enum([
    "escalation_banner_visible",
    "send_text",
    "click_suggested_chip",
    "request_human_escalation",
    /** Post-agent phase: customer thread matches postAgentCustomerGuidance / natural wrap-up. */
    "session_goal_met",
  ]),
  /**
   * For send_text / request_human_escalation / click_suggested_chip. Empty when action is
   * escalation_banner_visible or session_goal_met.
   */
  primaryText: z.string(),
});

export type CustomerReplayVisionDecision = z.infer<
  typeof customerReplayVisionDecisionSchema
>;

const customerReplayVisionDecisionObjectSchema = zodToAiSchema(
  customerReplayVisionDecisionSchema,
);

export type DecideCustomerReplayStepInput = {
  pngBuffer: Buffer;
  bundle: ReplayGuidanceBundle;
};

function buildVisionPrompt(bundle: ReplayGuidanceBundle): string {
  const g = bundle.guidance;
  const facts = g.keyFacts.map((k) => `- ${k}`).join("\n");

  if (bundle.phase === "pre_escalation") {
    if (bundle.expectEscalation) {
      return `You drive an automated **F5 customer chat** test (left side of the screenshot). The test uses **guidelines**, not a fixed script — choose the **next single action** toward the goal.

## Desired outcome
${g.successSummary}

## Phase: **Before human escalation** (public chat only)
Guidance (narrative — not lines to type verbatim):
${g.preEscalationGuidance}

## Facts to honor
${facts || "(none)"}

## Escalation ground truth (why a human is needed eventually)
"""
${(bundle.escalationReason || "(none)").slice(0, 4000)}
"""

Rules:
- The thread must **alternate** customer ↔ F5 Support: **never** choose **send_text**, **click_suggested_chip**, or **request_human_escalation** when the **latest** visible message is already from **You** (customer) — wait until F5 Support has replied.
- If an **amber** banner shows escalation / support specialist / similar → **escalation_banner_visible**, primaryText "".
- If the assistant’s **latest message** lists **numbered questions** (1. 2. 3.), asks **which / what / when**, or says **“reply with”** / **“once I have”**, the customer must **answer** with concrete choices (products, deployment, timing, tier)—**not** thanks-only lines like “Thanks”, “I appreciate it”, “Please proceed”, or “Thank you for the help” **without** those answers. In that situation → **send_text** with a substantive reply; never send a chain of closers while questions are unanswered.
- If the assistant asked a clarifying question without numbered lists → **send_text** with a short natural reply that moves toward the goal using the facts + guidance.
- If a **product chip** matches intent → **click_suggested_chip**; primaryText = **exact** visible label.
- If subscription/billing intent is clear but no escalation yet → **request_human_escalation** with a polite line asking a **human agent** to take over.
- Do **not** choose **session_goal_met** in this phase (escalation is required for success).
- Keep typed messages short.`;
    }

    return `You drive an automated **F5 customer chat** test (left side). **No human escalation** is expected — the customer should get what they need from the AI assistant.

## Desired outcome
${g.successSummary}

## Guidance
${g.preEscalationGuidance}

## Facts
${facts || "(none)"}

Rules:
- The thread must **alternate** customer ↔ assistant: **never** send again while **You** is still the latest sender — wait for F5 Support’s reply first.
- If the assistant has **adequately addressed** the request per the guidance → **session_goal_met**, primaryText "".
- If a clarifying question was asked → **send_text** with a short natural reply.
- Use **click_suggested_chip** when a visible chip matches intent; primaryText = exact label.
- Do **not** use **request_human_escalation** unless the user explicitly wants a human and the UI offers that path.
- **escalation_banner_visible** only if an unexpected escalation banner appears (then stop the test flow).`;
  }

  return `You drive the **post-agent** portion of the same test (customer still on the left).

## Success summary
${g.successSummary}

## Phase: **After the human/agent reply is visible**
What we want from the customer before stopping (narrative):
${g.postAgentCustomerGuidance || "(natural thanks or confirmation — may be empty)"}

## Facts
${facts || "(none)"}

Rules:
- The thread must **alternate** customer ↔ agent: **never** choose **send_text** or **click_suggested_chip** when **You** (customer) is already the **latest** sender — the human agent must reply next.
- The case is **not** resolved until the **latest Agent (You)** message has fully addressed the request per the success summary (next steps, cancellation handling, thanks — whatever “done” means there). If that message still asks the customer for information, or only partially answers, → **send_text** with a short reply — **not** **session_goal_met**. **Do not** send only gratitude or generic thanks (“Thanks”, “Appreciate the help”) while the agent’s message still expects **specific** answers or confirmations.
- **session_goal_met** only when (1) the resolution above is clearly reflected in the **most recent agent message**, **and** (2) the customer has already sent at least one **follow-up** after that agent message that matches the guidance (thanks, confirmation, acknowledgment). If the customer has **not** replied after the latest agent turn, → **send_text** with one short line toward that wrap-up — do **not** stop yet.
- If you see chips relevant to a follow-up, you may use **click_suggested_chip**.
- Do not request human escalation again unless the UI clearly needs it (rare).`;
}

/**
 * Requires `OPENAI_API_KEY` and a vision-capable model (default `gpt-4o`).
 * `SHOWCASE_REPLAY_VISION_MODEL` overrides.
 */
export async function decideCustomerReplayStepFromScreenshot(
  input: DecideCustomerReplayStepInput,
): Promise<CustomerReplayVisionDecision> {
  const modelId = process.env.SHOWCASE_REPLAY_VISION_MODEL ?? "gpt-4o";

  const { object } = await generateObjectMessagesWithAnthropicFallback({
    label: "showcase-replay-vision",
    openaiModelId: modelId,
    schema: customerReplayVisionDecisionObjectSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: input.pngBuffer,
            mediaType: "image/png",
          },
          {
            type: "text",
            text: buildVisionPrompt(input.bundle),
          },
        ],
      },
    ],
  });

  return object;
}
