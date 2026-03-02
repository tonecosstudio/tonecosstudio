/**
 * PaymentVerification Page
 *
 * Admin page for verifying payment vouchers from both manual payments and standalone purchases.
 * Displays a unified queue of all orders pending payment verification.
 *
 * Requirements: 25.6
 * Task: 25.4 Create payment verification queue page
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toBahiaTime } from "@/lib/timezone";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { ValidationFeedback } from "@/components/ui/validation-feedback";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limiter";

const ITEMS_PER_PAGE = 50;

// Type for unified payment verification item
interface PaymentVerificationItem {
  id: string;
  type: 'manual_payment' | 'standalone_purchase';
  referenceNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: string;
  voucherUrl: string | null;
  voucherType?: 'deposit' | 'balance'; // For standalone purchases
  createdAt: string;
  dueDate?: string | null;
}

export default function PaymentVerification() {
  const queryClient = useQueryClient();
  const [searchTermRaw, setSearchTermRaw, searchTermSanitized] = useSanitizedInput("", "search");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal state
  const [selectedItem, setSelectedItem] = useState<PaymentVerificationItem | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Calculate offset for pagination
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // Fetch pending verification items
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["payment-verification", typeFilter, statusFilter, startDate, endDate, currentPage],
    queryFn: async () => {
      const items: PaymentVerificationItem[] = [];

      // Fetch manual payments pending verification
      if (typeFilter === "all" || typeFilter === "manual_payment") {
        const manualPaymentsQuery = supabase
          .from("manual_payments")
          .select(`
            id,
            reference_number,
            amount,
            currency,
            status,
            created_at,
            user:user_id (
              full_name,
              email
            )
          `)
          .in("status", ["pending", "under_review"]);

        if (startDate) {
          manualPaymentsQuery.gte("created_at", new Date(startDate).toISOString());
        }
        if (endDate) {
          manualPaymentsQuery.lte("created_at", new Date(endDate).toISOString());
        }

        const { data: manualPayments, error: mpError } = await manualPaymentsQuery;

        if (mpError) throw mpError;

        if (manualPayments) {
          for (const payment of manualPayments) {
            // Get payment files
            const { data: files } = await supabase
              .from("payment_files")
              .select("file_path")
              .eq("payment_id", payment.id)
              .order("created_at", { ascending: false })
              .limit(1);

            items.push({
              id: payment.id,
              type: "manual_payment",
              referenceNumber: payment.reference_number,
              customerName: (payment.user as any)?.full_name || "N/A",
              customerEmail: (payment.user as any)?.email || "N/A",
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              voucherUrl: files && files.length > 0 ? files[0].file_path : null,
              createdAt: payment.created_at,
            });
          }
        }
      }

      // Fetch standalone purchases with vouchers pending verification
      if (typeFilter === "all" || typeFilter === "standalone_purchase") {
        const standalonePurchasesQuery = supabase
          .from("standalone_purchases")
          .select(`
            id,
            deposit_amount,
            balance_amount,
            total_amount,
            status,
            payment_voucher_deposit_url,
            payment_voucher_balance_url,
            created_at,
            balance_due_date,
            user:user_id (
              full_name,
              email
            ),
            collection:collection_id (
              name
            )
          `)
          .in("status", ["deposit_paid", "awaiting_balance"]);

        if (startDate) {
          standalonePurchasesQuery.gte("created_at", new Date(startDate).toISOString());
        }
        if (endDate) {
          standalonePurchasesQuery.lte("created_at", new Date(endDate).toISOString());
        }

        const { data: standalonePurchases, error: spError } = await standalonePurchasesQuery;

        if (spError) throw spError;

        if (standalonePurchases) {
          for (const purchase of standalonePurchases) {
            // Add deposit voucher if exists and status is deposit_paid
            if (purchase.payment_voucher_deposit_url && purchase.status === "deposit_paid") {
              items.push({
                id: purchase.id,
                type: "standalone_purchase",
                referenceNumber: `SP-${purchase.id.substring(0, 8)}`,
                customerName: (purchase.user as any)?.full_name || "N/A",
                customerEmail: (purchase.user as any)?.email || "N/A",
                amount: purchase.deposit_amount,
                currency: "BRL",
                status: "deposit_pending",
                voucherUrl: purchase.payment_voucher_deposit_url,
                voucherType: "deposit",
                createdAt: purchase.created_at,
              });
            }

            // Add balance voucher if exists and status is awaiting_balance
            if (purchase.payment_voucher_balance_url && purchase.status === "awaiting_balance") {
              items.push({
                id: purchase.id,
                type: "standalone_purchase",
                referenceNumber: `SP-${purchase.id.substring(0, 8)}`,
                customerName: (purchase.user as any)?.full_name || "N/A",
                customerEmail: (purchase.user as any)?.email || "N/A",
                amount: purchase.balance_amount,
                currency: "BRL",
                status: "balance_pending",
                voucherUrl: purchase.payment_voucher_balance_url,
                voucherType: "balance",
                createdAt: purchase.created_at,
                dueDate: purchase.balance_due_date,
              });
            }
          }
        }
      }

      // Sort by created date (newest first)
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply search filter
      let filteredItems = items;
      if (searchTermSanitized.trim()) {
        // Check rate limit for search
        const rateLimit = checkRateLimit('search-payment-verification', RATE_LIMITS.search);
        if (!rateLimit.allowed) {
          throw new Error(`Rate limit exceeded. Wait ${rateLimit.retryAfter} seconds.`);
        }
        
        const search = searchTermSanitized.toLowerCase();
        filteredItems = items.filter(
          (item) =>
            item.referenceNumber.toLowerCase().includes(search) ||
            item.customerName.toLowerCase().includes(search) ||
            item.customerEmail.toLowerCase().includes(search)
        );
      }

      // Apply pagination
      const paginatedItems = filteredItems.slice(offset, offset + ITEMS_PER_PAGE);

      return {
        data: paginatedItems,
        count: filteredItems.length,
      };
    },
  });

  const displayData = data || { data: [], count: 0 };
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

  const handleViewVoucher = (item: PaymentVerificationItem) => {
    setSelectedItem(item);
    setShowVoucherModal(true);
    setRejectionReason("");
  };

  const handleCloseModal = () => {
    setShowVoucherModal(false);
    setSelectedItem(null);
    setRejectionReason("");
  };

  const handleApprove = async () => {
    if (!selectedItem) return;

    setIsApproving(true);
    try {
      if (selectedItem.type === "manual_payment") {
        // Update manual payment status to approved
        const { error } = await supabase
          .from("manual_payments")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
          })
          .eq("id", selectedItem.id);

        if (error) throw error;

        toast({
          title: "Pagamento aprovado",
          description: `Pagamento ${selectedItem.referenceNumber} foi aprovado com sucesso.`,
        });
      } else if (selectedItem.type === "standalone_purchase") {
        // Update standalone purchase based on voucher type
        if (selectedItem.voucherType === "deposit") {
          // Approve deposit - move to production
          const { error } = await supabase
            .from("standalone_purchases")
            .update({
              status: "awaiting_balance",
              production_complete_at: new Date().toISOString(),
            })
            .eq("id", selectedItem.id);

          if (error) throw error;

          toast({
            title: "Depósito aprovado",
            description: `Depósito da compra ${selectedItem.referenceNumber} foi aprovado.`,
          });
        } else if (selectedItem.voucherType === "balance") {
          // Approve balance - move to balance_paid
          const { error } = await supabase
            .from("standalone_purchases")
            .update({
              status: "balance_paid",
              balance_paid_at: new Date().toISOString(),
            })
            .eq("id", selectedItem.id);

          if (error) throw error;

          toast({
            title: "Saldo aprovado",
            description: `Saldo da compra ${selectedItem.referenceNumber} foi aprovado.`,
          });
        }
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["payment-verification"] });
      handleCloseModal();
    } catch (error: any) {
      console.error("Error approving payment:", error);
      toast({
        title: "Erro ao aprovar",
        description: error.message || "Ocorreu um erro ao aprovar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;

    if (!rejectionReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }

    setIsRejecting(true);
    try {
      if (selectedItem.type === "manual_payment") {
        // Update manual payment status to rejected
        const { error } = await supabase
          .from("manual_payments")
          .update({
            status: "rejected",
            rejection_reason: rejectionReason,
          })
          .eq("id", selectedItem.id);

        if (error) throw error;

        toast({
          title: "Pagamento rejeitado",
          description: `Pagamento ${selectedItem.referenceNumber} foi rejeitado.`,
        });
      } else if (selectedItem.type === "standalone_purchase") {
        // Clear voucher URL to allow re-upload
        const updateData: any = {};
        
        if (selectedItem.voucherType === "deposit") {
          updateData.payment_voucher_deposit_url = null;
        } else if (selectedItem.voucherType === "balance") {
          updateData.payment_voucher_balance_url = null;
        }

        const { error } = await supabase
          .from("standalone_purchases")
          .update(updateData)
          .eq("id", selectedItem.id);

        if (error) throw error;

        // TODO: Send notification to customer with rejection reason
        // This would be implemented in Task 25.5

        toast({
          title: "Comprovante rejeitado",
          description: `Comprovante da compra ${selectedItem.referenceNumber} foi rejeitado.`,
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["payment-verification"] });
      handleCloseModal();
    } catch (error: any) {
      console.error("Error rejecting payment:", error);
      toast({
        title: "Erro ao rejeitar",
        description: error.message || "Ocorreu um erro ao rejeitar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "under_review":
        return <Badge variant="default" className="bg-blue-500">Em Revisão</Badge>;
      case "deposit_pending":
        return <Badge variant="default" className="bg-yellow-500">Depósito Pendente</Badge>;
      case "balance_pending":
        return <Badge variant="default" className="bg-orange-500">Saldo Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "manual_payment":
        return <Badge variant="outline">Pagamento Manual</Badge>;
      case "standalone_purchase":
        return <Badge variant="outline" className="bg-purple-50">Compra Avulsa</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatBahiaDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const bahiaDate = toBahiaTime(new Date(dateString));
    return format(bahiaDate, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Verificação de Pagamentos</h2>
        </div>
        <p className="text-muted-foreground">
          Fila de comprovantes de pagamento pendentes de verificação
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
              Filtre e pesquise comprovantes pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Referência, nome ou email..."
                    value={searchTermRaw}
                    onChange={(e) => setSearchTermRaw(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {searchTermRaw !== searchTermSanitized && searchTermRaw.length > 0 && (
                  <ValidationFeedback 
                    info="Caracteres especiais foram removidos da busca"
                  />
                )}
              </div>

              {/* Type filter */}
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="manual_payment">Pagamentos Manuais</SelectItem>
                    <SelectItem value="standalone_purchase">Compras Avulsas</SelectItem>
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
                  setTypeFilter("all");
                  setStatusFilter("all");
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
              Comprovantes Pendentes
              {displayData.count > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({displayData.count} {displayData.count === 1 ? "item" : "itens"})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Mostrando página {currentPage} de {totalPages || 1}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500">Erro ao carregar dados</p>
                <Button variant="outline" onClick={() => refetch()} className="mt-4">
                  Tentar novamente
                </Button>
              </div>
            ) : displayData.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum comprovante pendente de verificação
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referência</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Prazo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayData.data.map((item) => (
                        <TableRow 
                          key={`${item.type}-${item.id}-${item.voucherType || ''}`}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <TableCell className="font-mono text-sm">
                            {item.referenceNumber}
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(item.type)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {item.customerName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {item.customerEmail}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(item.amount, item.currency)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(item.status)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatBahiaDate(item.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.dueDate ? (
                              <div className="flex flex-col">
                                <span>{formatBahiaDate(item.dueDate)}</span>
                                {new Date(item.dueDate) < new Date() && (
                                  <span className="text-xs text-red-500 font-medium">
                                    Vencido
                                  </span>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewVoucher(item)}
                              disabled={!item.voucherUrl}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Verificar
                            </Button>
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
                      Mostrando {offset + 1} a {Math.min(offset + ITEMS_PER_PAGE, displayData.count)} de {displayData.count} itens
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

        {/* Voucher Verification Modal */}
        <Dialog open={showVoucherModal} onOpenChange={setShowVoucherModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Verificar Comprovante de Pagamento</DialogTitle>
              <DialogDescription>
                Revise o comprovante e aprove ou rejeite o pagamento
              </DialogDescription>
            </DialogHeader>

            {selectedItem && (
              <div className="space-y-6">
                {/* Payment Details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Referência</Label>
                    <p className="font-mono text-sm">{selectedItem.referenceNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <div className="mt-1">{getTypeBadge(selectedItem.type)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cliente</Label>
                    <p className="text-sm">{selectedItem.customerName}</p>
                    <p className="text-xs text-muted-foreground">{selectedItem.customerEmail}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor</Label>
                    <p className="text-sm font-medium">
                      {formatCurrency(selectedItem.amount, selectedItem.currency)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data</Label>
                    <p className="text-sm">{formatBahiaDate(selectedItem.createdAt)}</p>
                  </div>
                  {selectedItem.dueDate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Prazo</Label>
                      <p className="text-sm">{formatBahiaDate(selectedItem.dueDate)}</p>
                      {new Date(selectedItem.dueDate) < new Date() && (
                        <p className="text-xs text-red-500 font-medium">Vencido</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Voucher Image/PDF */}
                <div className="space-y-2">
                  <Label>Comprovante</Label>
                  {selectedItem.voucherUrl ? (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      {selectedItem.voucherUrl.toLowerCase().endsWith('.pdf') ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Arquivo PDF</p>
                          <Button
                            variant="outline"
                            onClick={() => window.open(selectedItem.voucherUrl!, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Abrir PDF
                          </Button>
                        </div>
                      ) : (
                        <img
                          src={selectedItem.voucherUrl}
                          alt="Comprovante de pagamento"
                          className="max-w-full h-auto rounded-lg"
                          style={{ maxHeight: '500px', objectFit: 'contain' }}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum comprovante disponível</p>
                  )}
                </div>

                {/* Rejection Reason */}
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">
                    Motivo da Rejeição
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Informe o motivo da rejeição (obrigatório para rejeitar)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    O cliente receberá este motivo e poderá enviar um novo comprovante
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                disabled={isApproving || isRejecting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isApproving || isRejecting || !rejectionReason.trim()}
              >
                {isRejecting ? (
                  <>Rejeitando...</>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </>
                )}
              </Button>
              <Button
                variant="default"
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? (
                  <>Aprovando...</>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
