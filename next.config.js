/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  webpack: (config, { dev, isServer }) => {
    // 只在开发模式下添加最小必要的编译信息
    if (dev) {
      config.infrastructureLogging = {
        level: 'none',  // 减少基础设施日志
      }
      config.stats = 'minimal';  // 使用最小预设
    }
    return config
  },
  async rewrites() {
    return [
      {
        source: '/api/comfyui/:path*',
        destination: 'http://10.0.1.88:8188/:path*',
      },
    ];
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
    level: 'info',  // 改为 info 级别
    api: {
      level: 'info',
      bodySize: true,
      bodyParsed: false  // 不显示解析的请求体
    },
    router: {
      level: 'error'  // 只显示路由错误
    }
  }
};

module.exports = nextConfig;
