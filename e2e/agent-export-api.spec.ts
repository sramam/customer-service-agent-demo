import { test, expect } from "@playwright/test";

/**
 * Canonical conversation export API — stable for Playwright `request.get` (no browser hotkey).
 * Full LLM + DB flows stay in `demo-flow.spec.ts`.
 */
test.describe("GET /api/conversations/[id]/agent-export", () => {
  test("returns 404 for unknown conversation id", async ({ request }) => {
    const res = await request.get(
      "/api/conversations/clxxxxxxxxxxxxxxxxxxxxxxxx/agent-export",
    );
    expect(res.status()).toBe(404);
  });

  test("JSON error shape for 404", async ({ request }) => {
    const res = await request.get(
      "/api/conversations/not-a-real-id/agent-export",
    );
    expect(res.status()).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeDefined();
  });
});
