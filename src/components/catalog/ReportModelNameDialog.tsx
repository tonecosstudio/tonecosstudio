import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Flag, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { createSupportConversationRpc } from "@/services/support/support-conversation-mutations-service";
import { CONTACT } from "@/config/constants";
import { loginReturnToPath } from "@/config/routes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ReportModelNameDialogProps = {
  modelId: string;
  displayedName: string;
  sourceTitle?: string | null;
  detailPath: string;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  compact?: boolean;
};

function normalizeInput(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function ReportModelNameDialog({
  modelId,
  displayedName,
  sourceTitle,
  detailPath,
  triggerLabel = "Reportar nome",
  triggerClassName,
  triggerVariant = "outline",
  compact = false,
}: ReportModelNameDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [suggestedName, setSuggestedName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnTo = useMemo(() => {
    if (detailPath.startsWith("/")) return detailPath;
    return `${location.pathname}${location.search}`;
  }, [detailPath, location.pathname, location.search]);

  const reportUrl = useMemo(() => {
    if (!detailPath.startsWith("/")) return detailPath;
    const origin = CONTACT.WEBSITE_URL || window.location.origin;
    return `${origin}${detailPath}`;
  }, [detailPath]);

  const handleSubmit = async () => {
    const cleanSuggestedName = normalizeInput(suggestedName);
    const cleanNotes = normalizeInput(notes);

    if (!cleanSuggestedName) {
      toast({
        title: "Informe o nome correto",
        description: "Preencha o nome que deveria aparecer neste modelo.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Faça login para reportar",
        description: "Você será redirecionado e voltará para este item.",
      });
      navigate(loginReturnToPath(returnTo));
      return;
    }

    setIsSubmitting(true);

    try {
      await createSupportConversationRpc({
        userId: user.id,
        subject: `Revisao de nome no universo: ${displayedName}`.slice(0, 120),
        status: "waiting_admin",
        priority: "normal",
        tags: ["duvida"],
        firstMessage: [
          "Reporte de nome incorreto no Universo.",
          `Modelo exibido: ${displayedName}`,
          `Nome correto sugerido: ${cleanSuggestedName}`,
          `ID do modelo: ${modelId}`,
          sourceTitle ? `Origem/franquia: ${sourceTitle}` : null,
          `Link do item: ${reportUrl}`,
          cleanNotes ? `Observacoes do usuario: ${cleanNotes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      toast({
        title: "Reporte enviado",
        description: "Nossa equipe vai revisar o nome deste personagem.",
      });
      setSuggestedName("");
      setNotes("");
      setOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao enviar reporte",
        description:
          error instanceof Error
            ? error.message
            : "Nao foi possivel registrar seu reporte agora.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          className={triggerClassName}
        >
          <Flag className={compact ? "h-3.5 w-3.5" : "mr-2 h-4 w-4"} />
          {!compact && triggerLabel}
          {compact && <span className="sr-only">{triggerLabel}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reportar nome incorreto</DialogTitle>
          <DialogDescription>
            Use esta opcao para avisar quando o personagem estiver identificado
            com o nome errado no Universo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-[hsl(var(--gold-accent)/0.25)] bg-[hsl(var(--gold-accent)/0.06)] p-3 text-xs text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--gold-accent))]" />
              Nome atual
            </div>
            <p>{displayedName}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`report-correct-name-${modelId}`}>Nome correto</Label>
            <Input
              id={`report-correct-name-${modelId}`}
              value={suggestedName}
              onChange={(event) => setSuggestedName(event.target.value)}
              placeholder="Ex.: Harley Quinn"
              maxLength={120}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`report-name-notes-${modelId}`}>
              Observacao opcional
            </Label>
            <Textarea
              id={`report-name-notes-${modelId}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: esta imagem e da personagem Blonde Blazer, do jogo Dispatch."
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando
              </>
            ) : (
              "Enviar reporte"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
