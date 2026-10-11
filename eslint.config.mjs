import { config } from "@workspace/eslint-config/base";
export default [
  ...config,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/.next/**",
      "**/target/**",
      "**/runtime/**",
      "**/.runtime-staging/**",
      ".scratch/**",
      "pb/pb_data/**",
      "pb/pb_migrations/**",
      "pb/pb_hooks/**",
    ],
  },
];
