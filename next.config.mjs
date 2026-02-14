/** @type {import('next').NextConfig} */
const isWindows = process.platform === "win32";

const nextConfig = {
  // Windows file tracing may touch protected profile paths during standalone copy.
  ...(isWindows ? {} : { output: "standalone" }),
  distDir: ".next",
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_CLOUD_URL: "https://9router.com",
  },
  // Configure Server Actions request body size limit.
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    // Ignore fs/path modules in browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    // Reduce webpack infrastructure log noise.
    config.infrastructureLogging = {
      level: 'error',
    };
    return config;
  },
  // Exclude large directories from being watched/scanned
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
  async rewrites() {
    return [
      {
        source: "/v1/v1/:path*",
        destination: "/api/v1/:path*"
      },
      {
        source: "/v1/v1",
        destination: "/api/v1"
      },
      {
        source: "/codex/:path*",
        destination: "/api/v1/responses"
      },
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*"
      },
      {
        source: "/v1",
        destination: "/api/v1"
      }
    ];
  }
};

export default nextConfig;
