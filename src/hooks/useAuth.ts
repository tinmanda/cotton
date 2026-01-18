import { useAtom, useAtomValue } from "jotai";
import { useCallback } from "react";
import { userAtom, isAuthenticatedAtom, authLoadingAtom } from "@/store/auth";
import { AuthService } from "@/services";
import { ApiResponse } from "@/types";

/**
 * Authentication hook
 * Provides auth state and operations with proper typing
 */
export const useAuth = () => {
  const [user, setUser] = useAtom(userAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [isLoading, setIsLoading] = useAtom(authLoadingAtom);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async (): Promise<ApiResponse<void>> => {
    setIsLoading(true);
    const result = await AuthService.signOut();

    if (result.success) {
      setUser(null);
    }

    setIsLoading(false);
    return result;
  }, [setIsLoading, setUser]);

  /**
   * Validate current session
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    const isValid = await AuthService.validateSession();

    if (!isValid) {
      setUser(null);
    }

    return isValid;
  }, [setUser]);

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    const userData = await AuthService.getCurrentUser();
    if (userData) {
      setUser(userData);
    }
  }, [setUser]);

  return {
    user,
    setUser,
    isAuthenticated,
    isLoading,
    signOut,
    validateSession,
    refreshUser,
  };
};
