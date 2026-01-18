import Parse from "parse/react-native.js";
import {
  ApiResponse,
  IUser,
  successResponse,
  errorResponseFromUnknown,
} from "@/types";

/**
 * Transform Parse User to IUser interface
 */
const toIUser = (parseUser: Parse.User): IUser => ({
  id: parseUser.id,
  username: parseUser.getUsername() || "",
  email: parseUser.getEmail(),
  name: parseUser.get("name"),
  phone: parseUser.get("phone"),
  profilePhoto: parseUser.get("profilePhoto"),
  createdAt: parseUser.createdAt,
  updatedAt: parseUser.updatedAt,
});

/**
 * Authentication service
 * Handles user authentication operations
 */
export class AuthService {
  /**
   * Sign up a new user
   */
  static async signUp(
    username: string,
    password: string,
    email?: string
  ): Promise<ApiResponse<IUser>> {
    try {
      const user = new Parse.User();
      user.set("username", username);
      user.set("password", password);
      if (email) {
        user.set("email", email);
      }

      const result = await user.signUp();
      return successResponse(toIUser(result));
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Sign in an existing user
   */
  static async signIn(
    username: string,
    password: string
  ): Promise<ApiResponse<IUser>> {
    try {
      const user = await Parse.User.logIn(username, password);
      return successResponse(toIUser(user));
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
   * Update user profile
   */
  static async updateProfile(
    updates: Partial<Pick<IUser, "name" | "email" | "profilePhoto">>
  ): Promise<ApiResponse<IUser>> {
    try {
      const parseUser = await Parse.User.currentAsync();
      if (!parseUser) {
        throw new Error("No user logged in");
      }

      if (updates.name !== undefined) {
        parseUser.set("name", updates.name);
      }
      if (updates.email !== undefined) {
        parseUser.set("email", updates.email);
      }
      if (updates.profilePhoto !== undefined) {
        parseUser.set("profilePhoto", updates.profilePhoto);
      }

      const result = await parseUser.save();
      return successResponse(toIUser(result));
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }
}
