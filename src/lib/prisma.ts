import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma";
import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const vercelCopyFlag = "__f5_vercel_sqlite_copied__";

function ensureVercelBundledDbOnTmp(): void {
  if (process.env.VERCEL !== "1") return;
  const g = globalThis as Record<string, unknown>;
  if (g[vercelCopyFlag]) return;
  g[vercelCopyFlag] = true;

  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "prisma", "dev.db"),
    path.join(cwd, "dev.db"),
  ];

  const runtime = "/tmp/f5-poc.db";
  try {
    if (existsSync(runtime)) {
      unlinkSync(runtime);
    }
    let bundled: string | undefined;
    for (const p of candidates) {
      if (existsSync(p)) {
        bundled = p;
        break;
      }
    }
    if (bundled) {
      copyFileSync(bundled, runtime);
    } else {
      console.error(
        "[prisma] Vercel: bundled SQLite not found. Tried:",
        candidates,
        "cwd=",
        cwd
      );
    }
  } catch (e) {
    console.error("[prisma] Vercel: copy dev.db → /tmp failed:", e);
  }
}

/**
 * Local dev: DATABASE_URL=file:... or prisma/dev.db.
 * Vercel: **always** file:/tmp/f5-poc.db — do not use DATABASE_URL from pasted .env (e.g. file:./dev.db)
 * or SQLite hits SQLITE_CANTOPEN on the read-only serverless filesystem.
 */
function sqliteFileUrl(): string {
  if (process.env.VERCEL === "1") {
    return "file:/tmp/f5-poc.db";
  }
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv?.startsWith("file:")) {
    return fromEnv;
  }
  return "file:" + path.join(process.cwd(), "prisma", "dev.db");
}

function createClient() {
  ensureVercelBundledDbOnTmp();
  const adapter = new PrismaBetterSqlite3({
    url: sqliteFileUrl(),
  });
  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = createClient());
