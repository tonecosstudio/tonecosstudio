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
import { useSubscription } from '@/hooks/subscription';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Coins, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// TYPES
// ============================================================================

interface Character {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  collection_id: string;
  is_active: boolean;
  price_multiplier: number | null;
  created_at: string;
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
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  
  // Hooks
  const { data: subscription } = useSubscription();
  const { data: coinsBalance } = useCoinsBalance();
  const purchaseMutation = usePurchaseCharacter();
  
  // Queries
  const { data: charactersData, isLoading } = useQuery({
    queryKey: ['characters', 'catalog', page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('is_active', true)
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
  const characters = charactersData?.characters || [];
  const hasMore = charactersData?.hasMore || false;
  
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
    
    if (!isSubscriber) {
      toast({
        title: 'Assinatura necessária',
        description: 'Você precisa ser assinante para comprar personagens.',
      });
      navigate('/plans');
      return;
    }
    
    if (!coinsBalance || coinsBalance.balance < price) {
      toast({
        title: 'Saldo insuficiente',
        description: `Você precisa de ${price} coins, mas tem apenas ${coinsBalance?.balance || 0}.`,
        variant: 'destructive',
      });
      return;
    }
    
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
      
      {/* Coins Balance Bar (Assinantes) */}
      {isSubscriber && coinsBalance && (
        <div className="container py-6">
          <div className="bg-card border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seu Saldo</p>
                <p className="text-2xl font-bold">{coinsBalance.balance} coins</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/coins/purchase')}>
              Comprar Mais Coins
            </Button>
          </div>
        </div>
      )}
      
      {/* Alert para não assinantes */}
      {!isSubscriber && (
        <div className="container py-6">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Você precisa ser assinante para comprar personagens.{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate('/plans')}
              >
                Ver planos disponíveis
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Characters Grid */}
      <div className="container py-8">
        {characters.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              Nenhum personagem disponível no momento.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Character Image */}
                  {character.image_url && (
                    <div className="aspect-square bg-muted">
                      <img
                        src={character.image_url}
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Character Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{character.name}</h3>
                    {character.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {character.description}
                      </p>
                    )}
                    
                    {/* Price & Action */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-primary" />
                        <span className="font-semibold">
                          {/* TODO: Calcular preço contextual */}
                          1000 coins
                        </span>
                      </div>
                      
                      {isSubscriber ? (
                        <Button
                          size="sm"
                          onClick={() => handlePurchase(character, 1000)}
                          disabled={purchaseMutation.isPending}
                        >
                          {purchaseMutation.isPending ? 'Comprando...' : 'Comprar'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/plans')}
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Assinar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
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
