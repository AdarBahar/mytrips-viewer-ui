// craco.config.js
const path = require("path");
// Load environment variables based on NODE_ENV
// Don't load .env files here - let Create React App handle it with its standard priority order

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === "true",
};

const webpackConfig = {
  style: {
    postcss: {
      mode: 'file',
    },
  },
  paths: (paths) => {
    paths.appPath = path.resolve(__dirname, 'frontend');
    paths.appPublic = path.resolve(__dirname, 'frontend/public');
    paths.appHtml = path.resolve(__dirname, 'frontend/public/index.html');
    paths.appIndexJs = path.resolve(__dirname, 'frontend/src/index.js');
    paths.appSrc = path.resolve(__dirname, 'frontend/src');
    paths.appBuild = path.resolve(__dirname, 'build');
    return paths;
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
    },
    configure: (webpackConfig) => {

      // Disable hot reload completely if environment variable is set
      if (config.disableHotReload) {
        // Remove hot reload related plugins
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });

        // Disable watch mode
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/, // Ignore all files
        };
      } else {
        // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        };
      }

      return webpackConfig;
    },
  },
};

module.exports = webpackConfig;
