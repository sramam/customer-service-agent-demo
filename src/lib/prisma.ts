import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function databaseUrlForApp(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url && !url.startsWith("postgresql")) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL URL (Neon pooled). Remove SQLite file: URLs from .env.",
    );
  }
  if (url?.startsWith("postgresql")) return url;
  // Build / generate without a real DB; set DATABASE_URL for runtime queries.
  return "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

export const prisma =
  globalForPrisma.prisma ??
  (globalForPrisma.prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: databaseUrlForApp() }),
  }));
