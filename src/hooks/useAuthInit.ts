import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { userAtom } from "@/store/auth";
import { AuthService } from "@/services";

/**
 * Auth initialization hook - call ONCE at app root
 * Checks for existing session and initializes user state
 */
export const useAuthInit = () => {
  const setUser = useSetAtom(userAtom);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initAuth = async () => {
      try {
        const userData = await AuthService.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Auth init error:", error);
        setUser(null);
      }
    };

    initAuth();
  }, [setUser]);
};
