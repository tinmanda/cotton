/**
 * Cotton Cloud Code
 * Main entry point for Back4App Cloud Code functions
 */

const { v4: uuidv4 } = require("uuid");

// ============================================
// Configuration
// ============================================

// Anthropic API key (set in Back4App environment variables)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Fallback exchange rate (used if API fails)
const FALLBACK_USD_TO_INR_RATE = 83;

// Default categories to seed
const DEFAULT_CATEGORIES = [
  // Expense categories
  { name: "Software & Tools", type: "expense", icon: "laptop", color: "#3B82F6" },
  { name: "Salaries", type: "expense", icon: "users", color: "#8B5CF6" },
  { name: "Marketing", type: "expense", icon: "megaphone", color: "#EC4899" },
  { name: "Office & Supplies", type: "expense", icon: "briefcase", color: "#F59E0B" },
  { name: "Travel", type: "expense", icon: "plane", color: "#10B981" },
  { name: "Food & Entertainment", type: "expense", icon: "utensils", color: "#EF4444" },
  { name: "Cloud & Hosting", type: "expense", icon: "cloud", color: "#6366F1" },
  { name: "Professional Services", type: "expense", icon: "scale", color: "#14B8A6" },
  { name: "Taxes & Fees", type: "expense", icon: "landmark", color: "#64748B" },
  { name: "Miscellaneous", type: "expense", icon: "circle-dot", color: "#94A3B8" },
  // Income categories
  { name: "Client Revenue", type: "income", icon: "wallet", color: "#22C55E" },
  { name: "Product Sales", type: "income", icon: "shopping-cart", color: "#06B6D4" },
  { name: "Consulting", type: "income", icon: "message-square", color: "#A855F7" },
  { name: "Investment Returns", type: "income", icon: "trending-up", color: "#F97316" },
  { name: "Other Income", type: "income", icon: "plus-circle", color: "#84CC16" },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(countryCode, phoneNumber) {
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const normalizedCode = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
  return `${normalizedCode}${cleanPhone}`;
}

/**
 * Generate a random password for users
 */
function generateRandomPassword() {
  return uuidv4() + uuidv4();
}

/**
 * Get exchange rate for a specific date (with caching)
 * Uses exchangerate.host API for historical rates
 * @param {string} fromCurrency - Source currency code (e.g., "USD")
 * @param {string} toCurrency - Target currency code (e.g., "INR")
 * @param {Date} date - Date for the exchange rate
 * @returns {Promise<number>} Exchange rate
 */
async function getExchangeRate(fromCurrency, toCurrency, date) {
  if (fromCurrency === toCurrency) return 1;

  // Format date as YYYY-MM-DD
  const dateStr = date.toISOString().split("T")[0];
  const cacheKey = `${fromCurrency}_${toCurrency}_${dateStr}`;

  // Check cache first (ExchangeRate class)
  const cacheQuery = new Parse.Query("ExchangeRate");
  cacheQuery.equalTo("cacheKey", cacheKey);
  const cached = await cacheQuery.first({ useMasterKey: true });

  if (cached) {
    console.log(`[getExchangeRate] Cache hit: ${cacheKey} = ${cached.get("rate")}`);
    return cached.get("rate");
  }

  // Fetch from API (using Frankfurter - free, no API key required)
  try {
    const apiUrl = `https://api.frankfurter.app/${dateStr}?from=${fromCurrency}&to=${toCurrency}`;
    console.log(`[getExchangeRate] Fetching: ${apiUrl}`);

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.rates || !data.rates[toCurrency]) {
      throw new Error(`Invalid API response: ${JSON.stringify(data)}`);
    }

    const rate = data.rates[toCurrency];
    console.log(`[getExchangeRate] Fetched: ${cacheKey} = ${rate}`);

    // Cache the rate
    const ExchangeRate = Parse.Object.extend("ExchangeRate");
    const rateObj = new ExchangeRate();
    rateObj.set("cacheKey", cacheKey);
    rateObj.set("fromCurrency", fromCurrency);
    rateObj.set("toCurrency", toCurrency);
    rateObj.set("date", date);
    rateObj.set("rate", rate);
    await rateObj.save(null, { useMasterKey: true });

    return rate;
  } catch (error) {
    console.error(`[getExchangeRate] API error: ${error.message}, using fallback`);
    // Return fallback rate
    if (fromCurrency === "USD" && toCurrency === "INR") {
      return FALLBACK_USD_TO_INR_RATE;
    }
    return 1; // Default to 1:1 for unknown pairs
  }
}

/**
 * Convert amount to INR (async, uses real exchange rates)
 * @param {number} amount - Amount to convert
 * @param {string} currency - Source currency code
 * @param {Date} date - Date for the exchange rate (defaults to today)
 * @returns {Promise<number>} Amount in INR
 */
async function convertToINR(amount, currency, date = new Date()) {
  if (currency === "INR") return amount;

  const rate = await getExchangeRate(currency, "INR", date);
  return amount * rate;
}

/**
 * Find potential duplicate transactions
 * Matches: same amount, similar contact name, date within ±3 days
 * @param {Parse.User} user - The user
 * @param {number} amount - Transaction amount
 * @param {string} contactName - Contact name to match
 * @param {Date} date - Transaction date
 * @param {string} excludeId - Transaction ID to exclude (the one we just created)
 * @returns {Promise<string[]>} Array of potential duplicate transaction IDs
 */
async function findPotentialDuplicates(user, amount, contactName, date, excludeId = null) {
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const startDate = new Date(date.getTime() - threeDaysMs);
  const endDate = new Date(date.getTime() + threeDaysMs);

  // Query for transactions with same amount within date range
  const query = new Parse.Query("Transaction");
  query.equalTo("user", user);
  query.equalTo("amount", amount);
  query.greaterThanOrEqualTo("date", startDate);
  query.lessThanOrEqualTo("date", endDate);
  if (excludeId) {
    query.notEqualTo("objectId", excludeId);
  }
  query.limit(10);

  const potentialDuplicates = await query.find({ useMasterKey: true });

  // Filter by contact name similarity (case-insensitive, trimmed)
  const normalizedContactName = contactName.trim().toLowerCase();
  const matches = [];

  for (const t of potentialDuplicates) {
    const txContactName = (t.get("contactName") || "").trim().toLowerCase();

    // Check for exact match or if one name contains the other
    if (
      txContactName === normalizedContactName ||
      txContactName.includes(normalizedContactName) ||
      normalizedContactName.includes(txContactName)
    ) {
      matches.push(t.id);
    }
  }

  return matches;
}

/**
 * Call Anthropic API (text only)
 */
