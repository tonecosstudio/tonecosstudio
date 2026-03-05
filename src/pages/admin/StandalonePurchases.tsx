// @ts-nocheck
﻿import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ShoppingBag, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAllStandalonePurchases, searchStandalonePurchasesByCustomer } from "@/services/standalone-purchase-service";
import { toBahiaTime } from "@/lib/timezone";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { ValidationFeedback } from "@/components/ui/validation-feedback";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limiter";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 50;

// Componente de conteÃºdo sem layout (para ser usado dentro de outras pÃ¡ginas)
export function StandalonePurchasesContent() {
  const { toast } = useToast();
  const [searchTermRaw, setSearchTermRaw, searchTermSanitized] = useSanitizedInput("", "search");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate offset for pagination
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // Fetch standalone purchases data
  const purchasesQuery = useQuery({
    queryKey: ["standalone-purchases", statusFilter, cycleFilter, startDate, endDate, currentPage],
    queryFn: async () => {
      const filters: any = {
        limit: ITEMS_PER_PAGE,
        offset,
      };

      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }

      if (cycleFilter !== "all") {
        filters.cycleId = cycleFilter;
      }

      if (startDate) {
        filters.startDate = new Date(startDate).toISOString();
      }

      if (endDate) {
        filters.endDate = new Date(endDate).toISOString();
      }

      return getAllStandalonePurchases(filters);
    },
  });

  // Search by customer name or order ID
  const searchQuery = useQuery({
    queryKey: ["standalone-purchases-search", searchTermSanitized],
    enabled: searchTermSanitized.length >= 3,
    queryFn: async () => {
      // Check rate limit
      const rateLimit = checkRateLimit('search-standalone-purchases', RATE_LIMITS.search);
      if (!rateLimit.allowed) {
        toast({
          title: 'Limite de busca excedido',
          description: `Aguarde ${rateLimit.retryAfter} segundos antes de buscar novamente.`,
          variant: 'destructive'
        });
        throw new Error('Rate limit exceeded');
      }
      
      return searchStandalonePurchasesByCustomer(searchTermSanitized, ITEMS_PER_PAGE);
    },
  });

  // Use search results if searching, otherwise use filtered results
  const displayData = searchTermSanitized.length >= 3 
    ? { data: searchQuery.data || [], count: searchQuery.data?.length || 0 }
    : purchasesQuery.data || { data: [], count: 0 };

  const totalPages = Math.ceil(displayData.count / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "deposit_paid":
        return <Badge variant="secondary">DepÃ³sito Pago</Badge>;
      case "awaiting_balance":
        return <Badge variant="default" className="bg-yellow-500">Aguardando Saldo</Badge>;
      case "balance_paid":
        return <Badge variant="default" className="bg-green-500">Saldo Pago</Badge>;
      case "shipped":
        return <Badge variant="default" className="bg-blue-500">Enviado</Badge>;
      case "delivered":
        return <Badge variant="default" className="bg-green-700">Entregue</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatBahiaDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const bahiaDate = toBahiaTime(new Date(dateString));
    return format(bahiaDate, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const formatCycle = (cycle: any) => {
    if (!cycle) return "-";
    return `Ciclo ${cycle.cycle_number} - ${cycle.month}/${cycle.year}`;
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Compras Avulsas</h1>
        </div>
        <p className="text-muted-foreground">
          Gerenciamento de todas as compras avulsas com modelo de depÃ³sito
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre e pesquise compras avulsas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search by customer or order ID */}
            <div className="space-y-2">
              <Label htmlFor="search">Buscar Cliente ou ID</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, email ou ID..."
                  value={searchTermRaw}
                  onChange={(e) => setSearchTermRaw(e.target.value)}
                  className="pl-8"
                />
              </div>
              {searchTermRaw.length > 0 && searchTermRaw.length < 3 && (
                <p className="text-xs text-muted-foreground">
                  Digite pelo menos 3 caracteres
                </p>
              )}
              {searchTermRaw !== searchTermSanitized && searchTermRaw.length > 0 && (
                <ValidationFeedback 
                  info="Caracteres especiais foram removidos da busca"
                />
              )}
            </div>

            {/* Status filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="deposit_paid">DepÃ³sito Pago</SelectItem>
                  <SelectItem value="awaiting_balance">Aguardando Saldo</SelectItem>
                  <SelectItem value="balance_paid">Saldo Pago</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Clear filters button */}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTermRaw("");
                setStatusFilter("all");
                setCycleFilter("all");
                setStartDate("");
                setEndDate("");
                setCurrentPage(1);
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Compras Avulsas
            {displayData.count > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({displayData.count} {displayData.count === 1 ? "compra" : "compras"})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Mostrando pÃ¡gina {currentPage} de {totalPages || 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purchasesQuery.isLoading || searchQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : displayData.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma compra encontrada
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID do Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>ColeÃ§Ã£o</TableHead>
                      <TableHead>Ciclo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data DepÃ³sito</TableHead>
                      <TableHead>Prazo Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData.data.map((purchase: any) => (
                      <TableRow 
                        key={purchase.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          // TODO: Navigate to detail view
                          console.log('View purchase:', purchase.id);
                        }}
                      >
                        <TableCell className="font-mono text-xs">
                          {purchase.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {purchase.profiles?.full_name || "N/A"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {purchase.profiles?.email || "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {purchase.collections?.name || "N/A"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              R$ {purchase.price_full?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCycle(purchase.cycles)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(purchase.status)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatBahiaDate(purchase.deposit_paid_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {purchase.balance_due_date ? (
                            <div className="flex flex-col">
                              <span>{formatBahiaDate(purchase.balance_due_date)}</span>
                              {purchase.status === 'awaiting_balance' && 
                               new Date(purchase.balance_due_date) < new Date() && (
                                <span className="text-xs text-red-500 font-medium">
                                  Vencido
                                </span>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {offset + 1} a {Math.min(offset + ITEMS_PER_PAGE, displayData.count)} de {displayData.count} compras
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="text-sm">
                      PÃ¡gina {currentPage} de {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      PrÃ³xima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Componente principal (para uso standalone)
export default function StandalonePurchases() {
  return (
    <>
      <SEOHead
        title="Admin - Compras Avulsas"
        description="Gerenciamento de compras avulsas"
        noindex={true}
      />

      <StandalonePurchasesContent />
    </>
  );
}

