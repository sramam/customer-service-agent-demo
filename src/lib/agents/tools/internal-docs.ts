import { tool } from "ai";
import { z } from "zod";
import { searchDocs } from "@/lib/doc-store";

export const searchInternalDocs = tool({
  description:
    "Search internal-only documentation: runbooks, triage codes, account change procedures. Results must NEVER be forwarded to customers.",
  inputSchema: z.object({
    query: z.string().describe("Search terms to look for in internal docs"),
  }),
  execute: async ({ query }) => {
    return searchDocs("internal", query);
  },
});
