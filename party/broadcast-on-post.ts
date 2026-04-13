import type * as Party from "partykit/server";

/**
 * POST with header `x-partykit-secret` matching `PARTYKIT_SECRET` (room.vars / deploy env).
 * Body is broadcast verbatim to all WebSocket connections in the room.
 */
export async function broadcastOnPost(
  room: Party.Room,
  req: Party.Request,
): Promise<Response> {
  const secret = room.env.PARTYKIT_SECRET as string | undefined;
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const auth = req.headers.get("x-partykit-secret");
  if (!secret || auth !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await req.text();
  room.broadcast(body);
  return new Response("ok", { status: 200 });
}
