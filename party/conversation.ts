import type * as Party from "partykit/server";
import { broadcastOnPost } from "./broadcast-on-post";

export default class ConversationParty implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onRequest(req: Party.Request) {
    return broadcastOnPost(this.room, req);
  }
}
