import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production configuration
  output: 'standalone',
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    domains: ['7p-education.7peducation.com', 'localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Enable experimental features for better performance
  experimental: {
    serverActions: {
      allowedOrigins: ['7p-education.7peducation.com', 'localhost:3002']
    }
  },
  
  // Runtime configuration
  serverRuntimeConfig: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
};

export default nextConfig;
