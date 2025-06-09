/** @type {import('next').NextConfig} */

// 定义 CSP 策略
// 我们在 script-src 中加入了 'unsafe-eval' 来解决您遇到的问题
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`

const nextConfig = {
    basePath: "/hallucination-detector",
    experimental: {
      serverActions: {
        allowedOrigins: ["demo.exa.ai"],
        allowedForwardedHosts: ["demo.exa.ai"],
      },
    },
    // 新增 headers 配置
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
            },
          ],
        },
      ]
    },
  };
  
export default nextConfig;
