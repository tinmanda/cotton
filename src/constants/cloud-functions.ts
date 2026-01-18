/**
 * Cloud function names
 * Use these constants when calling Parse.Cloud.run()
 */
export const CLOUD_FUNCTIONS = {
  REQUEST_OTP: "requestOTP",
  VERIFY_OTP: "verifyOTP",
  CREATE_USER: "createUser",
  HELLO: "hello",
} as const;

export type CloudFunctionKey = keyof typeof CLOUD_FUNCTIONS;
