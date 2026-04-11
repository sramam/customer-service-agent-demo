import { tool } from "ai";
import { z } from "zod";
import { searchDocs } from "@/lib/doc-store";

export const searchPublicDocs = tool({
  description:
    "Search F5 public product documentation (BIG-IP, NGINX One, Distributed Cloud). Returns matching excerpts.",
  inputSchema: z.object({
    query: z.string().describe("Search terms to look for in public docs"),
  }),
  execute: async ({ query }) => {
    return searchDocs("public", query);
  },
});
