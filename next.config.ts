import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'export',
  poweredByHeader: false,
  webpack(config, { isServer }) {
    if (!isServer)
      config.resolve.fallback = { ...config.resolve.fallback, 'fs/promises': false, module: false };
    return config;
  },
};
export default config;
