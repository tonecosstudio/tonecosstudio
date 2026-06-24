import { log } from "@/lib/logger";
import {
  DEFAULT_NOTIFICATION_ICON_URL,
  DEFAULT_NOTIFICATION_SOUND_URL,
} from "@/lib/notifications/assets";

interface BrowserNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

interface AudioNotificationOptions {
  enabled: boolean;
  volume?: number;
  src?: string;
  context: string;
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    log.warn("Browser notifications are not supported", { context: "browser-notifications" });
    return false;
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function showBrowserNotification(payload: BrowserNotificationPayload): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  new Notification(payload.title, {
    body: payload.body,
    icon: payload.icon ?? DEFAULT_NOTIFICATION_ICON_URL,
    badge: payload.badge ?? DEFAULT_NOTIFICATION_ICON_URL,
    tag: payload.tag,
  });
}

export function playAudioNotification({
  enabled,
  volume = 0.5,
  src = DEFAULT_NOTIFICATION_SOUND_URL,
  context,
}: AudioNotificationOptions): void {
  if (!enabled) return;

  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch((error: unknown) => {
      log.warn("Failed to play notification sound", { error, context });
    });
  } catch (error) {
    log.warn("Failed to create notification audio", { error, context });
  }
}
