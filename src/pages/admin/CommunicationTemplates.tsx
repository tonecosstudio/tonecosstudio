import AppShell from "@/components/AppShell";
import RequireAdmin from "@/components/RequireAdmin";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, MessageSquare, AlertCircle, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";

const templates = {
  oficial: {
    title: "Comunicado Oficial - Tonecos",
    category: "Público",
    severity: "high",
    content: `Comunicado Importante aos Clientes Tonecos Studios

Reconhecemos que parte dos pedidos realizados em anos anteriores ainda não foi concluída. Sabemos que isso gerou frustração e quebra de expectativa, e não ignoramos essa responsabilidade.

Justamente por isso, estamos implementando um novo sistema de organização e acompanhamento chamado Ordax, criado para estruturar processos, comunicação e regularização de pedidos de forma clara e documentada.

Clientes com pedidos pendentes serão convidados a se cadastrar no sistema para escolher, de forma transparente, como desejam prosseguir:
– aguardar a produção
– trocar a peça
– converter em crédito
– solicitar cancelamento

A Tonecos Studios permanece responsável por todos os pedidos realizados. Este é um passo concreto para organizar e concluir o que ficou pendente.`,
  },
  proativo: {
    title: "Comunicação Proativa - Cliente Antigo",
    category: "Individual",
    severity: "medium",
    content: `Olá [Nome]! Queremos atualizar você sobre como estamos organizando nossas coleções artesanais. Estamos criando a ORDAx, uma plataforma que vai permitir acompanhar pedidos e coleções de forma organizada e transparente. Pedidos antigos estão sendo registrados individualmente para análise interna. Por enquanto, não podemos abrir novos compromissos, mas você pode acompanhar novidades e se cadastrar na ORDAx se quiser explorar a experiência organizada da nova plataforma. Agradecemos sua compreensão e paciência.`,
    benefits: [
      "✅ Usa nome → pessoal",
      "✅ Informa sobre ORDAx → transparente",
      "✅ Não promete entrega → proteção legal",
      "✅ Cria registro interno → controle"
    ]
  },
  individual: {
    title: "Mensagem para Cliente Antigo",
    category: "Individual",
    severity: "medium",
    content: `Olá, tudo bem?

Estamos entrando em contato porque seu pedido com a Tonecos Studios permanece pendente.

Para organizar e regularizar esses casos, estamos utilizando a plataforma Ordax, onde você poderá escolher como deseja prosseguir com seu pedido de forma clara e registrada.

Importante: a responsabilidade pelo pedido continua sendo da Tonecos Studios. A Ordax é apenas o sistema de organização.

Assim que se cadastrar, nossa equipe dará sequência ao seu caso.`,
  },
  ordax: {
    title: "Resposta na Ordax - Cliente Antigo",
    category: "Individual",
    severity: "medium",
    content: `Olá [Nome], recebemos sua mensagem. Todos os contatos e pedidos antigos estão sendo analisados internamente. No momento, não podemos abrir novos compromissos nem informar prazos de entregas passadas. Agradecemos sua compreensão e paciência enquanto registramos sua situação.`,
    shortcut: "Ctrl+1",
    description: "Mensagem neutra e defensiva para clientes antigos"
  },
  publica: {
    title: "Resposta Pública - Reclamação em Feed/Comentários",
    category: "Público",
    severity: "high",
    content: `Olá, registramos seu contato e situação para análise interna. Estamos trabalhando na organização das produções e agradecemos sua compreensão.`,
    shortcut: "Ctrl+2",
    warnings: [
      "⚠️ NÃO falar de valores ou prazos",
      "⚠️ NÃO mencionar que novas coleções são vendidas",
      "⚠️ Manter resposta curta e neutra",
      "⚠️ Não prometer nada específico"
    ]
  },
  objecao: {
    title: 'Resposta: "Mudaram o nome pra fugir"',
    category: "Objeção",
    severity: "high",
    content: `Não. A Tonecos Studios continua existindo e sendo responsável pelos pedidos. A Ordax foi criada justamente para organizar e documentar a regularização dos pedidos pendentes, algo que antes não existia de forma estruturada.`,
  },
};

