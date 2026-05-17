import { groupService } from "@/lib/services/groupService";
import { metricsService } from "@/lib/services/metricsService";

export function useAdminGroupServices() {
  return {
    groupService,
    metricsService,
  };
}
