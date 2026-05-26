import globals from "globals";
import sveltePlugin from "eslint-plugin-svelte";

export default [
  {
    ignores: ["dist/", "node_modules/"],
  },
  ...sveltePlugin.configs["flat/recommended"],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-console": "off",
    },
  },
];
