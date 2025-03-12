/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  async rewrites() {
    return [
      {
        source: '/api/comfyui/:path*',
        destination: 'http://10.0.1.88:8188/:path*',
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    // 添加更多的编译信息
    if (dev) {
      config.infrastructureLogging = {
        level: 'verbose',
        debug: true,
      }
      config.stats = {
        loggingDebug: true,
        logging: 'verbose',
      }
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, must-revalidate',
          }
        ],
      },
      {
        // 添加 CORS 头
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      }
    ];
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
    level: 'debug'
  }
};

module.exports = nextConfig;
