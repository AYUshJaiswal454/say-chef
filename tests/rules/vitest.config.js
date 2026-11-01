// Kept separate from the app's vite.config.ts so these tests only need this folder's packages.
export default {
  test: {
    include: ['**/*.test.js'],
    exclude: ['node_modules/**'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
};
