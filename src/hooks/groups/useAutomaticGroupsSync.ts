import { useState } from "react";
import { toast } from "sonner";
import { log } from "@/lib/logger";
import { syncAllAutomaticGroups } from "@/services/groups/group-management-service";

export function useAutomaticGroupsSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const syncAll = async () => {
    setSyncing(true);

    try {
      await syncAllAutomaticGroups();
      setLastSync(new Date());
      toast.success("Todos os grupos foram sincronizados com sucesso!");
    } catch (error) {
      log.error("Erro ao sincronizar grupos automaticos", { error });
      toast.error("Erro ao sincronizar grupos.");
    } finally {
      setSyncing(false);
    }
  };

  return { syncAll, syncing, lastSync };
}
