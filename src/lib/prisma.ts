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

  const bundled = path.join(process.cwd(), "prisma", "dev.db");
  const runtime = "/tmp/f5-poc.db";
  try {
    if (existsSync(runtime)) {
      unlinkSync(runtime);
    }
    if (existsSync(bundled)) {
      copyFileSync(bundled, runtime);
    }
  } catch {
    // Writable /tmp copy failed — adapter may still open an empty file.
  }
}

function sqliteFileUrl(): string {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv?.startsWith("file:")) {
    return fromEnv;
  }
  if (process.env.VERCEL === "1") {
    return "file:/tmp/f5-poc.db";
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

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
