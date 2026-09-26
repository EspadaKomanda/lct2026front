"use client";

import { useRef } from "react";
import { ApiError } from "@/lib/api/client";
import { useMutation } from "@/lib/api/hooks";

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError({
    type: "unexpected",
    title: e instanceof Error ? e.message : "Неожиданная ошибка",
    status: 0,
  });
}

/** useMutation с мгновенным доступом к ошибке: после `await run()` читайте lastError.current. */
export function useRun<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const lastError = useRef<ApiError | null>(null);
  const mut = useMutation<TArgs, TResult>(async (args) => {
    try {
      const result = await fn(args);
      lastError.current = null;
      return result;
    } catch (e) {
      lastError.current = toApiError(e);
      throw e;
    }
  });
  return { run: mut.run, loading: mut.loading, lastError };
}
