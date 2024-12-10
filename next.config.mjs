/** @type {import('next').NextConfig} */

//remove the below NextConfig when deploying
const nextConfig = {
    basePath: "/hallucination-detector",
    experimental: {
      serverActions: {
        allowedOrigins: ["demo.exa.ai"],
        allowedForwardedHosts: ["demo.exa.ai"],
      },
    },
  };
  
export default nextConfig;