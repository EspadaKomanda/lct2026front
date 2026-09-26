"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login as loginApi, getMe } from "@/lib/api/modules/auth";
import { ApiError } from "@/lib/api/client";
import { firstAvailablePath } from "@/components/auth/portal-nav";
import { Button, Input, Spinner, ToastProvider, useToast } from "@/components/ui";

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginCard />
    </ToastProvider>
  );
}

function LoginCard() {
  const router = useRouter();
  const toast = useToast();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((me) => {
        if (alive) router.replace(firstAvailablePath(me.user.role));
      })
      .catch(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const me = await loginApi({ login: login.trim(), password });
      router.replace(firstAvailablePath(me.user.role));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Неверный логин или пароль");
      } else {
        toast.show(err instanceof ApiError ? err.problem.title : "Не удалось войти");
      }
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Spinner size={20} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-8">
      <div className="card w-[400px] p-8">
        <h1 className="text-2xl font-semibold">Арена переговоров</h1>
        <p className="text-sm text-dusk mt-1">Портал для методологов и HR</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-6">
          <Input
            label="Логин"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            error={error ?? undefined}
            required
          />
          <Button type="submit" variant="primary" loading={loading} className="w-full mt-1">
            {loading ? "Входим…" : "Войти"}
          </Button>
        </form>
        <p className="text-xs text-gray mt-6">Демо: gromova / arena2026 (методолог), lanskoy / arena2026 (админ)</p>
      </div>
    </div>
  );
}
