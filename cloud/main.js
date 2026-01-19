/**
 * Cotton Cloud Code
 * Main entry point for Back4App Cloud Code functions
 */

const { v4: uuidv4 } = require("uuid");

// ============================================
// OTP Authentication Cloud Functions
// ============================================

/**
 * Normalize phone number to E.164 format
 * @param {string} countryCode - Country dialing code (e.g., "+1", "+91")
 * @param {string} phoneNumber - Phone number without country code
 * @returns {string} E.164 formatted phone number
 */
function normalizePhoneNumber(countryCode, phoneNumber) {
  // Remove all non-digit characters from phone number
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  // Ensure country code starts with +
  const normalizedCode = countryCode.startsWith("+")
    ? countryCode
    : `+${countryCode}`;
  return `${normalizedCode}${cleanPhone}`;
}

/**
 * Generate a random password for users
 * Users authenticate via OTP, so this password is never exposed to them
 */
function generateRandomPassword() {
  return uuidv4() + uuidv4();
}

/**
 * Request OTP for phone authentication
 * In development, OTP is always "1234" - no SMS is sent
 *
 * @param {string} countryCode - Country dialing code (e.g., "+1", "+91")
 * @param {string} phoneNumber - Phone number without country code
 * @returns {{ success: boolean, message: string }}
 */
Parse.Cloud.define("requestOTP", async (request) => {
  const { countryCode, phoneNumber } = request.params;

  // Validate required parameters
  if (!countryCode || !phoneNumber) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Country code and phone number are required"
    );
  }

  // Remove non-digit characters for validation
  const cleanPhone = phoneNumber.replace(/\D/g, "");

  // Validate phone number length (6-15 digits is standard for international)
  if (cleanPhone.length < 6 || cleanPhone.length > 15) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Phone number must be between 6 and 15 digits"
    );
  }

  // Normalize phone number for logging/tracking
  const normalizedPhone = normalizePhoneNumber(countryCode, phoneNumber);

  // In production, this would send an SMS via Twilio
  // For development, OTP is hardcoded to "1234"
  console.log(`[OTP] Requested for ${normalizedPhone} - OTP is 1234`);

  return {
    success: true,
    message: "OTP sent successfully",
  };
});

/**
 * Verify OTP and authenticate user
 *
 * @param {string} countryCode - Country dialing code (e.g., "+1", "+91")
 * @param {string} phoneNumber - Phone number without country code
 * @param {string} otp - The OTP to verify
 * @param {string} countryIsoCode - ISO country code (e.g., "US", "IN")
 * @returns {{ isNewUser: boolean, sessionToken?: string, user?: object }}
 */
Parse.Cloud.define("verifyOTP", async (request) => {
  const { countryCode, phoneNumber, otp, countryIsoCode } = request.params;

  // Validate required parameters
  if (!countryCode || !phoneNumber || !otp) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Country code, phone number, and OTP are required"
    );
  }

  // Verify OTP (hardcoded to "1234" for development)
  if (otp !== "1234") {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Invalid OTP");
  }

  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(countryCode, phoneNumber);

  // Check if user exists with this phone number
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("username", normalizedPhone);

  // Use master key to query users
  const existingUser = await userQuery.first({ useMasterKey: true });

  if (existingUser) {
    // Existing user - log them in using Parse.User.logIn()
    // Generate a new password and update it, then log in
    const newPassword = generateRandomPassword();
    existingUser.set("password", newPassword);
    await existingUser.save(null, { useMasterKey: true });

    // Log in with the new password - Parse creates the session internally
    const loggedInUser = await Parse.User.logIn(normalizedPhone, newPassword);
    const sessionToken = loggedInUser.getSessionToken();

    console.log(`[verifyOTP] Logged in existing user ${loggedInUser.id}`);

    return {
      isNewUser: false,
      sessionToken: sessionToken,
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

  // New user - return flag to prompt for name entry
  return {
    isNewUser: true,
    phoneNumber: normalizedPhone,
    countryIsoCode: countryIsoCode || "US",
  };
});

/**
 * Create a new user with phone authentication
 *
 * @param {string} countryCode - Country dialing code (e.g., "+1", "+91")
 * @param {string} phoneNumber - Phone number without country code
 * @param {string} countryIsoCode - ISO country code (e.g., "US", "IN")
 * @param {string} fullName - User's full name
 * @returns {{ sessionToken: string, user: object }}
 */
Parse.Cloud.define("createUser", async (request) => {
  const { countryCode, phoneNumber, countryIsoCode, fullName } = request.params;

  // Validate required parameters
  if (!countryCode || !phoneNumber || !fullName) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Country code, phone number, and full name are required"
    );
  }

  // Validate name length
  if (fullName.trim().length < 2) {
    throw new Parse.Error(
      Parse.Error.VALIDATION_ERROR,
      "Name must be at least 2 characters"
    );
  }

  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(countryCode, phoneNumber);

  // Check if user already exists
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("username", normalizedPhone);
  const existingUser = await userQuery.first({ useMasterKey: true });

  if (existingUser) {
    throw new Parse.Error(
      Parse.Error.USERNAME_TAKEN,
      "An account with this phone number already exists"
    );
  }

  // Create new user
  const user = new Parse.User();
  user.set("username", normalizedPhone);
  user.set("email", `${normalizedPhone.replace("+", "")}@phone.cotton.app`);

  // Generate and store password - we need it for logIn() later
  const password = generateRandomPassword();
  user.set("password", password);
  user.set("fullName", fullName.trim());
  user.set("phoneNumber", normalizedPhone);
  user.set("countryIsoCode", countryIsoCode || "US");

  // Use signUp() instead of save() for proper user creation
  await user.signUp(null, { useMasterKey: true });
  console.log(`[createUser] Created new user ${user.id} for ${normalizedPhone}`);

  // Set ACL: user has read/write, public has read access
  // Public read is required for login to work properly
  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(true);
  user.setACL(acl);
  await user.save(null, { useMasterKey: true });

  // Log in to get session token - Parse creates the session internally
  const loggedInUser = await Parse.User.logIn(normalizedPhone, password);
  const sessionToken = loggedInUser.getSessionToken();

  console.log(`[createUser] Logged in new user ${loggedInUser.id}`);

  return {
    sessionToken: sessionToken,
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

// ============================================
// User Profile Cloud Functions
// ============================================

/**
 * Update user's name
 *
 * @param {string} fullName - New name for the user
 * @returns {{ success: boolean, user: object }}
 */
Parse.Cloud.define("updateUserName", async (request) => {
  const { fullName } = request.params;
  const user = request.user;

  // Require authenticated user
  if (!user) {
    throw new Parse.Error(
      Parse.Error.INVALID_SESSION_TOKEN,
      "User must be authenticated"
    );
  }

  // Validate name
  if (!fullName || fullName.trim().length === 0) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Name is required");
  }

  const trimmedName = fullName.trim();
  if (trimmedName.length < 2) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Name must be at least 2 characters"
    );
  }

  if (trimmedName.length > 100) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Name is too long");
  }

  // Update user's name
  user.set("fullName", trimmedName);
  await user.save(null, { useMasterKey: true });

  console.log(`[updateUserName] Updated name for user ${user.id} to "${trimmedName}"`);

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
// Utility Cloud Functions
// ============================================

// Example Cloud Function
Parse.Cloud.define("hello", async (request) => {
  return { message: "Hello from Cotton Cloud Code!" };
});
