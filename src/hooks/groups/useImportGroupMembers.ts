import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  importGroupMembersFromCsv,
  type ImportGroupMembersResult,
} from "@/services/groups/group-management-service";

export function useImportGroupMembers(groupId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportGroupMembersResult | null>(null);

  const importMembers = async (file: File) => {
    if (!user) return;

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const importResult = await importGroupMembersFromCsv({
        groupId,
        importedBy: user.id,
        file,
        onProgress: setProgress,
      });

      setResult(importResult);
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-metrics", groupId] });

      if (importResult.success > 0) {
        toast.success(`${importResult.success} membros importados com sucesso`);
      }

      if (importResult.failed > 0) {
        toast.warning(`${importResult.failed} membros nao puderam ser importados`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar membros");
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const resetImport = () => {
    setResult(null);
    setProgress(0);
  };

  return {
    importMembers,
    importing,
    progress,
    result,
    resetImport,
  };
}
