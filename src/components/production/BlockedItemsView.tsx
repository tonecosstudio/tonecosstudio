// @ts-nocheck
/**
 * BlockedItemsView Component
 *
 * Displays all blocked production items in a dedicated view.
 * Features:
 * - Display all blocked items
 * - Show block reason and duration
 * - Add "Unblock" button
 * - Sort by longest blocked first
 *
 * Integrates with production-service.ts and UnblockProductionModal
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, CheckCircle2, Package } from "lucide-react";
import { fetchProductionQueue } from "@/services/admin/production-service";
import { UnblockProductionModal } from "./UnblockProductionModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Types
// ============================================================================

interface BlockedItem {
  id: string;
  customerName: string;
  customerEmail: string;
  collectionName: string;
  characterName: string | null;
  currentStage: string;
  blockReason: string;
  blockedAt: string;
  blockedDurationHours: number;
  assignedToName: string | null;
  priority: string;
}

interface BlockedItemsViewProps {
  // No props - fetches data internally
}

// ============================================================================
// Component
// ============================================================================

export const BlockedItemsView: React.FC<BlockedItemsViewProps> = () => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);

  // Fetch blocked items
  const { data: blockedItems, isLoading, refetch } = useQuery({
    queryKey: ["blocked-items"],
    queryFn: async (): Promise<BlockedItem[]> => {
      // Fetch production queue items with status 'on_hold'
      const queueResponse = await fetchProductionQueue(
        { statuses: ["on_hold"] },
        { page: 1, pageSize: 1000 }
      );

      // For each blocked item, fetch stage information to get block reason and blocked_at
      const blockedItemsPromises = queueResponse.data.map(async (item) => {
        const { data: stageData } = await supabase
          .from("production_stages")
          .select("block_reason, blocked_at")
          .eq("production_queue_id", item.id)
          .eq("stage_name", item.currentStage)
          .eq("is_blocked", true)
          .single();

        const blockedAt = stageData?.blocked_at || new Date().toISOString();
        const blockedDurationMs = new Date().getTime() - new Date(blockedAt).getTime();
        const blockedDurationHours = blockedDurationMs / (1000 * 60 * 60);

        return {
          id: item.id,
          customerName: item.customerName,
          customerEmail: item.customerEmail,
          collectionName: item.collectionName,
          characterName: item.characterName,
          currentStage: item.currentStage,
          blockReason: stageData?.block_reason || item.productionNotes || "Motivo não especificado",
          blockedAt,
          blockedDurationHours,
          assignedToName: item.assignedToName,
          priority: item.priority,
        };
      });

      const blockedItems = await Promise.all(blockedItemsPromises);

      // Sort by longest blocked first (descending duration)
      return blockedItems.sort((a, b) => b.blockedDurationHours - a.blockedDurationHours);
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Handle unblock button click
  const handleUnblockClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsUnblockModalOpen(true);
  };

  // Handle unblock success
  const handleUnblockSuccess = () => {
    refetch();
  };

  // Format stage name
  const formatStageName = (stage: string): string => {
    const stageLabels: Record<string, string> = {
      awaiting_choice: "Aguardando Escolha",
      design: "Design",
      production: "Produção",
      quality_check: "Controle de Qualidade",
      packaging: "Embalagem",
      shipped: "Enviado",
    };
    return stageLabels[stage] || stage;
  };

  // Format duration
  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutos`;
    } else if (hours < 24) {
      return `${Math.round(hours)} horas`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0
        ? `${days} ${days === 1 ? "dia" : "dias"} e ${remainingHours} ${remainingHours === 1 ? "hora" : "horas"}`
        : `${days} ${days === 1 ? "dia" : "dias"}`;
    }
  };

  // Format date
  const formatDate = (date: string): string => {
    try {
      return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      critical: "bg-red-500 text-white",
      high: "bg-orange-500 text-white",
      normal: "bg-blue-500 text-white",
      low: "bg-gray-500 text-white",
    };
    return colors[priority] || colors.normal;
  };

  // Loading state
  if (isLoading) {
    return <BlockedItemsViewSkeleton />;
  }

  // Empty state
  if (!blockedItems || blockedItems.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-green-50 dark:bg-green-950/20">
        <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 dark:text-green-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-400">
          Nenhum Item Bloqueado
        </h3>
        <p className="text-muted-foreground">
          Ótimo! Não há itens de produção bloqueados no momento.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-semibold">Itens Bloqueados</h2>
            <Badge variant="destructive" className="ml-2">
              {blockedItems.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Ordenado por tempo bloqueado (maior primeiro)
          </p>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Coleção</TableHead>
                <TableHead>Personagem</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Motivo do Bloqueio</TableHead>
                <TableHead>Bloqueado em</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.customerName}</span>
                      <span className="text-xs text-muted-foreground">{item.customerEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.collectionName}</TableCell>
                  <TableCell>{item.characterName || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatStageName(item.currentStage)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(item.priority)}>
                      {item.priority.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm line-clamp-2" title={item.blockReason}>
                        {item.blockReason}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatDate(item.blockedAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.blockedDurationHours > 48
                          ? "border-red-500 text-red-700 dark:text-red-400"
                          : item.blockedDurationHours > 24
                          ? "border-orange-500 text-orange-700 dark:text-orange-400"
                          : ""
                      }
                    >
                      {formatDuration(item.blockedDurationHours)}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.assignedToName || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleUnblockClick(item.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Desbloquear
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Unblock Modal */}
      {selectedItemId && (
        <UnblockProductionModal
          isOpen={isUnblockModalOpen}
          onOpenChange={setIsUnblockModalOpen}
          productionQueueId={selectedItemId}
          onUnblock={handleUnblockSuccess}
        />
      )}
    </>
  );
};

// ============================================================================
// Skeleton Component
// ============================================================================

function BlockedItemsViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-8" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Coleção</TableHead>
              <TableHead>Personagem</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Motivo do Bloqueio</TableHead>
              <TableHead>Bloqueado em</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-28 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default BlockedItemsView;
