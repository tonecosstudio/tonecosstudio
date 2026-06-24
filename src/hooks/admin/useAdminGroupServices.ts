import { groupService } from "@/services/groups/group-service";
import { metricsService } from "@/services/groups/group-metrics-service";

export function useAdminGroupServices() {
  return {
    groupService,
    metricsService,
  };
}
