/**
 * User interface
 * Represents a user in the system
 */
export interface IUser {
  id: string;
  username: string;
  email?: string;
  name?: string;
  phone?: string;
  profilePhoto?: string;
  createdAt: Date;
  updatedAt: Date;
}
