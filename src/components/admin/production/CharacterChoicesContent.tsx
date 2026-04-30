// @ts-nocheck
/**
 * CharacterChoicesContent - Gerenciamento de Escolhas de Personagens
 *
 * Componente extraído de CharacterChoiceManagerPage para ser usado
 * como uma aba dentro do ProductionHub
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPendingChoices, type ChoiceFilters, type CharacterChoice } from "@/services/admin/choice-service";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ChoiceApprovalModal } from "@/components/admin/collections/ChoiceApprovalModal";
import { Search, Filter, X, Clock, User, Package, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { ChoiceStatus } from "@/services/admin/production-service";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Status options
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

export function CharacterChoicesContent() {
  const [filters, setFilters] = useState<ChoiceFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<CharacterChoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch choices
  const { data: choices, isLoading } = useQuery({
    queryKey: ["character-choices", filters, searchQuery],
    queryFn: () => fetchPendingChoices({ ...filters, searchQuery }),
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

  // Handlers
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

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    setFilters({
      ...filters,
      dateFrom: range.from,
      dateTo: range.to,
    });
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

  const handleChoiceClick = (choice: CharacterChoice) => {
    setSelectedChoice(choice);
    setIsModalOpen(true);
  };

  const getStatusIcon = (status: ChoiceStatus) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
      case "submitted":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDeadlineColor = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 0) return "text-red-600 font-semibold";
    if (hoursUntil < 24) return "text-orange-600 font-semibold";
    if (hoursUntil < 72) return "text-yellow-600";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, email ou coleção..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filtros</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                disabled={activeFilterCount === 0}
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Filter */}
            <div className="space-y-3">
              <Label>Status</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={filters.statuses?.includes(option.value)}
                      onCheckedChange={() => handleStatusToggle(option.value)}
                    />
                    <Label
                      htmlFor={`status-${option.value}`}
                      className="cursor-pointer text-sm"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Collection Filter */}
            {collections && collections.length > 0 && (
              <div className="space-y-3">
                <Label>Coleções</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {collections.map((collection: any) => (
                    <div key={collection.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`collection-${collection.id}`}
                        checked={filters.collections?.includes(collection.id)}
                        onCheckedChange={() => handleCollectionToggle(collection.id)}
                      />
                      <Label
                        htmlFor={`collection-${collection.id}`}
                        className="cursor-pointer text-sm"
                      >
                        {collection.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range Filter */}
            <div className="space-y-3">
              <Label>Prazo de Escolha</Label>
              <DateRangePicker
                from={filters.dateFrom}
                to={filters.dateTo}
                onSelect={handleDateRangeChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Choices List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Carregando escolhas...</p>
          </div>
        )}

        {!isLoading && (!choices || choices.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma escolha encontrada</p>
            {activeFilterCount > 0 && (
              <Button
                variant="link"
                onClick={handleClearFilters}
                className="mt-2"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {choices && choices.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground mb-2">
              {choices.length} {choices.length === 1 ? "escolha encontrada" : "escolhas encontradas"}
            </div>
            {choices.map((choice: CharacterChoice) => (
              <Card
                key={choice.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleChoiceClick(choice)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Customer Info */}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">
                          {choice.customerName}
                        </span>
                        <span className="text-sm text-muted-foreground truncate">
                          {choice.customerEmail}
                        </span>
                      </div>

                      {/* Collection */}
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">{choice.collectionName}</span>
                      </div>

                      {/* Deadline */}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className={`text-sm ${getDeadlineColor(choice.deadline)}`}>
                          {formatDistanceToNow(new Date(choice.deadline), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {getStatusIcon(choice.status)}
                      <Badge
                        variant={
                          STATUS_OPTIONS.find((opt) => opt.value === choice.status)
                            ?.variant || "secondary"
                        }
                      >
                        {STATUS_OPTIONS.find((opt) => opt.value === choice.status)
                          ?.label || choice.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Approval Modal */}
      {selectedChoice && (
        <ChoiceApprovalModal
          choice={selectedChoice}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedChoice(null);
          }}
        />
      )}
    </div>
  );
}
