import { api } from "../client";
import type { PortalSettings, PortalSettingsPatch } from "../types";

export function getSettings(): Promise<PortalSettings> {
  return api.get<PortalSettings>("/settings");
}

export function updateSettings(body: PortalSettingsPatch): Promise<PortalSettings> {
  return api.patch<PortalSettings>("/settings", body);
}
