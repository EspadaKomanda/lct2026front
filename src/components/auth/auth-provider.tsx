"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getMe, logout as logoutApi } from "@/lib/api/modules/auth";
import { useApi } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import type { Me, Role } from "@/lib/api/types";
import { Button, Notice, Spinner, useToast } from "@/components/ui";

interface AuthContextValue {
  me: Me | null;
  loading: boolean;
  reload: () => void;
  hasRole: (...roles: Role[]) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  me: null,
  loading: true,
  reload: () => {},
  hasRole: () => false,
  logout: () => Promise.resolve(),
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(getMe, []);

  useEffect(() => {
    if (error?.status === 401) router.replace("/login");
  }, [error, router]);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
      router.replace("/login");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.problem.title : "Не удалось выйти");
    }
  }, [router, toast]);

  const value = useMemo<AuthContextValue>(
    () => ({
      me: data,
      loading,
      reload,
      hasRole: (...roles: Role[]) => (data ? roles.includes(data.user.role) : false),
      logout,
    }),
    [data, loading, reload, logout],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={20} />
      </div>
    );
  }

  if (error) {
    if (error.status === 401) return null;
    return (
      <div className="min-h-screen flex items-center justify-center px-8">
        <div className="w-[400px] flex flex-col gap-4">
          <Notice variant="error" title={error.problem.title} />
          <Button variant="secondary" className="self-center" onClick={reload}>
            Повторить
          </Button>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