async function callAnthropic(systemPrompt, userMessage) {
  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
  } catch (fetchError) {
    console.error("[callAnthropic] Fetch error:", fetchError.message);
    throw new Error(`Anthropic fetch error: ${fetchError.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[callAnthropic] API error:", errorText);
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Call Anthropic API with image support (for vision)
 */
async function callAnthropicWithImage(systemPrompt, textMessage, imageBase64, mediaType = "image/jpeg") {
  const content = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: imageBase64,
      },
    },
    {
      type: "text",
      text: textMessage,
    },
  ];

  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      }),
    });
  } catch (fetchError) {
    console.error("[callAnthropicWithImage] Fetch error:", fetchError.message);
    throw new Error(`Anthropic fetch error: ${fetchError.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[callAnthropicWithImage] API error:", errorText);
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Call Anthropic API with optional text and multiple media files (images and PDFs)
 * @param {string} systemPrompt - System prompt
 * @param {string|null} textMessage - Optional text message
 * @param {Array<{base64: string, mediaType: string}>} mediaFiles - Array of images or PDFs
 */
async function callAnthropicWithMedia(systemPrompt, textMessage, mediaFiles = []) {
  const content = [];
  let hasPdf = false;

  // Add media files first (images and documents)
  for (const file of mediaFiles) {
    const isPdf = file.mediaType === "application/pdf";
    if (isPdf) {
      hasPdf = true;
      // Use document type for PDFs (per Anthropic API spec)
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: file.base64,
        },
      });
    } else {
      // Use image type for images
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.mediaType || "image/jpeg",
          data: file.base64,
        },
      });
    }
  }

  // Add text message
  if (textMessage) {
    content.push({
      type: "text",
      text: textMessage,
    });
  }

  // Use Sonnet for PDFs (Haiku doesn't support PDF input), Haiku for images only
  const model = hasPdf ? "claude-sonnet-4-20250514" : "claude-3-haiku-20240307";
  // PDFs can have many transactions (potentially 500-1000), so use very high max_tokens
  // Claude Sonnet 4 supports up to 64K output tokens
  const maxTokens = hasPdf ? 65536 : 4096;

  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      }),
    });
  } catch (fetchError) {
    console.error("[callAnthropicWithMedia] Fetch error:", fetchError.message);
    throw new Error(`Anthropic fetch error: ${fetchError.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[callAnthropicWithMedia] API error:", errorText);
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Require authenticated user
 */
function requireUser(request) {
  if (!request.user) {
    throw new Parse.Error(
      Parse.Error.INVALID_SESSION_TOKEN,
      "User must be authenticated"
    );
  }
  return request.user;
}

/**
 * Set user ACL on object
 */
function setUserACL(object, user) {
  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(false);
  object.setACL(acl);
}

/**
 * Transform Contact Parse object to plain object
 */
function transformContact(contact) {
  return {
    id: contact.id,
    name: contact.get("name"),
    types: contact.get("types") || [],
    aliases: contact.get("aliases") || [],
    email: contact.get("email"),
    phone: contact.get("phone"),
    company: contact.get("company"),
    website: contact.get("website"),
    notes: contact.get("notes"),
    totalSpent: contact.get("totalSpent") || 0,
    totalReceived: contact.get("totalReceived") || 0,
    transactionCount: contact.get("transactionCount") || 0,
    defaultCategoryId: contact.get("defaultCategory")?.id,
    // Employee-specific fields
    role: contact.get("role"),
    monthlySalary: contact.get("monthlySalary"),
    salaryCurrency: contact.get("salaryCurrency"),
    employeeStatus: contact.get("employeeStatus"),
    projectId: contact.get("project")?.id,
    projectName: contact.get("project")?.get("name"),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

// ============================================
// OTP Authentication Cloud Functions
// ============================================

Parse.Cloud.define("requestOTP", async (request) => {
  const { countryCode, phoneNumber } = request.params;

  if (!countryCode || !phoneNumber) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Country code and phone number are required"
    );
  }

  const cleanPhone = phoneNumber.replace(/\D/g, "");
  if (cleanPhone.length < 6 || cleanPhone.length > 15) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Phone number must be between 6 and 15 digits"
    );
  }

  const normalizedPhone = normalizePhoneNumber(countryCode, phoneNumber);
  console.log(`[OTP] Requested for ${normalizedPhone} - OTP is 1234`);

  return { success: true, message: "OTP sent successfully" };
});

Parse.Cloud.define("verifyOTP", async (request) => {
  const { countryCode, phoneNumber, otp, countryIsoCode } = request.params;

  if (!countryCode || !phoneNumber || !otp) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Country code, phone number, and OTP are required"
    );
  }

  if (otp !== "1234") {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Invalid OTP");
  }

  const normalizedPhone = normalizePhoneNumber(countryCode, phoneNumber);
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("username", normalizedPhone);
  const existingUser = await userQuery.first({ useMasterKey: true });

  if (existingUser) {
    const newPassword = generateRandomPassword();
    existingUser.set("password", newPassword);
    await existingUser.save(null, { useMasterKey: true });
    const loggedInUser = await Parse.User.logIn(normalizedPhone, newPassword);

    return {
      isNewUser: false,
      sessionToken: loggedInUser.getSessionToken(),
      user: {
        id: loggedInUser.id,
        phoneNumber: normalizedPhone,
        fullName: loggedInUser.get("fullName") || "",
        email: loggedInUser.get("email"),
        profilePhoto: loggedInUser.get("profilePhoto"),
        createdAt: loggedInUser.createdAt,
        updatedAt: loggedInUser.updatedAt,
      },
    };
  }

  return {
    isNewUser: true,
    phoneNumber: normalizedPhone,
    countryIsoCode: countryIsoCode || "US",
  };
});

Parse.Cloud.define("createUser", async (request) => {
  const { countryCode, phoneNumber, countryIsoCode, fullName } = request.params;

  if (!countryCode || !phoneNumber || !fullName) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Country code, phone number, and full name are required"
    );
  }

  if (fullName.trim().length < 2) {
    throw new Parse.Error(
      Parse.Error.VALIDATION_ERROR,
      "Name must be at least 2 characters"
    );
  }

  const normalizedPhone = normalizePhoneNumber(countryCode, phoneNumber);
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("username", normalizedPhone);
  const existingUser = await userQuery.first({ useMasterKey: true });

  if (existingUser) {
    throw new Parse.Error(
      Parse.Error.USERNAME_TAKEN,
      "An account with this phone number already exists"
    );
  }

  const user = new Parse.User();
  const password = generateRandomPassword();
  user.set("username", normalizedPhone);
  user.set("email", `${normalizedPhone.replace("+", "")}@phone.cotton.app`);
  user.set("password", password);
  user.set("fullName", fullName.trim());
  user.set("phoneNumber", normalizedPhone);
  user.set("countryIsoCode", countryIsoCode || "US");

  await user.signUp(null, { useMasterKey: true });

  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(true);
  user.setACL(acl);
  await user.save(null, { useMasterKey: true });

  const loggedInUser = await Parse.User.logIn(normalizedPhone, password);

  return {
    sessionToken: loggedInUser.getSessionToken(),
    user: {
      id: loggedInUser.id,
      phoneNumber: normalizedPhone,
      fullName: loggedInUser.get("fullName"),
      email: loggedInUser.get("email"),
      profilePhoto: loggedInUser.get("profilePhoto"),
      createdAt: loggedInUser.createdAt,
      updatedAt: loggedInUser.updatedAt,
    },
  };
});

Parse.Cloud.define("updateUserName", async (request) => {
  const { fullName } = request.params;
  const user = requireUser(request);

  if (!fullName || fullName.trim().length === 0) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Name is required");
  }

  const trimmedName = fullName.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Name must be between 2 and 100 characters"
    );
  }

  user.set("fullName", trimmedName);
  await user.save(null, { useMasterKey: true });

  return {
    success: true,
    user: {
      id: user.id,
      phoneNumber: user.get("phoneNumber"),
      fullName: user.get("fullName"),
      email: user.get("email"),
      profilePhoto: user.get("profilePhoto"),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
});

// ============================================
// Category Cloud Functions
// ============================================

Parse.Cloud.define("seedCategories", async (request) => {
  const user = requireUser(request);

  // Check if categories already exist for this user
  const existingQuery = new Parse.Query("Category");
  existingQuery.equalTo("user", user);
  const existingCount = await existingQuery.count({ useMasterKey: true });

  if (existingCount > 0) {
    return { success: true, message: "Categories already seeded", count: existingCount };
  }

  const categories = [];
  for (const cat of DEFAULT_CATEGORIES) {
    const Category = Parse.Object.extend("Category");
    const category = new Category();
    category.set("name", cat.name);
    category.set("type", cat.type);
    category.set("icon", cat.icon);
    category.set("color", cat.color);
    category.set("isSystem", true);
    category.set("user", user);
    setUserACL(category, user);
    categories.push(category);
  }

  await Parse.Object.saveAll(categories, { useMasterKey: true });
  console.log(`[seedCategories] Seeded ${categories.length} categories for user ${user.id}`);

  return { success: true, message: "Categories seeded", count: categories.length };
});

Parse.Cloud.define("getCategories", async (request) => {
  const user = requireUser(request);
  const { type } = request.params; // Optional filter by type

  const query = new Parse.Query("Category");
  query.equalTo("user", user);
  if (type) {
    query.equalTo("type", type);
  }
  query.ascending("name");

  const results = await query.find({ useMasterKey: true });
  return results.map((cat) => ({
    id: cat.id,
    name: cat.get("name"),
    type: cat.get("type"),
    icon: cat.get("icon"),
    color: cat.get("color"),
    isSystem: cat.get("isSystem"),
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));
});

// ============================================
// Project Cloud Functions
// ============================================

Parse.Cloud.define("createProject", async (request) => {
  const user = requireUser(request);
  const { name, type, description, color, monthlyBudget, currency } = request.params;

  if (!name || !type || !color) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Name, type, and color are required");
  }

  const Project = Parse.Object.extend("Project");
  const project = new Project();
  project.set("name", name.trim());
  project.set("type", type);
  project.set("status", "active");
  project.set("description", description || "");
  project.set("color", color);
  project.set("monthlyBudget", monthlyBudget || null);
  project.set("currency", currency || "INR");
  project.set("user", user);
  setUserACL(project, user);

  await project.save(null, { useMasterKey: true });
  console.log(`[createProject] Created project ${project.id} for user ${user.id}`);

  return {
    id: project.id,
    name: project.get("name"),
    type: project.get("type"),
    status: project.get("status"),
    description: project.get("description"),
    color: project.get("color"),
    monthlyBudget: project.get("monthlyBudget"),
    currency: project.get("currency"),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
});

Parse.Cloud.define("getProjects", async (request) => {
  const user = requireUser(request);
  const { status } = request.params;

  const query = new Parse.Query("Project");
  query.equalTo("user", user);
  if (status) {
    query.equalTo("status", status);
  }
  query.descending("createdAt");

  const results = await query.find({ useMasterKey: true });
  return results.map((proj) => ({
    id: proj.id,
    name: proj.get("name"),
    type: proj.get("type"),
    status: proj.get("status"),
    description: proj.get("description"),
    color: proj.get("color"),
    monthlyBudget: proj.get("monthlyBudget"),
    currency: proj.get("currency"),
    createdAt: proj.createdAt,
    updatedAt: proj.updatedAt,
  }));
});

Parse.Cloud.define("updateProject", async (request) => {
  const user = requireUser(request);
  const { projectId, name, type, status, description, color, monthlyBudget, currency } = request.params;

  if (!projectId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Project ID is required");
  }

  const query = new Parse.Query("Project");
  query.equalTo("user", user);
  const project = await query.get(projectId, { useMasterKey: true });

  if (name) project.set("name", name.trim());
  if (type) project.set("type", type);
  if (status) project.set("status", status);
  if (description !== undefined) project.set("description", description);
  if (color) project.set("color", color);
  if (monthlyBudget !== undefined) project.set("monthlyBudget", monthlyBudget);
  if (currency) project.set("currency", currency);

  await project.save(null, { useMasterKey: true });

  return {
    id: project.id,
    name: project.get("name"),
    type: project.get("type"),
    status: project.get("status"),
    description: project.get("description"),
    color: project.get("color"),
    monthlyBudget: project.get("monthlyBudget"),
    currency: project.get("currency"),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
});

// ============================================
// Contact Cloud Functions (Unified: Customer/Supplier/Employee)
// ============================================

Parse.Cloud.define("createContact", async (request) => {
  const user = requireUser(request);
  const {
    name,
    types,
    aliases,
    email,
    phone,
    company,
    website,
    notes,
    defaultCategoryId,
    // Employee-specific fields
    role,
    monthlySalary,
    salaryCurrency,
    projectId,
  } = request.params;

  if (!name || !types || !Array.isArray(types) || types.length === 0) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Name and at least one type are required");
  }

  // Validate types
  const validTypes = ["customer", "supplier", "employee"];
  for (const t of types) {
    if (!validTypes.includes(t)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid contact type: ${t}`);
    }
  }

  // If employee type, require project
  const isEmployee = types.includes("employee");
  if (isEmployee && !projectId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Project is required for employee contacts");
  }

  const Contact = Parse.Object.extend("Contact");
  const contact = new Contact();
  contact.set("name", name.trim());
  contact.set("types", types);
  contact.set("aliases", aliases || []);
  contact.set("email", email || "");
  contact.set("phone", phone || "");
  contact.set("company", company || "");
  contact.set("website", website || "");
  contact.set("notes", notes || "");
  contact.set("totalSpent", 0);
  contact.set("totalReceived", 0);
  contact.set("transactionCount", 0);
  contact.set("user", user);

  if (defaultCategoryId) {
    const catPointer = Parse.Object.extend("Category").createWithoutData(defaultCategoryId);
    contact.set("defaultCategory", catPointer);
  }

  // Employee-specific fields
  if (isEmployee) {
    contact.set("role", role || "Employee");
    contact.set("monthlySalary", monthlySalary || 0);
    contact.set("salaryCurrency", salaryCurrency || "INR");
    contact.set("employeeStatus", "active");

    const projQuery = new Parse.Query("Project");
    projQuery.equalTo("user", user);
    const project = await projQuery.get(projectId, { useMasterKey: true });
    contact.set("project", project);
  }

  setUserACL(contact, user);
  await contact.save(null, { useMasterKey: true });

  console.log(`[createContact] Created contact ${contact.id} (types: ${types.join(", ")}) for user ${user.id}`);

  return transformContact(contact);
});

