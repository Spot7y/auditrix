import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content Security Policy: the browser only loads scripts, styles, fonts and
// data from Auditrix itself (no third-party scripts, and the browser never
// talks to Supabase directly), and no other site may show Auditrix in a frame.
// React needs 'unsafe-eval' in development only, for its error overlay.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Older browsers' version of frame-ancestors: no clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // Files are only treated as the type the server says they are.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites don't see Auditrix addresses (which contain student IDs).
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Once served over HTTPS, browsers refuse plain HTTP for two years. Only
  // the production build sends it; browsers ignore it over plain HTTP.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  // Don't announce the framework in every response.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Hide the round "N" indicator Next.js shows while developing. Build and
  // runtime errors are still shown when they happen.
  devIndicators: false,
  experimental: {
    serverActions: {
      // Server actions default to a 1 MB request limit, which a large
      // KSU-MIS student export can exceed. The import dialog rejects files
      // over 10 MB before uploading; the extra room covers form overhead.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
