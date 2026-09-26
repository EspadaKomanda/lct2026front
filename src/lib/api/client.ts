import type { Problem } from "./types";

export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.title);
    this.name = "ApiError";
    this.problem = problem;
  }

  get status(): number {
    return this.problem.status;
  }
}

const BASE = "/api/portal";

export type QueryValue = string | number | boolean;
export type QueryParams = Record<string, QueryValue | QueryValue[] | null | undefined>;

export function buildQuery(params?: object): string {
  if (!params) return "";
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) usp.append(key, String(item));
    } else {
      usp.set(key, String(value));
    }
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

const STATUS_TITLES: Record<number, string> = {
  400: "Некорректный запрос",
  401: "Требуется вход в систему",
  403: "Доступ запрещён",
  404: "Не найдено",
  409: "Конфликт состояния",
  410: "Данные больше не актуальны",
  412: "Данные изменились, обновите страницу",
  413: "Слишком большой запрос",
  422: "Ошибки проверки данных",
  429: "Слишком много запросов, повторите позже",
  500: "Ошибка сервера",
};

async function readProblem(res: Response): Promise<Problem> {
  const text = await res.text().catch(() => "");
  const contentType = res.headers.get("content-type") ?? "";
  if (text && contentType.includes("json")) {
    try {
      const parsed = JSON.parse(text) as Partial<Problem> | null;
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.title === "string" &&
        typeof parsed.status === "number"
      ) {
        const retryHeader = res.headers.get("retry-after");
        return {
          type: parsed.type ?? "error",
          title: parsed.title,
          status: parsed.status,
          detail: parsed.detail ?? null,
          instance: parsed.instance,
          errors: parsed.errors,
          retry_after_seconds:
            parsed.retry_after_seconds ??
            (retryHeader ? Number(retryHeader) || undefined : undefined),
          data: parsed.data,
        };
      }
    } catch {
      // не problem+json — собираем Problem из статуса и текста ниже
    }
  }
  return {
    type: "http_error",
    title: text ? text.slice(0, 300) : (STATUS_TITLES[res.status] ?? `Ошибка ${res.status}`),
    status: res.status,
    detail: null,
  };
}

export interface RawResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export interface RequestInit {
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  method: string,
  path: string,
  init?: RequestInit,
): Promise<RawResponse<T>> {
  const headers: Record<string, string> = { ...(init?.headers ?? {}) };
  if (init?.body !== undefined) headers["content-type"] ??= "application/json";

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: "same-origin",
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError({ type: "network_error", title: "Нет соединения с сервером", status: 0 });
  }

  if (!res.ok) throw new ApiError(await readProblem(res));
  if (res.status === 204) return { data: undefined as T, status: res.status, headers: res.headers };

  const text = await res.text();
  let data: T;
  try {
    data = (text ? JSON.parse(text) : undefined) as T;
  } catch {
    throw new ApiError({
      type: "bad_response",
      title: "Некорректный ответ сервера",
      status: res.status,
    });
  }
  return { data, status: res.status, headers: res.headers };
}

export const api = {
  get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return apiRequest<T>("GET", path, { headers }).then((r) => r.data);
  },
  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return apiRequest<T>("POST", path, { body, headers }).then((r) => r.data);
  },
  put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return apiRequest<T>("PUT", path, { body, headers }).then((r) => r.data);
  },
  patch<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return apiRequest<T>("PATCH", path, { body, headers }).then((r) => r.data);
  },
  del<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return apiRequest<T>("DELETE", path, { body, headers }).then((r) => r.data);
  },
};

export interface ApiFile {
  blob: Blob;
  filename: string | null;
  rowsCount: number | null;
}

function parseFilename(disposition: string | null): string | null {
  if (!disposition) return null;
  const star = /filename\*=(?:UTF-8''|utf-8'')?([^;]+)/i.exec(disposition);
  if (star) return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1] : null;
}

export async function apiDownload(path: string, body?: unknown): Promise<ApiFile> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError({ type: "network_error", title: "Нет соединения с сервером", status: 0 });
  }
  if (!res.ok) throw new ApiError(await readProblem(res));
  const blob = await res.blob();
  const rowsHeader = res.headers.get("x-rows-count");
  return {
    blob,
    filename: parseFilename(res.headers.get("content-disposition")),
    rowsCount: rowsHeader === null ? null : Number(rowsHeader) || null,
  };
}
