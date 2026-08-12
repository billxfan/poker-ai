import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained Node.js server for Docker/NAS deployments. Vercel
  // owns its output tracing and must use the platform default instead.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
