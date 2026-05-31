import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// Enables getCloudflareContext() (and the D1 binding) during `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
