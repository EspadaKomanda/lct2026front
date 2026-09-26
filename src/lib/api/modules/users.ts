import { api } from "../client";
import type { GroupAccessPut, PortalUser, UserCreate, UserPatch } from "../types";

export function listUsers(): Promise<PortalUser[]> {
  return api.get<PortalUser[]>("/users");
}

export function createUser(body: UserCreate): Promise<PortalUser> {
  return api.post<PortalUser>("/users", body);
}

export function updateUser(userId: string, body: UserPatch): Promise<PortalUser> {
  return api.patch<PortalUser>(`/users/${userId}`, body);
}

export function setUserGroupAccess(userId: string, groupIds: string[]): Promise<PortalUser> {
  const body: GroupAccessPut = { group_ids: groupIds };
  return api.put<PortalUser>(`/users/${userId}/group-access`, body);
}
