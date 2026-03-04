// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { subscriptionCreditAPI } from '@/services/subscription-credit-api';
import type { Character, Subscription, CreditsBalanceResponse } from '@/types/subscription-credit-system';
import { CharacterCatalogHero } from './character-catalog/CharacterCatalogHero';
import { CreditBalanceBar } from './character-catalog/CreditBalanceBar';
import { CharacterGrid } from './character-catalog/CharacterGrid';
import { CharacterFilters } from './character-catalog/CharacterFilters';
import { Loader2 } from 'lucide-react';

export default function CharacterCatalog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [credits, setCredits] = useState<CreditsBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [showOnlyExclusive, setShowOnlyExclusive] = useState(false);

  useEffect(() => {
    loadData();
  }, [user, page]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load subscription and credits if user is logged in
      let sub: Subscription | null = null;
      let cred: CreditsBalanceResponse | null = null;

      if (user) {
        try {
          sub = await subscriptionCreditAPI.getMySubscription();
          setSubscription(sub);

          if (sub && sub.status === 'active') {
            cred = await subscriptionCreditAPI.getCreditsBalance();
            setCredits(cred);
          }
        } catch (error) {
          console.error('Error loading subscription/credits:', error);
        }
      }

      // Load characters with appropriate filtering
      const planType = sub?.status === 'active' ? sub.plan_type : undefined;
      const response = await subscriptionCreditAPI.getCharacters(page, 24, planType);
      
      setCharacters(response.characters);
      setHasMore(response.pagination.has_next);
    } catch (error) {
      console.error('Error loading catalog:', error);
      toast({
        title: 'Erro ao carregar catálogo',
        description: 'Não foi possível carregar os personagens. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (character: Character, useCredits: boolean) => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para comprar personagens.',
      });
      navigate('/login');
      return;
    }

    if (!subscription || subscription.status !== 'active') {
      toast({
        title: 'Assinatura necessária',
        description: 'Você precisa de uma assinatura ativa para comprar personagens.',
      });
      navigate('/plans');
      return;
    }

    try {
      if (useCredits) {
        // Check if user has enough credits
        if (!credits || credits.available_credits < character.price_credits) {
          toast({
            title: 'Créditos insuficientes',
            description: `Você precisa de ${character.price_credits} créditos, mas tem apenas ${credits?.available_credits || 0}.`,
            variant: 'destructive',
          });
          return;
        }

        // Create order with credits
        await subscriptionCreditAPI.createIndividualOrder(character.id, true);
        
        toast({
          title: 'Compra realizada!',
          description: `${character.name} foi adicionado ao seu pedido.`,
        });

        // Reload data to update credits
        loadData();
      } else {
        // TODO: Implement cash purchase flow
        toast({
          title: 'Em breve',
          description: 'Compra com dinheiro será implementada em breve.',
        });
      }
    } catch (error) {
      console.error('Error purchasing character:', error);
      toast({
        title: 'Erro na compra',
        description: error instanceof Error ? error.message : 'Não foi possível completar a compra.',
        variant: 'destructive',
      });
    }
  };

  // Apply filters
  const filteredCharacters = characters.filter((char) => {
    if (showOnlyAvailable && credits && char.price_credits > credits.available_credits) {
      return false;
    }
    if (showOnlyExclusive && !char.is_exclusive_semestral) {
      return false;
    }
    return true;
  });

  const isSubscriber = subscription?.status === 'active';
  const planType = subscription?.plan_type;

  return (
    <AppShell>
      <SEOHead
        title="Catálogo de Personagens - Sistema de Créditos"
        description="Explore nosso catálogo de personagens colecionáveis. Assinantes podem usar créditos para comprar."
        keywords={['catálogo', 'personagens', 'créditos', 'assinatura', 'colecionáveis']}
        type="website"
      />

      <CharacterCatalogHero />

      {isSubscriber && credits && (
        <div className="container py-6">
          <CreditBalanceBar
            totalCredits={credits.total_credits}
            usedCredits={credits.used_credits}
            availableCredits={credits.available_credits}
            planType={planType!}
          />
        </div>
      )}

      <div className="container py-8">
        <CharacterFilters
          showOnlyAvailable={showOnlyAvailable}
          onToggleAvailable={() => setShowOnlyAvailable(!showOnlyAvailable)}
          showOnlyExclusive={showOnlyExclusive}
          onToggleExclusive={() => setShowOnlyExclusive(!showOnlyExclusive)}
          isSubscriber={isSubscriber}
          isSemestral={planType === 'semestral'}
          hasCredits={!!credits}
        />

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <CharacterGrid
              characters={filteredCharacters}
              isSubscriber={isSubscriber}
              planType={planType}
              availableCredits={credits?.available_credits || 0}
              onPurchase={handlePurchase}
            />

            {filteredCharacters.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground">
                  Nenhum personagem encontrado com os filtros selecionados.
                </p>
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setPage(page + 1)}
                  className="px-6 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90"
                >
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
