import { useMemo, useState } from "react";
import { AlertCircle, Check, Copy, MessageSquare, Shield } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TemplateScope = "oficial" | "publico" | "direto" | "objecao";
type TemplateSeverity = "high" | "medium";

type TemplateDefinition = {
  id: string;
  title: string;
  description: string;
  scope: TemplateScope;
  category: string;
  severity: TemplateSeverity;
  content: string;
  shortcut?: string;
  notes?: string[];
  warnings?: string[];
  steps?: string[];
};

const templateCatalog: TemplateDefinition[] = [
  {
    id: "official-transition",
    title: "Comunicado oficial",
    description: "Texto base para posicionamento publico sobre regularizacao de pedidos pendentes.",
    scope: "oficial",
    category: "Comunicado institucional",
    severity: "high",
    content: `Comunicado importante aos clientes

Reconhecemos que parte dos pedidos realizados em anos anteriores ainda nao foi concluida. Sabemos que isso gerou frustracao, desgaste e quebra de expectativa.

Para organizar a regularizacao desses casos, estruturamos a Ordax como sistema de acompanhamento, registro e comunicacao. O objetivo e dar visibilidade, padrao operacional e historico documentado ao tratamento de cada pedido.

Clientes com pedidos pendentes poderao acompanhar o caso pelo sistema e receber orientacoes claras sobre os proximos passos.

A responsabilidade pelos pedidos anteriores permanece com a operacao original. A Ordax atua como camada de organizacao e atendimento.`,
    notes: [
      "Use somente em comunicacoes publicas oficiais.",
      "Nao adapte o sentido do texto sem alinhamento interno.",
    ],
  },
  {
    id: "public-complaint",
    title: "Resposta publica curta",
    description: "Resposta de contencao para comentario publico, feed ou comunidade.",
    scope: "publico",
    category: "Exposicao publica",
    severity: "high",
    shortcut: "Ctrl+2",
    content: `Ola, registramos seu contato para analise interna. Estamos organizando os atendimentos e seguiremos com a apuracao do caso pelos canais adequados. Obrigado pela sinalizacao.`,
    warnings: [
      "Nao discutir valores em publico.",
      "Nao informar prazos sem validacao operacional.",
      "Nao prometer compensacao no comentario publico.",
      "Encaminhar o caso para canal privado assim que possivel.",
    ],
    steps: [
      "Responder com texto curto e neutro.",
      "Registrar o caso no atendimento.",
      "Continuar a tratativa em canal privado.",
    ],
  },
  {
    id: "direct-first-contact",
    title: "Primeiro contato direto",
    description: "Mensagem base para cliente com pedido antigo ou situacao pendente.",
    scope: "direto",
    category: "Contato individual",
    severity: "medium",
    content: `Ola, tudo bem?

Estamos entrando em contato porque seu caso esta em processo de organizacao e regularizacao.

Para centralizar o acompanhamento com registro claro, utilizamos a plataforma Ordax como apoio operacional. Assim conseguimos manter historico, contexto e proximos passos documentados.

Assim que o cadastro estiver concluido, nossa equipe segue com a analise do seu atendimento.`,
    notes: [
      "Use em WhatsApp, email ou mensagem privada.",
      "Troque a abertura pelo nome real do cliente quando fizer sentido.",
    ],
  },
  {
    id: "direct-defensive",
    title: "Resposta defensiva na plataforma",
    description: "Mensagem neutra para cliente antigo quando ainda nao existe definicao operacional.",
    scope: "direto",
    category: "Contato individual",
    severity: "medium",
    shortcut: "Ctrl+1",
    content: `Ola [Nome], recebemos sua mensagem e registramos o caso para analise interna.

Neste momento, estamos consolidando o historico e validando a situacao para responder com precisao. Assim que houver posicionamento confirmado, a equipe segue com o retorno pelos canais do atendimento.`,
    warnings: [
      "Nao abrir novos compromissos.",
      "Nao prometer data sem confirmacao real.",
      "Manter tom respeitoso e objetivo.",
    ],
  },
  {
    id: "brand-objection",
    title: 'Resposta para a objecao "mudaram o nome para fugir"',
    description: "Posicionamento direto para uma objecao recorrente sobre marca e responsabilidade.",
    scope: "objecao",
    category: "Objecao sensivel",
    severity: "high",
    content: `Nao. A estrutura atual existe para organizar atendimento, registro e acompanhamento com mais controle. Isso nao elimina responsabilidades anteriores nem substitui a necessidade de tratamento adequado dos casos pendentes.`,
    notes: [
      "Use somente quando a objecao aparecer de forma explicita.",
      "Evite prolongar discussao publica depois da resposta base.",
    ],
  },
];

