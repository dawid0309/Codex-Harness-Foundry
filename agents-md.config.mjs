const config = {
  include: ["**/agents-md/**/*.md", "**/*.agents.md"],
  exclude: [
    "**/node_modules/**",
    "**/.git/**",
    "**/.next/**",
    "**/coverage/**",
    "**/dist/**",
  ],
  defaultTarget: "nearest",
  annotateSources: true,
};

export default config;
