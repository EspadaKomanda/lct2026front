import { api, buildQuery } from "../client";
import type {
  ProfileCheckResult,
  TrainerProfile,
  TrainerProfileAdmin,
  TrainerProfileCreate,
  TrainerProfileKeys,
  TrainerProfilePatch,
} from "../types";

export function listTrainerProfiles(params?: {
  include_archived?: boolean;
  key_last4?: string;
}): Promise<TrainerProfile[]> {
  return api.get<TrainerProfile[]>(`/trainer-profiles${buildQuery(params)}`);
}

export function createTrainerProfile(body: TrainerProfileCreate): Promise<TrainerProfileAdmin> {
  return api.post<TrainerProfileAdmin>("/trainer-profiles", body);
}

export function getTrainerProfile(profileId: string): Promise<TrainerProfile> {
  return api.get<TrainerProfile>(`/trainer-profiles/${profileId}`);
}

export function updateTrainerProfile(
  profileId: string,
  body: TrainerProfilePatch,
): Promise<TrainerProfileAdmin> {
  return api.patch<TrainerProfileAdmin>(`/trainer-profiles/${profileId}`, body);
}

export function updateTrainerProfileKeys(
  profileId: string,
  body: TrainerProfileKeys,
): Promise<TrainerProfileAdmin> {
  return api.put<TrainerProfileAdmin>(`/trainer-profiles/${profileId}/keys`, body);
}

export function checkTrainerProfile(profileId: string): Promise<ProfileCheckResult> {
  return api.post<ProfileCheckResult>(`/trainer-profiles/${profileId}/check`);
}

export function archiveTrainerProfile(profileId: string): Promise<TrainerProfileAdmin> {
  return api.post<TrainerProfileAdmin>(`/trainer-profiles/${profileId}/archive`);
}
