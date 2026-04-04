import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@newchat/db"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "masious.ir",
        port: "",
        pathname: "/**",
      }
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Upload source maps for readable stack traces in Sentry
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
