/**
 * Alert Notification Service
 * 
 * Handles browser notifications, sound alerts, and email digests for
 * critical production alerts.
 */

import { ASSETS } from "@/config/constants";
import { logInfo, logError, logWarn } from "@/lib/logger";
import { navigateInApp } from "@/lib/navigation";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { assertCurrentUserId } from "@/services/auth/current-user";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";

// ============================================================================
// Types
// ============================================================================

export interface NotificationPreferences {
  browserNotifications: boolean;
  soundNotifications: boolean;
  emailDigest: boolean;
}

export interface AlertNotification {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: unknown;
}

// ============================================================================
// Browser Notification Functions
// ============================================================================

/**
 * Request permission for browser notifications
 * @returns Promise<boolean> - true if permission granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    logWarn("This browser does not support notifications", null, 'alerts');
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Check if browser notifications are supported and permitted
 */
export function canShowNotifications(): boolean {
  return (
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

/**
 * Show a browser notification
 * @param notification - Notification details
 */
export function showBrowserNotification(notification: AlertNotification): void {
  if (!canShowNotifications()) {
    logWarn("Cannot show notification: permission not granted", null, 'alerts');
    return;
  }

  const { title, body, icon, tag, data } = notification;

  const notif = new Notification(title, {
    body,
    icon: icon || ASSETS.DEFAULT_ICON_URL,
    tag: tag || "production-alert",
    data,
    requireInteraction: true, // Keep notification visible until user interacts
  });

  // Handle notification click
  notif.onclick = () => {
    window.focus();
    notif.close();
    
    // Navigate to production dashboard if not already there
    if (!window.location.pathname.includes("/admin/production")) {
      navigateInApp("/admin/production");
    }
  };
}

/**
 * Show notification for critical deadline items
 */
export function notifyCriticalDeadline(count: number): void {
  showBrowserNotification({
    title: "⚠️ Alerta Crítico de Prazo",
    body: `${count} ${count === 1 ? 'item tem' : 'itens têm'} prazo menor que 24 horas!`,
    tag: "deadline-critical",
    data: { type: "deadline_critical", count },
  });
}

/**
 * Show notification for pending choices
 */
export function notifyPendingChoices(count: number): void {
  showBrowserNotification({
    title: "⏰ Escolhas Pendentes",
    body: `${count} ${count === 1 ? 'cliente precisa' : 'clientes precisam'} escolher personagem urgentemente.`,
    tag: "pending-choices",
    data: { type: "deadline_urgent", count },
  });
}

/**
 * Show notification for blocked items
 */
export function notifyBlockedItems(count: number): void {
  showBrowserNotification({
    title: "🚫 Itens Bloqueados",
    body: `${count} ${count === 1 ? 'item está bloqueado' : 'itens estão bloqueados'} na produção.`,
    tag: "blocked-items",
    data: { type: "blocked", count },
  });
}

/**
 * Show notification for overdue items
 */
export function notifyOverdueItems(count: number): void {
  showBrowserNotification({
    title: "📊 Tempo Excedido",
    body: `${count} ${count === 1 ? 'item excedeu' : 'itens excederam'} o tempo médio de produção.`,
    tag: "overdue-items",
    data: { type: "overdue", count },
  });
}

// ============================================================================
// Sound Notification Functions
// ============================================================================

let audioContext: AudioContext | null = null;

/**
 * Initialize audio context (must be called after user interaction)
 */
function initAudioContext(): void {
  if (!audioContext) {
    const audioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioContextConstructor) {
      return;
    }
    audioContext = new audioContextConstructor();
  }
}

/**
 * Play a notification sound
 * @param frequency - Sound frequency in Hz (default: 800)
 * @param duration - Sound duration in ms (default: 200)
 */
export function playNotificationSound(frequency: number = 800, duration: number = 200): void {
  try {
    initAudioContext();
    
    if (!audioContext) {
      logWarn("AudioContext not available", null, 'alerts');
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    logError("Error playing notification sound", error, 'alerts');
  }
}

/**
 * Play alert sound based on severity
 * @param severity - Alert severity level
 */
export function playAlertSound(severity: "critical" | "warning" | "info"): void {
  switch (severity) {
    case "critical":
      // High-pitched urgent sound
      playNotificationSound(1000, 150);
      setTimeout(() => playNotificationSound(1000, 150), 200);
      break;
    case "warning":
      // Medium-pitched warning sound
      playNotificationSound(800, 200);
      break;
    case "info":
      // Low-pitched info sound
      playNotificationSound(600, 150);
      break;
  }
}

// ============================================================================
// User Preferences Functions
// ============================================================================

const PREFERENCES_KEY = "production_notification_preferences";

/**
 * Get user notification preferences from localStorage
 */
export function getNotificationPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logError("Error reading notification preferences", error, 'alerts');
  }

  // Default preferences
  return {
    browserNotifications: true,
    soundNotifications: false,
    emailDigest: true,
  };
}

