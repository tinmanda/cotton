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

  // Contacts (unified: customers, suppliers, employees)
  CREATE_CONTACT: "createContact",
  GET_CONTACTS: "getContacts",
  UPDATE_CONTACT: "updateContact",
  DELETE_CONTACT: "deleteContact",

  // Transactions
  PARSE_TRANSACTION: "parseTransaction",
  PARSE_BULK_TRANSACTIONS: "parseBulkTransactions",
  PARSE_TRANSACTION_FROM_IMAGE: "parseTransactionFromImage",
  PARSE_TRANSACTION_INPUT: "parseTransactionInput",
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
