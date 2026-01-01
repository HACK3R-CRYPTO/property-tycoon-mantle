import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Add empty turbopack config to silence warning
  turbopack: {},
  webpack: (config) => {
    // Ignore all Solana-related modules (not needed for EVM/Mantle project)
    const webpack = require('webpack');
    
    // Ignore Solana packages
    const solanaPackages = [
      /^@solana\/kit$/,
      /^@solana\/web3\.js$/,
      /^@solana\/spl-token$/,
      /^@solana-program\//,
    ];
    
    solanaPackages.forEach((pattern) => {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: pattern,
        })
      );
    });
    
    // Set fallback for Solana modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@solana/kit': false,
      '@solana/web3.js': false,
      '@solana/spl-token': false,
    };
    
    return config;
  },
};

export default nextConfig;
