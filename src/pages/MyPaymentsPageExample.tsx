/**
 * MyPaymentsPage Example
 * 
 * Example usage of the MyPaymentsPage component.
 * This file demonstrates how to integrate the component into the application.
 */

import React from 'react';
import { AppShell } from '@/components/AppShell';
import MyPaymentsPage from './MyPaymentsPage';

/**
 * Example wrapper for MyPaymentsPage that includes the application shell.
 * This is how the page would typically be used in the application.
 */
export function MyPaymentsPageExample() {
  return (
    <AppShell>
      <MyPaymentsPage />
    </AppShell>
  );
}

/**
 * Standalone example for testing or demonstration purposes.
 * This version doesn't include the full app shell.
 */
export function MyPaymentsPageStandaloneExample() {
  return <MyPaymentsPage />;
}

export default MyPaymentsPageExample;