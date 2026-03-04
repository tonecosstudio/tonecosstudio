/**
 * Notification Preferences Component
 * 
 * Allows customers to manage their notification preferences.
 * Customers can opt-out of non-critical notifications.
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Info, RotateCcw } from 'lucide-react';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  resetNotificationPreferences,
} from '@/services/customer/notification-preferences-service';
import type { NotificationPreferences } from '@/types/notification-preferences';
import {
  getNotificationLabel,
  getNotificationDescription,
} from '@/types/notification-preferences';

interface NotificationPreferencesProps {
  /** Optional callback when preferences are updated */
  onUpdate?: (preferences: NotificationPreferences) => void;
}

export function NotificationPreferences({ onUpdate }: NotificationPreferencesProps) {
  const queryClient = useQueryClient();
  const [showInfo, setShowInfo] = useState(false);

  // Fetch current preferences
  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchNotificationPreferences,
  });

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      onUpdate?.(data);
    },
  });

  // Reset preferences mutation
  const resetMutation = useMutation({
    mutationFn: resetNotificationPreferences,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      onUpdate?.(data);
    },
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    
    updateMutation.mutate({
      [key]: !preferences[key],
    });
  };

  const handleReset = () => {
    if (confirm('Reset all notification preferences to defaults?')) {
      resetMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load notification preferences</p>
      </div>
    );
  }

  if (!preferences) {
    return null;
  }

  const preferenceKeys = Object.keys(preferences) as Array<keyof NotificationPreferences>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notification Preferences
          </h2>
          <p className="text-gray-600 mt-1">
            Manage which notifications you want to receive
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              <strong>Important:</strong> Critical notifications (character choice reminders, 
              payment updates, order confirmations, and production delays) cannot be disabled 
              as they contain essential information about your orders.
            </p>
          </div>
        </div>
      </div>

      {/* Preferences List */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {preferenceKeys.map((key) => {
          const isEnabled = preferences[key];
          const label = getNotificationLabel(key);
          const description = getNotificationDescription(key);

          return (
            <div key={key} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isEnabled ? (
                      <Bell className="h-5 w-5 text-blue-600" />
                    ) : (
                      <BellOff className="h-5 w-5 text-gray-400" />
                    )}
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 ml-7">{description}</p>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(key)}
                  disabled={updateMutation.isPending}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full
                    transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isEnabled ? 'bg-blue-600' : 'bg-gray-300'}
                  `}
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={`Toggle ${label}`}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Message */}
      {updateMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            ✓ Notification preferences updated successfully
          </p>
        </div>
      )}

      {updateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            Failed to update preferences. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
