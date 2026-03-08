/**
 * ProductionFilters Component
 * 
 * Provides comprehensive filtering options for the production dashboard:
 * - Collection multi-select filter
 * - Priority filter (Critical / High / Normal / Low)
 * - Stage filter (multi-select)
 * - Date range picker for scheduled production
 * - Assigned team member filter
 * - "Clear all filters" button
 * 
 * Filters are managed in parent component and passed down via props.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductionFilters as ProductionFiltersType, Priority, ProductionStage } from "@/services/admin/production-service";

interface ProductionFiltersProps {
  filters: ProductionFiltersType;
  onFiltersChange: (filters: ProductionFiltersType) => void;
  onReset: () => void;
}

// Priority options with labels
const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; variant: "default" | "destructive" | "secondary" }> = [
  { value: "critical", label: "Crítico", variant: "destructive" },
  { value: "high", label: "Alto", variant: "default" },
  { value: "normal", label: "Normal", variant: "secondary" },
  { value: "low", label: "Baixo", variant: "secondary" },
];

// Stage options with labels
const STAGE_OPTIONS: Array<{ value: ProductionStage; label: string }> = [
  { value: "awaiting_payment", label: "Aguardando Pagamento" },
  { value: "payment_confirmed", label: "Pagamento Confirmado" },
  { value: "awaiting_choice", label: "Aguardando Escolha" },
  { value: "model_preparation", label: "Preparação do Modelo" },
  { value: "printing", label: "Em Impressão 3D" },
  { value: "post_processing", label: "Limpeza e Preparação" },
  { value: "painting", label: "Pintura Artesanal" },
  { value: "quality_check", label: "Controle de Qualidade" },
  { value: "packaging", label: "Embalagem" },
  { value: "ready_to_ship", label: "Pronto para Envio" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
];

export function ProductionFilters({
  filters,
  onFiltersChange,
  onReset,
}: ProductionFiltersProps) {
  // Fetch collections for filter
  const { data: collections, isLoading: isLoadingCollections } = useQuery({
    queryKey: ["collections-for-filters"],
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

  // Fetch team members (admin users) for filter
  const { data: teamMembers, isLoading: isLoadingTeamMembers } = useQuery({
    queryKey: ["team-members-for-filters"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");

      if (error) throw error;
      
      // Filter only admin users
      const admins = (data || []).filter((user: any) => 
        user.roles && Array.isArray(user.roles) && user.roles.includes("admin")
      );
      
      return admins.map((user: any) => ({
        id: user.id,
        name: user.full_name || user.email || "Sem nome",
      }));
    },
  });

  // Calculate active filter count
  const activeFilterCount = 
    (filters.collections?.length || 0) +
    (filters.priorities?.length || 0) +
    (filters.stages?.length || 0) +
    (filters.assignedTo?.length || 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  // Handler for collection toggle
  const handleCollectionToggle = (collectionId: string) => {
    const currentCollections = filters.collections || [];
    const newCollections = currentCollections.includes(collectionId)
      ? currentCollections.filter(id => id !== collectionId)
      : [...currentCollections, collectionId];
    
    onFiltersChange({
      ...filters,
      collections: newCollections.length > 0 ? newCollections : undefined,
    });
  };

  // Handler for priority toggle
  const handlePriorityToggle = (priority: Priority) => {
    const currentPriorities = filters.priorities || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority];
    
    onFiltersChange({
      ...filters,
      priorities: newPriorities.length > 0 ? newPriorities : undefined,
    });
  };

  // Handler for stage toggle
  const handleStageToggle = (stage: ProductionStage) => {
    const currentStages = filters.stages || [];
    const newStages = currentStages.includes(stage)
      ? currentStages.filter(s => s !== stage)
      : [...currentStages, stage];
    
    onFiltersChange({
      ...filters,
      stages: newStages.length > 0 ? newStages : undefined,
    });
  };

  // Handler for team member toggle
  const handleTeamMemberToggle = (memberId: string) => {
    const currentMembers = filters.assignedTo || [];
    const newMembers = currentMembers.includes(memberId)
      ? currentMembers.filter(id => id !== memberId)
      : [...currentMembers, memberId];
    
    onFiltersChange({
      ...filters,
      assignedTo: newMembers.length > 0 ? newMembers : undefined,
    });
  };

  // Handler for date range change
  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    onFiltersChange({
      ...filters,
      dateFrom: range.from ? range.from.toISOString().split('T')[0] : undefined,
      dateTo: range.to ? range.to.toISOString().split('T')[0] : undefined,
    });
  };

  return (
    <Card className="border border-border bg-card shadow-sm">
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
              onClick={onReset}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar Tudo
            </Button>
          )}
        </div>

        {/* Collection Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">Coleções</Label>
          {isLoadingCollections ? (
            <div className="text-sm text-muted-foreground">Carregando coleções...</div>
          ) : collections && collections.length > 0 ? (
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
            <div className="text-sm text-muted-foreground">Nenhuma coleção disponível</div>
          )}
          {filters.collections && filters.collections.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filters.collections.length} {filters.collections.length === 1 ? 'coleção selecionada' : 'coleções selecionadas'}
            </p>
          )}
        </div>

        {/* Priority Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">Prioridade</Label>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map(({ value, label, variant }) => {
              const isSelected = filters.priorities?.includes(value) || false;
              
              return (
                <button
                  key={value}
                  onClick={() => handlePriorityToggle(value)}
                  className={`
                    px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${isSelected
                      ? variant === "destructive"
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        : variant === "default"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      : "bg-secondary/50 text-secondary-foreground hover:bg-secondary/70"
                    }
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {filters.priorities && filters.priorities.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filters.priorities.length} {filters.priorities.length === 1 ? 'prioridade selecionada' : 'prioridades selecionadas'}
            </p>
          )}
        </div>

        {/* Stage Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">Estágios</Label>
          <div className="space-y-2">
            {STAGE_OPTIONS.map(({ value, label }) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`stage-${value}`}
                  checked={filters.stages?.includes(value) || false}
                  onCheckedChange={() => handleStageToggle(value)}
                />
                <label
                  htmlFor={`stage-${value}`}
                  className="text-sm text-foreground cursor-pointer flex-1"
                >
                  {label}
                </label>
              </div>
            ))}
          </div>
          {filters.stages && filters.stages.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filters.stages.length} {filters.stages.length === 1 ? 'estágio selecionado' : 'estágios selecionados'}
            </p>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">Período de Produção</Label>
          <DateRangePicker
            value={{
              from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
              to: filters.dateTo ? new Date(filters.dateTo) : undefined,
            }}
            onChange={handleDateRangeChange}
            placeholder="Selecione o período"
          />
        </div>

        {/* Team Member Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">Membro da Equipe</Label>
          {isLoadingTeamMembers ? (
            <div className="text-sm text-muted-foreground">Carregando membros...</div>
          ) : teamMembers && teamMembers.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`member-${member.id}`}
                    checked={filters.assignedTo?.includes(member.id) || false}
                    onCheckedChange={() => handleTeamMemberToggle(member.id)}
                  />
                  <label
                    htmlFor={`member-${member.id}`}
                    className="text-sm text-foreground cursor-pointer flex-1"
                  >
                    {member.name}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Nenhum membro disponível</div>
          )}
          {filters.assignedTo && filters.assignedTo.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filters.assignedTo.length} {filters.assignedTo.length === 1 ? 'membro selecionado' : 'membros selecionados'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
