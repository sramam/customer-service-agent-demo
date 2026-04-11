import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response("Missing key parameter", { status: 400 });
  }

  const safePath = path.normalize(key);
  if (safePath.includes("..") || !safePath.endsWith(".pdf")) {
    return new Response("Invalid path", { status: 400 });
  }

  const fullPath = path.join(process.cwd(), "content", safePath);

  try {
    const buffer = await readFile(fullPath);
    const filename = path.basename(fullPath);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return new Response("Invoice not found", { status: 404 });
  }
}
