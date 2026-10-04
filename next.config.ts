import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Docker 镜像里只打包 standalone 产物，体积小很多；直接 npm start 部署时不受影响
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
};

export default nextConfig;
