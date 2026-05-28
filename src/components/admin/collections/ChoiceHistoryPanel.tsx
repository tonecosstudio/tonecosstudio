/**
 * Choice History Panel
 *
 * Component for displaying the complete history of character choice changes for an order.
 * Features:
 * - Display all choice changes for an order chronologically
 * - Show timestamps for each change
 * - Show reasons for changes (if provided)
 * - Show who approved/rejected each choice
 * - Add timeline visualization with icons for different events
 */

import { useChoiceHistory } from "@/hooks/admin/useChoiceHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  MessageSquare,
  RefreshCw,
  Lock,
  Send,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChoiceHistoryPanelProps {
  orderId: string;
}

// Map status to icon and color
const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: "Pendente",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    variant: "secondary" as const,
  },
  submitted: {
    icon: Send,
    label: "Submetido",
    color: "text-blue-500",
    bgColor: "bg-blue-100",
    variant: "default" as const,
  },
  approved: {
    icon: CheckCircle,
    label: "Aprovado",
    color: "text-green-500",
    bgColor: "bg-green-100",
    variant: "default" as const,
  },
  rejected: {
    icon: XCircle,
    label: "Rejeitado",
    color: "text-red-500",
    bgColor: "bg-red-100",
    variant: "destructive" as const,
  },
  locked: {
    icon: Lock,
    label: "Bloqueado",
    color: "text-purple-500",
    bgColor: "bg-purple-100",
    variant: "outline" as const,
  },
  expired: {
    icon: AlertCircle,
    label: "Expirado",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    variant: "destructive" as const,
  },
};

export function ChoiceHistoryPanel({ orderId }: ChoiceHistoryPanelProps) {
  // Fetch choice history
  const { data: history, isLoading, error } = useChoiceHistory(orderId);

  // Format timestamp
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return "—";

    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return "—";
    }
  };

  // Format full date
  const formatFullDate = (timestamp: string | null): string => {
    if (!timestamp) return "—";

    try {
      const date = new Date(timestamp);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Escolhas</CardTitle>
          <CardDescription>Carregando histórico...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Escolhas</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar histórico: {error instanceof Error ? error.message : "Erro desconhecido"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Escolhas</CardTitle>
          <CardDescription>Nenhuma escolha registrada para este pedido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-500">
              O histórico de escolhas aparecerá aqui quando o cliente fizer uma seleção.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Escolhas</CardTitle>
        <CardDescription>
          {history.length} {history.length === 1 ? "registro" : "registros"} encontrado
          {history.length === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Timeline items */}
          <div className="space-y-6">
            {history.map((choice, index) => {
              const config = STATUS_CONFIG[choice.status];
              const Icon = config.icon;
              const isLatest = index === 0;

              return (
                <div key={choice.id} className="relative flex gap-4">
                  {/* Timeline icon */}
                  <div
                    className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ${config.bgColor} ${config.color} ring-4 ring-white`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="rounded-lg border bg-white p-4 shadow-sm">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={config.variant}>{config.label}</Badge>
                            {isLatest && (
                              <Badge variant="outline" className="text-xs">
                                Atual
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {choice.characterName || (
                              <span className="text-gray-400 italic">Nenhum personagem escolhido</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{formatTimestamp(choice.createdAt)}</p>
                          <p className="text-xs text-gray-400">{formatFullDate(choice.createdAt)}</p>
                        </div>
                      </div>

                      {/* Character image (if available) */}
                      {choice.characterImageUrl && (
                        <div className="mb-3">
                          <img
                            src={choice.characterImageUrl}
                            alt={choice.characterName || "Character"}
                            className="h-24 w-24 rounded-lg object-cover border"
                          />
                        </div>
                      )}

                      {/* Details */}
                      <div className="space-y-2 text-sm">
                        {/* Submitted timestamp */}
                        {choice.submittedAt && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Send className="h-4 w-4" />
                            <span>Submetido: {formatFullDate(choice.submittedAt)}</span>
                          </div>
                        )}

                        {/* Approved info */}
                        {choice.status === "approved" && choice.approvedAt && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>
                              Aprovado por{" "}
                              <span className="font-medium">{choice.approvedByName || "Admin"}</span>{" "}
                              em {formatFullDate(choice.approvedAt)}
                            </span>
                          </div>
                        )}

                        {/* Rejected info */}
                        {choice.status === "rejected" && choice.rejectedAt && (
                          <>
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span>Rejeitado em {formatFullDate(choice.rejectedAt)}</span>
                            </div>
                            {choice.rejectionReason && (
                              <div className="flex items-start gap-2 text-gray-700 bg-red-50 p-3 rounded-md">
                                <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-medium text-red-900 mb-1">
                                    Motivo da rejeição:
                                  </p>
                                  <p className="text-sm">{choice.rejectionReason}</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Change reason */}
                        {choice.changeReason && (
                          <div className="flex items-start gap-2 text-gray-700 bg-blue-50 p-3 rounded-md">
                            <RefreshCw className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-blue-900 mb-1">
                                Motivo da alteração:
                              </p>
                              <p className="text-sm">{choice.changeReason}</p>
                            </div>
                          </div>
                        )}

                        {/* Change count */}
                        {choice.changeCount > 0 && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <RefreshCw className="h-4 w-4" />
                            <span>
                              Alteração #{choice.changeCount} (máximo: 3)
                            </span>
                          </div>
                        )}

                        {/* Deadline */}
                        {choice.deadline && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>Prazo: {formatFullDate(choice.deadline)}</span>
                          </div>
                        )}

                        {/* Customer info */}
                        <div className="flex items-center gap-2 text-gray-500 pt-2 border-t">
                          <User className="h-4 w-4" />
                          <span>
                            Cliente: {choice.customerName} ({choice.customerEmail})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
