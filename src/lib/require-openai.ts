/**
 * Returns a JSON Response if OpenAI is not configured (e.g. missing Vercel env var).
 * Otherwise returns null and handlers continue.
 */
export function requireOpenAiKeyResponse(): Response | null {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return null;
  }
  return Response.json(
    {
      error:
        "OPENAI_API_KEY is not set. Add it in Vercel: Project → Settings → Environment Variables, then redeploy.",
    },
    { status: 503 }
  );
}