Parse.Cloud.define("getContacts", async (request) => {
  const user = requireUser(request);
  const { type, projectId, employeeStatus, search, limit } = request.params;

  const query = new Parse.Query("Contact");
  query.equalTo("user", user);
  query.include("project");
  query.include("defaultCategory");

  // Filter by type if specified
  if (type) {
    query.equalTo("types", type);
  }

  // Filter by project (for employees)
  if (projectId) {
    const projPointer = Parse.Object.extend("Project").createWithoutData(projectId);
    query.equalTo("project", projPointer);
  }

  // Filter by employee status
  if (employeeStatus) {
    query.equalTo("employeeStatus", employeeStatus);
  }

  // Search by name
  if (search) {
    query.matches("name", new RegExp(search, "i"));
  }

  query.descending("transactionCount");
  query.limit(limit || 100);

  const results = await query.find({ useMasterKey: true });
  return results.map(transformContact);
});

Parse.Cloud.define("updateContact", async (request) => {
  const user = requireUser(request);
  const {
    contactId,
    name,
    types,
    aliases,
    email,
    phone,
    company,
    website,
    notes,
    defaultCategoryId,
    // Employee-specific fields
    role,
    monthlySalary,
    salaryCurrency,
    employeeStatus,
    projectId,
  } = request.params;

  if (!contactId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Contact ID is required");
  }

  const query = new Parse.Query("Contact");
  query.equalTo("user", user);
  query.include("project");
  const contact = await query.get(contactId, { useMasterKey: true });

  if (name) contact.set("name", name.trim());
  if (types && Array.isArray(types)) contact.set("types", types);
  if (aliases !== undefined) contact.set("aliases", aliases);
  if (email !== undefined) contact.set("email", email);
  if (phone !== undefined) contact.set("phone", phone);
  if (company !== undefined) contact.set("company", company);
  if (website !== undefined) contact.set("website", website);
  if (notes !== undefined) contact.set("notes", notes);

  // Handle default category
  if (defaultCategoryId !== undefined) {
    if (defaultCategoryId) {
      const catPointer = Parse.Object.extend("Category").createWithoutData(defaultCategoryId);
      contact.set("defaultCategory", catPointer);
    } else {
      contact.unset("defaultCategory");
    }
  }

  // Employee-specific fields
  if (role !== undefined) contact.set("role", role);
  if (monthlySalary !== undefined) contact.set("monthlySalary", monthlySalary);
  if (salaryCurrency) contact.set("salaryCurrency", salaryCurrency);
  if (employeeStatus) contact.set("employeeStatus", employeeStatus);

  if (projectId !== undefined) {
    if (projectId) {
      const projQuery = new Parse.Query("Project");
      projQuery.equalTo("user", user);
      const project = await projQuery.get(projectId, { useMasterKey: true });
      contact.set("project", project);
    } else {
      contact.unset("project");
    }
  }

  await contact.save(null, { useMasterKey: true });

  return transformContact(contact);
});

Parse.Cloud.define("deleteContact", async (request) => {
  const user = requireUser(request);
  const { contactId } = request.params;

  if (!contactId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Contact ID is required");
  }

  // Get contact
  const contactQuery = new Parse.Query("Contact");
  contactQuery.equalTo("user", user);
  const contact = await contactQuery.get(contactId, { useMasterKey: true });

  // Check if there are transactions associated with this contact
  const transactionQuery = new Parse.Query("Transaction");
  transactionQuery.equalTo("user", user);
  transactionQuery.equalTo("contact", contact);
  const transactionCount = await transactionQuery.count({ useMasterKey: true });

  if (transactionCount > 0) {
    throw new Parse.Error(
      Parse.Error.VALIDATION_ERROR,
      `Cannot delete contact: ${transactionCount} transaction(s) are associated with this contact. Please delete or reassign those transactions first.`
    );
  }

  // Delete the contact
  await contact.destroy({ useMasterKey: true });
  console.log(`[deleteContact] Deleted contact ${contactId} for user ${user.id}`);

  return { success: true, deletedId: contactId };
});

// ============================================
// Transaction Parsing with Anthropic
// ============================================

