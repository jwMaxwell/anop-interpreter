module.exports = {
  parserOptions: { ecmaVersion: 2021 },
  env: { browser: true, es6: true, node: true, mocha: true },
  extends: ["eslint:recommended", "prettier"],
  plugins: ["prettier"],
  rules: {
    "no-console": "off",
    "prettier/prettier": "warn",
    "dot-notation": "warn",
    "quote-props": ["warn", "as-needed"],
    "arrow-body-style": ["warn", "as-needed"],
    "object-shorthand": "warn",
    "no-use-before-define": "warn",
  },
};
