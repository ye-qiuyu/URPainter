/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
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
