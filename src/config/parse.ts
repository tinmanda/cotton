import AsyncStorage from "@react-native-async-storage/async-storage";
import Parse from "parse/react-native.js";
import { ENV } from "./env";

let isInitialized = false;

/**
 * Initialize Parse SDK with Back4App configuration
 * Only initializes once, safe to call multiple times
 */
export const initializeParse = (): void => {
  if (isInitialized) {
    return;
  }

  Parse.setAsyncStorage(AsyncStorage);
  Parse.initialize(ENV.parseAppId, ENV.parseJsKey);
  Parse.serverURL = ENV.parseServerUrl;

  isInitialized = true;
};

/**
 * Check if Parse has been initialized
 */
export const isParseInitialized = (): boolean => {
  return isInitialized;
};
