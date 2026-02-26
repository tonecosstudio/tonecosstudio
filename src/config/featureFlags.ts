/**
 * Feature Flags Configuration
 * 
 * Controla a ativação/desativação de features no sistema
 */

import React from 'react';

export interface FeatureFlags {
  // Premium Club v2.0
  premiumClubV2: boolean;
  premiumClubCycles: boolean;
  premiumClubDeliveries: boolean;
  premiumClubBonusPieces: boolean;
  
  // Legacy Features
  legacySubscriptionModel: boolean;
  collectionPricing: boolean;
  
  // Admin Features
  adminCycleManagement: boolean;
  adminHolidayManagement: boolean;
  adminCapacityManagement: boolean;
  
  // User Features
  userCharacterChanges: boolean;
  userCollectionChanges: boolean;
  userDeliveryTracking: boolean;
}

// Default feature flags
const defaultFlags: FeatureFlags = {
  // Premium Club v2.0 - Ativado
  premiumClubV2: true,
  premiumClubCycles: true,
  premiumClubDeliveries: true,
  premiumClubBonusPieces: true,
  
  // Legacy Features - Mantido para compatibilidade
  legacySubscriptionModel: true,
  collectionPricing: false, // Desativado no novo modelo
  
  // Admin Features - Ativado
  adminCycleManagement: true,
  adminHolidayManagement: true,
  adminCapacityManagement: true,
  
  // User Features - Ativado
  userCharacterChanges: true,
  userCollectionChanges: true,
  userDeliveryTracking: true,
};

// Environment-based overrides
const getEnvironmentFlags = (): Partial<FeatureFlags> => {
  const env = import.meta.env.MODE;
  
  switch (env) {
    case 'development':
      return {
        // Todas as features ativadas em desenvolvimento
      };
    
    case 'staging':
      return {
        // Features em teste
        premiumClubV2: true,
      };
    
    case 'production':
      return {
        // Features estáveis em produção
        premiumClubV2: true,
        legacySubscriptionModel: true,
      };
    
    default:
      return {};
  }
};

// Merge default flags with environment overrides
export const featureFlags: FeatureFlags = {
  ...defaultFlags,
  ...getEnvironmentFlags(),
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags[feature];
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): (keyof FeatureFlags)[] {
  return Object.entries(featureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature as keyof FeatureFlags);
}

/**
 * Get all disabled features
 */
export function getDisabledFeatures(): (keyof FeatureFlags)[] {
  return Object.entries(featureFlags)
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature as keyof FeatureFlags);
}

/**
 * Hook to use feature flags in components
 */
export function useFeatureFlag(feature: keyof FeatureFlags): boolean {
  return isFeatureEnabled(feature);
}

/**
 * Component wrapper for conditional feature rendering
 */
interface FeatureGateProps {
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const enabled = isFeatureEnabled(feature);
  
  if (enabled) {
    return children;
  }
  
  return fallback;
}
