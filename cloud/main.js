/**
 * Cotton Cloud Code
 * Main entry point for Back4App Cloud Code functions
 */

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
    // Existing user - log them in by creating a session
    // Generate a session token for the existing user
    const sessionToken = existingUser.getSessionToken();

    // If no active session, create a new one
    if (!sessionToken) {
      // Create a new session for the user
      const Session = Parse.Object.extend("_Session");
      const session = new Session();
      session.set("user", existingUser);
      session.set("createdWith", { action: "login", authProvider: "otp" });
      session.set("restricted", false);
      session.set("expiresAt", new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)); // 1 year
      session.set(
        "sessionToken",
        "r:" + [...Array(24)].map(() => Math.random().toString(36)[2]).join("")
      );

      await session.save(null, { useMasterKey: true });

      return {
        isNewUser: false,
        sessionToken: session.get("sessionToken"),
        user: {
          id: existingUser.id,
          phoneNumber: normalizedPhone,
          fullName: existingUser.get("fullName") || "",
          email: existingUser.get("email"),
          profilePhoto: existingUser.get("profilePhoto"),
          createdAt: existingUser.createdAt,
          updatedAt: existingUser.updatedAt,
        },
      };
    }

    return {
      isNewUser: false,
      sessionToken: sessionToken,
      user: {
        id: existingUser.id,
        phoneNumber: normalizedPhone,
        fullName: existingUser.get("fullName") || "",
        email: existingUser.get("email"),
        profilePhoto: existingUser.get("profilePhoto"),
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt,
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
  user.set("password", crypto.randomUUID()); // Random password, not used for OTP auth
  user.set("fullName", fullName.trim());
  user.set("phoneNumber", normalizedPhone);
  user.set("countryIsoCode", countryIsoCode || "US");

  // Save user with master key
  await user.save(null, { useMasterKey: true });

  // Set ACL: user has read/write, public has read access
  // Public read is required for login to work properly
  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(true);
  user.setACL(acl);
  await user.save(null, { useMasterKey: true });

  // Create session for the new user
  const Session = Parse.Object.extend("_Session");
  const session = new Session();
  session.set("user", user);
  session.set("createdWith", { action: "signup", authProvider: "otp" });
  session.set("restricted", false);
  session.set("expiresAt", new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)); // 1 year
  session.set(
    "sessionToken",
    "r:" + [...Array(24)].map(() => Math.random().toString(36)[2]).join("")
  );

  await session.save(null, { useMasterKey: true });

  return {
    sessionToken: session.get("sessionToken"),
    user: {
      id: user.id,
      phoneNumber: normalizedPhone,
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
