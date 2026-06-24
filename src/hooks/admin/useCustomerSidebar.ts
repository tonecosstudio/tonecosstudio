import { useCallback, useEffect, useState } from "react";
import {
  getCustomerSidebarData,
  type CustomerSidebarData,
} from "@/services/admin/customers/customer-sidebar-service";
import { log } from "@/lib/logger";

export type {
  CustomerProfile,
  CustomerSidebarData,
  CustomerSidebarOrder,
  CustomerSidebarPayment,
  CustomerSidebarQuote,
  CustomerSidebarSubscription,
} from "@/services/admin/customers/customer-sidebar-service";

export function useCustomerSidebar(userId: string, isOpen: boolean) {
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<CustomerSidebarData | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadCustomerData = useCallback(async () => {
    if (!userId) {
      setContext(null);
      setHasLoaded(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getCustomerSidebarData(userId);
      setContext(data);
      setHasLoaded(true);
    } catch (error) {
      log.error("Error loading customer data", { error, userId });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      void loadCustomerData();
    }
  }, [isOpen, userId, loadCustomerData]);

  return {
    context,
    loading,
    hasLoaded,
    loadCustomerData,
  };
}
