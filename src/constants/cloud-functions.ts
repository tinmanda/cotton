/**
 * Cloud function names
 * Use these constants when calling Parse.Cloud.run()
 */
export const CLOUD_FUNCTIONS = {
  // Auth
  REQUEST_OTP: "requestOTP",
  VERIFY_OTP: "verifyOTP",
  CREATE_USER: "createUser",
  UPDATE_USER_NAME: "updateUserName",

  // Categories
  SEED_CATEGORIES: "seedCategories",
  GET_CATEGORIES: "getCategories",

  // Projects
  CREATE_PROJECT: "createProject",
  GET_PROJECTS: "getProjects",
  UPDATE_PROJECT: "updateProject",

  // Employees
  CREATE_EMPLOYEE: "createEmployee",
  GET_EMPLOYEES: "getEmployees",
  UPDATE_EMPLOYEE: "updateEmployee",

  // Merchants
  GET_MERCHANTS: "getMerchants",
  UPDATE_MERCHANT: "updateMerchant",
  DELETE_MERCHANT: "deleteMerchant",

  // Transactions
  PARSE_TRANSACTION: "parseTransaction",
  PARSE_BULK_TRANSACTIONS: "parseBulkTransactions",
  PARSE_TRANSACTION_FROM_IMAGE: "parseTransactionFromImage",
  CREATE_TRANSACTION_FROM_PARSED: "createTransactionFromParsed",
  CREATE_BULK_TRANSACTIONS: "createBulkTransactions",
  GET_TRANSACTIONS: "getTransactions",
  UPDATE_TRANSACTION: "updateTransaction",
  DELETE_TRANSACTION: "deleteTransaction",

  // Dashboard & Analytics
  GET_DASHBOARD: "getDashboard",
  GET_PROJECT_SUMMARY: "getProjectSummary",

  // Utility
  HELLO: "hello",
} as const;

export type CloudFunctionKey = keyof typeof CLOUD_FUNCTIONS;
