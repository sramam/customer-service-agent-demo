import { getEnrichedEscalatedConversations } from "@/lib/get-enriched-conversations";

export async function GET() {
  const enriched = await getEnrichedEscalatedConversations();
  return Response.json(enriched);
}
