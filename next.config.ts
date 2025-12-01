import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker/Cloud Run deployment
  output: 'standalone',

  // Redirects - equivalent to htaccess redirects
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: '(?<domain>(?!www\\.).+)', // Match any domain that doesn't start with www.
          },
        ],
        destination: 'https://www.:domain/:path*',
        permanent: true, // 301 redirect
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      // Add other common image hosting services
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
