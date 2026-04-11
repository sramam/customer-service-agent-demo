import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type DocScope = "public" | "internal";

const ROOT = path.join(process.cwd(), "content", "docs");

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
export async function searchDocs(scope: DocScope, query: string): Promise<string> {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (q.length === 0) return "No query terms.";
  const files = await listDocFiles(scope);
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
  return `IMPORTANT: Use only the exact filenames shown after "FILE:" for the docFile citation field.\n\n${chunks.join("\n\n---\n\n")}`;
}
