// @ts-nocheck
import { useState } from "react";
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
import { History, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAllCollectionChanges, searchCollectionChangesBySubscriber } from "@/services/audit-trail-service";
import { toBahiaTime } from "@/lib/timezone";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { ValidationFeedback } from "@/components/ui/validation-feedback";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limiter";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 50;

export default function AuditTrail() {
  const { toast } = useToast();
  const [searchTermRaw, setSearchTermRaw, searchTermSanitized] = useSanitizedInput("", "search");
  const [changeReasonFilter, setChangeReasonFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate offset for pagination
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // Fetch audit trail data
  const auditQuery = useQuery({
    queryKey: ["audit-trail", changeReasonFilter, startDate, endDate, currentPage],
    queryFn: async () => {
      const filters: any = {
        limit: ITEMS_PER_PAGE,
        offset,
      };

      if (changeReasonFilter !== "all") {
        filters.changeReason = changeReasonFilter;
      }

      if (startDate) {
        filters.startDate = new Date(startDate).toISOString();
      }

      if (endDate) {
        filters.endDate = new Date(endDate).toISOString();
      }

      return getAllCollectionChanges(filters);
    },
  });

  // Search by subscriber name
  const searchQuery = useQuery({
    queryKey: ["audit-trail-search", searchTermSanitized],
    enabled: searchTermSanitized.length >= 3,
    queryFn: async () => {
      // Check rate limit
      const rateLimit = checkRateLimit('search-audit-trail', RATE_LIMITS.search);
      if (!rateLimit.allowed) {
        toast({
          title: 'Limite de busca excedido',
          description: `Aguarde ${rateLimit.retryAfter} segundos antes de buscar novamente.`,
          variant: 'destructive'
        });
        throw new Error('Rate limit exceeded');
      }
      
      return searchCollectionChangesBySubscriber(searchTermSanitized, ITEMS_PER_PAGE);
    },
  });

  // Use search results if searching, otherwise use filtered results
  const displayData = searchTermSanitized.length >= 3 
    ? { data: searchQuery.data || [], count: searchQuery.data?.length || 0 }
    : auditQuery.data || { data: [], count: 0 };

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

  const getChangeReasonBadge = (reason: string) => {
    switch (reason) {
      case "manual":
        return <Badge variant="default">Manual</Badge>;
      case "automatic_maintenance":
        return <Badge variant="secondary">Auto-Manutenção</Badge>;
      case "admin_override":
        return <Badge variant="destructive">Admin</Badge>;
      default:
        return <Badge variant="outline">{reason}</Badge>;
    }
  };

  const formatBahiaDate = (dateString: string) => {
    const bahiaDate = toBahiaTime(new Date(dateString));
    return format(bahiaDate, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  return (
    <>
      <SEOHead
        title="Admin - Trilha de Auditoria"
        description="Histórico completo de mudanças de coleção"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <History className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Trilha de Auditoria</h1>
          </div>
          <p className="text-muted-foreground">
            Histórico completo de todas as mudanças de coleção realizadas por assinantes
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
              Filtre e pesquise mudanças de coleção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search by subscriber */}
              <div className="space-y-2">
                <Label htmlFor="search">Buscar Assinante</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Nome ou email..."
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

              {/* Change reason filter */}
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da Mudança</Label>
                <Select value={changeReasonFilter} onValueChange={setChangeReasonFilter}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatic_maintenance">Auto-Manutenção</SelectItem>
                    <SelectItem value="admin_override">Admin</SelectItem>
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
                  setChangeReasonFilter("all");
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
              Registros de Mudanças
              {displayData.count > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({displayData.count} {displayData.count === 1 ? "registro" : "registros"})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Mostrando página {currentPage} de {totalPages || 1}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditQuery.isLoading || searchQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : displayData.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum registro encontrado
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Assinante</TableHead>
                        <TableHead>Coleção Anterior</TableHead>
                        <TableHead>Nova Coleção</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayData.data.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono text-xs">
                            {formatBahiaDate(record.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {record.user?.full_name || "N/A"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {record.user?.email || "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.previous_collection?.name || (
                              <span className="text-muted-foreground italic">
                                Primeira escolha
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {record.new_collection?.name || "N/A"}
                          </TableCell>
                          <TableCell>
                            {getChangeReasonBadge(record.change_reason)}
                            {record.changed_by_admin && (
                              <div className="text-xs text-muted-foreground mt-1">
                                por {record.admin_user?.full_name || "Admin"}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {record.ip_address || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs">
                            {record.user_agent || (
                              <span className="text-muted-foreground">-</span>
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
                      Mostrando {offset + 1} a {Math.min(offset + ITEMS_PER_PAGE, displayData.count)} de {displayData.count} registros
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
                        Página {currentPage} de {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </AdminLayout>
    </>
  );
}
