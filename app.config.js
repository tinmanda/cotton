const packageJson = require("./package.json");

module.exports = {
  expo: {
    name: "Cotton",
    slug: "cotton",
    owner: "cityteam",
    version: packageJson.version,
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "cotton",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.tinmen.cotton",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.tinmen.cotton",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#3b82f6",
      },
    },
    platforms: ["ios", "android"],
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-localization",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#3b82f6",
        },
      ],
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    updates: {
      url: "https://u.expo.dev/1b1f62b0-a137-4c66-8935-ad7288fdb92e",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      eas: {
        projectId: "1b1f62b0-a137-4c66-8935-ad7288fdb92e",
      },
      // Back4App Parse Server configuration
      EXPO_PUBLIC_PARSE_APP_ID:
        process.env.EXPO_PUBLIC_PARSE_APP_ID ||
        "FCUqIKx4ZaZxK0ZhFtYkYg60iSWwJFc5KQvWbftk",
      EXPO_PUBLIC_PARSE_JS_KEY:
        process.env.EXPO_PUBLIC_PARSE_JS_KEY ||
        "lfwVvVco2YMoYp2NVO9p7qNzevooey5aGnZiXB7z",
      EXPO_PUBLIC_PARSE_SERVER_URL:
        process.env.EXPO_PUBLIC_PARSE_SERVER_URL ||
        "https://parseapi.back4app.com",
      EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV || "development",
    },
  },
};
