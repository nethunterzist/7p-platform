import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development configurations for faster iteration
  eslint: {
    // Temporarily ignore ESLint during build for development
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    // Temporarily ignore TypeScript errors during build for development
    ignoreBuildErrors: true,
  },
  
  images: {
    domains: ['localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
