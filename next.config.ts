import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright uses http://127.0.0.1:3000 while `next dev` prints localhost — avoids noisy HMR warnings.
  allowedDevOrigins: ["127.0.0.1"],
  // Ensure bundled SQLite from the Vercel build is traced into serverless output (copied to /tmp at boot).
  outputFileTracingIncludes: {
    "/*": ["./prisma/dev.db"],
  },
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