Parse.Cloud.define("parseTransaction", async (request) => {
  const user = requireUser(request);
  const { text, source } = request.params;

  if (!text || text.trim().length === 0) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Text is required");
  }

  // Get user's existing contacts, categories, and projects for context
  const [contacts, categories, projects] = await Promise.all([
    new Parse.Query("Contact").equalTo("user", user).include("project").find({ useMasterKey: true }),
    new Parse.Query("Category").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Project").equalTo("user", user).find({ useMasterKey: true }),
  ]);

  const contactList = contacts.map((c) => ({
    id: c.id,
    name: c.get("name"),
    types: c.get("types") || [],
    aliases: c.get("aliases") || [],
    role: c.get("role"),
    monthlySalary: c.get("monthlySalary"),
    projectId: c.get("project")?.id,
  }));
  const categoryList = categories.map((c) => ({ id: c.id, name: c.get("name"), type: c.get("type") }));
  const projectList = projects.map((p) => ({ id: p.id, name: p.get("name") }));

  const systemPrompt = `You are a financial transaction parser for a solo founder's expense tracking app.
Your job is to extract transaction details from raw text (SMS alerts, emails, invoices, manual notes).

CONTEXT:
- User's existing contacts (customers, suppliers, employees): ${JSON.stringify(contactList)}
- User's categories: ${JSON.stringify(categoryList)}
- User's projects: ${JSON.stringify(projectList)}

RULES:
1. Extract: amount, currency (INR or USD), type (income/expense), date, contact name
2. If contact matches an existing one (or alias), use that contact's ID
3. Suggest the most appropriate category based on contact/context
4. Suggest the most appropriate project if you can infer it
5. For bank debits, UPI payments, card charges = expense
6. For credits, refunds, payments received = income
7. Default to today's date if not specified
8. Default to INR if currency unclear
9. For salary-related transactions, look for employee contacts

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{
  "amount": number,
  "currency": "INR" | "USD",
  "type": "income" | "expense",
  "date": "YYYY-MM-DD",
  "contactName": "string",
  "existingContactId": "string or null",
  "suggestedCategoryId": "string or null",
  "suggestedProjectId": "string or null",
  "description": "brief description",
  "confidence": 0.0-1.0,
  "needsReview": boolean,
  "rawExtracted": {
    "amountString": "original amount text",
    "dateString": "original date text or null",
    "contactString": "original contact/merchant text"
  }
}`;

  const userMessage = `Parse this transaction:\n\n${text.trim()}`;

  let parsedData;
  try {
    const aiResponse = await callAnthropic(systemPrompt, userMessage);
    parsedData = JSON.parse(aiResponse);
  } catch (error) {
    console.error("[parseTransaction] Error:", error.message);
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Failed to parse transaction: ${error.message}`);
  }

  // Create RawInput record
  const RawInput = Parse.Object.extend("RawInput");
  const rawInput = new RawInput();
  rawInput.set("originalText", text.trim());
  rawInput.set("source", source || "manual");
  rawInput.set("parsedData", parsedData);
  rawInput.set("status", "pending");
  rawInput.set("user", user);
  setUserACL(rawInput, user);
  await rawInput.save(null, { useMasterKey: true });

  // Find existing contact if ID was suggested
  let existingContact = null;
  if (parsedData.existingContactId) {
    const contactQuery = new Parse.Query("Contact");
    contactQuery.equalTo("user", user);
    try {
      existingContact = await contactQuery.get(parsedData.existingContactId, { useMasterKey: true });
    } catch (e) {
      // Contact not found, ignore
    }
  }

  // Find suggested category
  let suggestedCategory = null;
  if (parsedData.suggestedCategoryId) {
    const catQuery = new Parse.Query("Category");
    catQuery.equalTo("user", user);
    try {
      suggestedCategory = await catQuery.get(parsedData.suggestedCategoryId, { useMasterKey: true });
    } catch (e) {
      // Category not found, ignore
    }
  }

  // Find suggested project
  let suggestedProject = null;
  if (parsedData.suggestedProjectId) {
    const projQuery = new Parse.Query("Project");
    projQuery.equalTo("user", user);
    try {
      suggestedProject = await projQuery.get(parsedData.suggestedProjectId, { useMasterKey: true });
    } catch (e) {
      // Project not found, ignore
    }
  }

  console.log(`[parseTransaction] Parsed transaction for user ${user.id}: ${JSON.stringify(parsedData)}`);

  return {
    parsed: parsedData,
    rawInputId: rawInput.id,
    existingContact: existingContact ? {
      id: existingContact.id,
      name: existingContact.get("name"),
      types: existingContact.get("types") || [],
    } : null,
    suggestedCategory: suggestedCategory ? {
      id: suggestedCategory.id,
      name: suggestedCategory.get("name"),
      type: suggestedCategory.get("type"),
      icon: suggestedCategory.get("icon"),
      color: suggestedCategory.get("color"),
    } : null,
    suggestedProject: suggestedProject ? {
      id: suggestedProject.id,
      name: suggestedProject.get("name"),
      color: suggestedProject.get("color"),
    } : null,
  };
});

// ============================================
// Bulk Transaction Parsing
// ============================================

Parse.Cloud.define("parseBulkTransactions", async (request) => {
  const user = requireUser(request);
  const { text, source } = request.params;

  if (!text || text.trim().length === 0) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Text is required");
  }

  // Get user's existing contacts, categories, and projects for context
  const [contacts, categories, projects] = await Promise.all([
    new Parse.Query("Contact").equalTo("user", user).include("project").find({ useMasterKey: true }),
    new Parse.Query("Category").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Project").equalTo("user", user).find({ useMasterKey: true }),
  ]);

  const contactList = contacts.map((c) => ({
    id: c.id,
    name: c.get("name"),
    types: c.get("types") || [],
    aliases: c.get("aliases") || [],
    role: c.get("role"),
    monthlySalary: c.get("monthlySalary"),
    projectId: c.get("project")?.id,
  }));
  const categoryList = categories.map((c) => ({ id: c.id, name: c.get("name"), type: c.get("type") }));
  const projectList = projects.map((p) => ({ id: p.id, name: p.get("name") }));

  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are a financial transaction parser for a solo founder's expense tracking app.
Your job is to extract MULTIPLE transactions from text that may describe recurring payments, salary histories, or bulk entries.

CONTEXT:
- User's existing contacts (customers, suppliers, employees): ${JSON.stringify(contactList)}
- User's categories: ${JSON.stringify(categoryList)}
- User's projects: ${JSON.stringify(projectList)}
- Today's date: ${today}

RULES:
1. Parse text that describes multiple transactions over time (e.g., "Ajay salary was 30K for Jan-Jun, then 60K for Jul-Oct")
2. Generate one transaction per period mentioned (e.g., 6 transactions for Jan-Jun at 30K each)
3. For salary payments, match to existing employee contacts if possible
4. Use the last day of each month for salary transactions
5. Default currency is INR unless specified
6. For ranges like "Jan-Jun 2025", create transactions for Jan 31, Feb 28, Mar 31, Apr 30, May 31, Jun 30
7. If year not specified, use current year or infer from context
8. Match contacts by name (case-insensitive, partial match OK)

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{
  "transactions": [
    {
      "amount": number,
      "currency": "INR" | "USD",
      "type": "income" | "expense",
      "date": "YYYY-MM-DD",
      "contactName": "string (use employee/supplier/customer name)",
      "existingContactId": "string or null",
      "suggestedCategoryId": "string or null",
      "suggestedProjectId": "string or null",
      "description": "brief description (e.g., 'January 2025 salary')"
    }
  ],
  "summary": "Brief summary of what was parsed",
  "confidence": 0.0-1.0
}`;

  const userMessage = `Parse these transactions:\n\n${text.trim()}`;

  let parsedData;
  try {
    const aiResponse = await callAnthropic(systemPrompt, userMessage);
    // Try to extract JSON from the response (handle potential markdown wrapping)
    let jsonStr = aiResponse;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    parsedData = JSON.parse(jsonStr);
  } catch (error) {
    console.error("[parseBulkTransactions] AI parsing error:", error);
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, "Failed to parse transaction text");
  }

  // Create RawInput record
  const RawInput = Parse.Object.extend("RawInput");
  const rawInput = new RawInput();
  rawInput.set("originalText", text.trim());
  rawInput.set("source", source || "manual");
  rawInput.set("parsedData", parsedData);
  rawInput.set("status", "pending");
  rawInput.set("user", user);
  setUserACL(rawInput, user);
  await rawInput.save(null, { useMasterKey: true });

  console.log(`[parseBulkTransactions] Parsed ${parsedData.transactions?.length || 0} transactions for user ${user.id}`);

  return {
    transactions: parsedData.transactions || [],
    summary: parsedData.summary,
    confidence: parsedData.confidence,
    rawInputId: rawInput.id,
    categories: categoryList,
    projects: projectList,
    contacts: contactList,
  };
});

