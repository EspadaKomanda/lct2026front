import { api } from "../client";
import type { LoginRequest, Me } from "../types";

export function login(body: LoginRequest): Promise<Me> {
  return api.post<Me>("/auth/login", body);
}

export function logout(): Promise<void> {
  return api.post<void>("/auth/logout");
}

export function getMe(): Promise<Me> {
  return api.get<Me>("/auth/me");
}
