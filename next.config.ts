import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: this app has no API routes, middleware, server actions,
  // or dynamic route segments — every page is a plain client component
  // that talks to the external Python backend via fetch(), so it doesn't
  // need a Node server behind it at all. That makes it deployable as a
  // folder of static files (`npm run build` writes to `out/`) to any
  // static host — Render Static Sites, Netlify, Cloudflare Pages — instead
  // of needing a platform that runs a Next.js server, like Vercel.
  output: "export",
};

export default nextConfig;
