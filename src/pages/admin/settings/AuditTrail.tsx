import { useState } from "react";
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
import { History, Search, Filter, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { toBahiaTime } from "@/lib/timezone";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { ValidationFeedback } from "@/components/ui/validation-feedback";
import { useToast } from "@/hooks/use-toast";
import {
  useAuditTrailRecords,
  useAuditTrailSearch,
  type AuditRecord,
  type AuditTrailFilters,
} from "@/hooks/admin/useAuditTrail";

const ITEMS_PER_PAGE = 50;

const ORDER_TYPE_LABELS: Record<string, string> = {
  subscription_delivery: "Assinatura",
  standalone_purchase: "Compra Avulsa",
  manual_payment: "Pagamento Manual",
  quote: "Orçamento",
};

export default function AuditTrail() {
  const { toast } = useToast();
  const [searchTermRaw, setSearchTermRaw, searchTermSanitized] = useSanitizedInput("", "search");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const filters: AuditTrailFilters = {
    limit: ITEMS_PER_PAGE,
    offset,
    ...(orderTypeFilter !== "all" ? { changeReason: orderTypeFilter } : {}),
    ...(startDate ? { startDate: new Date(startDate).toISOString() } : {}),
    ...(endDate ? { endDate: new Date(endDate).toISOString() } : {}),
  };

  const auditQuery = useAuditTrailRecords(filters);

  const searchQuery = useAuditTrailSearch(searchTermSanitized, ITEMS_PER_PAGE, (retryAfter) => {
    toast({
      title: "Limite de busca excedido",
      description: `Aguarde ${retryAfter} segundos antes de buscar novamente.`,
      variant: "destructive",
    });
  });

  const displayData = searchTermSanitized.length >= 3
    ? { data: searchQuery.data || [], count: searchQuery.data?.length || 0 }
    : auditQuery.data || { data: [], count: 0 };

  const totalPages = Math.ceil(displayData.count / ITEMS_PER_PAGE);

  const formatBahiaDate = (dateString: string) => {
    const bahiaDate = toBahiaTime(new Date(dateString));
    return format(bahiaDate, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  return (
    <>
      <SEOHead
        title="Admin - Trilha de Auditoria"
        description="Histórico completo de mudanças de status"
        noindex={true}
      />

      <AdminLayout>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <History className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Trilha de Auditoria</h1>
          </div>
          <p className="text-muted-foreground">
            Histórico completo de todas as mudanças de status dos pedidos
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar por Responsável</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Nome do responsável..."
                    value={searchTermRaw}
                    onChange={(e) => setSearchTermRaw(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {searchTermRaw.length > 0 && searchTermRaw.length < 3 && (
                  <p className="text-xs text-muted-foreground">Digite pelo menos 3 caracteres</p>
                )}
                {searchTermRaw !== searchTermSanitized && searchTermRaw.length > 0 && (
                  <ValidationFeedback info="Caracteres especiais foram removidos da busca" />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Pedido</Label>
                <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="subscription_delivery">Assinatura</SelectItem>
                    <SelectItem value="standalone_purchase">Compra Avulsa</SelectItem>
                    <SelectItem value="manual_payment">Pagamento Manual</SelectItem>
                    <SelectItem value="quote">Orçamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTermRaw("");
                  setOrderTypeFilter("all");
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
              Registros de Auditoria
              {displayData.count > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({displayData.count} {displayData.count === 1 ? "registro" : "registros"})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Página {currentPage} de {totalPages || 1}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditQuery.isLoading || searchQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : displayData.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Mudança de Status</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayData.data.map((record: AuditRecord) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono text-xs whitespace-nowrap">
                            {formatBahiaDate(record.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {ORDER_TYPE_LABELS[record.order_type] || record.order_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {record.order_id?.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {record.old_status ? (
                                <>
                                  <Badge variant="secondary" className="text-xs">{record.old_status}</Badge>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  <Badge variant="default" className="text-xs">{record.new_status}</Badge>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs text-muted-foreground mr-1">Inicial:</span>
                                  <Badge variant="default" className="text-xs">{record.new_status}</Badge>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.changed_by_name || <span className="text-muted-foreground">Sistema</span>}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                            {record.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {offset + 1} a {Math.min(offset + ITEMS_PER_PAGE, displayData.count)} de {displayData.count}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4 mr-1" />Anterior
                      </Button>
                      <div className="text-sm">Página {currentPage} de {totalPages}</div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                        Próxima<ChevronRight className="h-4 w-4 ml-1" />
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
