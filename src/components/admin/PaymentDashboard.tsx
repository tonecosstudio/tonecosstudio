/**
 * PaymentDashboard Component
 *
 * Admin dashboard for managing manual payments with filtering, sorting, and statistics.
 *
 * Requirements: 5.1-5.10, 16.1-16.15
 * Task: 12.1 Criar componente PaymentDashboard
 * Task: 23.2 Integrar atualizações em tempo real nos componentes
 */

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Filter,
  Search,
  Calendar,
  Download,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  LayoutGrid,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckSquare,
  Square,
} from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { RealtimeIndicator } from "@/components/ui/RealtimeIndicator";
import type { PaymentListItem, PaymentFilters, PaymentStatus } from "@/types/manual-payment";
import { listPendingPayments, getPaymentStats } from "@/lib/admin-payment-service";
import { listAllPaymentMethods } from "@/lib/payment-method-service";
import {
  PaymentListItem as PaymentListItemComponent,
  PaymentListItemCard,
} from "./PaymentListItem";
import { BulkOperationsToolbar } from "./BulkOperationsToolbar";
import { useAdminDashboardRealtime } from "@/hooks/usePaymentRealtimeDashboard";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { ValidationFeedback } from "@/components/ui/validation-feedback";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limiter";

interface PaymentDashboardProps {
  onViewPayment?: (paymentId: string) => void;
}

type SortField = "created_at" | "amount" | "customer_name" | "status";
type SortDirection = "asc" | "desc";

