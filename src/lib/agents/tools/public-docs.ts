import { tool } from "ai";
import { z } from "zod";
import { searchDocs } from "@/lib/doc-store";
import {
  formatPublicDocCatalog,
  PUBLIC_PRODUCT_SEARCH_FOCUS,
} from "@/lib/public-doc-catalog";

export const listPublicProductDocs = tool({
  description:
    "List public product documentation areas and filenames. Call when you need to choose a productFocus for searchPublicDocs or to explain options to the customer.",
  inputSchema: z.object({}),
  execute: async () => formatPublicDocCatalog(),
});

export const searchPublicDocs = tool({
  description:
    "Search F5 public product documentation (BIG-IP, NGINX One, Distributed Cloud, etc.). Use productFocus to search only one product line, or ANY / omit to search all public docs. For available focuses, call listPublicProductDocs.",
  inputSchema: z.object({
    query: z.string().describe("Search terms to look for in public docs"),
    productFocus: z
      .enum(PUBLIC_PRODUCT_SEARCH_FOCUS)
      .optional()
      .describe(
        "Narrow to one product line; omit or ANY to search every public doc file.",
      ),
  }),
  execute: async ({ query, productFocus }) => {
    const focus =
      productFocus && productFocus !== "ANY" ? productFocus : undefined;
    return searchDocs("public", query, { productFocus: focus });
  },
});
