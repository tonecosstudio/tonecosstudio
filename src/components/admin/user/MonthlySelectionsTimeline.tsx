/**
 * Componente para exibir timeline de escolhas de personagens
 * Organizado por status: Aprovados, Pendentes, Rejeitados
 */
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CharacterChoice {
  id: string;
  order_id: string;
  order_type?: string | null;
  status: string;
  character_name?: string | null;
  chosen_at?: string | null;
  deadline?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  collection_characters?: { id: string; name: string; image_url?: string | null } | null;
  collections?: { id: string; name: string } | null;
}

interface MonthlySelectionsTimelineProps {
  selections: CharacterChoice[];
}

export function MonthlySelectionsTimeline({ selections }: MonthlySelectionsTimelineProps) {
  if (selections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma escolha registrada
      </p>
    );
  }

  const approved = selections.filter((s) => s.status === "approved");
  const pending = selections.filter((s) => s.status === "pending" || s.status === "submitted");
  const rejected = selections.filter((s) => s.status === "rejected");

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const renderSelection = (selection: CharacterChoice, statusConfig: any) => (
    <div
      key={selection.id}
      className={`flex items-center justify-between p-3 rounded-lg border ${statusConfig.bgClass}`}
    >
      <div className="flex items-center gap-3 flex-1">
        {selection.collection_characters?.image_url && (
          <div className="flex-shrink-0">
            <img
              src={selection.collection_characters.image_url}
              alt={selection.collection_characters.name}
              className="w-12 h-12 rounded-lg object-cover border-2 border-border"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">
            {selection.collection_characters?.name || selection.character_name || "Personagem"}
          </div>
          <div className="text-xs text-muted-foreground">
            {selection.collections?.name || "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Criado em {formatDate(selection.created_at)}
            {selection.deadline && ` • Prazo: ${formatDate(selection.deadline)}`}
          </div>
          {selection.rejection_reason && (
            <div className="text-xs text-red-600 mt-1">
              Motivo: {selection.rejection_reason}
            </div>
          )}
        </div>
      </div>
      
      <Badge variant="outline" className={statusConfig.badgeClass}>
        {statusConfig.icon}
        {statusConfig.text}
      </Badge>
    </div>
  );

  return (
    <div className="space-y-4">
      {approved.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <h4 className="font-semibold text-sm">Aprovados ({approved.length})</h4>
          </div>
          <div className="space-y-2 ml-6">
            {approved.map((s) =>
              renderSelection(s, {
                bgClass: "bg-green-50 dark:bg-green-950/20",
                badgeClass: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
                icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
                text: "Aprovado",
              })
            )}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-600" />
            <h4 className="font-semibold text-sm">Pendentes ({pending.length})</h4>
          </div>
          <div className="space-y-2 ml-6">
            {pending.map((s) =>
              renderSelection(s, {
                bgClass: "bg-amber-50 dark:bg-amber-950/20",
                badgeClass: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
                icon: <Clock className="h-3 w-3 mr-1" />,
                text: s.status === "submitted" ? "Enviado" : "Pendente",
              })
            )}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-4 w-4 text-red-600" />
            <h4 className="font-semibold text-sm">Rejeitados ({rejected.length})</h4>
          </div>
          <div className="space-y-2 ml-6">
            {rejected.map((s) =>
              renderSelection(s, {
                bgClass: "bg-red-50 dark:bg-red-950/20",
                badgeClass: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
                icon: <XCircle className="h-3 w-3 mr-1" />,
                text: "Rejeitado",
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
