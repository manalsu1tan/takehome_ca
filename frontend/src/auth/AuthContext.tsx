import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "../api/client";
import { login as loginRequest } from "../api/auth";

const TOKEN_STORAGE_KEY = "carbon_arc_task_token";

type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  handleApiError: (error: unknown) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Local storage keeps the demo session alive across browser refreshes.
  const [token, setToken] = useState<string | null>(() =>
    window.localStorage.getItem(TOKEN_STORAGE_KEY),
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    setToken(response.token);
  }, []);

  const handleApiError = useCallback(
    (error: unknown) => {
      // A 401 means the saved token is no longer useful, so protected routes
      // should fall back to the login page on the next render.
      if (error instanceof ApiError && error.status === 401) {
        logout();
      }
    },
    [logout],
  );

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
      handleApiError,
    }),
    [handleApiError, login, logout, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
