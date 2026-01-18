module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@app": "./src/app",
            "@components": "./src/components",
            "@hooks": "./src/hooks",
            "@constants": "./src/constants",
            "@assets": "./assets",
            "@": "./src",
          },
        },
      ],
    ],
  };
};
