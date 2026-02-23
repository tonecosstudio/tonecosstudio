import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Send, Clock, CheckCircle2, AlertCircle, User, Package, CreditCard, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  is_internal: boolean;
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  last_message_at: string;
}

export default function Support() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get("conversation");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newFirstMessage, setNewFirstMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'support' | 'profile' | 'orders' | 'payments'>('support');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Buscar user ID
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  // Buscar conversas
  useEffect(() => {
    if (!userId) return;
    
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar conversas:", error);
        toast.error("Erro ao carregar conversas");
      } else {
        setConversations(data || []);
        
        // Se há um ID de conversa na URL, selecionar essa conversa
        if (conversationIdFromUrl && data) {
          const conversationFromUrl = data.find(c => c.id === conversationIdFromUrl);
          if (conversationFromUrl) {
            setSelectedConversation(conversationFromUrl);
          } else if (data.length > 0) {
            setSelectedConversation(data[0]);
          }
        } else if (data && data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0]);
        }
      }
      setLoading(false);
    };

    fetchConversations();

    // Realtime subscription
    const channel = supabase
      .channel("support_conversations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_conversations",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, conversationIdFromUrl]);

  // Buscar mensagens da conversa selecionada
  useEffect(() => {
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
        toast.error("Erro ao carregar mensagens");
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
            setMessages((prev) => [...prev, payload.new as Message]);
            scrollToBottom();
            markAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      toast.error("Preencha o assunto e a mensagem");
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
      const { error: msgError } = await supabase
        .from("support_messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: userId,
          message: newFirstMessage.trim(),
        });

      if (msgError) throw msgError;

      toast.success("Mensagem enviada! Responderemos em até 48h úteis.");
      setNewSubject("");
      setNewFirstMessage("");
      setSelectedConversation(conversation);
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !userId) return;

    setSending(true);

    try {
      const { error } = await supabase
        .from("support_messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: userId,
          message: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage("");
      toast.success("Mensagem enviada!");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
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

  if (loading) {
    return (
      <div className="container py-8 max-w-4xl">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Suporte - Ordax"
        description="Entre em contato com nossa equipe de suporte"
      />

      <div className="container py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Central de Ajuda</h1>
          <p className="text-muted-foreground">
            Entre em contato conosco. Respondemos em até 48 horas úteis.
          </p>
        </header>

        {/* Layout com Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveSection('support')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === 'support' 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Suporte
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveSection('profile');
                      navigate('/perfil');
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === 'profile' 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <User className="h-4 w-4" />
                    Meu Perfil
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveSection('orders');
                      navigate('/meus-pedidos');
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === 'orders' 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Package className="h-4 w-4" />
                    Meus Pedidos
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveSection('payments');
                      navigate('/my-payments');
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeSection === 'payments' 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                    Pagamentos
                  </button>
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Conteúdo Principal */}
          <div className="flex-1 min-w-0">
          {/* Aviso de Prazo */}
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              <strong>Prazo de resposta:</strong> Nossa equipe responde em até 48 horas úteis.
              Você receberá um email quando houver novidades.
            </AlertDescription>
          </Alert>

          {conversations.length === 0 ? (
            /* Nova Conversa */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Nova Mensagem
                </CardTitle>
                <CardDescription>
                  Descreva sua dúvida ou problema e nossa equipe entrará em contato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="subject">Assunto</Label>
                  <Input
                    id="subject"
                    placeholder="Ex: Dúvida sobre meu pedido"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    placeholder="Descreva sua dúvida ou problema..."
                    rows={6}
                    value={newFirstMessage}
                    onChange={(e) => setNewFirstMessage(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateConversation}
                  disabled={sending || !newSubject.trim() || !newFirstMessage.trim()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Enviando..." : "Enviar Mensagem"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Chat Existente */
            <div className="space-y-4">
              {/* Conversa Selecionada */}
              {selectedConversation && (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedConversation.subject}</CardTitle>
                        <CardDescription>
                          Criada em {format(new Date(selectedConversation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </CardDescription>
                      </div>
                      {getStatusBadge(selectedConversation.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Mensagens */}
                    <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
                      {messages.map((msg) => (
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
                            <p className={`text-xs mt-1 ${msg.sender_id === userId ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <Separator className="my-4" />

                    {/* Input de Nova Mensagem */}
                    {selectedConversation.status !== "closed" && (
                      <div className="space-y-2">
                        <Textarea
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
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                          Esta conversa foi fechada. Para abrir uma nova, clique no botão abaixo.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Botão Nova Conversa */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedConversation(null);
                  setConversations([]);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Iniciar Nova Conversa
              </Button>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
    );
  }
