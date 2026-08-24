import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["data/**", "dist/**", ".next/**"],
  },
];

export default eslintConfig;