Parse.Cloud.define("parseTransactionFromImage", async (request) => {
  const user = requireUser(request);
  const { imageBase64, mediaType, source } = request.params;

  if (!imageBase64) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Image is required");
  }

  // Get user's existing data for context
  const [contacts, categories, projects] = await Promise.all([
    new Parse.Query("Contact").equalTo("user", user).include("project").find({ useMasterKey: true }),
    new Parse.Query("Category").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Project").equalTo("user", user).find({ useMasterKey: true }),
  ]);

  const contactList = contacts.map((c) => ({
    id: c.id,
    name: c.get("name"),
    types: c.get("types") || [],
    aliases: c.get("aliases") || [],
  }));
  const categoryList = categories.map((c) => ({ id: c.id, name: c.get("name"), type: c.get("type") }));
  const projectList = projects.map((p) => ({ id: p.id, name: p.get("name") }));

  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are a financial transaction parser for a solo founder's expense tracking app.
Your job is to extract transactions from images of receipts, invoices, bank statements, or any financial document.

CONTEXT:
- User's existing contacts (customers, suppliers, employees): ${JSON.stringify(contactList)}
- User's categories: ${JSON.stringify(categoryList)}
- User's projects: ${JSON.stringify(projectList)}
- Today's date: ${today}

RULES:
1. Extract ALL transactions visible in the image
2. For bank statements, extract each line item as a separate transaction
3. For receipts/invoices, extract the total as one transaction (or line items if clearly listed)
4. Identify: amount, currency, date, contact/vendor name, description
5. Match contacts to existing ones if possible (use aliases for matching)
6. Suggest appropriate categories based on contact/description
7. Default currency: INR (unless clearly USD, EUR, etc.)
8. If date not visible, use today's date
9. For debits/payments = expense, for credits/receipts = income

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{
  "transactions": [
    {
      "amount": number,
      "currency": "INR" | "USD",
      "type": "income" | "expense",
      "date": "YYYY-MM-DD",
      "contactName": "string",
      "existingContactId": "string or null",
      "suggestedCategoryId": "string or null",
      "suggestedProjectId": "string or null",
      "description": "brief description"
    }
  ],
  "documentType": "receipt" | "invoice" | "bank_statement" | "other",
  "summary": "Brief summary of what was found in the image",
  "confidence": 0.0-1.0
}`;

  const userMessage = "Extract all financial transactions from this image.";

  let parsedData;
  try {
    const aiResponse = await callAnthropicWithImage(
      systemPrompt,
      userMessage,
      imageBase64,
      mediaType || "image/jpeg"
    );
    // Try to extract JSON from the response
    let jsonStr = aiResponse;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    parsedData = JSON.parse(jsonStr);
  } catch (error) {
    console.error("[parseTransactionFromImage] AI parsing error:", error);
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, "Failed to parse image");
  }

  // Create RawInput record (store reference to image parsing)
  const RawInput = Parse.Object.extend("RawInput");
  const rawInput = new RawInput();
  rawInput.set("originalText", `[Image: ${parsedData.documentType || "unknown"}]`);
  rawInput.set("source", source || "image");
  rawInput.set("parsedData", parsedData);
  rawInput.set("status", "pending");
  rawInput.set("user", user);
  setUserACL(rawInput, user);
  await rawInput.save(null, { useMasterKey: true });

  console.log(`[parseTransactionFromImage] Parsed ${parsedData.transactions?.length || 0} transactions from image for user ${user.id}`);

  return {
    transactions: parsedData.transactions || [],
    documentType: parsedData.documentType,
    summary: parsedData.summary,
    confidence: parsedData.confidence,
    rawInputId: rawInput.id,
    categories: categoryList,
    projects: projectList,
    contacts: contactList,
  };
});

// ============================================
// Unified Transaction Input Parsing
// ============================================

/**
 * Unified transaction input parser
 * Accepts optional text and/or multiple images
 * Returns parsed transactions in bulk format
 */
Parse.Cloud.define("parseTransactionInput", async (request) => {
  const user = requireUser(request);
  const { text, images, source } = request.params;

  // Validate: at least one of text or images required
  const hasText = text && text.trim().length > 0;
  const hasImages = images && Array.isArray(images) && images.length > 0;

  if (!hasText && !hasImages) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "At least text or images are required");
  }

  // Get user's existing data for context
  const [contacts, categories, projects] = await Promise.all([
    new Parse.Query("Contact").equalTo("user", user).include("project").find({ useMasterKey: true }),
    new Parse.Query("Category").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Project").equalTo("user", user).find({ useMasterKey: true }),
  ]);

  const contactList = contacts.map((c) => ({
    id: c.id,
    name: c.get("name"),
    types: c.get("types") || [],
    aliases: c.get("aliases") || [],
    role: c.get("role"),
    monthlySalary: c.get("monthlySalary"),
    projectId: c.get("project")?.id,
  }));
  const categoryList = categories.map((c) => ({ id: c.id, name: c.get("name"), type: c.get("type") }));
  const projectList = projects.map((p) => ({ id: p.id, name: p.get("name") }));

  const today = new Date().toISOString().split("T")[0];

  // Build the system prompt
  const systemPrompt = `You are a financial transaction parser for a solo founder's expense tracking app.
Your job is to extract MULTIPLE transactions from the provided input (text, images, or both).

CONTEXT:
- User's existing contacts (customers, suppliers, employees): ${JSON.stringify(contactList)}
- User's categories: ${JSON.stringify(categoryList)}
- User's projects: ${JSON.stringify(projectList)}
- Today's date: ${today}

INPUT TYPES YOU MAY RECEIVE:
1. Text only: SMS alerts, bank statements, salary info, manual notes
2. Images only: Receipts, invoices, bank statements, screenshots
3. Both: Images with additional context provided as text

RULES:
1. Extract ALL transactions from all provided inputs (text and images combined)
2. For text describing multiple transactions over time (e.g., "Ajay salary was 30K for Jan-Jun, then 60K for Jul-Oct"), generate one transaction per period
3. For images with multiple line items, extract each as a separate transaction
4. If the user provides context text along with images, use that context to better categorize and understand the transactions
5. For salary payments, match to existing employee contacts if possible
6. Use the last day of each month for salary transactions
7. Default currency is INR unless specified
8. Match contacts by name (case-insensitive, partial match OK)
9. For debits/payments = expense, for credits/receipts = income
10. If date not visible or specified, use today's date

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{
  "transactions": [
    {
      "amount": number,
      "currency": "INR" | "USD",
      "type": "income" | "expense",
      "date": "YYYY-MM-DD",
      "contactName": "string (use employee/supplier/customer name)",
      "existingContactId": "string or null",
      "suggestedCategoryId": "string or null",
      "suggestedProjectId": "string or null",
      "description": "brief description"
    }
  ],
  "inputType": "text_only" | "image_only" | "text_and_image",
  "documentTypes": ["receipt", "invoice", "bank_statement", "text_note", "other"],
  "summary": "Brief summary of what was parsed",
  "confidence": 0.0-1.0
}`;

  // Build the user message based on what's provided
  let userMessage = "Extract all financial transactions from the following input:\n\n";

  if (hasText) {
    userMessage += `TEXT INPUT:\n${text.trim()}\n\n`;
  }

  if (hasImages) {
    userMessage += `IMAGES: ${images.length} image(s) attached. Please analyze all images and extract transactions.\n`;
    if (hasText) {
      userMessage += `\nNote: Use the text above as additional context to help categorize and understand the transactions in the images.`;
    }
  }

  let parsedData;
  try {
    let aiResponse;
    if (hasImages) {
      // Use vision API with images (and optional text)
      aiResponse = await callAnthropicWithMedia(systemPrompt, userMessage, images);
    } else {
      // Text only - use regular API
      aiResponse = await callAnthropic(systemPrompt, userMessage);
    }

    // Try to extract JSON from the response
    let jsonStr = aiResponse;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    // Try to parse, with fallback for truncated JSON
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (jsonError) {
      console.log("[parseTransactionInput] Initial JSON parse failed, attempting repair...");
      console.log("[parseTransactionInput] Raw response length:", aiResponse.length);

      // Try to repair truncated JSON by closing open arrays/objects
      let repairedJson = jsonStr;

      // Count open brackets
      const openBraces = (repairedJson.match(/\{/g) || []).length;
      const closeBraces = (repairedJson.match(/\}/g) || []).length;
      const openBrackets = (repairedJson.match(/\[/g) || []).length;
      const closeBrackets = (repairedJson.match(/\]/g) || []).length;

      // If we have unclosed brackets, try to close them
      if (openBrackets > closeBrackets || openBraces > closeBraces) {
        // Remove any trailing incomplete object/element (after last complete element)
        // Look for the last complete transaction object ending with }
        const lastCompleteIdx = repairedJson.lastIndexOf('}');
        if (lastCompleteIdx > 0) {
          // Check if there's incomplete data after the last }
          const afterLast = repairedJson.substring(lastCompleteIdx + 1).trim();
          if (afterLast.startsWith(',') || afterLast.match(/^\s*\{[^}]*$/)) {
            // There's an incomplete element, truncate to last complete object
            repairedJson = repairedJson.substring(0, lastCompleteIdx + 1);
          }
        }

        // Re-count after potential truncation
        const newOpenBrackets = (repairedJson.match(/\[/g) || []).length;
        const newCloseBrackets = (repairedJson.match(/\]/g) || []).length;
        const newOpenBraces = (repairedJson.match(/\{/g) || []).length;
        const newCloseBraces = (repairedJson.match(/\}/g) || []).length;

        // Close any remaining open brackets
        for (let i = 0; i < newOpenBrackets - newCloseBrackets; i++) {
          repairedJson += ']';
        }
        for (let i = 0; i < newOpenBraces - newCloseBraces; i++) {
          repairedJson += '}';
        }

        console.log("[parseTransactionInput] Attempted JSON repair, retrying parse...");
        parsedData = JSON.parse(repairedJson);
        console.log("[parseTransactionInput] JSON repair successful!");
      } else {
        throw jsonError;
      }
    }
  } catch (error) {
    console.error("[parseTransactionInput] AI parsing error:", error);
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Failed to parse input: ${error.message}`);
  }

  // Create RawInput record
  const RawInput = Parse.Object.extend("RawInput");
  const rawInput = new RawInput();
  rawInput.set("originalText", hasText ? text.trim() : `[${images.length} image(s)]`);
  rawInput.set("source", source || (hasImages ? "image" : "manual"));
  rawInput.set("parsedData", parsedData);
  rawInput.set("hasImages", hasImages);
  rawInput.set("imageCount", hasImages ? images.length : 0);
  rawInput.set("status", "pending");
  rawInput.set("user", user);
  setUserACL(rawInput, user);
  await rawInput.save(null, { useMasterKey: true });

  console.log(`[parseTransactionInput] Parsed ${parsedData.transactions?.length || 0} transactions (text: ${hasText}, images: ${hasImages ? images.length : 0}) for user ${user.id}`);

  return {
    transactions: parsedData.transactions || [],
    inputType: parsedData.inputType,
    documentTypes: parsedData.documentTypes,
    summary: parsedData.summary,
    confidence: parsedData.confidence,
    rawInputId: rawInput.id,
    categories: categoryList,
    projects: projectList,
    contacts: contactList,
  };
});

Parse.Cloud.define("createBulkTransactions", async (request) => {
  const user = requireUser(request);
  const { transactions, rawInputId } = request.params;

  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Transactions array is required");
  }

  const createdTransactions = [];

  for (const txData of transactions) {
    const {
      amount: rawAmount,
      currency: rawCurrency,
      type: rawType,
      date: rawDate,
      contactName: rawContactName,
      contactType, // Optional: override for contact type (customer, supplier, employee)
      categoryId,
      projectId,
      description,
      needsReview, // Flag for low-confidence transactions
      confidence, // AI confidence score
    } = txData;

    // Check for missing required fields and use placeholders
    const missingFields = [];
    if (!rawAmount && rawAmount !== 0) missingFields.push("amount");
    if (!rawCurrency) missingFields.push("currency");
    if (!rawType) missingFields.push("type");
    if (!rawDate) missingFields.push("date");
    if (!rawContactName) missingFields.push("contact");

    const isIncomplete = missingFields.length > 0;

    // Use placeholders for missing fields
    const amount = rawAmount || 0;
    const currency = rawCurrency || "INR";
    const type = rawType || "expense";
    const date = rawDate || new Date().toISOString();
    const contactName = rawContactName || "Unknown";

    if (isIncomplete) {
      console.log(`[createBulkTransactions] Saving incomplete transaction (missing: ${missingFields.join(", ")})`);
    }

    // Find or create contact
    let contact;
    const contactQuery = new Parse.Query("Contact");
    contactQuery.equalTo("user", user);
    contactQuery.equalTo("name", contactName.trim());
    contact = await contactQuery.first({ useMasterKey: true });

    if (!contact) {
      const Contact = Parse.Object.extend("Contact");
      contact = new Contact();
      contact.set("name", contactName.trim());
      // Use provided contactType, or default based on transaction type
      const initialType = contactType || (type === "expense" ? "supplier" : "customer");
      contact.set("types", [initialType]);
      contact.set("aliases", []);
      contact.set("totalSpent", 0);
      contact.set("totalReceived", 0);
      contact.set("transactionCount", 0);
      contact.set("user", user);

      // Set employee-specific defaults if type is employee
      if (initialType === "employee") {
        contact.set("role", "Employee");
        contact.set("employeeStatus", "active");
      }

      setUserACL(contact, user);
      await contact.save(null, { useMasterKey: true });
    }

    // Create transaction
    const Transaction = Parse.Object.extend("Transaction");
    const transaction = new Transaction();
    const transactionDate = new Date(date);
    transaction.set("amount", amount);
    transaction.set("currency", currency);
    transaction.set("amountINR", await convertToINR(amount, currency, transactionDate));
    transaction.set("type", type);
    transaction.set("date", transactionDate);
    transaction.set("contact", contact);
    transaction.set("contactName", contactName.trim());
    transaction.set("user", user);
    transaction.set("isRecurring", false);

    let category = null;
    let isSalaryPayment = false;
    if (categoryId) {
      const catQuery = new Parse.Query("Category");
      catQuery.equalTo("user", user);
      try {
        category = await catQuery.get(categoryId, { useMasterKey: true });
        transaction.set("category", category);
        transaction.set("categoryName", category.get("name"));
        isSalaryPayment = category.get("name") === "Salaries";
      } catch (e) {
        // Category not found, skip
      }
    }

    if (projectId) {
      const projQuery = new Parse.Query("Project");
      projQuery.equalTo("user", user);
      try {
        const project = await projQuery.get(projectId, { useMasterKey: true });
        transaction.set("project", project);
        transaction.set("projectName", project.get("name"));
      } catch (e) {
        // Project not found, skip
      }
    }

    // Auto-update contact to employee for salary payments
    if (isSalaryPayment && !(contact.get("types") || []).includes("employee")) {
      const types = contact.get("types") || [];
      types.push("employee");
      contact.set("types", types);
      contact.set("role", contact.get("role") || "Employee");
      contact.set("monthlySalary", amount);
      contact.set("salaryCurrency", currency);
      contact.set("employeeStatus", "active");
      if (projectId) {
        const projPointer = Parse.Object.extend("Project").createWithoutData(projectId);
        contact.set("project", projPointer);
      }
      await contact.save(null, { useMasterKey: true });
      console.log(`[createBulkTransactions] Auto-added employee type to contact: ${contact.id} - ${contactName}`);
    }

    if (description) {
      transaction.set("description", description);
    }

    // Set review flags
    if (needsReview !== undefined) {
      transaction.set("needsReview", needsReview);
    }
    if (confidence !== undefined) {
      transaction.set("confidence", confidence);
    }

    // Flag incomplete transactions (highest priority)
    if (isIncomplete) {
      transaction.set("needsReview", true);
      transaction.set("reviewReason", "incomplete");
      transaction.set("missingFields", missingFields); // Store which fields are missing
    }

    if (rawInputId) {
      const rawInputPointer = Parse.Object.extend("RawInput").createWithoutData(rawInputId);
      transaction.set("rawInput", rawInputPointer);
    }

    setUserACL(transaction, user);
    await transaction.save(null, { useMasterKey: true });

    // Only check for duplicates if not already flagged as incomplete
    if (!isIncomplete) {
      const duplicateIds = await findPotentialDuplicates(
        user,
        amount,
        contactName.trim(),
        transactionDate,
        transaction.id
      );

      if (duplicateIds.length > 0) {
        // Mark this transaction as potential duplicate
        transaction.set("needsReview", true);
        transaction.set("reviewReason", "potential_duplicate");
        transaction.set("potentialDuplicateIds", duplicateIds);
        await transaction.save(null, { useMasterKey: true });
        console.log(`[createBulkTransactions] Flagged transaction ${transaction.id} as potential duplicate of: ${duplicateIds.join(", ")}`);
      } else if (needsReview) {
        // Set review reason for low confidence
        transaction.set("reviewReason", "low_confidence");
        await transaction.save(null, { useMasterKey: true });
      }
    }

    // Update contact totals
    if (type === "expense") {
      contact.increment("totalSpent", amount);
    } else {
      contact.increment("totalReceived", amount);
    }
    contact.increment("transactionCount", 1);
    await contact.save(null, { useMasterKey: true });

    createdTransactions.push({
      id: transaction.id,
      amount,
      currency,
      type,
      date,
      contactName: contactName.trim(),
    });
  }

  // Update RawInput status
  if (rawInputId) {
    const rawInputQuery = new Parse.Query("RawInput");
    rawInputQuery.equalTo("user", user);
    try {
      const rawInput = await rawInputQuery.get(rawInputId, { useMasterKey: true });
      rawInput.set("status", "processed");
      await rawInput.save(null, { useMasterKey: true });
    } catch (e) {
      // RawInput not found, ignore
    }
  }

  console.log(`[createBulkTransactions] Created ${createdTransactions.length} transactions for user ${user.id}`);

  return {
    created: createdTransactions.length,
    transactions: createdTransactions,
  };
});

