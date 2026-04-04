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
};

export default nextConfig;
