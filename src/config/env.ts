import Constants from "expo-constants";

interface EnvConfig {
  parseAppId: string;
  parseJsKey: string;
  parseServerUrl: string;
  env: "development" | "staging" | "production";
}

const getEnvVar = (key: string): string => {
  const value = Constants.expoConfig?.extra?.[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const getOptionalEnvVar = (key: string): string => {
  return Constants.expoConfig?.extra?.[key] || "";
};

export const ENV: EnvConfig = {
  parseAppId: getEnvVar("EXPO_PUBLIC_PARSE_APP_ID"),
  parseJsKey: getEnvVar("EXPO_PUBLIC_PARSE_JS_KEY"),
  parseServerUrl: getEnvVar("EXPO_PUBLIC_PARSE_SERVER_URL"),
  env: (getOptionalEnvVar("EXPO_PUBLIC_ENV") ||
    "development") as EnvConfig["env"],
};

export const isDevelopment = ENV.env === "development";
export const isProduction = ENV.env === "production";
export const isStaging = ENV.env === "staging";
