import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import packageJson from './package.json'

// I18N 配置
const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  output: 'standalone', // 开启独立打包模式
  // 定义环境变量
  env: {
    NEXT_PUBLIC_VERSION: packageJson.version,
    NEXT_PUBLIC_REPOSITORY: packageJson.repository.url,
  },
  // api路由代理
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/:path*', // 代理到本地开发服务器
      },
    ]
  },
  // 代理配置覆盖
  experimental: {
    // proxyTimeout: 300_000, // 请求超时
    // proxyClientMaxBodySize: '15mb', // body最大限制
  },
  // 开发环境origin
  allowedDevOrigins: ['10.168.1.*'],
}

export default withNextIntl(nextConfig)