const tabDefinitions: Array<{ value: "all" | TemplateScope; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "oficial", label: "Oficial" },
  { value: "publico", label: "Publico" },
  { value: "direto", label: "Direto" },
  { value: "objecao", label: "Objecoes" },
];

const severityBadgeVariant: Record<TemplateSeverity, "default" | "destructive"> = {
  medium: "default",
  high: "destructive",
};

function getSeverityIcon(severity: TemplateSeverity) {
  return severity === "high" ? (
    <AlertCircle className="h-4 w-4" />
  ) : (
    <MessageSquare className="h-4 w-4" />
  );
}

function TemplateCard({
  template,
  copiedId,
  onCopy,
}: {
  template: TemplateDefinition;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getSeverityIcon(template.severity)}
              <CardTitle className="text-xl">{template.title}</CardTitle>
            </div>
            <CardDescription>{template.description}</CardDescription>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityBadgeVariant[template.severity]}>{template.category}</Badge>
              {template.shortcut && <Badge variant="outline">Atalho: {template.shortcut}</Badge>}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onCopy(template.content, template.id)}
            className="shrink-0"
          >
            {copiedId === template.id ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 font-mono text-sm whitespace-pre-wrap">
          {template.content}
        </div>

        {template.notes && template.notes.length > 0 && (
          <ContextBlock title="Orientacoes" tone="neutral" items={template.notes} />
        )}

        {template.warnings && template.warnings.length > 0 && (
          <ContextBlock title="Pontos de atencao" tone="critical" items={template.warnings} />
        )}

        {template.steps && template.steps.length > 0 && (
          <ContextBlock title="Fluxo recomendado" tone="positive" items={template.steps} ordered />
        )}
      </CardContent>
    </Card>
  );
}

function ContextBlock({
  title,
  items,
  tone,
  ordered = false,
}: {
  title: string;
  items: string[];
  tone: "neutral" | "critical" | "positive";
  ordered?: boolean;
}) {
  const toneClasses = {
    neutral: "border-border bg-muted/20",
    critical: "border-destructive/30 bg-destructive/5",
    positive: "border-primary/20 bg-primary/5",
  } as const;

  const ListTag = ordered ? "ol" : "ul";

  return (
    <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <ListTag className={`space-y-1 text-sm text-muted-foreground ${ordered ? "list-decimal pl-5" : "list-disc pl-5"}`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    </div>
  );
}

export default function CommunicationTemplates() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const groupedTemplates = useMemo(
    () =>
      tabDefinitions.reduce<Record<string, TemplateDefinition[]>>((acc, tab) => {
        acc[tab.value] =
          tab.value === "all"
            ? templateCatalog
            : templateCatalog.filter((template) => template.scope === tab.value);
        return acc;
      }, {}),
    []
  );

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Texto copiado para a area de transferencia.");
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Nao foi possivel copiar o texto.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Templates de comunicacao</h2>
        <p className="text-muted-foreground">
          Base operacional para comunicados oficiais, respostas publicas e contato individual.
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          {tabDefinitions.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabDefinitions.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            {groupedTemplates[tab.value].map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <Separator />

      <Card className="bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-lg">Criterios de uso</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Use os textos como base operacional. Ajustes finos de contexto sao aceitaveis, mas sem
            mudar responsabilidade, promessa de prazo ou tom institucional.
          </p>
          <p>
            Quando houver duvida juridica, financeira ou operacional, mantenha a resposta curta e
            registre o caso antes de responder em detalhe.
          </p>
          <p className="text-foreground">
            Em exposicao publica, a prioridade e conter o dano, mover a tratativa para canal
            privado e manter historico interno.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
