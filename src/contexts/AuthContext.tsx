/*src\contexts\AuthContext.tsx */
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "professor" | "student" | "admin";
  professorStatus?: "pending" | "approved" | "rejected";
  avatar?: string | null;
  bio?: string | null;
  department?: string | null;
  university?: string | null;
  interests?: string[];
  programmingLanguages?: string[];
  username?: string | null;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: "professor" | "student";
  department?: string;
  university?: string;
  bio?: string;
  interests?: string[];
  programmingLanguages?: string[];
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Safely parse an API response.
 *
 * Prevents errors like:
 * "Unexpected token '<', '<!DOCTYPE ...' is not valid JSON"
 *
 * when Next.js returns an HTML error/404 page instead of JSON.
 */
async function parseApiResponse<T = Record<string, unknown>>(
  response: Response
): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!rawText) {
    return {} as T;
  }

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Server returned a non-JSON response (HTTP ${response.status}).`
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(`Server returned invalid JSON (HTTP ${response.status}).`);
  }
}

function getApiErrorMessage(
  data: Record<string, unknown>,
  fallback: string
): string {
  return typeof data.error === "string"
    ? data.error
    : typeof data.message === "string"
    ? data.message
    : fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Get the currently authenticated user.
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await parseApiResponse<{
        user?: User;
        error?: string;
      }>(response);

      if (!response.ok) {
        setUser(null);
        return;
      }

      if (!data.user) {
        setUser(null);
        return;
      }

      setUser(data.user);
    } catch (error) {
      console.error("refreshUser error:", error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        await refreshUser();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  /**
   * Login.
   */
  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new Error("ایمیل و رمز عبور الزامی است");
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
      }),
    });

    let data: {
      user?: User;
      token?: string;
      error?: string;
      message?: string;
    };

    try {
      data = await parseApiResponse(response);
    } catch (error) {
      console.error("Login API returned an invalid response:", error);

      throw new Error(
        `Login server error (HTTP ${response.status}). Please check the server console.`
      );
    }

    if (!response.ok) {
      throw new Error(getApiErrorMessage(data, "ورود ناموفق بود"));
    }

    if (!data.user) {
      console.error("Login API response:", data);
      throw new Error("ورود موفق بود اما اطلاعات کاربر دریافت نشد.");
    }

    setUser(data.user);
  };

  /**
   * Register.
   */
  const register = async (formData: RegisterData) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(formData),
    });

    let data: {
      user?: User;
      pendingApproval?: boolean;
      error?: string;
      message?: string;
    };

    try {
      data = await parseApiResponse(response);
    } catch (error) {
      console.error("Register API returned an invalid response:", error);

      throw new Error(
        `Registration server error (HTTP ${response.status}). Please check the server console.`
      );
    }

    if (!response.ok) {
      throw new Error(getApiErrorMessage(data, "ثبت‌نام ناموفق بود"));
    }

    if (data.pendingApproval) {
      throw new Error(
        data.message || "حساب استاد شما در انتظار تأیید مدیر است."
      );
    }

    if (!data.user) {
      throw new Error("ثبت‌نام موفق بود اما اطلاعات کاربر دریافت نشد.");
    }

    setUser(data.user);
  };

  /**
   * Logout.
   */
  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        try {
          const data = await parseApiResponse<{
            error?: string;
            message?: string;
          }>(response);

          throw new Error(getApiErrorMessage(data, "خروج از حساب ناموفق بود"));
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }

          throw new Error(`Logout failed (HTTP ${response.status})`);
        }
      }

      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