export function PaymentDashboard({ onViewPayment }: PaymentDashboardProps) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [searchInputRaw, setSearchInputRaw, searchInputSanitized] = useSanitizedInput("", "search");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [showRealtimeIndicator, setShowRealtimeIndicator] = useState(true);

  // Hook para atualizações em tempo real
  const {
    isConnected,
    isReconnecting,
    hasNewUpdates,
    newUpdateCount,
    resetUpdateCount,
    hasError,
    error,
    refreshData,
  } = useAdminDashboardRealtime();

  // Fetch payment methods for filter
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods", "all"],
    queryFn: listAllPaymentMethods,
  });

  // Fetch payment stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["payment-stats"],
    queryFn: getPaymentStats,
  });

  // Fetch payments with filters
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    error: paymentsError,
    refetch,
  } = useQuery({
    queryKey: ["pending-payments", filters],
    queryFn: () => listPendingPayments(filters),
  });

  // Apply search filter with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Check rate limit
      const rateLimit = checkRateLimit('search-payment-dashboard', RATE_LIMITS.search);
      if (!rateLimit.allowed) {
        toast({
          title: 'Limite de busca excedido',
          description: `Aguarde ${rateLimit.retryAfter} segundos antes de buscar novamente.`,
          variant: 'destructive'
        });
        return;
      }
      
      setFilters((prev) => ({
        ...prev,
        search: searchInputSanitized.trim() || undefined,
      }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInputSanitized]);

  // Apply date range filter
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      date_from: dateRange.from?.toISOString(),
      date_to: dateRange.to?.toISOString(),
    }));
  }, [dateRange]);

  // Handle status filter change
  const handleStatusFilter = (statuses: PaymentStatus[]) => {
    setFilters((prev) => ({
      ...prev,
      status: statuses.length > 0 ? statuses : undefined,
    }));
  };

  // Handle payment method filter change
  const handlePaymentMethodFilter = (methodId: string) => {
    setFilters((prev) => ({
      ...prev,
      payment_method_id: methodId === "all" ? undefined : methodId,
    }));
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Handle payment selection
  const handlePaymentSelect = (paymentId: string, selected: boolean) => {
    if (selected) {
      setSelectedPayments((prev) => [...prev, paymentId]);
    } else {
      setSelectedPayments((prev) => prev.filter((id) => id !== paymentId));
    }
  };

  // Handle select all
  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      // Select all payments on current page
      const allPaymentIds = sortedPayments.map((p) => p.id);
      setSelectedPayments(allPaymentIds);
    } else {
      // Clear selection
      setSelectedPayments([]);
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedPayments([]);
  };

  // Sort payments
  const sortedPayments = [...payments].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortField) {
      case "created_at":
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case "amount":
        aValue = a.amount;
        bValue = b.amount;
        break;
      case "customer_name":
        aValue = a.customer_name.toLowerCase();
        bValue = b.customer_name.toLowerCase();
        break;
      case "status":
        // Custom status order
        const statusOrder = { pending: 0, under_review: 1, requires_info: 2 };
        aValue = statusOrder[a.status as keyof typeof statusOrder] || 3;
        bValue = statusOrder[b.status as keyof typeof statusOrder] || 3;
        break;
      default:
        return 0;
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Get status badge variant and icon
  const getStatusConfig = (status: PaymentStatus) => {
    switch (status) {
      case "pending":
        return {
          variant: "outline" as const,
          icon: <Clock className="h-3 w-3" />,
          label: "Pendente",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
        };
      case "under_review":
        return {
          variant: "secondary" as const,
          icon: <Eye className="h-3 w-3" />,
          label: "Em Revisão",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        };
      case "requires_info":
        return {
          variant: "destructive" as const,
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Precisa de Info",
          color: "text-orange-600",
          bgColor: "bg-orange-50",
        };
      default:
        return {
          variant: "outline" as const,
          icon: null,
          label: status,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
        };
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearchInputRaw("");
    setDateRange({});
  };

  // Handle export payment
  const handleExportPayment = (paymentId: string) => {
    toast({
      title: "Exportação iniciada",
      description: `O pagamento ${paymentId} será exportado em breve.`,
    });
    // TODO: Implement actual export logic
    console.log("Exporting payment:", paymentId);
  };

  // Handle real-time update notification
  const handleRealtimeUpdate = () => {
    toast({
      title: "Atualização em tempo real",
      description: "Os dados foram atualizados automaticamente.",
      duration: 2000,
    });
    resetUpdateCount();
  };

  // Efeito para mostrar notificação quando há novas atualizações
  useEffect(() => {
    if (hasNewUpdates && newUpdateCount > 0) {
      handleRealtimeUpdate();
    }
  }, [hasNewUpdates, newUpdateCount]);

  // Função para reconectar manualmente
  const handleManualReconnect = () => {
    refreshData();
    toast({
      title: "Reconectando...",
      description: "Tentando reconectar ao servidor em tempo real.",
    });
  };

  if (paymentsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard de Pagamentos</CardTitle>
          <CardDescription>Gerencie pagamentos manuais pendentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erro ao carregar pagamentos</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{paymentsError.message}</p>
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard de Pagamentos</h1>
            {hasNewUpdates && (
              <Badge variant="default" className="animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                {newUpdateCount} nova{newUpdateCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              Gerencie pagamentos manuais pendentes de verificação
            </p>
            <Badge
              variant={isConnected ? "default" : "destructive"}
              className="text-xs flex items-center gap-1"
            >
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              resetUpdateCount();
            }}
            disabled={isReconnecting}
          >
            {isReconnecting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.pending_count || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Aguardando comprovante</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Revisão</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.under_review_count || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Comprovante enviado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precisa de Info</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.requires_info_count || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Aguardando resposta do cliente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(stats?.total_pending_amount || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Em pagamentos pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>
                Filtre os pagamentos por status, método, data ou busca
              </CardDescription>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="sm:hidden">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Aplique filtros para encontrar pagamentos específicos
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-6">
                  <MobileFilters
                    paymentMethods={paymentMethods}
                    filters={filters}
                    onStatusFilter={handleStatusFilter}
                    onPaymentMethodFilter={handlePaymentMethodFilter}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                  <div className="pt-4 border-t">
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={clearFilters}>
                        Limpar Filtros
                      </Button>
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => {
                          // Fecha o drawer
                          const sheetClose = document.querySelector(
                            '[data-state="open"] button[aria-label="Close"]'
                          ) as HTMLButtonElement;
                          sheetClose?.click();
                        }}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex flex-wrap gap-2">
                {(["pending", "under_review", "requires_info"] as PaymentStatus[]).map((status) => {
                  const config = getStatusConfig(status);
                  const isActive = filters.status?.includes(status);
                  return (
                    <Button
                      key={status}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => {
                        const currentStatuses = filters.status || [];
                        if (isActive) {
                          handleStatusFilter(currentStatuses.filter((s) => s !== status));
                        } else {
                          handleStatusFilter([...currentStatuses, status]);
                        }
                      }}
                    >
                      {config.icon}
                      <span className="ml-1">{config.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Método de Pagamento</label>
              <Select
                value={filters.payment_method_id || ""}
                onValueChange={handlePaymentMethodFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos os métodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os métodos</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Selecione o período"
                className="w-full"
              />
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Número ou cliente..."
                  className="pl-9 w-full"
                  value={searchInputRaw}
                  onChange={(e) => setSearchInputRaw(e.target.value)}
                />
              </div>
              {searchInputRaw !== searchInputSanitized && searchInputRaw.length > 0 && (
                <ValidationFeedback 
                  info="Caracteres especiais foram removidos da busca"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Pagamentos</CardTitle>
              <CardDescription>
                {sortedPayments.length} pagamento{sortedPayments.length !== 1 ? "s" : ""} encontrado
                {sortedPayments.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-r-none h-8 px-3"
                  onClick={() => setViewMode("table")}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-l-none h-8 px-3"
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden sm:flex">
                    Ordenar por
                    {sortDirection === "asc" ? (
                      <ChevronUp className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSort("created_at")}>
                    Data {sortField === "created_at" && (sortDirection === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("amount")}>
                    Valor {sortField === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("customer_name")}>
                    Cliente {sortField === "customer_name" && (sortDirection === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("status")}>
                    Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="sm:hidden">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSort("created_at")}>
                    Data {sortField === "created_at" && (sortDirection === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("amount")}>
                    Valor {sortField === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("customer_name")}>
                    Cliente {sortField === "customer_name" && (sortDirection === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("status")}>
                    Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedPayments.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">Nenhum pagamento encontrado com os filtros atuais.</p>
              <p className="text-sm text-gray-400 mt-1">
                Tente ajustar os filtros ou verifique se há pagamentos pendentes.
              </p>
            </div>
          ) : viewMode === "table" ? (
            <>
              {/* Mobile Cards View (hidden on larger screens) */}
              <div className="sm:hidden space-y-4">
                {sortedPayments.map((payment) => {
                  const statusConfig = getStatusConfig(payment.status);
                  const isSelected = selectedPayments.includes(payment.id);
                  return (
                    <Card
                      key={payment.id}
                      className={isSelected ? "border-primary bg-blue-50" : ""}
                    >
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="font-medium text-lg">{payment.reference_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(payment.created_at)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="p-1 hover:bg-gray-100 rounded"
                              onClick={() => handlePaymentSelect(payment.id, !isSelected)}
                              title={isSelected ? "Desmarcar" : "Marcar"}
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onViewPayment?.(payment.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Cliente</span>
                            <span className="text-sm">{payment.customer_name}</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Valor</span>
                            <span className="font-medium">
                              {formatCurrency(payment.amount, payment.currency)}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Método</span>
                            <span className="text-sm">{payment.payment_method_name}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Status</span>
                            <Badge
                              variant={statusConfig.variant}
                              className={`${statusConfig.bgColor} ${statusConfig.color} flex items-center gap-1`}
                            >
                              {statusConfig.icon}
                              {statusConfig.label}
                            </Badge>
                          </div>

                          <div className="flex gap-2 pt-2">
                            {payment.file_count > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                {payment.file_count} arquivo{payment.file_count !== 1 ? "s" : ""}
                              </Badge>
                            )}
                            {payment.unread_messages > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {payment.unread_messages} mensagem
                                {payment.unread_messages !== 1 ? "ns" : ""}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <div className="flex items-center">
                          <button
                            type="button"
                            className="p-1 hover:bg-gray-100 rounded"
                            onClick={() =>
                              handleSelectAll(selectedPayments.length !== sortedPayments.length)
                            }
                            title={
                              selectedPayments.length === sortedPayments.length &&
                              sortedPayments.length > 0
                                ? "Desmarcar todos"
                                : "Marcar todos"
                            }
                          >
                            {selectedPayments.length === sortedPayments.length &&
                            sortedPayments.length > 0 ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPayments.map((payment) => {
                      const statusConfig = getStatusConfig(payment.status);
                      const isSelected = selectedPayments.includes(payment.id);
                      return (
                        <TableRow key={payment.id} className={isSelected ? "bg-blue-50" : ""}>
                          <TableCell>
                            <div className="flex items-center">
                              <button
                                type="button"
                                className="p-1 hover:bg-gray-100 rounded"
                                onClick={() => handlePaymentSelect(payment.id, !isSelected)}
                                title={isSelected ? "Desmarcar" : "Marcar"}
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{payment.reference_number}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.customer_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {payment.customer_email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell>{payment.payment_method_name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={statusConfig.variant}
                              className={`${statusConfig.bgColor} ${statusConfig.color} flex items-center gap-1`}
                            >
                              {statusConfig.icon}
                              {statusConfig.label}
                            </Badge>
                            <div className="flex items-center gap-2 mt-1">
                              {payment.file_count > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {payment.file_count}
                                </Badge>
                              )}
                              {payment.unread_messages > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  {payment.unread_messages}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(payment.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewPayment?.(payment.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => onViewPayment?.(payment.id)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportPayment(payment.id)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedPayments.map((payment) => (
                <PaymentListItemCard
                  key={payment.id}
                  payment={payment}
                  onViewPayment={onViewPayment}
                  isSelected={selectedPayments.includes(payment.id)}
                  onSelectChange={handlePaymentSelect}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operations Toolbar */}
      <BulkOperationsToolbar
        selectedPayments={selectedPayments}
        payments={sortedPayments}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onSelectionChange={setSelectedPayments}
      />

      {/* Realtime Indicator */}
      {showRealtimeIndicator && (
        <RealtimeIndicator
          isConnected={isConnected}
          isReconnecting={isReconnecting}
          hasError={hasError}
          errorMessage={error?.message}
          hasNewUpdates={hasNewUpdates}
          newUpdateCount={newUpdateCount}
          size="md"
          position="bottom-right"
          showAlways={false}
          onReconnect={handleManualReconnect}
        />
      )}
    </div>
  );
}

// Mobile Filters Component
interface MobileFiltersProps {
  paymentMethods: any[];
  filters: PaymentFilters;
  onStatusFilter: (statuses: PaymentStatus[]) => void;
  onPaymentMethodFilter: (methodId: string) => void;
  dateRange: { from?: Date; to?: Date };
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void;
}

function MobileFilters({
  paymentMethods,
  filters,
  onStatusFilter,
  onPaymentMethodFilter,
  dateRange,
  onDateRangeChange,
}: MobileFiltersProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Status</h3>
        <div className="flex flex-wrap gap-2">
          {(["pending", "under_review", "requires_info"] as PaymentStatus[]).map((status) => {
            const isActive = filters.status?.includes(status);
            return (
              <Button
                key={status}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => {
                  const currentStatuses = filters.status || [];
                  if (isActive) {
                    onStatusFilter(currentStatuses.filter((s) => s !== status));
                  } else {
                    onStatusFilter([...currentStatuses, status]);
                  }
                }}
              >
                {status === "pending" && "Pendente"}
                {status === "under_review" && "Em Revisão"}
                {status === "requires_info" && "Precisa de Info"}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Método de Pagamento</h3>
        <Select value={filters.payment_method_id || ""} onValueChange={onPaymentMethodFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os métodos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os métodos</SelectItem>
            {paymentMethods.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                {method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Período</h3>
        <DateRangePicker
          value={dateRange}
          onChange={onDateRangeChange}
          placeholder="Selecione o período"
        />
      </div>
    </div>
  );
}
