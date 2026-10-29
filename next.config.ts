import type { NextConfig } from 'next';

const basePath = process.env.BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  // Let a phone on the same Wi-Fi, or a VS Code forwarded port, load the dev server.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '*.devtunnels.ms'],
};

export default nextConfig;
