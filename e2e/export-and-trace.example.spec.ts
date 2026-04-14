/**
 * Example: tie a **downloaded conversation export** to Playwright + **trace** workflow.
 *
 * Playwright traces are not "replayed" as automation — use **show-trace** to inspect.
 * This spec optionally loads an export file and validates the API matches (deterministic check).
 *
 * ## 1) Enrich a downloaded JSON with AI (probabilistic speaker labels)
 *   pnpm export:enrich-ai ./my-export.json --out ./my-export.enriched.json
 *
 * ## 2) Run a demo test with trace on
 *   pnpm exec playwright test e2e/demo-flow.spec.ts --trace on
 *   # trace zip: test-results/.../trace.zip
 *
 * ## 3) Open the downloaded trace
 *   pnpm trace:open -- test-results/<run>/trace.zip
 *
 * ## 4) (optional) Run this example with an export on disk
 *   F5_EXPORT_JSON=./my-export.enriched.json pnpm exec playwright test e2e/export-and-trace.example.spec.ts
 */
import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "fs";

const exportPath = process.env.F5_EXPORT_JSON;

test.describe("Export JSON + trace workflow (optional)", () => {
  test.skip(
    !exportPath || !existsSync(exportPath),
    "Set F5_EXPORT_JSON to a downloaded export path to enable",
  );

  test("agent-export API matches export conversationId + email", async ({
    request,
  }) => {
    const raw = readFileSync(exportPath!, "utf-8");
    const data = JSON.parse(raw) as {
      conversationId?: string | null;
      customerEmail?: string;
    };

    const convId = data.conversationId;
    expect(convId, "export should include conversationId").toBeTruthy();
    if (!convId) return;

    const q = new URLSearchParams();
    if (data.customerEmail) q.set("email", data.customerEmail);
    const res = await request.get(
      `/api/conversations/${encodeURIComponent(convId)}/agent-export?${q.toString()}`,
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const live = (await res.json()) as { transcript?: { id: string }[] };
    expect(live.transcript?.length).toBeGreaterThan(0);
  });
});
