import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  analyzeTierMigration,
  executeTierMigration,
  getMigrationAudit,
  listMigrationAudits,
} from "@/services/system/migration-service";
import type {
  MigrateToTiersInput,
  MigrationResult,
  MigrationSuggestion,
} from "@/types/pricing-tiers";
import { pricingTiersKeys } from "./usePricingTiers";
import { collectionTierKeys } from "./useCollectionTierAssignment";

export const migrationKeys = {
  all: ["migration"] as const,
  audits: () => [...migrationKeys.all, "audits"] as const,
  audit: (id: string) => [...migrationKeys.all, "audit", id] as const,
  analysis: () => [...migrationKeys.all, "analysis"] as const,
};

export function useMigrationAudits() {
  return useQuery({
    queryKey: migrationKeys.audits(),
    queryFn: listMigrationAudits,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMigrationAudit(auditId: string | null | undefined) {
  return useQuery({
    queryKey: migrationKeys.audit(auditId || ""),
    queryFn: async () => {
      if (!auditId) return null;
      return getMigrationAudit(auditId);
    },
    enabled: !!auditId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyzeMigration() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: analyzeTierMigration,
    onError: (error: Error) => {
      toast({
        title: "Erro na analise",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useExecuteMigration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (input: MigrateToTiersInput) => {
      return executeTierMigration(input, setProgress);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.all });
      queryClient.invalidateQueries({ queryKey: migrationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      if ("dryRun" in result && result.dryRun) {
        toast({
          title: "Analise concluida",
          description: `${result.suggestions.length} grupos de precos encontrados.`,
        });
      } else if ("tiersCreated" in result) {
        const message =
          result.errors.length > 0
            ? `${result.tiersCreated} niveis criados, ${result.collectionsAssigned} colecoes atribuidas. ${result.errors.length} erros.`
            : `${result.tiersCreated} niveis criados, ${result.collectionsAssigned} colecoes atribuidas com sucesso.`;

        toast({
          title: "Migracao concluida",
          description: message,
          variant: result.errors.length > 0 ? "destructive" : "default",
        });
      }

      setProgress(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na migracao",
        description: error.message,
        variant: "destructive",
      });
      setProgress(0);
    },
  });

  return {
    ...mutation,
    progress,
  };
}

export function useMigrationWizard() {
  const [currentStep, setCurrentStep] = useState<
    "idle" | "analyzing" | "confirming" | "executing" | "completed"
  >("idle");
  const [suggestions, setSuggestions] = useState<MigrationSuggestion[]>([]);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const analyzeMutation = useAnalyzeMigration();
  const executeMutation = useExecuteMigration();

  const startAnalysis = async () => {
    setCurrentStep("analyzing");
    try {
      const data = await analyzeMutation.mutateAsync();
      setSuggestions(data);
      setCurrentStep("confirming");
    } catch {
      setCurrentStep("idle");
    }
  };

  const executeMigration = async (autoCreateTiers: boolean = true) => {
    setCurrentStep("executing");
    try {
      const data = await executeMutation.mutateAsync({
        dryRun: false,
        autoCreateTiers,
      });
      setResult(data);
      setCurrentStep("completed");
    } catch {
      setCurrentStep("confirming");
    }
  };

  const reset = () => {
    setCurrentStep("idle");
    setSuggestions([]);
    setResult(null);
  };

  return {
    currentStep,
    suggestions,
    result,
    isAnalyzing: analyzeMutation.isPending,
    isExecuting: executeMutation.isPending,
    startAnalysis,
    executeMigration,
    reset,
  };
}