export default function CommunicationTemplates() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Texto copiado para área de transferência");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Erro ao copiar texto");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertCircle className="h-4 w-4" />;
      case "medium":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <RequireAdmin>
      <AppShell>
        <SEOHead
          title="Templates de Comunicação - Admin"
          description="Gerenciar templates de comunicação para clientes"
        />

        <AdminLayout>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Templates de Comunicação
            </h1>
            <p className="text-muted-foreground text-lg">
              Textos prontos para comunicação com clientes e alimentação de IA
            </p>
          </div>

          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="oficial">Oficial</TabsTrigger>
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="objecao">Objeções</TabsTrigger>
            </TabsList>

            {/* Tab: Todos */}
            <TabsContent value="all" className="space-y-4">
              {Object.entries(templates).map(([key, template]) => (
                <Card key={key} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(template.severity)}
                          <CardTitle className="text-xl">{template.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(template.severity)}>
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(template.content, key)}
                        className="shrink-0"
                      >
                        {copiedId === key ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                      {template.content}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab: Oficial */}
            <TabsContent value="oficial" className="space-y-4">
              <Card className="border-2 border-destructive">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <CardTitle className="text-xl">{templates.oficial.title}</CardTitle>
                      </div>
                      <CardDescription>
                        Use este texto para comunicados públicos oficiais sobre a transição Tonecos → Ordax
                      </CardDescription>
                      <Badge variant="destructive">{templates.oficial.category}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(templates.oficial.content, "oficial")}
                    >
                      {copiedId === "oficial" ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                    {templates.oficial.content}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Público */}
            <TabsContent value="publico" className="space-y-4">
              <Card className="border-2 border-destructive">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <CardTitle className="text-xl">{templates.publica.title}</CardTitle>
                      </div>
                      <CardDescription>
                        Resposta padrão para reclamações públicas em feed/comentários de redes sociais
                      </CardDescription>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{templates.publica.category}</Badge>
                        <Badge variant="outline">Crítico</Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(templates.publica.content, "publica")}
                    >
                      {copiedId === "publica" ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                    {templates.publica.content}
                  </div>
                  
                  {/* Avisos Críticos */}
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                    <p className="font-semibold text-sm mb-2 text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      AVISOS CRÍTICOS - Leia antes de usar:
                    </p>
                    <ul className="space-y-1 text-sm">
                      {templates.publica.warnings?.map((warning, index) => (
                        <li key={index} className="text-muted-foreground">{warning}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Contexto de Uso */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
                      📱 Quando usar:
                    </p>
                    <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200 list-disc list-inside">
                      <li>Cliente reclama em post público (Instagram/Facebook)</li>
                      <li>Comentário negativo em publicação</li>
                      <li>Menção pública à marca</li>
                      <li>Exposição em grupo/comunidade</li>
                    </ul>
                  </div>

                  {/* O Que NÃO Fazer */}
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="font-semibold text-sm mb-2 text-red-900 dark:text-red-100 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      O QUE NÃO FAZER:
                    </p>
                    <ul className="space-y-1 text-sm text-red-800 dark:text-red-200 list-disc list-inside">
                      <li>❌ Não discutir valores ou prazos publicamente</li>
                      <li>❌ Não mencionar que novas coleções estão à venda</li>
                      <li>❌ Não prometer datas específicas</li>
                      <li>❌ Não entrar em discussão pública</li>
                      <li>❌ Não deletar comentários (transparência)</li>
                    </ul>
                  </div>

                  {/* Próximo Passo */}
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="font-semibold text-sm mb-2 text-green-900 dark:text-green-100">
                      ✅ Após responder publicamente:
                    </p>
                    <ol className="space-y-1 text-sm text-green-800 dark:text-green-200 list-decimal list-inside">
                      <li>Envie mensagem privada (DM/WhatsApp)</li>
                      <li>Use template "Proativo" ou "Individual"</li>
                      <li>Registre o caso na Ordax</li>
                      <li>Acompanhe a situação internamente</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Individual */}
            <TabsContent value="individual" className="space-y-4">
              {/* Template Ordax - Cliente Antigo */}
              <Card className="border-2 border-amber-500">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-600" />
                        <CardTitle className="text-xl">{templates.ordax.title}</CardTitle>
                      </div>
                      <CardDescription>
                        {templates.ordax.description}
                      </CardDescription>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{templates.ordax.category}</Badge>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                          Atalho: {templates.ordax.shortcut}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(templates.ordax.content, "ordax")}
                    >
                      {copiedId === "ordax" ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                    {templates.ordax.content}
                  </div>
                  
                  {/* Características */}
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="font-semibold text-sm mb-2 text-amber-900 dark:text-amber-100">
                      🛡️ Características desta resposta:
                    </p>
                    <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200 list-disc list-inside">
                      <li>Neutra e defensiva</li>
                      <li>Não promete prazos</li>
                      <li>Não abre novos compromissos</li>
                      <li>Registra a situação</li>
                      <li>Mantém tom respeitoso</li>
                    </ul>
                  </div>

                  {/* Quando usar */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
                      📱 Quando usar:
                    </p>
                    <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200 list-disc list-inside">
                      <li>Cliente antigo entra em contato pela Ordax</li>
                      <li>Primeira resposta a pedido pendente</li>
                      <li>Cliente questiona prazo de entrega</li>
                      <li>Situação delicada que precisa análise</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Template Proativo */}
              <Card className="border-2 border-primary">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <CardTitle className="text-xl">{templates.proativo.title}</CardTitle>
                      </div>
                      <CardDescription>
                        Mensagem proativa via WhatsApp/DM Instagram ANTES do cliente descobrir pela Ordax
                      </CardDescription>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{templates.proativo.category}</Badge>
                        <Badge variant="outline">Recomendado</Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(templates.proativo.content, "proativo")}
                    >
                      {copiedId === "proativo" ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                    {templates.proativo.content}
                  </div>
                  
                  {/* Benefícios */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="font-semibold text-sm mb-2 text-primary">Por que usar este template:</p>
                    <ul className="space-y-1 text-sm">
                      {templates.proativo.benefits?.map((benefit, index) => (
                        <li key={index} className="text-muted-foreground">{benefit}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Instruções */}
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="font-semibold text-sm mb-2 text-amber-900 dark:text-amber-100">
                      📱 Como usar:
                    </p>
                    <ol className="space-y-1 text-sm text-amber-800 dark:text-amber-200 list-decimal list-inside">
                      <li>Substitua [Nome] pelo nome real do cliente</li>
                      <li>Envie via WhatsApp ou DM Instagram (privado)</li>
                      <li>Envie ANTES do cliente descobrir pela Ordax</li>
                      <li>Mantenha tom amigável e transparente</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Template Individual Original */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <CardTitle className="text-xl">{templates.individual.title}</CardTitle>
                      </div>
                      <CardDescription>
                        Use este texto para contato direto com clientes que possuem pedidos pendentes
                      </CardDescription>
                      <Badge>{templates.individual.category}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(templates.individual.content, "individual")}
                    >
                      {copiedId === "individual" ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                    {templates.individual.content}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Objeções */}
            <TabsContent value="objecao" className="space-y-4">
              <Card className="border-2 border-destructive">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <CardTitle className="text-xl">{templates.objecao.title}</CardTitle>
                      </div>
                      <CardDescription>
                        Resposta padrão para objeção comum sobre mudança de nome/marca
                      </CardDescription>
                      <Badge variant="destructive">{templates.objecao.category}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(templates.objecao.content, "objecao")}
                    >
                      {copiedId === "objecao" ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                    {templates.objecao.content}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator className="my-8" />

          {/* Instruções de Uso */}
          <Card className="border-border bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">📋 Como Usar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <strong className="text-foreground">Para copiar:</strong>
                <p>Clique no botão "Copiar" ao lado de cada template. O texto será copiado para sua área de transferência.</p>
              </div>
              <div>
                <strong className="text-foreground">Para alimentar IA:</strong>
                <p>Use estes textos como contexto ao treinar ou instruir assistentes de IA para atendimento ao cliente.</p>
              </div>
              <div>
                <strong className="text-foreground">Importante:</strong>
                <p className="text-destructive">Use EXATAMENTE como está escrito. Estes textos foram cuidadosamente elaborados para manter consistência estratégica.</p>
              </div>
            </CardContent>
          </Card>
        </AdminLayout>
      </AppShell>
    </RequireAdmin>
  );
}