Parse.Cloud.define("createTransactionFromParsed", async (request) => {
  const user = requireUser(request);
  const {
    rawInputId,
    amount,
    currency,
    type,
    date,
    contactName,
    categoryId,
    projectId,
    allocations,
    description,
    notes,
    isRecurring,
  } = request.params;

  if (!amount || !currency || !type || !date || !contactName) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Amount, currency, type, date, and contact name are required"
    );
  }

  // Find or create contact
  let contact;
  const contactQuery = new Parse.Query("Contact");
  contactQuery.equalTo("user", user);
  contactQuery.equalTo("name", contactName.trim());
  contact = await contactQuery.first({ useMasterKey: true });

  if (!contact) {
    // Create new contact
    const Contact = Parse.Object.extend("Contact");
    contact = new Contact();
    contact.set("name", contactName.trim());
    // Default to supplier for expenses, customer for income
    contact.set("types", type === "expense" ? ["supplier"] : ["customer"]);
    contact.set("aliases", []);
    contact.set("totalSpent", 0);
    contact.set("totalReceived", 0);
    contact.set("transactionCount", 0);
    contact.set("user", user);
    setUserACL(contact, user);

    // Set default category if provided
    if (categoryId) {
      const catPointer = Parse.Object.extend("Category").createWithoutData(categoryId);
      contact.set("defaultCategory", catPointer);
    }

    await contact.save(null, { useMasterKey: true });
    console.log(`[createTransactionFromParsed] Created new contact: ${contact.id}`);
  }

  // Get category and project objects for names
  let category = null;
  let project = null;
  let isSalaryPayment = false;

  if (categoryId) {
    const catQuery = new Parse.Query("Category");
    catQuery.equalTo("user", user);
    category = await catQuery.get(categoryId, { useMasterKey: true });
    isSalaryPayment = category.get("name") === "Salaries";
  }

  if (projectId) {
    const projQuery = new Parse.Query("Project");
    projQuery.equalTo("user", user);
    project = await projQuery.get(projectId, { useMasterKey: true });
  }

  // Auto-update contact to employee for salary payments
  if (isSalaryPayment && !(contact.get("types") || []).includes("employee")) {
    const types = contact.get("types") || [];
    types.push("employee");
    contact.set("types", types);
    contact.set("role", contact.get("role") || "Employee");
    contact.set("monthlySalary", amount);
    contact.set("salaryCurrency", currency);
    contact.set("employeeStatus", "active");
    if (project) {
      contact.set("project", project);
    }
    await contact.save(null, { useMasterKey: true });
    console.log(`[createTransactionFromParsed] Auto-added employee type to contact: ${contact.id} - ${contactName}`);
  }

  // Create transaction
  const Transaction = Parse.Object.extend("Transaction");
  const transaction = new Transaction();
  const transactionDate = new Date(date);
  transaction.set("amount", amount);
  transaction.set("currency", currency);
  transaction.set("amountINR", await convertToINR(amount, currency, transactionDate));
  transaction.set("type", type);
  transaction.set("date", transactionDate);
  transaction.set("contact", contact);
  transaction.set("contactName", contact.get("name"));

  if (category) {
    transaction.set("category", category);
    transaction.set("categoryName", category.get("name"));
  }

  if (project) {
    transaction.set("project", project);
    transaction.set("projectName", project.get("name"));
  }

  if (allocations && allocations.length > 0) {
    transaction.set("allocations", allocations);
  }

  transaction.set("description", description || "");
  transaction.set("notes", notes || "");
  transaction.set("isRecurring", isRecurring || false);
  transaction.set("user", user);
  setUserACL(transaction, user);

  // Link raw input if provided
  if (rawInputId) {
    const rawInputPointer = Parse.Object.extend("RawInput").createWithoutData(rawInputId);
    transaction.set("rawInput", rawInputPointer);
  }

  await transaction.save(null, { useMasterKey: true });

  // Check for potential duplicates
  const duplicateIds = await findPotentialDuplicates(
    user,
    amount,
    contact.get("name"),
    transactionDate,
    transaction.id
  );

  if (duplicateIds.length > 0) {
    // Mark this transaction as potential duplicate
    transaction.set("needsReview", true);
    transaction.set("reviewReason", "potential_duplicate");
    transaction.set("potentialDuplicateIds", duplicateIds);
    await transaction.save(null, { useMasterKey: true });
    console.log(`[createTransactionFromParsed] Flagged transaction ${transaction.id} as potential duplicate of: ${duplicateIds.join(", ")}`);
  }

  // Update raw input status
  if (rawInputId) {
    const rawInputQuery = new Parse.Query("RawInput");
    rawInputQuery.equalTo("user", user);
    const rawInput = await rawInputQuery.get(rawInputId, { useMasterKey: true });
    rawInput.set("status", "processed");
    rawInput.set("transaction", transaction);
    await rawInput.save(null, { useMasterKey: true });
  }

  // Update contact totals
  if (type === "expense") {
    contact.increment("totalSpent", amount);
  } else {
    contact.increment("totalReceived", amount);
  }
  contact.increment("transactionCount", 1);
  await contact.save(null, { useMasterKey: true });

  console.log(`[createTransactionFromParsed] Created transaction ${transaction.id}`);

  return {
    id: transaction.id,
    amount: transaction.get("amount"),
    currency: transaction.get("currency"),
    amountINR: transaction.get("amountINR"),
    type: transaction.get("type"),
    date: transaction.get("date"),
    contactId: contact.id,
    contactName: transaction.get("contactName"),
    categoryId: category?.id,
    categoryName: transaction.get("categoryName"),
    projectId: project?.id,
    projectName: transaction.get("projectName"),
    allocations: transaction.get("allocations"),
    description: transaction.get("description"),
    notes: transaction.get("notes"),
    isRecurring: transaction.get("isRecurring"),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
});

// ============================================
// Transaction Query Functions
// ============================================

