// @ts-nocheck
/**
 * ContactsList - Lista todos os usuários para iniciar conversas
 * Funcionalidade tipo WhatsApp para o admin
 */

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Contact {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  has_orders?: boolean;
  has_subscription?: boolean;
  has_quotes?: boolean;
  last_order_date?: string;
}

interface ContactsListProps {
  onStartConversation: (userId: string, userName: string, userEmail: string) => void;
}

export function ContactsList({ onStartConversation }: ContactsListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "customers" | "subscribers" | "quotes">("all");

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [contacts, searchTerm, filterType]);

  const loadContacts = async () => {
    try {
      setLoading(true);

      // Buscar todos os usuários
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Buscar informações adicionais (pedidos via manual_payments, assinaturas, orçamentos)
      const enrichedContacts = await Promise.all(
        (users || []).map(async (user) => {
          const [payments, subscriptions, quotes] = await Promise.all([
            supabase
              .from("manual_payments")
              .select("id, created_at")
              .eq("user_id", user.id)
              .not("quote_id", "is", null)
              .order("created_at", { ascending: false })
              .limit(1),
            supabase
              .from("subscriptions")
              .select("id")
              .eq("user_id", user.id)
              .eq("status", "active")
              .limit(1),
            supabase
              .from("quotes")
              .select("id")
              .eq("user_id", user.id)
              .limit(1),
          ]);

          return {
            ...user,
            has_orders: (payments.data?.length || 0) > 0,
            has_subscription: (subscriptions.data?.length || 0) > 0,
            has_quotes: (quotes.data?.length || 0) > 0,
            last_order_date: payments.data?.[0]?.created_at,
          };
        })
      );

      setContacts(enrichedContacts);
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
      toast.error("Erro ao carregar contatos");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...contacts];

    // Filtro por tipo
    if (filterType === "customers") {
      filtered = filtered.filter((c) => c.has_orders);
    } else if (filterType === "subscribers") {
      filtered = filtered.filter((c) => c.has_subscription);
    } else if (filterType === "quotes") {
      filtered = filtered.filter((c) => c.has_quotes);
    }

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.email?.toLowerCase().includes(term) ||
          c.full_name?.toLowerCase().includes(term)
      );
    }

    setFilteredContacts(filtered);
  };

  const handleStartConversation = (contact: Contact) => {
    onStartConversation(
      contact.id,
      contact.full_name || contact.email,
      contact.email
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Contatos</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadContacts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtro por tipo */}
        <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Contatos</SelectItem>
            <SelectItem value="customers">Clientes (com pedidos)</SelectItem>
            <SelectItem value="subscribers">Assinantes</SelectItem>
            <SelectItem value="quotes">Com Orçamentos</SelectItem>
          </SelectContent>
        </Select>

        {/* Contador */}
        <p className="text-xs text-muted-foreground">
          {filteredContacts.length} contato{filteredContacts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Lista de contatos */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando contatos...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhum contato encontrado
          </div>
        ) : (
          <div className="divide-y">
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onStartConversation={() => handleStartConversation(contact)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ContactCardProps {
  contact: Contact;
  onStartConversation: () => void;
}

function ContactCard({ contact, onStartConversation }: ContactCardProps) {
  return (
    <div className="p-4 hover:bg-accent transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {contact.full_name || contact.email}
          </p>
          {contact.full_name && (
            <p className="text-xs text-muted-foreground truncate">
              {contact.email}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {contact.has_subscription && (
              <Badge variant="default" className="text-xs">
                Assinante
              </Badge>
            )}
            {contact.has_orders && (
              <Badge variant="secondary" className="text-xs">
                Cliente
              </Badge>
            )}
            {contact.has_quotes && (
              <Badge variant="outline" className="text-xs">
                Orçamento
              </Badge>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={onStartConversation}
          title="Iniciar conversa"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
