/**
 * Character Choice Manager Page
 *
 * Admin interface for managing customer character choices.
 * Features:
 * - Display table of all choices with status
 * - Filters: Status, Collection, Deadline range
 * - Search by customer name/email
 * - Deadline countdown with color coding
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPendingChoices, type ChoiceFilters, type CharacterChoice } from "@/services/admin/choice-service";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ChoiceApprovalModal } from "@/components/admin/ChoiceApprovalModal";
import { Search, Filter, X, Clock, User, Package } from "lucide-react";
import type { ChoiceStatus } from "@/services/admin/production-service";

// Status options with labels
const STATUS_OPTIONS: Array<{
  value: ChoiceStatus;
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}> = [
  { value: "pending", label: "Pendente", variant: "secondary" },
  { value: "submitted", label: "Submetido", variant: "default" },
  { value: "approved", label: "Aprovado", variant: "default" },
  { value: "rejected", label: "Rejeitado", variant: "destructive" },
  { value: "locked", label: "Bloqueado", variant: "outline" },
];

export default function CharacterChoiceManagerPage() {
  const [filters, setFilters] = useState<ChoiceFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<CharacterChoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch choices
  const { data: choices, isLoading } = useQuery({
    queryKey: ["character-choices", filters, searchQuery],
    queryFn: () =>
      fetchPendingChoices({
        ...filters,
        searchQuery,
      }),
  });

  // Fetch collections for filter
  const { data: collections } = useQuery({
    queryKey: ["collections-for-choice-filters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate active filter count
  const activeFilterCount =
    (filters.statuses?.length || 0) +
    (filters.collections?.length || 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  // Handler for status toggle
  const handleStatusToggle = (status: ChoiceStatus) => {
    const currentStatuses = filters.statuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];

    setFilters({
      ...filters,
      statuses: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  // Handler for collection toggle
  const handleCollectionToggle = (collectionId: string) => {
    const currentCollections = filters.collections || [];
    const newCollections = currentCollections.includes(collectionId)
      ? currentCollections.filter((id) => id !== collectionId)
      : [...currentCollections, collectionId];

    setFilters({
      ...filters,
      collections: newCollections.length > 0 ? newCollections : undefined,
    });
  };

  // Handler for date range change
  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    setFilters({
      ...filters,
      dateFrom: range.from ? range.from.toISOString().split("T")[0] : undefined,
      dateTo: range.to ? range.to.toISOString().split("T")[0] : undefined,
    });
  };

  // Handler for reset filters
  const handleResetFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

  // Handler for opening modal
  const handleViewDetails = (choice: CharacterChoice) => {
    setSelectedChoice(choice);
    setIsModalOpen(true);
  };

  // Handler for closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Delay clearing selected choice to allow modal animation to complete
    setTimeout(() => setSelectedChoice(null), 200);
  };

  // Calculate deadline urgency
  const getDeadlineColor = (deadline: string): string => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) return "text-gray-500"; // Expired
    if (hoursRemaining < 24) return "text-red-600"; // < 24h
    if (hoursRemaining < 48) return "text-yellow-600"; // < 48h
    return "text-green-600"; // > 48h
  };

  // Format deadline countdown
  const formatDeadlineCountdown = (deadline: string): string => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) return "Expirado";
    if (hoursRemaining < 24) return `${Math.floor(hoursRemaining)}h restantes`;
    if (hoursRemaining < 48) return `${Math.floor(hoursRemaining / 24)}d ${Math.floor(hoursRemaining % 24)}h`;
    
    const daysRemaining = Math.floor(hoursRemaining / 24);
    return `${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"}`;
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gerenciamento de Escolhas de Personagens
            </h1>
            <p className="text-sm text-gray-500">
              Gerencie as escolhas de personagens dos clientes com prazos e aprovações
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filters Sidebar */}
        <aside className="w-80 border-r bg-white overflow-y-auto">
          <Card className="border-0 rounded-none shadow-none">
            <CardContent className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Filtros</h3>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </div>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Buscar Cliente
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Status</Label>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${value}`}
                        checked={filters.statuses?.includes(value) || false}
                        onCheckedChange={() => handleStatusToggle(value)}
                      />
                      <label
                        htmlFor={`status-${value}`}
                        className="text-sm text-foreground cursor-pointer flex-1"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collection Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Coleções</Label>
                {collections && collections.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {collections.map((collection) => (
                      <div key={collection.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`collection-${collection.id}`}
                          checked={filters.collections?.includes(collection.id) || false}
                          onCheckedChange={() => handleCollectionToggle(collection.id)}
                        />
                        <label
                          htmlFor={`collection-${collection.id}`}
                          className="text-sm text-foreground cursor-pointer flex-1"
                        >
                          {collection.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Nenhuma coleção disponível
                  </div>
                )}
              </div>

              {/* Deadline Range Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">
                  Período do Prazo
                </Label>
                <DateRangePicker
                  value={{
                    from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
                    to: filters.dateTo ? new Date(filters.dateTo) : undefined,
                  }}
                  onChange={handleDateRangeChange}
                  placeholder="Selecione o período"
                />
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Carregando escolhas...</p>
            </div>
          ) : choices && choices.length > 0 ? (
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coleção
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Personagem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prazo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {choices.map((choice) => {
                    const statusOption = STATUS_OPTIONS.find((s) => s.value === choice.status);
                    const deadlineColor = getDeadlineColor(choice.deadline);
                    const deadlineText = formatDeadlineCountdown(choice.deadline);

                    return (
                      <tr key={choice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {choice.customerName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {choice.customerEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {choice.collectionName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {choice.characterName || (
                              <span className="text-gray-400 italic">Não escolhido</span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusOption?.variant || "default"}>
                            {statusOption?.label || choice.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock className={`h-4 w-4 mr-2 ${deadlineColor}`} />
                            <span className={`text-sm font-medium ${deadlineColor}`}>
                              {deadlineText}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(choice.deadline).toLocaleDateString("pt-BR")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(choice)}
                          >
                            Ver Detalhes
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900">
                Nenhuma escolha encontrada
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Tente ajustar os filtros ou a busca
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Choice Approval Modal */}
      <ChoiceApprovalModal
        choice={selectedChoice}
        open={isModalOpen}
        onOpenChange={handleCloseModal}
      />
    </div>
  );
}