Parse.Cloud.define("getTransactions", async (request) => {
  const user = requireUser(request);
  const {
    startDate,
    endDate,
    type,
    projectId,
    categoryId,
    contactId,
    limit,
    skip,
  } = request.params;

  const query = new Parse.Query("Transaction");
  query.equalTo("user", user);
  query.include(["contact", "category", "project"]);

  if (startDate) {
    query.greaterThanOrEqualTo("date", new Date(startDate));
  }
  if (endDate) {
    query.lessThanOrEqualTo("date", new Date(endDate));
  }
  if (type) {
    query.equalTo("type", type);
  }
  if (projectId) {
    const projPointer = Parse.Object.extend("Project").createWithoutData(projectId);
    query.equalTo("project", projPointer);
  }
  if (categoryId) {
    const catPointer = Parse.Object.extend("Category").createWithoutData(categoryId);
    query.equalTo("category", catPointer);
  }
  if (contactId) {
    const contactPointer = Parse.Object.extend("Contact").createWithoutData(contactId);
    query.equalTo("contact", contactPointer);
  }

  query.descending("date");
  query.limit(limit || 50);
  query.skip(skip || 0);

  const [results, total] = await Promise.all([
    query.find({ useMasterKey: true }),
    query.count({ useMasterKey: true }),
  ]);

  return {
    transactions: results.map((t) => ({
      id: t.id,
      amount: t.get("amount"),
      currency: t.get("currency"),
      amountINR: t.get("amountINR"),
      type: t.get("type"),
      date: t.get("date"),
      contactId: t.get("contact")?.id,
      contactName: t.get("contactName"),
      categoryId: t.get("category")?.id,
      categoryName: t.get("categoryName"),
      projectId: t.get("project")?.id,
      projectName: t.get("projectName"),
      allocations: t.get("allocations"),
      description: t.get("description"),
      notes: t.get("notes"),
      isRecurring: t.get("isRecurring"),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    total,
    hasMore: (skip || 0) + results.length < total,
  };
});

// ============================================
// Dashboard & Analytics
// ============================================

Parse.Cloud.define("getDashboard", async (request) => {
  const user = requireUser(request);
  const { startDate, endDate } = request.params;

  // Build base query
  const baseQuery = () => {
    const q = new Parse.Query("Transaction");
    q.equalTo("user", user);
    if (startDate) q.greaterThanOrEqualTo("date", new Date(startDate));
    if (endDate) q.lessThanOrEqualTo("date", new Date(endDate));
    return q;
  };

  // Get all transactions for calculations
  const allTransactionsQuery = baseQuery();
  allTransactionsQuery.include(["project", "category"]);
  allTransactionsQuery.limit(10000);
  const allTransactions = await allTransactionsQuery.find({ useMasterKey: true });

  // Calculate totals
  let totalIncome = 0;
  let totalExpenses = 0;
  const projectTotals = {};
  const categoryTotals = {};
  const monthlyData = {};

  for (const t of allTransactions) {
    const amountINR = t.get("amountINR");
    const type = t.get("type");
    const date = t.get("date");
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (type === "income") {
      totalIncome += amountINR;
    } else {
      totalExpenses += amountINR;
    }

    // Project totals
    const projectId = t.get("project")?.id || "unassigned";
    const projectName = t.get("projectName") || "Unassigned";
    if (!projectTotals[projectId]) {
      projectTotals[projectId] = { id: projectId, name: projectName, income: 0, expenses: 0 };
    }
    if (type === "income") {
      projectTotals[projectId].income += amountINR;
    } else {
      projectTotals[projectId].expenses += amountINR;
    }

    // Category totals (expenses only)
    if (type === "expense") {
      const categoryId = t.get("category")?.id || "uncategorized";
      const categoryName = t.get("categoryName") || "Uncategorized";
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = { id: categoryId, name: categoryName, amount: 0 };
      }
      categoryTotals[categoryId].amount += amountINR;
    }

    // Monthly trend
    if (!monthlyData[month]) {
      monthlyData[month] = { month, income: 0, expenses: 0 };
    }
    if (type === "income") {
      monthlyData[month].income += amountINR;
    } else {
      monthlyData[month].expenses += amountINR;
    }
  }

  // Get counts
  const [projectCount, contactCount] = await Promise.all([
    new Parse.Query("Project").equalTo("user", user).count({ useMasterKey: true }),
    new Parse.Query("Contact").equalTo("user", user).count({ useMasterKey: true }),
  ]);

  // Get employee count (contacts with employee type)
  const employeeQuery = new Parse.Query("Contact");
  employeeQuery.equalTo("user", user);
  employeeQuery.equalTo("types", "employee");
  const employeeCount = await employeeQuery.count({ useMasterKey: true });

  // Get recent transactions
  const recentQuery = baseQuery();
  recentQuery.descending("date");
  recentQuery.limit(10);
  const recentTransactions = await recentQuery.find({ useMasterKey: true });

  // Sort and format results
  const projectSummaries = Object.values(projectTotals)
    .map((p) => ({ ...p, net: p.income - p.expenses }))
    .sort((a, b) => b.expenses - a.expenses);

  const topExpenseCategories = Object.values(categoryTotals)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((c) => ({ ...c, percentage: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0 }));

  const monthlyTrend = Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ ...m, net: m.income - m.expenses }));

  return {
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
    transactionCount: allTransactions.length,
    projectCount,
    contactCount,
    employeeCount,
    projectSummaries,
    topExpenseCategories,
    monthlyTrend,
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      amount: t.get("amount"),
      currency: t.get("currency"),
      amountINR: t.get("amountINR"),
      type: t.get("type"),
      date: t.get("date"),
      contactName: t.get("contactName"),
      categoryName: t.get("categoryName"),
      projectName: t.get("projectName"),
    })),
  };
});

Parse.Cloud.define("getProjectSummary", async (request) => {
  const user = requireUser(request);
  const { projectId, startDate, endDate } = request.params;

  if (!projectId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Project ID is required");
  }

  // Get project
  const projectQuery = new Parse.Query("Project");
  projectQuery.equalTo("user", user);
  const project = await projectQuery.get(projectId, { useMasterKey: true });

  // Get transactions
  const projPointer = Parse.Object.extend("Project").createWithoutData(projectId);
  const transQuery = new Parse.Query("Transaction");
  transQuery.equalTo("user", user);
  transQuery.equalTo("project", projPointer);
  transQuery.include(["category", "contact"]);
  if (startDate) transQuery.greaterThanOrEqualTo("date", new Date(startDate));
  if (endDate) transQuery.lessThanOrEqualTo("date", new Date(endDate));
  transQuery.limit(10000);
  const transactions = await transQuery.find({ useMasterKey: true });

  // Calculate totals
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals = {};
  const contactTotals = {};
  const monthlyData = {};

  for (const t of transactions) {
    const amountINR = t.get("amountINR");
    const type = t.get("type");
    const date = t.get("date");
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (type === "income") {
      totalIncome += amountINR;
    } else {
      totalExpenses += amountINR;
    }

    // Category totals
    if (type === "expense") {
      const categoryId = t.get("category")?.id || "uncategorized";
      const categoryName = t.get("categoryName") || "Uncategorized";
      const categoryColor = t.get("category")?.get("color") || "#94A3B8";
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = { id: categoryId, name: categoryName, color: categoryColor, amount: 0 };
      }
      categoryTotals[categoryId].amount += amountINR;
    }

    // Contact totals
    const contactId = t.get("contact")?.id;
    if (contactId) {
      const contactName = t.get("contactName");
      if (!contactTotals[contactId]) {
        contactTotals[contactId] = { id: contactId, name: contactName, amount: 0, count: 0 };
      }
      contactTotals[contactId].amount += amountINR;
      contactTotals[contactId].count += 1;
    }

    // Monthly trend
    if (!monthlyData[month]) {
      monthlyData[month] = { month, income: 0, expenses: 0 };
    }
    if (type === "income") {
      monthlyData[month].income += amountINR;
    } else {
      monthlyData[month].expenses += amountINR;
    }
  }

  // Get employee count (contacts with employee type and this project)
  const empQuery = new Parse.Query("Contact");
  empQuery.equalTo("user", user);
  empQuery.equalTo("project", projPointer);
  empQuery.equalTo("types", "employee");
  const employeeCount = await empQuery.count({ useMasterKey: true });

  return {
    project: {
      id: project.id,
      name: project.get("name"),
      type: project.get("type"),
      status: project.get("status"),
      color: project.get("color"),
    },
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
    transactionCount: transactions.length,
    employeeCount,
    topCategories: Object.values(categoryTotals)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((c) => ({ ...c, percentage: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0 })),
    topContacts: Object.values(contactTotals)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    monthlyTrend: Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({ ...m, net: m.income - m.expenses })),
  };
});

// ============================================
// Transaction Update & Delete Functions
// ============================================

