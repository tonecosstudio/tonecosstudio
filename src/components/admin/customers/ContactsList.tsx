import { useState, useEffect, useCallback } from "react";
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
import { toast } from "sonner";
import { useContacts } from "@/hooks/admin/useContacts";
import type { Contact } from "@/hooks/admin/useContacts";
import { log } from "@/lib/logger";

interface ContactsListProps {
  onStartConversation: (userId: string, userName: string, userEmail: string) => void;
}

export function ContactsList({ onStartConversation }: ContactsListProps) {
  const { contacts, loading, loadContacts } = useContacts();
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "customers" | "subscribers" | "quotes">(
    "all"
  );

  const handleReload = async () => {
    try {
      await loadContacts();
    } catch (error) {
      log.error("Erro ao carregar contatos", { error });
      toast.error("Erro ao carregar contatos");
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...contacts];

    if (filterType === "customers") {
      filtered = filtered.filter((c) => c.has_orders);
    } else if (filterType === "subscribers") {
      filtered = filtered.filter((c) => c.has_subscription);
    } else if (filterType === "quotes") {
      filtered = filtered.filter((c) => c.has_quotes);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) => c.email?.toLowerCase().includes(term) || c.full_name?.toLowerCase().includes(term)
      );
    }

    setFilteredContacts(filtered);
  }, [contacts, filterType, searchTerm]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleStartConversation = (contact: Contact) => {
    onStartConversation(contact.id, contact.full_name || contact.email, contact.email);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Contatos</h2>
          <Button variant="ghost" size="sm" onClick={handleReload} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filterType}
          onValueChange={(value) => setFilterType(value as "all" | "customers" | "subscribers" | "quotes")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Contatos</SelectItem>
            <SelectItem value="customers">Clientes (com pedidos)</SelectItem>
            <SelectItem value="subscribers">Assinantes</SelectItem>
            <SelectItem value="quotes">Com Orcamentos</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-xs text-muted-foreground">
          {filteredContacts.length} contato{filteredContacts.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Carregando contatos...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Nenhum contato encontrado</div>
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
          <p className="font-medium truncate">{contact.full_name || contact.email}</p>
          {contact.full_name && <p className="text-xs text-muted-foreground truncate">{contact.email}</p>}

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
                Orcamento
              </Badge>
            )}
          </div>
        </div>

        <Button size="sm" variant="ghost" onClick={onStartConversation} title="Iniciar conversa">
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
