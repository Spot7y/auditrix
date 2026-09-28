import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
