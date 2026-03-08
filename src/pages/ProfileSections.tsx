// @ts-nocheck
// Componentes de Seção Adicionais para Profile.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  FileText,
  CreditCard,
  Bell,
  Plus,
  Trash2,
  Check,
  Clock,
  Send,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Seção de Dados Pessoais
export function PersonalDataSection({
  profileQuery,
  fullName,
  setFullName,
  phone,
  setPhone,
  whatsapp,
  setWhatsapp,
  cpf,
  setCpf,
  birthDate,
  setBirthDate,
  saveMutation,
}: any) {
  // Formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  // Formatar Telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Dados Pessoais
        </CardTitle>
        <CardDescription>Informações pessoais para identificação e contato</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="fullName">Nome Completo</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome completo"
            className="mt-2"
            maxLength={100}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              className="mt-2"
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground mt-1">Para contato geral</p>
          </div>

          <div>
            <Label htmlFor="whatsapp" className="flex items-center gap-2">
              WhatsApp
              <span className="text-green-600">●</span>
            </Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              className="mt-2"
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground mt-1">Para atualizações de pedidos</p>
          </div>
        </div>

        <div>
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            className="mt-2"
            maxLength={14}
          />
        </div>

        <div>
          <Label htmlFor="birthDate">Data de Nascimento</Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="mt-2"
          />
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-4">
            Seus dados pessoais são protegidos e usados apenas para melhorar sua experiência.
          </p>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar Dados Pessoais"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Seção de Métodos de Pagamento
export function PaymentSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const paymentMethodsQuery = useQuery({
    queryKey: ["payment-methods", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_methods").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Método de pagamento removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_methods")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Método padrão atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    },
  });

  const methods = paymentMethodsQuery.data || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Métodos de Pagamento
            </CardTitle>
            <CardDescription>Gerencie seus cartões e formas de pagamento</CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {methods.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum método de pagamento cadastrado</p>
            <p className="text-sm mt-1">Adicione um cartão para facilitar suas compras</p>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((method: any) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {method.card_brand?.toUpperCase() || method.type} •••• {method.card_last4}
                      </p>
                      {method.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Padrão
                        </Badge>
                      )}
                    </div>
                    {method.card_holder_name && (
                      <p className="text-sm text-muted-foreground">{method.card_holder_name}</p>
                    )}
                    {method.card_expiry_month && method.card_expiry_year && (
                      <p className="text-xs text-muted-foreground">
                        Validade: {String(method.card_expiry_month).padStart(2, "0")}/
                        {method.card_expiry_year}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!method.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDefaultMutation.mutate(method.id)}
                      disabled={setDefaultMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Tornar Padrão
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(method.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground">
            🔒 Seus dados de pagamento são criptografados e armazenados com segurança. Nunca
            compartilhamos suas informações financeiras.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Seção de Notificações
export function NotificationsSection({
  emailNotifications,
  setEmailNotifications,
  orderUpdates,
  setOrderUpdates,
  marketingEmails,
  setMarketingEmails,
  saveMutation,
}: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferências de Notificação
        </CardTitle>
        <CardDescription>Escolha como e quando você quer receber notificações</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="space-y-0.5">
            <Label>Notificações por Email</Label>
            <p className="text-sm text-muted-foreground">
              Receber emails sobre atividades importantes
            </p>
          </div>
          <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="space-y-0.5">
            <Label>Atualizações de Pedidos</Label>
            <p className="text-sm text-muted-foreground">
              Notificações sobre status de produção e entrega
            </p>
          </div>
          <Switch checked={orderUpdates} onCheckedChange={setOrderUpdates} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="space-y-0.5">
            <Label>Emails de Marketing</Label>
            <p className="text-sm text-muted-foreground">Novidades, promoções e lançamentos</p>
          </div>
          <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Seção de Assinaturas
import { Package, Calendar, ExternalLink, Mail, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

export function SubscriptionSection({ userId }: { userId: string }) {
  const subscriptionQuery = useQuery({
    queryKey: ["user-subscription", userId],
    queryFn: async () => {
      // Buscar assinatura
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select(
          `
          id,
          user_id,
          plan_type,
          status,
          created_at,
          updated_at
        `
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (subError && subError.code !== "PGRST116") throw subError;
      if (!subscription) return null;

      return subscription;
    },
  });

  if (!subscriptionQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Assinatura
          </CardTitle>
          <CardDescription>Você não possui assinatura ativa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              Assine uma coleção e receba personagens exclusivos todo mês
            </p>
            <Button asChild>
              <Link to="/planos">Ver Planos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sub = subscriptionQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Minha Assinatura
        </CardTitle>
        <CardDescription>Gerencie sua assinatura e entregas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium">Status</span>
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Ativa
          </Badge>
        </div>

        {/* Plano */}
        <div>
          <span className="text-xs text-muted-foreground">Plano</span>
          <p className="text-sm font-medium mt-1">
            {sub.plan_type === "trimestral" && "Trimestral (3 meses)"}
            {sub.plan_type === "semestral" && "Semestral (6 meses)"}
            {sub.plan_type === "anual" && "Anual (12 meses)"}
          </p>
        </div>

        {/* Botão para página completa */}
        <Button asChild variant="outline" className="w-full mt-4">
          <Link to="/painel-assinante">
            Ver Painel do Assinante
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Seção de Suporte
export function SupportSection({ userId }: { userId: string }) {
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newFirstMessage, setNewFirstMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const messagesEndRef = useState<HTMLDivElement | null>(null);
  const { toast } = useToast();

  const conversationsQuery = useQuery({
    queryKey: ["user-conversations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar mensagens da conversa selecionada
  useState(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .eq("is_internal", false)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar mensagens:", error);
        toast({ title: "Erro ao carregar mensagens", variant: "destructive" });
      } else {
        setMessages(data || []);
        scrollToBottom();
        markAsRead();
      }
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`support_messages_${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          if (!payload.new.is_internal) {
            setMessages((prev) => [...prev, payload.new as any]);
            scrollToBottom();
            markAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef[0]?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const markAsRead = async () => {
    if (!selectedConversation || !userId) return;

    await supabase
      .from("support_messages")
      .update({ read_by_customer: true, read_at: new Date().toISOString() })
      .eq("conversation_id", selectedConversation.id)
      .eq("read_by_customer", false)
      .neq("sender_id", userId);
  };

  const handleCreateConversation = async () => {
    if (!newSubject.trim() || !newFirstMessage.trim() || !userId) {
      toast({ title: "Preencha o assunto e a mensagem", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      // Criar conversa
      const { data: conversation, error: convError } = await supabase
        .from("support_conversations")
        .insert({
          user_id: userId,
          subject: newSubject.trim(),
          status: "waiting_admin",
        })
        .select()
        .single();

      if (convError) throw convError;

      // Criar primeira mensagem
      const { error: msgError } = await supabase.from("support_messages").insert({
        conversation_id: conversation.id,
        sender_id: userId,
        message: newFirstMessage.trim(),
      });

      if (msgError) throw msgError;

      toast({ title: "Mensagem enviada! Responderemos em até 48h úteis." });
      setNewSubject("");
      setNewFirstMessage("");
      setSelectedConversation(conversation);
      setShowNewConversationForm(false);
      conversationsQuery.refetch();
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !userId) return;

    setSending(true);

    try {
      const { error } = await supabase.from("support_messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: userId,
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
      toast({ title: "Mensagem enviada!" });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      new: { label: "Nova", variant: "default" as const },
      waiting_admin: { label: "Aguardando Resposta", variant: "secondary" as const },
      waiting_customer: { label: "Aguardando Você", variant: "default" as const },
      resolved: { label: "Resolvida", variant: "outline" as const },
      closed: { label: "Fechada", variant: "outline" as const },
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.new;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const conversations = conversationsQuery.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Suporte
        </CardTitle>
        <CardDescription>
          Entre em contato conosco. Respondemos em até 48 horas úteis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aviso de Prazo */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Prazo de resposta:</strong> Nossa equipe responde em até 48 horas úteis. Você
              receberá um email quando houver novidades.
            </p>
          </div>
        </div>

        {conversations.length === 0 && !selectedConversation && !showNewConversationForm ? (
          /* Primeira vez - sem conversas */
          <div className="text-center py-8">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">Você ainda não tem conversas</p>
            <Button onClick={() => setShowNewConversationForm(true)} className="w-full">
              <MessageSquare className="h-4 w-4 mr-2" />
              Iniciar Primeira Conversa
            </Button>
          </div>
        ) : (conversations.length === 0 || showNewConversationForm) && !selectedConversation ? (
          /* Nova Conversa */
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                placeholder="Ex: Dúvida sobre meu pedido"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="message">Mensagem</Label>
              <textarea
                id="message"
                placeholder="Descreva sua dúvida ou problema..."
                rows={6}
                value={newFirstMessage}
                onChange={(e) => setNewFirstMessage(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div className="flex gap-2">
              {conversations.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewConversationForm(false);
                    setNewSubject("");
                    setNewFirstMessage("");
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              )}
              <Button
                onClick={handleCreateConversation}
                disabled={sending || !newSubject.trim() || !newFirstMessage.trim()}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </div>
          </div>
        ) : (
          /* Chat Existente */
          <div className="space-y-4">
            {/* Lista de Conversas */}
            {!selectedConversation && conversations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Suas Conversas</h3>
                {conversations.map((conv: any) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{conv.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(conv.last_message_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {getStatusBadge(conv.status)}
                  </div>
                ))}
              </div>
            )}

            {/* Conversa Selecionada */}
            {selectedConversation && (
              <div className="space-y-4">
                <div className="flex items-start justify-between pb-3 border-b">
                  <div>
                    <h3 className="font-medium">{selectedConversation.subject}</h3>
                    <p className="text-xs text-muted-foreground">
                      Criada em{" "}
                      {format(new Date(selectedConversation.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedConversation.status)}
                    <Button size="sm" variant="ghost" onClick={() => setSelectedConversation(null)}>
                      Voltar
                    </Button>
                  </div>
                </div>

                {/* Mensagens */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender_id === userId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${msg.sender_id === userId ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                        >
                          {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={(el) => (messagesEndRef[1] = el)} />
                </div>

                {/* Input de Nova Mensagem */}
                {selectedConversation.status !== "closed" && (
                  <div className="space-y-2 pt-3 border-t">
                    <textarea
                      placeholder="Digite sua mensagem..."
                      rows={3}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        Pressione Enter para enviar, Shift+Enter para nova linha
                      </p>
                      <Button
                        onClick={handleSendMessage}
                        disabled={sending || !newMessage.trim()}
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                )}

                {selectedConversation.status === "closed" && (
                  <div className="p-3 rounded-lg bg-muted border">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5" />
                      <p className="text-sm">
                        Esta conversa foi fechada. Para abrir uma nova, clique no botão abaixo.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botão Nova Conversa */}
            {conversations.length > 0 && !selectedConversation && !showNewConversationForm && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewConversationForm(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Iniciar Nova Conversa
              </Button>
            )}
          </div>
        )}

        {/* Informações úteis */}
        <div className="bg-muted p-3 rounded-lg text-sm mt-4">
          <p className="font-medium mb-1">Horário de Atendimento</p>
          <p className="text-muted-foreground">Segunda a Sexta: 9h às 18h</p>
          <p className="text-muted-foreground">Tempo médio de resposta: 2 horas</p>
        </div>
      </CardContent>
    </Card>
  );
}
