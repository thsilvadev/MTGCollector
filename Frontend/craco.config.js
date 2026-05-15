module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://backend:3000',
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
      },
    },
  },
};
