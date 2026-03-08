// @ts-nocheck
import { usePricingTiers } from "@/hooks/usePricingTiers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { MoreHorizontal, Edit, Power, RefreshCw, Star, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PricingTierWithStats } from "@/types/pricing-tiers";
import { toast } from "sonner";
// @ts-nocheck
interface PricingTiersListProps {
  onEdit: (tier: PricingTierWithStats) => void;
  onViewPlans?: (tierId: string) => void;
}

/**
 * Lista de níveis de preço com ações
 * Atualizado para incluir visualização de planos
 * Requisitos: 1.5, 1.9, 4.2, 9.5
 * Tarefa: 8.2
 */
export function PricingTiersList({ onEdit, onViewPlans }: PricingTiersListProps) {
  const { data: tiers, isLoading } = usePricingTiers();
  const { deactivateTier, propagatePrices } = usePricingTiers();

  const handleDeactivate = async (tierId: string, tierName: string) => {
    try {
      await deactivateTier.mutateAsync(tierId);
      toast.success(`Nível "${tierName}" desativado com sucesso`);
    } catch (error) {
      toast.error("Erro ao desativar nível");
    }
  };

  const handlePropagate = async (tierId: string, tierName: string) => {
    try {
      const result = await propagatePrices.mutateAsync(tierId);
      toast.success(
        `Preços propagados: ${result.updated_count} coleções atualizadas`
      );
    } catch (error) {
      toast.error("Erro ao propagar preços");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!tiers || tiers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum nível de preço cadastrado</p>
        <p className="text-sm mt-2">
          Clique em "Criar Nível" para começar
        </p>
      </div>
    );
  }

  // Ordenar por display_order
  const sortedTiers = [...tiers].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Preço Cheio</TableHead>
          <TableHead>Preço PIX</TableHead>
          <TableHead>Entrada</TableHead>
          <TableHead>Coleções</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[70px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedTiers.map((tier) => (
          <TableRow key={tier.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {tier.is_default && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                )}
                <div>
                  <div className="font-medium">{tier.name}</div>
                  {tier.description && (
                    <div className="text-sm text-muted-foreground">
                      {tier.description}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>{formatCurrency(tier.price_full)}</TableCell>
            <TableCell>{formatCurrency(tier.price_pix)}</TableCell>
            <TableCell>{formatCurrency(tier.deposit_amount)}</TableCell>
            <TableCell>
              <Badge variant="secondary">
                {tier.collections_count || 0} coleções
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={tier.is_active ? "default" : "secondary"}>
                {tier.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(tier)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  {onViewPlans && (
                    <DropdownMenuItem onClick={() => onViewPlans(tier.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Planos
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handlePropagate(tier.id, tier.name)}
                    disabled={!tier.is_active || propagatePrices.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Propagar Preços
                  </DropdownMenuItem>
                  {tier.is_active && !tier.is_default && (
                    <DropdownMenuItem
                      onClick={() => handleDeactivate(tier.id, tier.name)}
                      disabled={deactivateTier.isPending}
                      className="text-destructive"
                    >
                      <Power className="mr-2 h-4 w-4" />
                      Desativar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
