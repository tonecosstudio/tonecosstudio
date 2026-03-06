// @ts-nocheck
/**
 * Catálogo de Personagens - Versão Profissional
 * 
 * Sistema híbrido:
 * - Assinantes: Compram com coins
 * - Não assinantes: Visualizam mas precisam assinar
 * 
 * Features:
 * - Preços contextuais (baseado em assinatura)
 * - Validação de saldo
 * - Compra com coins
 * - Filtros inteligentes
 * - Cache otimizado
 * 
 * @module pages/catalog/CharacterCatalog
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useCoinsBalance, usePurchaseCharacter } from '@/hooks/coins';
import { 
  useSubscription, 
  useUserSubscriptionCreditSummary,
  useSubscriptionCreditsForPurchase 
} from '@/hooks/subscription';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CharacterCard } from '@/components/catalog/CharacterCard';
import { CharacterFilters } from '@/components/catalog/CharacterFilters';
import { CoinsBalanceBar } from '@/components/catalog/CoinsBalanceBar';

// ============================================================================
// TYPES
// ============================================================================

interface Character {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  collection_id: string;
  status: string;
  release_date: string | null;
  release_order: number;
  is_revealed: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CharacterCatalog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [page, setPage] = useState(1);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [showOnlyWithMultiplier, setShowOnlyWithMultiplier] = useState(false);
  
  // Hooks
  const { data: subscription } = useSubscription();
  const { data: coinsBalance } = useCoinsBalance();
  const { data: userCreditSummary } = useUserSubscriptionCreditSummary(user?.id);
  const purchaseMutation = usePurchaseCharacter();
  const subscriptionCreditPurchaseMutation = useSubscriptionCreditsForPurchase();
  
  // Queries
  const { data: charactersData, isLoading } = useQuery({
    queryKey: ['collection_characters', 'catalog', page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_characters')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range((page - 1) * 24, page * 24 - 1);
      
      if (error) throw error;
      
      return {
        characters: (data as Character[]) || [],
        hasMore: data && data.length === 24,
      };
    },
    staleTime: 60 * 1000, // 1 minuto
  });
  
  // Derived state
  const isSubscriber = subscription?.status === 'active';
  const hasCreditSubscription = userCreditSummary?.has_active_subscription || false;
  const availableCredits = userCreditSummary?.credits_available || 0;
  const characters = charactersData?.characters || [];
  const hasMore = charactersData?.hasMore || false;
  
  // Apply filters
  const filteredCharacters = characters.filter((char) => {
    // Filtro: apenas revelados
    if (showOnlyWithMultiplier && !char.is_revealed) {
      return false;
    }
    
    // Filtro: apenas disponíveis (com saldo) - será aplicado no componente CharacterCard
    // pois precisa do preço contextual
    
    return true;
  });
  
  // Conta filtros ativos
  const activeFiltersCount = [
    showOnlyAvailable,
    showOnlyWithMultiplier,
  ].filter(Boolean).length;
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handlePurchase = async (character: Character, price: number) => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para comprar personagens.',
      });
      navigate('/login');
      return;
    }
    
    if (!isSubscriber && !hasCreditSubscription) {
      toast({
        title: 'Assinatura necessária',
        description: 'Você precisa ser assinante para comprar personagens.',
      });
      navigate('/plans');
      return;
    }
    
    // Verificar se tem créditos de assinatura suficientes
    if (hasCreditSubscription && availableCredits >= price) {
      // Usar créditos de assinatura
      subscriptionCreditPurchaseMutation.mutate({
        characterId: character.id,
        requiredCredits: price,
      });
      return;
    }
    
    // Verificar se tem coins suficientes
    if (!coinsBalance || coinsBalance.balance < price) {
      toast({
        title: 'Saldo insuficiente',
        description: `Você precisa de ${price} coins, mas tem apenas ${coinsBalance?.balance || 0}.`,
        variant: 'destructive',
      });
      return;
    }
    
    // Usar coins normais
    purchaseMutation.mutate({
      user_id: user.id,
      character_id: character.id,
      coins_amount: price,
    });
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }
  
  return (
    <AppShell>
      <SEOHead
        title="Catálogo de Personagens"
        description="Explore nosso catálogo de personagens colecionáveis. Assinantes podem comprar com coins."
        keywords={['catálogo', 'personagens', 'coins', 'assinatura', 'colecionáveis']}
        type="website"
      />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-12">
        <div className="container">
          <h1 className="text-4xl font-bold mb-4">Catálogo de Personagens</h1>
          <p className="text-lg text-muted-foreground">
            Explore e colecione seus personagens favoritos
          </p>
        </div>
      </div>
      
      {/* Balance Bars */}
      <div className="container py-6 space-y-4">
        {/* Coins Balance Bar (Todos os usuários autenticados) */}
        {user && coinsBalance && (
          <CoinsBalanceBar
            balance={coinsBalance.balance}
            lastUpdated={coinsBalance.last_updated}
            showProgress={true}
          />
        )}
        
        {/* Subscription Credits Bar (Assinantes com créditos) */}
        {hasCreditSubscription && userCreditSummary && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-green-600" />
                <div>
                  <div className="font-semibold">Créditos de Assinatura</div>
                  <div className="text-sm text-muted-foreground">
                    {userCreditSummary.plan_name} • {userCreditSummary.credits_used}/{userCreditSummary.credits_total} utilizados
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {userCreditSummary.credits_available.toLocaleString('pt-BR')}
                </div>
                <div className="text-sm text-green-500">créditos disponíveis</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Utilização</span>
                <span>{userCreditSummary.percentage_used.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(userCreditSummary.percentage_used, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Expiry Warning */}
            {userCreditSummary.days_until_expiry !== undefined && userCreditSummary.days_until_expiry <= 7 && (
              <div className="mt-2 text-sm text-amber-600">
                ⚠️ Créditos expiram em {userCreditSummary.days_until_expiry} dias
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Alert para não assinantes */}
      {!isSubscriber && !hasCreditSubscription && (
        <div className="container py-6">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Você precisa de uma assinatura para comprar personagens.{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-semibold"
                onClick={() => navigate('/plans')}
              >
                Conheça nossos planos com créditos mensais
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Characters Grid */}
      <div className="container py-8">
        {/* Filters */}
        <CharacterFilters
          showOnlyAvailable={showOnlyAvailable}
          onToggleAvailable={() => setShowOnlyAvailable(!showOnlyAvailable)}
          showOnlyWithMultiplier={showOnlyWithMultiplier}
          onToggleMultiplier={() => setShowOnlyWithMultiplier(!showOnlyWithMultiplier)}
          isSubscriber={isSubscriber}
          activeFiltersCount={activeFiltersCount}
        />
        
        {filteredCharacters.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {activeFiltersCount > 0
                ? 'Nenhum personagem encontrado com os filtros selecionados.'
                : 'Nenhum personagem disponível no momento.'}
            </p>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setShowOnlyAvailable(false);
                  setShowOnlyWithMultiplier(false);
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCharacters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  isSubscriber={isSubscriber}
                  userId={user?.id}
                  availableCoins={coinsBalance?.balance || 0}
                  onPurchase={handlePurchase}
                  isPurchasing={purchaseMutation.isPending}
                />
              ))}
            </div>
            
            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                >
                  Carregar Mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