Parse.Cloud.define("updateTransaction", async (request) => {
  const user = requireUser(request);
  const {
    transactionId,
    amount,
    currency,
    type,
    date,
    contactName,
    categoryId,
    projectId,
    description,
    notes,
  } = request.params;

  if (!transactionId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Transaction ID is required");
  }

  const query = new Parse.Query("Transaction");
  query.equalTo("user", user);
  query.include(["contact", "category", "project"]);
  const transaction = await query.get(transactionId, { useMasterKey: true });

  const oldAmount = transaction.get("amount");
  const oldType = transaction.get("type");
  const oldContact = transaction.get("contact");

  // Update basic fields
  if (amount !== undefined) {
    transaction.set("amount", amount);
    // Use new date if provided, otherwise use existing transaction date
    const conversionDate = date ? new Date(date) : transaction.get("date");
    transaction.set("amountINR", await convertToINR(amount, currency || transaction.get("currency"), conversionDate));
  }
  if (currency) transaction.set("currency", currency);
  if (type) transaction.set("type", type);
  if (date) transaction.set("date", new Date(date));
  if (description !== undefined) transaction.set("description", description);
  if (notes !== undefined) transaction.set("notes", notes);

  // Handle contact change
  let contact = oldContact;
  if (contactName && contactName !== transaction.get("contactName")) {
    // Find or create new contact
    const contactQuery = new Parse.Query("Contact");
    contactQuery.equalTo("user", user);
    contactQuery.equalTo("name", contactName.trim());
    contact = await contactQuery.first({ useMasterKey: true });

    if (!contact) {
      const Contact = Parse.Object.extend("Contact");
      contact = new Contact();
      contact.set("name", contactName.trim());
      const newType = type || transaction.get("type");
      contact.set("types", newType === "expense" ? ["supplier"] : ["customer"]);
      contact.set("aliases", []);
      contact.set("totalSpent", 0);
      contact.set("totalReceived", 0);
      contact.set("transactionCount", 0);
      contact.set("user", user);
      setUserACL(contact, user);
      await contact.save(null, { useMasterKey: true });
    }

    transaction.set("contact", contact);
    transaction.set("contactName", contactName.trim());
  }

  // Handle category change
  if (categoryId !== undefined) {
    if (categoryId) {
      const catQuery = new Parse.Query("Category");
      catQuery.equalTo("user", user);
      const category = await catQuery.get(categoryId, { useMasterKey: true });
      transaction.set("category", category);
      transaction.set("categoryName", category.get("name"));
    } else {
      transaction.unset("category");
      transaction.unset("categoryName");
    }
  }

  // Handle project change
  if (projectId !== undefined) {
    if (projectId) {
      const projQuery = new Parse.Query("Project");
      projQuery.equalTo("user", user);
      const project = await projQuery.get(projectId, { useMasterKey: true });
      transaction.set("project", project);
      transaction.set("projectName", project.get("name"));
    } else {
      transaction.unset("project");
      transaction.unset("projectName");
    }
  }

  // Check if we should clear the flagged status
  const currentReviewReason = transaction.get("reviewReason");
  const needsReview = transaction.get("needsReview");

  if (needsReview) {
    const currentAmount = transaction.get("amount");
    const currentCurrency = transaction.get("currency");
    const currentType = transaction.get("type");
    const currentDate = transaction.get("date");
    const currentContactName = transaction.get("contactName");

    if (currentReviewReason === "incomplete") {
      // For incomplete transactions, check if all required fields are now filled
      const isComplete = currentAmount > 0 &&
                        currentCurrency &&
                        currentType &&
                        currentDate &&
                        currentContactName &&
                        currentContactName !== "Unknown";

      if (isComplete) {
        transaction.set("needsReview", false);
        transaction.unset("reviewReason");
        transaction.unset("missingFields");
        console.log(`[updateTransaction] Cleared incomplete flag - all fields now filled`);
      }
    } else if (currentReviewReason === "low_confidence") {
      // For low confidence, user manually reviewed so clear the flag
      transaction.set("needsReview", false);
      transaction.unset("reviewReason");
      console.log(`[updateTransaction] Cleared low_confidence flag - user reviewed`);
    }
    // Note: potential_duplicate is NOT auto-cleared - needs explicit resolution
  }

  await transaction.save(null, { useMasterKey: true });

  // Update contact totals if amount or type changed
  const newAmount = transaction.get("amount");
  const newType = transaction.get("type");
  const newContact = transaction.get("contact");

  // If contact changed, update both old and new contact totals
  if (oldContact && oldContact.id !== newContact?.id) {
    // Remove from old contact
    if (oldType === "expense") {
      oldContact.increment("totalSpent", -oldAmount);
    } else {
      oldContact.increment("totalReceived", -oldAmount);
    }
    oldContact.increment("transactionCount", -1);
    await oldContact.save(null, { useMasterKey: true });

    // Add to new contact
    if (newContact) {
      if (newType === "expense") {
        newContact.increment("totalSpent", newAmount);
      } else {
        newContact.increment("totalReceived", newAmount);
      }
      newContact.increment("transactionCount", 1);
      await newContact.save(null, { useMasterKey: true });
    }
  } else if (newContact && (oldAmount !== newAmount || oldType !== newType)) {
    // Same contact, but amount or type changed
    if (oldType === "expense") {
      newContact.increment("totalSpent", -oldAmount);
    } else {
      newContact.increment("totalReceived", -oldAmount);
    }
    if (newType === "expense") {
      newContact.increment("totalSpent", newAmount);
    } else {
      newContact.increment("totalReceived", newAmount);
    }
    await newContact.save(null, { useMasterKey: true });
  }

  console.log(`[updateTransaction] Updated transaction ${transactionId}`);

  return {
    id: transaction.id,
    amount: transaction.get("amount"),
    currency: transaction.get("currency"),
    amountINR: transaction.get("amountINR"),
    type: transaction.get("type"),
    date: transaction.get("date"),
    contactId: transaction.get("contact")?.id,
    contactName: transaction.get("contactName"),
    categoryId: transaction.get("category")?.id,
    categoryName: transaction.get("categoryName"),
    projectId: transaction.get("project")?.id,
    projectName: transaction.get("projectName"),
    description: transaction.get("description"),
    notes: transaction.get("notes"),
    isRecurring: transaction.get("isRecurring"),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
});

Parse.Cloud.define("deleteTransaction", async (request) => {
  const user = requireUser(request);
  const { transactionId } = request.params;

  if (!transactionId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Transaction ID is required");
  }

  const query = new Parse.Query("Transaction");
  query.equalTo("user", user);
  query.include("contact");
  const transaction = await query.get(transactionId, { useMasterKey: true });

  const amount = transaction.get("amount");
  const type = transaction.get("type");
  const contact = transaction.get("contact");

  // Update contact totals
  if (contact) {
    if (type === "expense") {
      contact.increment("totalSpent", -amount);
    } else {
      contact.increment("totalReceived", -amount);
    }
    contact.increment("transactionCount", -1);
    await contact.save(null, { useMasterKey: true });
  }

  // Delete the transaction
  await transaction.destroy({ useMasterKey: true });

  console.log(`[deleteTransaction] Deleted transaction ${transactionId}`);

  return { success: true, deletedId: transactionId };
});

// ============================================
// Flagged Transactions
// ============================================

/**
 * Get transactions flagged for review
 */
Parse.Cloud.define("getFlaggedTransactions", async (request) => {
  const user = requireUser(request);
  const { limit = 50, skip = 0 } = request.params;

  const query = new Parse.Query("Transaction");
  query.equalTo("user", user);
  query.equalTo("needsReview", true);
  query.include(["contact", "category", "project"]);
  query.descending("createdAt");
  query.limit(limit);
  query.skip(skip);

  const [results, total] = await Promise.all([
    query.find({ useMasterKey: true }),
    query.count({ useMasterKey: true }),
  ]);

  console.log(`[getFlaggedTransactions] Found ${results.length} flagged transactions for user ${user.id}`);

  // Get potential duplicate details if needed
  const duplicateIds = new Set();
  for (const t of results) {
    const ids = t.get("potentialDuplicateIds") || [];
    ids.forEach((id) => duplicateIds.add(id));
  }

  // Fetch duplicate transactions for context
  let duplicateTransactions = {};
  if (duplicateIds.size > 0) {
    const dupQuery = new Parse.Query("Transaction");
    dupQuery.containedIn("objectId", Array.from(duplicateIds));
    dupQuery.equalTo("user", user);
    const dups = await dupQuery.find({ useMasterKey: true });
    for (const d of dups) {
      duplicateTransactions[d.id] = {
        id: d.id,
        amount: d.get("amount"),
        currency: d.get("currency"),
        type: d.get("type"),
        date: d.get("date"),
        contactName: d.get("contactName"),
        projectName: d.get("projectName"),
      };
    }
  }

  return {
    transactions: results.map((t) => ({
      id: t.id,
      amount: t.get("amount"),
      currency: t.get("currency"),
      amountINR: t.get("amountINR"),
      type: t.get("type"),
      date: t.get("date"),
      contactId: t.get("contact")?.id,
      contactName: t.get("contactName"),
      categoryId: t.get("category")?.id,
      categoryName: t.get("categoryName"),
      projectId: t.get("project")?.id,
      projectName: t.get("projectName"),
      description: t.get("description"),
      confidence: t.get("confidence"),
      needsReview: t.get("needsReview"),
      reviewReason: t.get("reviewReason"),
      potentialDuplicateIds: t.get("potentialDuplicateIds"),
      missingFields: t.get("missingFields"),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    duplicateTransactions,
    total,
    hasMore: skip + results.length < total,
  };
});

/**
 * Mark a transaction as reviewed (remove the flag)
 */
Parse.Cloud.define("markTransactionReviewed", async (request) => {
  const user = requireUser(request);
  const { transactionId } = request.params;

  if (!transactionId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Transaction ID is required");
  }

  const query = new Parse.Query("Transaction");
  query.equalTo("user", user);
  const transaction = await query.get(transactionId, { useMasterKey: true });

  transaction.set("needsReview", false);
  await transaction.save(null, { useMasterKey: true });

  console.log(`[markTransactionReviewed] Marked transaction ${transactionId} as reviewed`);

  return { success: true, transactionId };
});

/**
 * Get count of flagged transactions (for badge display)
 */
Parse.Cloud.define("getFlaggedCount", async (request) => {
  const user = requireUser(request);

  const query = new Parse.Query("Transaction");
  query.equalTo("user", user);
  query.equalTo("needsReview", true);
  const count = await query.count({ useMasterKey: true });

  return { count };
});

// ============================================
// Utility Cloud Functions
// ============================================

Parse.Cloud.define("hello", async () => {
  return { message: "Hello from Cotton Cloud Code!" };
});

// Debug function to test exchange rate API
Parse.Cloud.define("testExchangeRate", async (request) => {
  const { amount, currency, date } = request.params;
  const testDate = date ? new Date(date) : new Date();
  const rate = await getExchangeRate(currency || "USD", "INR", testDate);
  const converted = await convertToINR(amount || 100, currency || "USD", testDate);
  return {
    originalAmount: amount || 100,
    currency: currency || "USD",
    date: testDate.toISOString().split("T")[0],
    exchangeRate: rate,
    convertedToINR: converted,
  };
});

// Debug function to check environment variables (remove in production)
Parse.Cloud.define("checkEnvVars", async () => {
  const key = process.env.ANTHROPIC_API_KEY || "";
  return {
    ANTHROPIC_API_KEY_SET: !!key,
    ANTHROPIC_API_KEY_LENGTH: key.length,
    ANTHROPIC_API_KEY_PREFIX: key.substring(0, 20),
    ANTHROPIC_API_KEY_MIDDLE: key.substring(60, 85),
    ANTHROPIC_API_KEY_SUFFIX: key.substring(key.length - 15),
  };
});
