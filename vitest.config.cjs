// vitest 配置：排除本机无权限访问的缓存目录（.pytest_cache / .ruff_cache）
// 避免 vitest 全树扫描时 EPERM 中止（npm test）
/** @type {import('vitest').UserConfig} */
module.exports = {
  test: {
    exclude: [
      "node_modules/**",
      ".pytest_cache/**",
      ".ruff_cache/**",
      "**/__pycache__/**",
      ".git/**",
      "data/**",
    ],
  },
};
