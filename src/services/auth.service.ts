import Parse from "parse/react-native.js";
import {
  ApiResponse,
  IUser,
  RequestOTPResponse,
  VerifyOTPResponse,
  CreateUserResponse,
  successResponse,
  errorResponseFromUnknown,
} from "@/types";
import { CLOUD_FUNCTIONS } from "@/constants";

/**
 * Transform Parse User to IUser interface
 */
const toIUser = (parseUser: Parse.User): IUser => ({
  id: parseUser.id,
  phoneNumber: parseUser.get("phoneNumber") || parseUser.getUsername() || "",
  fullName: parseUser.get("fullName") || "",
  email: parseUser.getEmail(),
  profilePhoto: parseUser.get("profilePhoto"),
  countryIsoCode: parseUser.get("countryIsoCode"),
  createdAt: parseUser.createdAt,
  updatedAt: parseUser.updatedAt,
});

/**
 * Authentication service
 * Handles phone OTP authentication operations
 */
export class AuthService {
  /**
   * Request OTP for phone number
   */
  static async requestOTP(
    countryCode: string,
    phoneNumber: string
  ): Promise<ApiResponse<RequestOTPResponse>> {
    try {
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.REQUEST_OTP, {
        countryCode,
        phoneNumber,
      });
      return successResponse(result as RequestOTPResponse);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Verify OTP and authenticate user
   */
  static async verifyOTP(
    countryCode: string,
    phoneNumber: string,
    otp: string,
    countryIsoCode: string
  ): Promise<ApiResponse<VerifyOTPResponse>> {
    try {
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.VERIFY_OTP, {
        countryCode,
        phoneNumber,
        otp,
        countryIsoCode,
      });

      const response = result as VerifyOTPResponse;

      // If existing user, become the user with the session token
      if (!response.isNewUser && response.sessionToken) {
        await Parse.User.become(response.sessionToken);
      }

      return successResponse(response);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Create a new user after OTP verification
   */
  static async createUser(
    countryCode: string,
    phoneNumber: string,
    countryIsoCode: string,
    fullName: string
  ): Promise<ApiResponse<CreateUserResponse>> {
    try {
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.CREATE_USER, {
        countryCode,
        phoneNumber,
        countryIsoCode,
        fullName,
      });

      const response = result as CreateUserResponse;

      // Become the new user with the session token
      if (response.sessionToken) {
        await Parse.User.become(response.sessionToken);
      }

      return successResponse(response);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<ApiResponse<void>> {
    try {
      await Parse.User.logOut();
      return successResponse(undefined);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<IUser | null> {
    try {
      const parseUser = await Parse.User.currentAsync();
      if (!parseUser) {
        return null;
      }
      return toIUser(parseUser);
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Validate current session
   */
  static async validateSession(): Promise<boolean> {
    try {
      const parseUser = await Parse.User.currentAsync();
      if (!parseUser) {
        return false;
      }

      // Try to fetch user to validate session
      await parseUser.fetch();
      return true;
    } catch (error) {
      // Session is invalid
      return false;
    }
  }

  /**
   * Update user's name
   */
  static async updateUserName(fullName: string): Promise<ApiResponse<IUser>> {
    try {
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.UPDATE_USER_NAME, {
        fullName,
      });

      // Transform the response user to IUser
      const responseUser = result.user;
      const user: IUser = {
        id: responseUser.id,
        phoneNumber: responseUser.phoneNumber,
        fullName: responseUser.fullName,
        email: responseUser.email,
        profilePhoto: responseUser.profilePhoto,
        createdAt: new Date(responseUser.createdAt),
        updatedAt: new Date(responseUser.updatedAt),
      };

      return successResponse(user);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }
}
