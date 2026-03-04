// @ts-nocheck
/**
 * MyPaymentsPage Component
 *
 * Customer self-service page for viewing payment history and status.
 *
 * Requirements: 13.1-13.15
 * Task: 18.1 Criar componente MyPaymentsPage
 */

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon,
  Filter,
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { listPaymentsByUser } from "@/lib/payment-service";
import { supabase } from "@/integrations/supabase/client";
import type { ManualPayment, PaymentStatus } from "@/types/manual-payment";

export function MyPaymentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch user payments
  const {
    data: payments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-payments", user?.id, statusFilter, dateRange, searchQuery],
    queryFn: () => {
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      const filters: any = {};

      if (statusFilter !== "all") {
        filters.status = [statusFilter];
      }

      if (dateRange.from) {
        filters.date_from = dateRange.from.toISOString();
      }

      if (dateRange.to) {
        filters.date_to = dateRange.to.toISOString();
      }

      if (searchQuery) {
        filters.search = searchQuery;
      }

      return listPaymentsByUser(user.id, filters);
    },
    enabled: !!user?.id,
  });

  // Realtime subscription para atualizar quando pagamentos mudarem
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'manual_payments',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Pagamento atualizado:', payload);
          
          // Mostrar toast quando pagamento for aprovado
          if (payload.new && (payload.new as any).status === 'approved') {
            toast({
              title: "✓ Pagamento Aprovado",
              description: `Seu pagamento foi aprovado com sucesso!`,
              variant: "default",
            });
          }
          
          // Refetch para atualizar a lista
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch, toast]);

  // Get status icon
  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "under_review":
        return <Eye className="h-4 w-4" />;
      case "requires_info":
        return <AlertCircle className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get status color
  const getStatusColor = (status: PaymentStatus): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "under_review":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "requires_info":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get status label
  const getStatusLabel = (status: PaymentStatus): string => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "under_review":
        return "Em Análise";
      case "requires_info":
        return "Precisa de Informações";
      case "approved":
        return "Aprovado";
      case "rejected":
        return "Rejeitado";
      default:
        return status;
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Handle payment click
  const handlePaymentClick = (paymentId: string) => {
    navigate(`/payments/${paymentId}`);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setStatusFilter("all");
    setDateRange({});
    setSearchQuery("");
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: "Erro ao carregar pagamentos",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight">Meus Pagamentos</h1>
        <p className="text-xs text-muted-foreground mt-2">
          Acompanhe o status e histórico de todos os seus pagamentos
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre seus pagamentos por status, data ou número de referência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Search */}
            <form onSubmit={handleSearch} className="space-y-2">
              <Label htmlFor="search">Buscar por número de referência</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Ex: PAY-20240215-1234"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as PaymentStatus | "all")}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="under_review">Em Análise</SelectItem>
                    <SelectItem value="requires_info">Precisa de Informações</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Período</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "Data inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Data final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="default">
                Aplicar Filtros
              </Button>
              <Button onClick={handleClearFilters} variant="outline">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {payments.length === 0
              ? "Nenhum pagamento encontrado"
              : `${payments.length} pagamento(s) encontrado(s)`}
          </h2>
          {payments.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Payments Grid */}
      {payments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {payments.map((payment) => (
            <Card
              key={payment.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handlePaymentClick(payment.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate">
                      {payment.reference_number}
                    </CardTitle>
                    <CardDescription className="mt-1 truncate">
                      {formatDate(payment.created_at)}
                    </CardDescription>
                  </div>
                  <Badge className={cn("border flex-shrink-0", getStatusColor(payment.status))}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(payment.status)}
                      <span className="hidden sm:inline">{getStatusLabel(payment.status)}</span>
                      <span className="sm:hidden">
                        {payment.status === "pending"
                          ? "Pend"
                          : payment.status === "under_review"
                            ? "Análise"
                            : payment.status === "requires_info"
                              ? "Info"
                              : payment.status === "approved"
                                ? "Aprov"
                                : "Rej"}
                      </span>
                    </div>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="space-y-3">
                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Valor</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </div>

                  {/* Payment Type */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tipo</span>
                    <Badge variant="outline" className="text-xs">
                      {payment.payment_type === "one_time" ? "Único" : "Recorrente"}
                    </Badge>
                  </div>

                  {/* Linked Entity */}
                  {(payment.quote_id || payment.subscription_id) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Vinculado a</span>
                      <Badge variant="secondary" className="text-xs">
                        {payment.quote_id ? "Orçamento" : "Assinatura"}
                      </Badge>
                    </div>
                  )}

                  {/* Status Timeline */}
                  <div className="pt-2">
                    <div className="flex items-start text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">
                        {payment.status === "pending" && "Aguardando comprovante"}
                        {payment.status === "under_review" && "Em análise pelo administrador"}
                        {payment.status === "requires_info" && "Aguardando informações adicionais"}
                        {payment.status === "approved" && "Pagamento aprovado"}
                        {payment.status === "rejected" && "Pagamento rejeitado"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-3 border-t">
                <Button variant="outline" className="w-full" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Ver Detalhes</span>
                  <span className="sm:hidden">Detalhes</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card>
          <CardHeader>
            <CardTitle>Nenhum pagamento encontrado</CardTitle>
            <CardDescription>
              {statusFilter !== "all" || dateRange.from || dateRange.to || searchQuery
                ? "Tente ajustar seus filtros de busca"
                : "Você ainda não realizou nenhum pagamento"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gray-100 p-6 mb-4">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {statusFilter !== "all" || dateRange.from || dateRange.to || searchQuery
                ? "Nenhum pagamento corresponde aos filtros aplicados"
                : "Comece seu primeiro pagamento"}
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {statusFilter !== "all" || dateRange.from || dateRange.to || searchQuery
                ? "Tente remover alguns filtros ou ajustar o período de busca."
                : "Para iniciar um pagamento, acesse um orçamento ou assinatura e selecione a opção de pagamento manual."}
            </p>
            <div className="flex gap-4">
              {statusFilter !== "all" || dateRange.from || dateRange.to || searchQuery ? (
                <Button onClick={handleClearFilters} variant="default">
                  Limpar Filtros
                </Button>
              ) : (
                <Button onClick={() => navigate("/orcamento")} variant="default">
                  Ver Orçamentos
                </Button>
              )}
              <Button onClick={() => navigate("/assinaturas")} variant="outline">
                Ver Assinaturas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      {payments.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Precisa de ajuda com seus pagamentos?
            </CardTitle>
            <CardDescription>
              Encontre respostas para dúvidas comuns sobre pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold">Status do pagamento</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • <strong>Pendente:</strong> Aguardando envio do comprovante
                  </li>
                  <li>
                    • <strong>Em Análise:</strong> Comprovante recebido, em verificação
                  </li>
                  <li>
                    • <strong>Aprovado:</strong> Pagamento confirmado e processado
                  </li>
                  <li>
                    • <strong>Rejeitado:</strong> Comprovante não aceito
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Tempo de processamento</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Análise manual: até 24 horas úteis</li>
                  <li>• Aprovação automática após verificação</li>
                  <li>• Notificações por email em cada etapa</li>
                  <li>• Suporte disponível para dúvidas</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Ações disponíveis</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Clique em qualquer pagamento para ver detalhes</li>
                  <li>• Envie novos comprovantes se necessário</li>
                  <li>• Baixe recibos para pagamentos aprovados</li>
                  <li>• Entre em contato com suporte a qualquer momento</li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/perfil?section=support")}
            >
              Acessar Suporte
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

export default MyPaymentsPage;
