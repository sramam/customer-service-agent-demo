import { readDoc, listDocFiles, type DocScope } from "@/lib/doc-store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") as DocScope | null;
  const file = url.searchParams.get("file");

  if (!scope || !["public", "internal"].includes(scope)) {
    return Response.json({ error: "scope must be 'public' or 'internal'" }, { status: 400 });
  }

  if (file) {
    try {
      const content = await readDoc(scope, file);
      return Response.json({ scope, file, content });
    } catch {
      return Response.json({ error: "File not found" }, { status: 404 });
    }
  }

  const files = await listDocFiles(scope);
  return Response.json({ scope, files });
}
