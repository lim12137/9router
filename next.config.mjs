/** @type {import('next').NextConfig} */
const isWindows = process.platform === "win32";

const nextConfig = {
  // Next.js file tracing may hit protected profile folders on Windows
  // (EPERM scandir under AppData). Keep standalone for non-Windows builds.
  ...(isWindows ? {} : { output: "standalone" }),
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_CLOUD_URL: "https://9router.com",
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
    return config;
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
