import type { NextConfig } from "next";

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
