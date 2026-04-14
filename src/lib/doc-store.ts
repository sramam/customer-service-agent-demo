import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  filesForPublicProductFocus,
  PUBLIC_PRODUCT_FOCUS_IDS,
} from "@/lib/public-doc-catalog";

export type DocScope = "public" | "internal";

const ROOT = path.join(process.cwd(), "content", "docs");

export type SearchPublicDocsOptions = {
  /** Narrow public docs to a product line; ignored for internal scope. */
  productFocus?: string;
};

export async function listDocFiles(scope: DocScope): Promise<string[]> {
  const dir = path.join(ROOT, scope);
  const names = await readdir(dir);
  return names.filter((n) => n.endsWith(".md"));
}

export async function readDoc(scope: DocScope, filename: string): Promise<string> {
  const safe = path.basename(filename);
  const full = path.join(ROOT, scope, safe);
  if (!full.startsWith(path.join(ROOT, scope))) {
    throw new Error("Invalid path");
  }
  return readFile(full, "utf8");
}

/** Simple keyword search across markdown files (demo-quality, not production search). */
export async function searchDocs(
  scope: DocScope,
  query: string,
  options?: SearchPublicDocsOptions,
): Promise<string> {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (q.length === 0) return "No query terms.";
  let files = await listDocFiles(scope);
  if (scope === "public" && options?.productFocus) {
    const allow = filesForPublicProductFocus(options.productFocus);
    if (allow !== null) {
      if (allow.length === 0) {
        return `Unknown productFocus "${options.productFocus}". Use ANY or one of: ${PUBLIC_PRODUCT_FOCUS_IDS.join(", ")}.`;
      }
      files = files.filter((f) => allow.includes(f));
    }
    if (files.length === 0) {
      return `No documentation files matched productFocus "${options.productFocus}".`;
    }
  }
  const chunks: string[] = [];
  for (const file of files) {
    const text = await readDoc(scope, file);
    const lower = text.toLowerCase();
    const hits = q.filter((term) => lower.includes(term)).length;
    if (hits > 0) {
      chunks.push(`### FILE: ${file}\n${text}`);
    }
  }
  if (chunks.length === 0) {
    return `No matches in ${scope} documentation for: ${query}.\nAvailable documents: ${files.join(", ")}`;
  }
  return `IMPORTANT: Use only the exact filenames shown after "FILE:" for each source row's docFile field.\n\n${chunks.join("\n\n---\n\n")}`;
}
