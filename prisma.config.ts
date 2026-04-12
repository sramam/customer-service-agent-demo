import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/** Prefer direct URL for migrations; fall back to pooled if only one string is set. */
function databaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  const pooled = process.env.DATABASE_URL?.trim();
  if (direct) return direct;
  if (pooled) return pooled;
  return "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: databaseUrl(),
  },
});
