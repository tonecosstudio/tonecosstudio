// @ts-nocheck
/**
 * Página de Escolha Mensal de Personagens
 * Sistema híbrido: cliente escolhe personagem do mês com saldo de coins
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import AppShell from '@/components/AppShell';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Coins,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import {
  useSubscriptionCoins,
  useMonthlyReleases,
  useMonthlySelections,
  useSimulateSelection,
  useSelectCharacter,
  useContextualPrice,
  canChangeSelection,
  type MonthlyRelease,
  type SelectionImpact,
} from '@/hooks/useSubscriptionCoins';
import { CharacterSelectionCard } from '@/components/subscription/CharacterSelectionCard';
import { BalanceAlert } from '@/components/subscription/BalanceAlert';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MonthlyCharacterSelection() {
  const { month } = useParams<{ month: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [selectedCharacter, setSelectedCharacter] = useState<MonthlyRelease | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [characterPrice, setCharacterPrice] = useState<number>(0);
  const [simulationResult, setSimulationResult] = useState<SelectionImpact | null>(null);

  // Buscar assinatura ativa do usuário
  const { data: userSubscriptions } = useQuery({
    queryKey: ['user-active-subscription', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const subscriptionId = userSubscriptions?.id;

  // Queries
  const coinsQuery = useSubscriptionCoins(subscriptionId);
  const releasesQuery = useMonthlyReleases(month || '');
  const selectionsQuery = useMonthlySelections(subscriptionId);

  // Mutations
  const simulateMutation = useSimulateSelection();
  const selectMutation = useSelectCharacter();
  const priceMutation = useContextualPrice();

  // Dados
  const coinsData = coinsQuery.data;
  const releases = releasesQuery.data || [];
  const selections = selectionsQuery.data || [];
  const currentSelection = selections.find(s => s.delivery_month === month);

  // Verificar se pode trocar
  const { canChange, reason } = canChangeSelection(currentSelection, month || '');

  // Validações
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!month) {
      navigate('/painel-assinante');
      return;
    }

    if (!subscriptionId && !coinsQuery.isLoading) {
      toast({
        title: 'Assinatura não encontrada',
        description: 'Você precisa ter uma assinatura ativa.',
        variant: 'destructive',
      });
      navigate('/planos');
    }

    // Validar se pode fazer escolha
    if (!canChange && !coinsQuery.isLoading) {
      toast({
        title: 'Não é possível escolher',
        description: reason || 'Prazo encerrado ou peça já em produção.',
        variant: 'destructive',
      });
      navigate('/painel-assinante');
    }
  }, [user, month, subscriptionId, coinsQuery.isLoading, canChange, reason]);

  // Calcular preço contextual quando seleciona personagem
  useEffect(() => {
    if (selectedCharacter && coinsData?.active_collection_id) {
      priceMutation.mutate(
        {
          characterId: selectedCharacter.character_id,
          activeCollectionId: coinsData.active_collection_id,
        },
        {
          onSuccess: (price) => {
            setCharacterPrice(price);
            
            // Simular impacto
            if (subscriptionId && month) {
              simulateMutation.mutate(
                {
                  subscriptionId,
                  characterId: selectedCharacter.character_id,
                  deliveryMonth: month,
                },
                {
                  onSuccess: (impact) => {
                    setSimulationResult(impact);
                    setShowConfirmDialog(true);
                  },
                }
              );
            }
          },
        }
      );
    }
  }, [selectedCharacter, coinsData?.active_collection_id]);

  // Handlers
  const handleSelectCharacter = (release: MonthlyRelease) => {
    setSelectedCharacter(release);
  };

  const handleConfirmSelection = () => {
    if (!selectedCharacter || !subscriptionId || !month) return;

    selectMutation.mutate(
      {
        subscriptionId,
        characterId: selectedCharacter.character_id,
        collectionId: selectedCharacter.collection_id,
        deliveryMonth: month,
        coinsSpent: characterPrice,
      },
      {
        onSuccess: () => {
          setShowConfirmDialog(false);
          setSelectedCharacter(null);
          toast({
            title: 'Personagem selecionado!',
            description: `${selectedCharacter.character_name} foi selecionado para ${formatMonth(month)}.`,
          });
          navigate('/painel-assinante');
        },
      }
    );
  };

  const handleCancelSelection = () => {
    setShowConfirmDialog(false);
    setSelectedCharacter(null);
    setSimulationResult(null);
  };

  // Helpers
  const formatMonth = (monthStr: string) => {
    try {
      return format(new Date(monthStr + '-01'), 'MMMM yyyy', { locale: ptBR });
    } catch {
      return monthStr;
    }
  };

  // Loading
  if (coinsQuery.isLoading || releasesQuery.isLoading) {
    return (
      <AppShell>
        <div className="container py-8 max-w-7xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // Sem assinatura
  if (!coinsData) {
    return (
      <AppShell>
        <div className="container py-8 max-w-7xl">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você precisa ter uma assinatura ativa para escolher personagens.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/planos')} className="mt-4">
            Ver Planos
          </Button>
        </div>
      </AppShell>
    );
  }

  // Sem lançamentos no mês
  if (releases.length === 0) {
    return (
      <AppShell>
        <div className="container py-8 max-w-7xl">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Não há personagens disponíveis para {formatMonth(month || '')}.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/painel-assinante')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Painel
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SEOHead
        title={`Escolher Personagem - ${formatMonth(month || '')}`}
        description="Escolha seu personagem do mês"
        noindex
      />

      <div className="container py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/painel-assinante')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Painel
          </Button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Escolha seu Personagem
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatMonth(month || '')}
              </p>
            </div>

            {/* Saldo */}
            <Card className="min-w-[250px]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Seu Saldo</span>
                  <Coins className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {coinsData.coins_balance} coins
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  de {coinsData.coins_initial} coins iniciais
                </div>
                
                {/* Barra de progresso */}
                <div className="mt-3">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(coinsData.coins_balance / coinsData.coins_initial) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Coleção Ativa */}
        {coinsData.active_collection_name && (
          <Alert className="mb-6 border-primary bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription>
              <strong>Sua Coleção Ativa:</strong> {coinsData.active_collection_name}
              <br />
              <span className="text-sm text-muted-foreground">
                Personagens desta coleção custam 200 coins (preço prioritário)
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de Prazo */}
        <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            <strong>⏰ Prazo de Escolha:</strong> Até dia 15 às 23:59
            <br />
            <span className="text-sm">
              Após o prazo, não será mais possível escolher ou trocar personagens deste mês.
              {currentSelection && ' Você pode trocar sua escolha quantas vezes quiser até o prazo.'}
            </span>
          </AlertDescription>
        </Alert>

        {/* Escolha Atual */}
        {currentSelection && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              <strong>Você já escolheu:</strong> {currentSelection.character_name} ({currentSelection.collection_name})
              <br />
              <span className="text-sm">
                Custo: {currentSelection.coins_spent} coins
                {currentSelection.is_auto_selected && ' (Escolha automática)'}
              </span>
              <br />
              <span className="text-xs text-muted-foreground">
                Você pode trocar sua escolha até o dia 15
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Grid de Personagens */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {releases.map((release) => {
            const isActiveCollection = release.collection_id === coinsData.active_collection_id;
            const estimatedPrice = isActiveCollection ? 200 : 240; // Estimativa antes de calcular
            const canAfford = coinsData.coins_balance >= estimatedPrice;
            const isSelected = currentSelection?.character_id === release.character_id;

            return (
              <CharacterSelectionCard
                key={release.id}
                release={release}
                price={estimatedPrice}
                isActiveCollection={isActiveCollection}
                isSelected={isSelected}
                canAfford={canAfford}
                currentBalance={coinsData.coins_balance}
                onSelect={() => handleSelectCharacter(release)}
              />
            );
          })}
        </div>

        {/* Dialog de Confirmação */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Confirmar Escolha</DialogTitle>
              <DialogDescription>
                Revise o impacto desta escolha no seu saldo
              </DialogDescription>
            </DialogHeader>

            {selectedCharacter && simulationResult && (
              <BalanceAlert
                impact={simulationResult}
                characterName={selectedCharacter.character_name}
                collectionName={selectedCharacter.collection_name}
                activeCollectionName={coinsData.active_collection_name || ''}
                onCancel={handleCancelSelection}
                onConfirm={handleConfirmSelection}
                onBuyCoins={() => {
                  // TODO: Implementar compra de coins
                  toast({
                    title: 'Em breve',
                    description: 'Compra de coins extras será implementada em breve.',
                  });
                }}
              />
            )}

            {(priceMutation.isPending || simulateMutation.isPending) && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
