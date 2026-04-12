import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright uses http://127.0.0.1:3000 while `next dev` prints localhost — avoids noisy HMR warnings.
  allowedDevOrigins: ["127.0.0.1"],
  // Bundle prisma/dev.db (created by vercel-build: migrate + seed) into serverless output.
  // Route keys are URL pathnames; include API + catch-all so every function gets the file.
  outputFileTracingIncludes: {
    "/*": ["./prisma/dev.db"],
    "/api/**/*": ["./prisma/dev.db"],
    "/api/chat": ["./prisma/dev.db"],
    "/api/chat/classify": ["./prisma/dev.db"],
    "/api/agent-chat": ["./prisma/dev.db"],
    "/api/conversations": ["./prisma/dev.db"],
    "/api/conversations/[id]/approve": ["./prisma/dev.db"],
    "/api/escalate": ["./prisma/dev.db"],
  },
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
