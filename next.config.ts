import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright uses http://127.0.0.1:3000 while `next dev` prints localhost — avoids noisy HMR warnings.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
