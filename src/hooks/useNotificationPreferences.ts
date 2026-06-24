import { useCallback, useState } from "react";
import {
  notificationPreferencesService,
  type NotificationPreferences,
} from "@/services/notifications/notification-preferences-service";

export type NotificationPreferenceEntity = NotificationPreferences;
type NotificationPreferenceResult = "ok" | "unauthorized" | "error";

function toPreferenceResult(error: unknown): NotificationPreferenceResult {
  return error instanceof Error && error.message === "User not authenticated"
    ? "unauthorized"
    : "error";
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPreferences = useCallback(async (): Promise<NotificationPreferenceResult> => {
    try {
      const prefs = await notificationPreferencesService.getOrCreateCurrentPreferences();
      setPreferences(prefs);

      return "ok";
    } catch (error) {
      return toPreferenceResult(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreference = useCallback(
    async (
      field: keyof NotificationPreferences,
      value: boolean,
    ): Promise<NotificationPreferenceResult> => {
      if (!preferences) return "error";

      try {
        setSaving(true);

        const updated = await notificationPreferencesService.updateCurrentPreferences({
          [field]: value,
        });

        if (updated) {
          setPreferences(updated);
          return "ok";
        }

        return "error";
      } catch (error) {
        return toPreferenceResult(error);
      } finally {
        setSaving(false);
      }
    },
    [preferences],
  );

  const enableAll = useCallback(async (): Promise<NotificationPreferenceResult> => {
    try {
      setSaving(true);
      const updated = await notificationPreferencesService.enableAllCurrentUserEmails();

      if (updated) {
        setPreferences(updated);
        return "ok";
      }

      return "error";
    } catch (error) {
      return toPreferenceResult(error);
    } finally {
      setSaving(false);
    }
  }, []);

  const disableAll = useCallback(async (): Promise<NotificationPreferenceResult> => {
    try {
      setSaving(true);
      const updated = await notificationPreferencesService.disableAllCurrentUserEmails();

      if (updated) {
        setPreferences(updated);
        return "ok";
      }

      return "error";
    } catch (error) {
      return toPreferenceResult(error);
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    preferences,
    loading,
    saving,
    loadPreferences,
    updatePreference,
    enableAll,
    disableAll,
  };
}
