import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  notificationPreferencesService,
  type NotificationPreferences,
} from "@/services/notification-preferences-service";

export type NotificationPreferenceEntity = NotificationPreferences;

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPreferences = useCallback(async (): Promise<"ok" | "unauthorized" | "error"> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return "unauthorized";
      }

      const prefs = await notificationPreferencesService.getPreferences(user.id);
      if (!prefs) {
        const newPrefs = await notificationPreferencesService.createDefaultPreferences(user.id);
        setPreferences(newPrefs);
      } else {
        setPreferences(prefs);
      }

      return "ok";
    } catch {
      return "error";
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreference = useCallback(
    async (field: keyof NotificationPreferences, value: boolean): Promise<"ok" | "unauthorized" | "error"> => {
      if (!preferences) return "error";

      try {
        setSaving(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return "unauthorized";

        const updated = await notificationPreferencesService.updatePreferences(user.id, {
          [field]: value,
        });

        if (updated) {
          setPreferences(updated);
          return "ok";
        }

        return "error";
      } catch {
        return "error";
      } finally {
        setSaving(false);
      }
    },
    [preferences],
  );

  const enableAll = useCallback(async (): Promise<"ok" | "unauthorized" | "error"> => {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return "unauthorized";
      const updated = await notificationPreferencesService.enableAllEmails(user.id);

      if (updated) {
        setPreferences(updated);
        return "ok";
      }

      return "error";
    } catch {
      return "error";
    } finally {
      setSaving(false);
    }
  }, []);

  const disableAll = useCallback(async (): Promise<"ok" | "unauthorized" | "error"> => {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return "unauthorized";
      const updated = await notificationPreferencesService.disableAllEmails(user.id);

      if (updated) {
        setPreferences(updated);
        return "ok";
      }

      return "error";
    } catch {
      return "error";
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
