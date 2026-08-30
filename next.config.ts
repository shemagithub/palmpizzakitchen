import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  "https://backend.palmpizzakitchen.com";

/** Set CPANEL_STATIC=1 when building the public_html zip (HTML/CSS/JS only). */
const staticExport = process.env.CPANEL_STATIC === "1";

const nextConfig: NextConfig = {
  ...(staticExport
    ? { output: "export" as const, trailingSlash: true }
    : {}),
  images: {
    unoptimized: staticExport,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "backend.palmpizzakitchen.com",
        pathname: "/uploads/**",
      },
    ],
  },
  ...(!staticExport
    ? {
        serverExternalPackages: ["imapflow", "mailparser", "nodemailer", "dotenv"],
        async rewrites() {
          return [
            {
              source: "/uploads/:path*",
              destination: `${API_ORIGIN}/uploads/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
