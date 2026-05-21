/**
 * Tests for Alert Notification Service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  canShowNotifications,
  checkAndNotifyAlerts,
  type NotificationPreferences,
} from "./alert-notification-service";

describe("Alert Notification Service", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Mock Notification API
    global.Notification = {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    } as any;
  });

  describe("Notification Preferences", () => {
    it("should return default preferences when none are saved", () => {
      const preferences = getNotificationPreferences();
      
      expect(preferences).toEqual({
        browserNotifications: true,
        soundNotifications: false,
        emailDigest: true,
      });
    });

    it("should save and retrieve preferences", () => {
      const preferences: NotificationPreferences = {
        browserNotifications: false,
        soundNotifications: true,
        emailDigest: false,
      };

      saveNotificationPreferences(preferences);
      const retrieved = getNotificationPreferences();

      expect(retrieved).toEqual(preferences);
    });

    it("should handle invalid JSON in localStorage gracefully", () => {
      localStorage.setItem("production_notification_preferences", "invalid json");
      
      const preferences = getNotificationPreferences();
      
      // Should return default preferences
      expect(preferences).toEqual({
        browserNotifications: true,
        soundNotifications: false,
        emailDigest: true,
      });
    });
  });

  describe("Browser Notification Permission", () => {
    it("should return false when Notification API is not supported", () => {
      // @ts-expect-error - Temporarily remove Notification for testing
      delete global.Notification;
      
      const canShow = canShowNotifications();
      
      expect(canShow).toBe(false);
    });

    it("should return true when permission is granted", () => {
      global.Notification = {
        permission: "granted",
      } as any;
      
      const canShow = canShowNotifications();
      
      expect(canShow).toBe(true);
    });

    it("should return false when permission is denied", () => {
      global.Notification = {
        permission: "denied",
      } as any;
      
      const canShow = canShowNotifications();
      
      expect(canShow).toBe(false);
    });
  });

  describe("Alert Monitoring", () => {
    it("should not trigger notifications when metrics are unchanged", () => {
      const currentMetrics = {
        urgent: {
          deadlineCritical: 5,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const previousMetrics = {
        urgent: {
          deadlineCritical: 5,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const preferences: NotificationPreferences = {
        browserNotifications: true,
        soundNotifications: true,
        emailDigest: true,
      };

      // Mock notification functions
      global.Notification = vi.fn() as any;
      global.Notification.permission = "granted";

      checkAndNotifyAlerts(currentMetrics, previousMetrics, preferences);

      // Should not create any notifications
      expect(global.Notification).not.toHaveBeenCalled();
    });

    it("should trigger notification when critical deadline count increases", () => {
      const currentMetrics = {
        urgent: {
          deadlineCritical: 6,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const previousMetrics = {
        urgent: {
          deadlineCritical: 5,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const preferences: NotificationPreferences = {
        browserNotifications: true,
        soundNotifications: false,
        emailDigest: true,
      };

      // Mock Notification constructor
      const mockNotification = vi.fn();
      global.Notification = mockNotification as any;
      global.Notification.permission = "granted";

      checkAndNotifyAlerts(currentMetrics, previousMetrics, preferences);

      // Should create a notification
      expect(mockNotification).toHaveBeenCalledWith(
        expect.stringContaining("Alerta Crítico"),
        expect.objectContaining({
          body: expect.stringContaining("6"),
        })
      );
    });

    it("should not trigger notification when browser notifications are disabled", () => {
      const currentMetrics = {
        urgent: {
          deadlineCritical: 6,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const previousMetrics = {
        urgent: {
          deadlineCritical: 5,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const preferences: NotificationPreferences = {
        browserNotifications: false,
        soundNotifications: false,
        emailDigest: true,
      };

      const mockNotification = vi.fn();
      global.Notification = mockNotification as any;
      global.Notification.permission = "granted";

      checkAndNotifyAlerts(currentMetrics, previousMetrics, preferences);

      // Should not create any notifications
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it("should handle null metrics gracefully", () => {
      const preferences: NotificationPreferences = {
        browserNotifications: true,
        soundNotifications: true,
        emailDigest: true,
      };

      // Should not throw error
      expect(() => {
        checkAndNotifyAlerts(null, null, preferences);
      }).not.toThrow();
    });

    it("should trigger notifications for all alert types when they increase", () => {
      const currentMetrics = {
        urgent: {
          deadlineCritical: 6,
          deadlineUrgent: 4,
          blocked: 3,
          overdue: 2,
        },
      };

      const previousMetrics = {
        urgent: {
          deadlineCritical: 5,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const preferences: NotificationPreferences = {
        browserNotifications: true,
        soundNotifications: false,
        emailDigest: true,
      };

      const mockNotification = vi.fn();
      global.Notification = mockNotification as any;
      global.Notification.permission = "granted";

      checkAndNotifyAlerts(currentMetrics, previousMetrics, preferences);

      // Should create 4 notifications (one for each alert type)
      expect(mockNotification).toHaveBeenCalledTimes(4);
    });
  });

  describe("Notification Content", () => {
    it("should include correct count in notification body", () => {
      const currentMetrics = {
        urgent: {
          deadlineCritical: 10,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const previousMetrics = {
        urgent: {
          deadlineCritical: 5,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const preferences: NotificationPreferences = {
        browserNotifications: true,
        soundNotifications: false,
        emailDigest: true,
      };

      const mockNotification = vi.fn();
      global.Notification = mockNotification as any;
      global.Notification.permission = "granted";

      checkAndNotifyAlerts(currentMetrics, previousMetrics, preferences);

      expect(mockNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("10"),
        })
      );
    });

    it("should use singular form for count of 1", () => {
      const currentMetrics = {
        urgent: {
          deadlineCritical: 1,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const previousMetrics = {
        urgent: {
          deadlineCritical: 0,
          deadlineUrgent: 3,
          blocked: 2,
          overdue: 1,
        },
      };

      const preferences: NotificationPreferences = {
        browserNotifications: true,
        soundNotifications: false,
        emailDigest: true,
      };

      const mockNotification = vi.fn();
      global.Notification = mockNotification as any;
      global.Notification.permission = "granted";

      checkAndNotifyAlerts(currentMetrics, previousMetrics, preferences);

      expect(mockNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("item tem"),
        })
      );
    });
  });
});
