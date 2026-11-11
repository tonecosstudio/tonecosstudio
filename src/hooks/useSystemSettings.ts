import { useQuery } from "@tanstack/react-query";
import {
  readSystemSettings,
  updateSystemSettingsValues,
  updateSystemSettingValue,
  type SystemSettings,
} from "@/services/system/system-settings-service";

export type { SystemSettings } from "@/services/system/system-settings-service";

export function useSystemSettings(options: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: ["system-settings"],
    queryFn: readSystemSettings,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSystemSetting(key: keyof SystemSettings) {
  const { data: settings } = useSystemSettings();
  return settings?.[key];
}

export function useSystemSettingsMultiple<K extends keyof SystemSettings>(
  keys: K[],
): Pick<SystemSettings, K> | undefined {
  const { data: settings } = useSystemSettings();

  if (!settings) return undefined;

  return keys.reduce(
    (acc, key) => {
      acc[key] = settings[key];
      return acc;
    },
    {} as Pick<SystemSettings, K>,
  );
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  return readSystemSettings();
}

export function updateSystemSetting(
  key: string,
  value: string,
): Promise<{ success: boolean; error?: string }> {
  return updateSystemSettingValue(key, value);
}

export function updateSystemSettings(
  settings: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  return updateSystemSettingsValues(settings);
}
