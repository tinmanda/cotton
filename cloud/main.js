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
const USD_TO_INR_RATE = 83; // Approximate exchange rate

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
 * Convert amount to INR
 */
function convertToINR(amount, currency) {
  if (currency === "INR") return amount;
  if (currency === "USD") return amount * USD_TO_INR_RATE;
  return amount; // Default to same amount for unknown currencies
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
        model: "claude-3-5-sonnet-20241022",
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
        model: "claude-3-5-sonnet-20241022",
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
// Employee Cloud Functions
// ============================================

Parse.Cloud.define("createEmployee", async (request) => {
  const user = requireUser(request);
  const { name, role, projectId, monthlySalary, currency, email, phone, notes } = request.params;

  if (!name || !role || !projectId || monthlySalary === undefined) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Name, role, project, and salary are required");
  }

  // Verify project exists and belongs to user
  const projectQuery = new Parse.Query("Project");
  projectQuery.equalTo("user", user);
  const project = await projectQuery.get(projectId, { useMasterKey: true });

  const Employee = Parse.Object.extend("Employee");
  const employee = new Employee();
  employee.set("name", name.trim());
  employee.set("role", role.trim());
  employee.set("project", project);
  employee.set("monthlySalary", monthlySalary);
  employee.set("currency", currency || "INR");
  employee.set("status", "active");
  employee.set("email", email || "");
  employee.set("phone", phone || "");
  employee.set("notes", notes || "");
  employee.set("user", user);
  setUserACL(employee, user);

  await employee.save(null, { useMasterKey: true });
  console.log(`[createEmployee] Created employee ${employee.id} for project ${projectId}`);

  return {
    id: employee.id,
    name: employee.get("name"),
    role: employee.get("role"),
    projectId: project.id,
    monthlySalary: employee.get("monthlySalary"),
    currency: employee.get("currency"),
    status: employee.get("status"),
    email: employee.get("email"),
    phone: employee.get("phone"),
    notes: employee.get("notes"),
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
});

Parse.Cloud.define("getEmployees", async (request) => {
  const user = requireUser(request);
  const { projectId, status } = request.params;

  const query = new Parse.Query("Employee");
  query.equalTo("user", user);
  query.include("project");

  if (projectId) {
    const projectPointer = Parse.Object.extend("Project").createWithoutData(projectId);
    query.equalTo("project", projectPointer);
  }
  if (status) {
    query.equalTo("status", status);
  }
  query.ascending("name");

  const results = await query.find({ useMasterKey: true });
  return results.map((emp) => ({
    id: emp.id,
    name: emp.get("name"),
    role: emp.get("role"),
    projectId: emp.get("project")?.id,
    projectName: emp.get("project")?.get("name"),
    monthlySalary: emp.get("monthlySalary"),
    currency: emp.get("currency"),
    status: emp.get("status"),
    email: emp.get("email"),
    phone: emp.get("phone"),
    notes: emp.get("notes"),
    createdAt: emp.createdAt,
    updatedAt: emp.updatedAt,
  }));
});

Parse.Cloud.define("updateEmployee", async (request) => {
  const user = requireUser(request);
  const { employeeId, name, role, projectId, monthlySalary, currency, status, email, phone, notes } = request.params;

  if (!employeeId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Employee ID is required");
  }

  const query = new Parse.Query("Employee");
  query.equalTo("user", user);
  const employee = await query.get(employeeId, { useMasterKey: true });

  if (name) employee.set("name", name.trim());
  if (role) employee.set("role", role.trim());
  if (projectId) {
    const projectQuery = new Parse.Query("Project");
    projectQuery.equalTo("user", user);
    const project = await projectQuery.get(projectId, { useMasterKey: true });
    employee.set("project", project);
  }
  if (monthlySalary !== undefined) employee.set("monthlySalary", monthlySalary);
  if (currency) employee.set("currency", currency);
  if (status) employee.set("status", status);
  if (email !== undefined) employee.set("email", email);
  if (phone !== undefined) employee.set("phone", phone);
  if (notes !== undefined) employee.set("notes", notes);

  await employee.save(null, { useMasterKey: true });

  return {
    id: employee.id,
    name: employee.get("name"),
    role: employee.get("role"),
    projectId: employee.get("project")?.id,
    monthlySalary: employee.get("monthlySalary"),
    currency: employee.get("currency"),
    status: employee.get("status"),
    email: employee.get("email"),
    phone: employee.get("phone"),
    notes: employee.get("notes"),
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
});

// ============================================
// Merchant Cloud Functions
// ============================================

Parse.Cloud.define("getMerchants", async (request) => {
  const user = requireUser(request);
  const { search, limit } = request.params;

  const query = new Parse.Query("Merchant");
  query.equalTo("user", user);

  if (search) {
    query.matches("name", new RegExp(search, "i"));
  }

  query.descending("transactionCount");
  query.limit(limit || 100);

  const results = await query.find({ useMasterKey: true });
  return results.map((m) => ({
    id: m.id,
    name: m.get("name"),
    aliases: m.get("aliases") || [],
    defaultCategoryId: m.get("defaultCategory")?.id,
    defaultProjectId: m.get("defaultProject")?.id,
    website: m.get("website"),
    notes: m.get("notes"),
    totalSpent: m.get("totalSpent"),
    totalReceived: m.get("totalReceived"),
    transactionCount: m.get("transactionCount"),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
});

Parse.Cloud.define("updateMerchant", async (request) => {
  const user = requireUser(request);
  const { merchantId, name, aliases, defaultCategoryId, defaultProjectId, website, notes } = request.params;

  if (!merchantId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Merchant ID is required");
  }

  const query = new Parse.Query("Merchant");
  query.equalTo("user", user);
  const merchant = await query.get(merchantId, { useMasterKey: true });

  if (name) merchant.set("name", name.trim());
  if (aliases) merchant.set("aliases", aliases);
  if (defaultCategoryId !== undefined) {
    if (defaultCategoryId) {
      const catPointer = Parse.Object.extend("Category").createWithoutData(defaultCategoryId);
      merchant.set("defaultCategory", catPointer);
    } else {
      merchant.unset("defaultCategory");
    }
  }
  if (defaultProjectId !== undefined) {
    if (defaultProjectId) {
      const projPointer = Parse.Object.extend("Project").createWithoutData(defaultProjectId);
      merchant.set("defaultProject", projPointer);
    } else {
      merchant.unset("defaultProject");
    }
  }
  if (website !== undefined) merchant.set("website", website);
  if (notes !== undefined) merchant.set("notes", notes);

  await merchant.save(null, { useMasterKey: true });

  return {
    id: merchant.id,
    name: merchant.get("name"),
    aliases: merchant.get("aliases") || [],
    defaultCategoryId: merchant.get("defaultCategory")?.id,
    defaultProjectId: merchant.get("defaultProject")?.id,
    website: merchant.get("website"),
    notes: merchant.get("notes"),
    totalSpent: merchant.get("totalSpent"),
    totalReceived: merchant.get("totalReceived"),
    transactionCount: merchant.get("transactionCount"),
    createdAt: merchant.createdAt,
    updatedAt: merchant.updatedAt,
  };
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

  // Get user's existing merchants, categories, and projects for context
  const [merchants, categories, projects] = await Promise.all([
    new Parse.Query("Merchant").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Category").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Project").equalTo("user", user).find({ useMasterKey: true }),
  ]);

  const merchantList = merchants.map((m) => ({ id: m.id, name: m.get("name"), aliases: m.get("aliases") || [] }));
  const categoryList = categories.map((c) => ({ id: c.id, name: c.get("name"), type: c.get("type") }));
  const projectList = projects.map((p) => ({ id: p.id, name: p.get("name") }));

  const systemPrompt = `You are a financial transaction parser for a solo founder's expense tracking app.
Your job is to extract transaction details from raw text (SMS alerts, emails, invoices, manual notes).

CONTEXT:
- User's existing merchants: ${JSON.stringify(merchantList)}
- User's categories: ${JSON.stringify(categoryList)}
- User's projects: ${JSON.stringify(projectList)}

RULES:
1. Extract: amount, currency (INR or USD), type (income/expense), date, merchant name
2. If merchant matches an existing one (or alias), use that merchant's ID
3. Suggest the most appropriate category based on merchant/context
4. Suggest the most appropriate project if you can infer it
5. For bank debits, UPI payments, card charges = expense
6. For credits, refunds, payments received = income
7. Default to today's date if not specified
8. Default to INR if currency unclear

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{
  "amount": number,
  "currency": "INR" | "USD",
  "type": "income" | "expense",
  "date": "YYYY-MM-DD",
  "merchantName": "string",
  "existingMerchantId": "string or null",
  "suggestedCategoryId": "string or null",
  "suggestedProjectId": "string or null",
  "description": "brief description",
  "confidence": 0.0-1.0,
  "needsReview": boolean,
  "rawExtracted": {
    "amountString": "original amount text",
    "dateString": "original date text or null",
    "merchantString": "original merchant text"
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

  // Find existing merchant if ID was suggested
  let existingMerchant = null;
  if (parsedData.existingMerchantId) {
    const merchantQuery = new Parse.Query("Merchant");
    merchantQuery.equalTo("user", user);
    try {
      existingMerchant = await merchantQuery.get(parsedData.existingMerchantId, { useMasterKey: true });
    } catch (e) {
      // Merchant not found, ignore
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
    existingMerchant: existingMerchant ? {
      id: existingMerchant.id,
      name: existingMerchant.get("name"),
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

  // Get user's existing merchants, categories, projects, and employees for context
  const [merchants, categories, projects, employees] = await Promise.all([
    new Parse.Query("Merchant").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Category").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Project").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Employee").equalTo("user", user).find({ useMasterKey: true }),
  ]);

  const merchantList = merchants.map((m) => ({ id: m.id, name: m.get("name"), aliases: m.get("aliases") || [] }));
  const categoryList = categories.map((c) => ({ id: c.id, name: c.get("name"), type: c.get("type") }));
  const projectList = projects.map((p) => ({ id: p.id, name: p.get("name") }));
  const employeeList = employees.map((e) => ({
    id: e.id,
    name: e.get("name"),
    role: e.get("role"),
    projectId: e.get("project")?.id,
    monthlySalary: e.get("monthlySalary")
  }));

  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are a financial transaction parser for a solo founder's expense tracking app.
Your job is to extract MULTIPLE transactions from text that may describe recurring payments, salary histories, or bulk entries.

CONTEXT:
- User's existing merchants: ${JSON.stringify(merchantList)}
- User's categories: ${JSON.stringify(categoryList)}
- User's projects: ${JSON.stringify(projectList)}
- User's employees: ${JSON.stringify(employeeList)}
- Today's date: ${today}

RULES:
1. Parse text that describes multiple transactions over time (e.g., "Ajay salary was 30K for Jan-Jun, then 60K for Jul-Oct")
2. Generate one transaction per period mentioned (e.g., 6 transactions for Jan-Jun at 30K each)
3. For salary payments, match to existing employees if possible
4. Use the last day of each month for salary transactions
5. Default currency is INR unless specified
6. For ranges like "Jan-Jun 2025", create transactions for Jan 31, Feb 28, Mar 31, Apr 30, May 31, Jun 30
7. If year not specified, use current year or infer from context
8. Match merchants/employees by name (case-insensitive, partial match OK)

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{
  "transactions": [
    {
      "amount": number,
      "currency": "INR" | "USD",
      "type": "income" | "expense",
      "date": "YYYY-MM-DD",
      "merchantName": "string (use employee name for salaries)",
      "existingMerchantId": "string or null",
      "existingEmployeeId": "string or null",
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
    employees: employeeList,
  };
});

Parse.Cloud.define("parseTransactionFromImage", async (request) => {
  const user = requireUser(request);
  const { imageBase64, mediaType, source } = request.params;

  if (!imageBase64) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Image is required");
  }

  // Get user's existing data for context
  const [merchants, categories, projects] = await Promise.all([
    new Parse.Query("Merchant").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Category").equalTo("user", user).find({ useMasterKey: true }),
    new Parse.Query("Project").equalTo("user", user).find({ useMasterKey: true }),
  ]);

  const merchantList = merchants.map((m) => ({ id: m.id, name: m.get("name"), aliases: m.get("aliases") || [] }));
  const categoryList = categories.map((c) => ({ id: c.id, name: c.get("name"), type: c.get("type") }));
  const projectList = projects.map((p) => ({ id: p.id, name: p.get("name") }));

  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are a financial transaction parser for a solo founder's expense tracking app.
Your job is to extract transactions from images of receipts, invoices, bank statements, or any financial document.

CONTEXT:
- User's existing merchants: ${JSON.stringify(merchantList)}
- User's categories: ${JSON.stringify(categoryList)}
- User's projects: ${JSON.stringify(projectList)}
- Today's date: ${today}

RULES:
1. Extract ALL transactions visible in the image
2. For bank statements, extract each line item as a separate transaction
3. For receipts/invoices, extract the total as one transaction (or line items if clearly listed)
4. Identify: amount, currency, date, merchant/vendor name, description
5. Match merchants to existing ones if possible (use aliases for matching)
6. Suggest appropriate categories based on merchant/description
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
      "merchantName": "string",
      "existingMerchantId": "string or null",
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
      amount,
      currency,
      type,
      date,
      merchantName,
      categoryId,
      projectId,
      employeeId,
      description,
    } = txData;

    if (!amount || !currency || !type || !date || !merchantName) {
      continue; // Skip invalid transactions
    }

    // Find or create merchant
    let merchant;
    const merchantQuery = new Parse.Query("Merchant");
    merchantQuery.equalTo("user", user);
    merchantQuery.equalTo("name", merchantName.trim());
    merchant = await merchantQuery.first({ useMasterKey: true });

    if (!merchant) {
      const Merchant = Parse.Object.extend("Merchant");
      merchant = new Merchant();
      merchant.set("name", merchantName.trim());
      merchant.set("aliases", []);
      merchant.set("totalSpent", 0);
      merchant.set("totalReceived", 0);
      merchant.set("transactionCount", 0);
      merchant.set("user", user);
      setUserACL(merchant, user);
      await merchant.save(null, { useMasterKey: true });
    }

    // Create transaction
    const Transaction = Parse.Object.extend("Transaction");
    const transaction = new Transaction();
    transaction.set("amount", amount);
    transaction.set("currency", currency);
    transaction.set("amountINR", convertToINR(amount, currency));
    transaction.set("type", type);
    transaction.set("date", new Date(date));
    transaction.set("merchant", merchant);
    transaction.set("merchantName", merchantName.trim());
    transaction.set("user", user);
    transaction.set("isRecurring", false);

    if (categoryId) {
      const catQuery = new Parse.Query("Category");
      catQuery.equalTo("user", user);
      try {
        const category = await catQuery.get(categoryId, { useMasterKey: true });
        transaction.set("category", category);
        transaction.set("categoryName", category.get("name"));
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

    if (employeeId) {
      const empQuery = new Parse.Query("Employee");
      empQuery.equalTo("user", user);
      try {
        const employee = await empQuery.get(employeeId, { useMasterKey: true });
        transaction.set("employee", employee);
        transaction.set("employeeName", employee.get("name"));
      } catch (e) {
        // Employee not found, skip
      }
    }

    if (description) {
      transaction.set("description", description);
    }

    if (rawInputId) {
      const rawInputPointer = Parse.Object.extend("RawInput").createWithoutData(rawInputId);
      transaction.set("rawInput", rawInputPointer);
    }

    setUserACL(transaction, user);
    await transaction.save(null, { useMasterKey: true });

    // Update merchant totals
    if (type === "expense") {
      merchant.increment("totalSpent", amount);
    } else {
      merchant.increment("totalReceived", amount);
    }
    merchant.increment("transactionCount", 1);
    await merchant.save(null, { useMasterKey: true });

    createdTransactions.push({
      id: transaction.id,
      amount,
      currency,
      type,
      date,
      merchantName: merchantName.trim(),
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
    merchantName,
    categoryId,
    projectId,
    employeeId,
    allocations,
    description,
    notes,
    isRecurring,
  } = request.params;

  if (!amount || !currency || !type || !date || !merchantName) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Amount, currency, type, date, and merchant name are required"
    );
  }

  // Find or create merchant
  let merchant;
  const merchantQuery = new Parse.Query("Merchant");
  merchantQuery.equalTo("user", user);
  merchantQuery.equalTo("name", merchantName.trim());
  merchant = await merchantQuery.first({ useMasterKey: true });

  if (!merchant) {
    // Create new merchant
    const Merchant = Parse.Object.extend("Merchant");
    merchant = new Merchant();
    merchant.set("name", merchantName.trim());
    merchant.set("aliases", []);
    merchant.set("totalSpent", 0);
    merchant.set("totalReceived", 0);
    merchant.set("transactionCount", 0);
    merchant.set("user", user);
    setUserACL(merchant, user);

    // Set default category if provided
    if (categoryId) {
      const catPointer = Parse.Object.extend("Category").createWithoutData(categoryId);
      merchant.set("defaultCategory", catPointer);
    }

    // Set default project if provided
    if (projectId) {
      const projPointer = Parse.Object.extend("Project").createWithoutData(projectId);
      merchant.set("defaultProject", projPointer);
    }

    await merchant.save(null, { useMasterKey: true });
    console.log(`[createTransactionFromParsed] Created new merchant: ${merchant.id}`);
  }

  // Get category and project objects for names
  let category = null;
  let project = null;
  let employee = null;

  if (categoryId) {
    const catQuery = new Parse.Query("Category");
    catQuery.equalTo("user", user);
    category = await catQuery.get(categoryId, { useMasterKey: true });
  }

  if (projectId) {
    const projQuery = new Parse.Query("Project");
    projQuery.equalTo("user", user);
    project = await projQuery.get(projectId, { useMasterKey: true });
  }

  if (employeeId) {
    const empQuery = new Parse.Query("Employee");
    empQuery.equalTo("user", user);
    employee = await empQuery.get(employeeId, { useMasterKey: true });
  }

  // Create transaction
  const Transaction = Parse.Object.extend("Transaction");
  const transaction = new Transaction();
  transaction.set("amount", amount);
  transaction.set("currency", currency);
  transaction.set("amountINR", convertToINR(amount, currency));
  transaction.set("type", type);
  transaction.set("date", new Date(date));
  transaction.set("merchant", merchant);
  transaction.set("merchantName", merchant.get("name"));

  if (category) {
    transaction.set("category", category);
    transaction.set("categoryName", category.get("name"));
  }

  if (project) {
    transaction.set("project", project);
    transaction.set("projectName", project.get("name"));
  }

  if (employee) {
    transaction.set("employee", employee);
    transaction.set("employeeName", employee.get("name"));
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

  // Update raw input status
  if (rawInputId) {
    const rawInputQuery = new Parse.Query("RawInput");
    rawInputQuery.equalTo("user", user);
    const rawInput = await rawInputQuery.get(rawInputId, { useMasterKey: true });
    rawInput.set("status", "processed");
    rawInput.set("transaction", transaction);
    await rawInput.save(null, { useMasterKey: true });
  }

  // Update merchant totals
  if (type === "expense") {
    merchant.increment("totalSpent", amount);
  } else {
    merchant.increment("totalReceived", amount);
  }
  merchant.increment("transactionCount", 1);
  await merchant.save(null, { useMasterKey: true });

  console.log(`[createTransactionFromParsed] Created transaction ${transaction.id}`);

  return {
    id: transaction.id,
    amount: transaction.get("amount"),
    currency: transaction.get("currency"),
    amountINR: transaction.get("amountINR"),
    type: transaction.get("type"),
    date: transaction.get("date"),
    merchantId: merchant.id,
    merchantName: transaction.get("merchantName"),
    categoryId: category?.id,
    categoryName: transaction.get("categoryName"),
    projectId: project?.id,
    projectName: transaction.get("projectName"),
    employeeId: employee?.id,
    employeeName: transaction.get("employeeName"),
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
    merchantId,
    employeeId,
    limit,
    skip,
  } = request.params;

  const query = new Parse.Query("Transaction");
  query.equalTo("user", user);
  query.include(["merchant", "category", "project", "employee"]);

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
  if (merchantId) {
    const merchPointer = Parse.Object.extend("Merchant").createWithoutData(merchantId);
    query.equalTo("merchant", merchPointer);
  }
  if (employeeId) {
    const empPointer = Parse.Object.extend("Employee").createWithoutData(employeeId);
    query.equalTo("employee", empPointer);
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
      merchantId: t.get("merchant")?.id,
      merchantName: t.get("merchantName"),
      categoryId: t.get("category")?.id,
      categoryName: t.get("categoryName"),
      projectId: t.get("project")?.id,
      projectName: t.get("projectName"),
      employeeId: t.get("employee")?.id,
      employeeName: t.get("employeeName"),
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
  const [projectCount, merchantCount, employeeCount] = await Promise.all([
    new Parse.Query("Project").equalTo("user", user).count({ useMasterKey: true }),
    new Parse.Query("Merchant").equalTo("user", user).count({ useMasterKey: true }),
    new Parse.Query("Employee").equalTo("user", user).count({ useMasterKey: true }),
  ]);

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
    merchantCount,
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
      merchantName: t.get("merchantName"),
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
  transQuery.include(["category", "merchant"]);
  if (startDate) transQuery.greaterThanOrEqualTo("date", new Date(startDate));
  if (endDate) transQuery.lessThanOrEqualTo("date", new Date(endDate));
  transQuery.limit(10000);
  const transactions = await transQuery.find({ useMasterKey: true });

  // Calculate totals
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals = {};
  const merchantTotals = {};
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

    // Merchant totals
    const merchantId = t.get("merchant")?.id;
    if (merchantId) {
      const merchantName = t.get("merchantName");
      if (!merchantTotals[merchantId]) {
        merchantTotals[merchantId] = { id: merchantId, name: merchantName, amount: 0, count: 0 };
      }
      merchantTotals[merchantId].amount += amountINR;
      merchantTotals[merchantId].count += 1;
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

  // Get employee count
  const empQuery = new Parse.Query("Employee");
  empQuery.equalTo("user", user);
  empQuery.equalTo("project", projPointer);
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
    topMerchants: Object.values(merchantTotals)
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
    merchantName,
    categoryId,
    projectId,
    employeeId,
    description,
    notes,
  } = request.params;

  if (!transactionId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Transaction ID is required");
  }

  const query = new Parse.Query("Transaction");
  query.equalTo("user", user);
  query.include(["merchant", "category", "project", "employee"]);
  const transaction = await query.get(transactionId, { useMasterKey: true });

  const oldAmount = transaction.get("amount");
  const oldType = transaction.get("type");
  const oldMerchant = transaction.get("merchant");

  // Update basic fields
  if (amount !== undefined) {
    transaction.set("amount", amount);
    transaction.set("amountINR", convertToINR(amount, currency || transaction.get("currency")));
  }
  if (currency) transaction.set("currency", currency);
  if (type) transaction.set("type", type);
  if (date) transaction.set("date", new Date(date));
  if (description !== undefined) transaction.set("description", description);
  if (notes !== undefined) transaction.set("notes", notes);

  // Handle merchant change
  let merchant = oldMerchant;
  if (merchantName && merchantName !== transaction.get("merchantName")) {
    // Find or create new merchant
    const merchantQuery = new Parse.Query("Merchant");
    merchantQuery.equalTo("user", user);
    merchantQuery.equalTo("name", merchantName.trim());
    merchant = await merchantQuery.first({ useMasterKey: true });

    if (!merchant) {
      const Merchant = Parse.Object.extend("Merchant");
      merchant = new Merchant();
      merchant.set("name", merchantName.trim());
      merchant.set("aliases", []);
      merchant.set("totalSpent", 0);
      merchant.set("totalReceived", 0);
      merchant.set("transactionCount", 0);
      merchant.set("user", user);
      setUserACL(merchant, user);
      await merchant.save(null, { useMasterKey: true });
    }

    transaction.set("merchant", merchant);
    transaction.set("merchantName", merchantName.trim());
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

  // Handle employee change
  if (employeeId !== undefined) {
    if (employeeId) {
      const empQuery = new Parse.Query("Employee");
      empQuery.equalTo("user", user);
      const employee = await empQuery.get(employeeId, { useMasterKey: true });
      transaction.set("employee", employee);
      transaction.set("employeeName", employee.get("name"));
    } else {
      transaction.unset("employee");
      transaction.unset("employeeName");
    }
  }

  await transaction.save(null, { useMasterKey: true });

  // Update merchant totals if amount or type changed
  const newAmount = transaction.get("amount");
  const newType = transaction.get("type");
  const newMerchant = transaction.get("merchant");

  // If merchant changed, update both old and new merchant totals
  if (oldMerchant && oldMerchant.id !== newMerchant?.id) {
    // Remove from old merchant
    if (oldType === "expense") {
      oldMerchant.increment("totalSpent", -oldAmount);
    } else {
      oldMerchant.increment("totalReceived", -oldAmount);
    }
    oldMerchant.increment("transactionCount", -1);
    await oldMerchant.save(null, { useMasterKey: true });

    // Add to new merchant
    if (newMerchant) {
      if (newType === "expense") {
        newMerchant.increment("totalSpent", newAmount);
      } else {
        newMerchant.increment("totalReceived", newAmount);
      }
      newMerchant.increment("transactionCount", 1);
      await newMerchant.save(null, { useMasterKey: true });
    }
  } else if (newMerchant && (oldAmount !== newAmount || oldType !== newType)) {
    // Same merchant, but amount or type changed
    if (oldType === "expense") {
      newMerchant.increment("totalSpent", -oldAmount);
    } else {
      newMerchant.increment("totalReceived", -oldAmount);
    }
    if (newType === "expense") {
      newMerchant.increment("totalSpent", newAmount);
    } else {
      newMerchant.increment("totalReceived", newAmount);
    }
    await newMerchant.save(null, { useMasterKey: true });
  }

  console.log(`[updateTransaction] Updated transaction ${transactionId}`);

  return {
    id: transaction.id,
    amount: transaction.get("amount"),
    currency: transaction.get("currency"),
    amountINR: transaction.get("amountINR"),
    type: transaction.get("type"),
    date: transaction.get("date"),
    merchantId: transaction.get("merchant")?.id,
    merchantName: transaction.get("merchantName"),
    categoryId: transaction.get("category")?.id,
    categoryName: transaction.get("categoryName"),
    projectId: transaction.get("project")?.id,
    projectName: transaction.get("projectName"),
    employeeId: transaction.get("employee")?.id,
    employeeName: transaction.get("employeeName"),
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
  query.include("merchant");
  const transaction = await query.get(transactionId, { useMasterKey: true });

  const amount = transaction.get("amount");
  const type = transaction.get("type");
  const merchant = transaction.get("merchant");

  // Update merchant totals
  if (merchant) {
    if (type === "expense") {
      merchant.increment("totalSpent", -amount);
    } else {
      merchant.increment("totalReceived", -amount);
    }
    merchant.increment("transactionCount", -1);
    await merchant.save(null, { useMasterKey: true });
  }

  // Delete the transaction
  await transaction.destroy({ useMasterKey: true });

  console.log(`[deleteTransaction] Deleted transaction ${transactionId}`);

  return { success: true, deletedId: transactionId };
});

// ============================================
// Utility Cloud Functions
// ============================================

Parse.Cloud.define("hello", async () => {
  return { message: "Hello from Cotton Cloud Code!" };
});