/**
 * Save user notification preferences to localStorage
 */
export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    logError("Error saving notification preferences", error, 'alerts');
  }
}

// ============================================================================
// Email Digest Functions
// ============================================================================

/**
 * Send daily alert digest email to admins
 * This function should be called by a scheduled job (e.g., cron job or Supabase Edge Function)
 */
export async function sendDailyAlertDigest(): Promise<void> {
  try {
    const data = await callAuthenticatedEdgeFunction(
      "send-alert-digest",
      { type: "daily" },
      "Error sending daily alert digest",
    );

    logInfo("Daily alert digest sent successfully", data, 'alerts');
  } catch (error) {
    logError("Error sending daily alert digest", error, 'alerts');
    throw error;
  }
}

/**
 * Subscribe admin to email digest
 */
export async function subscribeToEmailDigest(userId: string, email: string): Promise<void> {
  try {
    await assertCurrentUserId(userId);
    void email;

    await callAdminRpc("admin_update_notification_settings", {
      p_updates: { email_enabled: true },
    });
  } catch (error) {
    logError("Error subscribing to email digest", error, 'alerts');
    throw error;
  }
}

/**
 * Unsubscribe admin from email digest
 */
export async function unsubscribeFromEmailDigest(userId: string): Promise<void> {
  try {
    await assertCurrentUserId(userId);

    await callAdminRpc("admin_update_notification_settings", {
      p_updates: { email_enabled: false },
    });
  } catch (error) {
    logError("Error unsubscribing from email digest", error, 'alerts');
    throw error;
  }
}

// ============================================================================
// Alert Monitoring Functions
// ============================================================================

/**
 * Check for new critical alerts and notify if needed
 * This should be called periodically or when metrics update
 */
export function checkAndNotifyAlerts(
  currentMetrics: {
    urgent: { deadlineCritical: number; deadlineUrgent: number; blocked: number; overdue: number };
  } | null,
  previousMetrics: {
    urgent: { deadlineCritical: number; deadlineUrgent: number; blocked: number; overdue: number };
  } | null,
  preferences: NotificationPreferences
): void {
  if (!currentMetrics || !previousMetrics) {
    return;
  }

  const { urgent: current } = currentMetrics;
  const { urgent: previous } = previousMetrics;

  // Check for new critical deadline items
  if (current.deadlineCritical > previous.deadlineCritical) {
    if (preferences.browserNotifications) {
      notifyCriticalDeadline(current.deadlineCritical);
    }
    if (preferences.soundNotifications) {
      playAlertSound("critical");
    }
  }

  // Check for new pending choices
  if (current.deadlineUrgent > previous.deadlineUrgent) {
    if (preferences.browserNotifications) {
      notifyPendingChoices(current.deadlineUrgent);
    }
    if (preferences.soundNotifications) {
      playAlertSound("warning");
    }
  }

  // Check for new blocked items
  if (current.blocked > previous.blocked) {
    if (preferences.browserNotifications) {
      notifyBlockedItems(current.blocked);
    }
    if (preferences.soundNotifications) {
      playAlertSound("info");
    }
  }

  // Check for new overdue items
  if (current.overdue > previous.overdue) {
    if (preferences.browserNotifications) {
      notifyOverdueItems(current.overdue);
    }
    if (preferences.soundNotifications) {
      playAlertSound("warning");
    }
  }
}
