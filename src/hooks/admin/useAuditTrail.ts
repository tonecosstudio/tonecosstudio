import { useQuery } from "@tanstack/react-query";
import {
  getAllCollectionChanges,
  searchCollectionChangesBySubscriber,
  type AuditRecord,
} from "@/services/audit-trail-service";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limiter";

export interface AuditTrailFilters {
  limit: number;
  offset: number;
  changeReason?: string;
  startDate?: string;
  endDate?: string;
}

export type { AuditRecord };

export function useAuditTrailRecords(filters: AuditTrailFilters) {
  return useQuery({
    queryKey: [
      "audit-trail",
      filters.changeReason ?? "all",
      filters.startDate ?? "",
      filters.endDate ?? "",
      filters.limit,
      filters.offset,
    ],
    queryFn: () => getAllCollectionChanges(filters),
  });
}

export function useAuditTrailSearch(
  searchTerm: string,
  limit: number,
  onRateLimit: (retryAfter: number) => void
) {
  return useQuery({
    queryKey: ["audit-trail-search", searchTerm, limit],
    enabled: searchTerm.length >= 3,
    queryFn: () => {
      const rateLimit = checkRateLimit("search-audit-trail", RATE_LIMITS.search);
      if (!rateLimit.allowed) {
        onRateLimit(rateLimit.retryAfter);
        throw new Error("Rate limit exceeded");
      }

      return searchCollectionChangesBySubscriber(searchTerm, limit);
    },
  });
}
