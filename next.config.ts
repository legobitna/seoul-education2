import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd()),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
  serverExternalPackages: ["@prisma/client", "nodemailer"],
};

export default nextConfig;
