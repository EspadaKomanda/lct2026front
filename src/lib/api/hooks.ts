"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./client";

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError({
    type: "unexpected",
    title: e instanceof Error ? e.message : "Неожиданная ошибка",
    status: 0,
  });
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>(fn: () => Promise<T>, deps: unknown[]): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);
  const seq = useRef(0);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    mounted.current = true;
    const id = ++seq.current;
    let stale = false;
    void (async () => {
      await Promise.resolve();
      if (stale || id !== seq.current) return;
      setLoading(true);
      setError(null);
      try {
        const result = await fnRef.current();
        if (stale || id !== seq.current || !mounted.current) return;
        setData(result);
      } catch (e) {
        if (stale || id !== seq.current || !mounted.current) return;
        setError(toApiError(e));
      } finally {
        if (!stale && id === seq.current && mounted.current) setLoading(false);
      }
    })();
    return () => {
      stale = true;
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, reload, setData };
}

export interface UseMutationResult<TArgs, TResult> {
  run: (args: TArgs) => Promise<TResult | null>;
  loading: boolean;
  error: ApiError | null;
  result: TResult | null;
}

export function useMutation<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
): UseMutationResult<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<TResult | null>(null);
  const mounted = useRef(true);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (args: TArgs): Promise<TResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const value = await fnRef.current(args);
      if (mounted.current) {
        setResult(value);
        setLoading(false);
      }
      return value;
    } catch (e) {
      if (mounted.current) {
        setError(toApiError(e));
        setLoading(false);
      }
      return null;
    }
  }, []);

  return { run, loading, error, result };
}
