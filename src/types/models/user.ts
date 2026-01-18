/**
 * User interface
 * Represents a user in the system (phone OTP authentication)
 */
export interface IUser {
  id: string;
  phoneNumber: string; // E.164 format (e.g., "+919876543210")
  fullName: string;
  email?: string;
  profilePhoto?: string;
  countryIsoCode?: string; // ISO 3166-1 alpha-2 (e.g., "US", "IN")
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response from verifyOTP cloud function
 */
export interface VerifyOTPResponse {
  isNewUser: boolean;
  sessionToken?: string;
  user?: IUser;
  phoneNumber?: string;
  countryIsoCode?: string;
}

/**
 * Response from createUser cloud function
 */
export interface CreateUserResponse {
  sessionToken: string;
  user: IUser;
}

/**
 * Response from requestOTP cloud function
 */
export interface RequestOTPResponse {
  success: boolean;
  message: string;
}
