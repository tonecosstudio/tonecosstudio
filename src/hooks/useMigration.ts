/**
 * Hook para gerenciar migração para o sistema de níveis
 * 
 * Fornece mutations para análise (dry run) e execução de migração
 * de coleções para o sistema de níveis de preço.
 * Requisitos: 5.1, 5.2, 5.4
 * Tarefa: 8.4
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  MigrateToTiersInput,
  MigrationResult,
  MigrationSuggestion,
  MigrationAudit,
} from "@/types/pricing-tiers";
import { migrateToTiersSchema } from "@/lib/validations/pricing-tiers";
import { pricingTiersKeys } from "./usePricingTiers";
import { collectionTierKeys } from "./useCollectionTierAssignment";

// =====================================================
// QUERY KEYS
// =====================================================

export const migrationKeys = {
  all: ["migration"] as const,
  audits: () => [...migrationKeys.all, "audits"] as const,
  audit: (id: string) => [...migrationKeys.all, "audit", id] as const,
  analysis: () => [...migrationKeys.all, "analysis"] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar histórico de migrações
 * Requisitos: 5.7
 */
export function useMigrationAudits() {
  return useQuery({
    queryKey: migrationKeys.audits(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("migration_audit")
        .select(`
          *,
          profiles:executed_by (
            id,
            full_name,
            email
          )
        `)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) {
        throw new Error(`Erro ao buscar histórico de migrações: ${error.message}`);
      }

      return data as (MigrationAudit & {
        profiles: {
          id: string;
          full_name: string;
          email: string;
        };
      })[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar uma auditoria de migração específica
 * Requisitos: 5.7
 */
export function useMigrationAudit(auditId: string | null | undefined) {
  return useQuery({
    queryKey: migrationKeys.audit(auditId || ""),
    queryFn: async () => {
      if (!auditId) return null;

      const { data, error } = await supabase
        .from("migration_audit")
        .select(`
          *,
          profiles:executed_by (
            id,
            full_name,
            email
          )
        `)
        .eq("id", auditId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar auditoria: ${error.message}`);
      }

      return data as MigrationAudit & {
        profiles: {
          id: string;
          full_name: string;
          email: string;
        };
      };
    },
    enabled: !!auditId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para análise de migração (dry run)
 * Requisitos: 5.1, 5.2, 5.3
 */
export function useAnalyzeMigration() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Obter token de autenticação
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // Chamar Edge Function em modo dry run
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-to-tiers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            dryRun: true,
            autoCreateTiers: true,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao analisar migração");
      }

      const result = await response.json();
      return result.suggestions as MigrationSuggestion[];
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para executar migração
 * Requisitos: 5.1, 5.4, 5.5, 5.6
 */
export function useExecuteMigration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);

  return useMutation({
    mutationFn: async (input: MigrateToTiersInput) => {
      // Validar input
      const validated = migrateToTiersSchema.parse(input);

      // Obter token de autenticação
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      setProgress(10);

      // Chamar Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-to-tiers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            dryRun: validated.dryRun,
            autoCreateTiers: validated.autoCreateTiers,
          }),
        }
      );

      setProgress(50);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao executar migração");
      }

      const result = await response.json();
      setProgress(100);

      return result as MigrationResult;
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.all });
      queryClient.invalidateQueries({ queryKey: migrationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      if ("dryRun" in result && result.dryRun) {
        toast({
          title: "Análise concluída",
          description: `${result.suggestions.length} grupos de preços encontrados.`,
        });
      } else if ("tiersCreated" in result) {
        const message =
          result.errors.length > 0
            ? `${result.tiersCreated} níveis criados, ${result.collectionsAssigned} coleções atribuídas. ${result.errors.length} erros.`
            : `${result.tiersCreated} níveis criados, ${result.collectionsAssigned} coleções atribuídas com sucesso.`;

        toast({
          title: "Migração concluída",
          description: message,
          variant: result.errors.length > 0 ? "destructive" : "default",
        });
      }

      setProgress(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na migração",
        description: error.message,
        variant: "destructive",
      });
      setProgress(0);
    },
  });
}

/**
 * Hook customizado que combina análise e execução com estado de progresso
 * Requisitos: 5.1, 5.4
 */
export function useMigrationWizard() {
  const [currentStep, setCurrentStep] = useState<"idle" | "analyzing" | "confirming" | "executing" | "completed">("idle");
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
    } catch (error) {
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
    } catch (error) {
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
