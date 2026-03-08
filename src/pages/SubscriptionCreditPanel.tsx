/**
 * User Panel for Subscription Credit System
 * Task 12.1: Criar componentes do Painel do Usuário
 */

import { useQuery } from '@tanstack/react-query';
import { subscriptionCreditAPI } from '@/services/subscription-credit-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/SEOHead';
import { MySubscriptionSection } from '@/components/subscription-credit/MySubscriptionSection';
import { MyCreditsSection } from '@/components/subscription-credit/MyCreditsSection';
import { MyAutomaticOrderSection } from '@/components/subscription-credit/MyAutomaticOrderSection';

export default function SubscriptionCreditPanel() {
  // Fetch user's subscription
  const subscriptionQuery = useQuery({
    queryKey: ['subscription-credit', 'my-subscription'],
    queryFn: () => subscriptionCreditAPI.getMySubscription(),
  });

  // Fetch credits balance
  const creditsQuery = useQuery({
    queryKey: ['subscription-credit', 'credits-balance'],
    queryFn: () => subscriptionCreditAPI.getCreditsBalance(),
    enabled: !!subscriptionQuery.data,
  });

  const subscription = subscriptionQuery.data;
  const credits = creditsQuery.data;

  return (
    <>
      <SEOHead
        title="Minha Assinatura"
        description="Gerencie sua assinatura e créditos"
        keywords={['assinatura', 'créditos', 'personagens']}
        noindex={true}
      />

      <div className="container py-8 sm:py-12 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Painel de Assinatura
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie sua assinatura, créditos e pedidos automáticos
          </p>
        </header>


        {!subscription ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma assinatura ativa</h3>
              <p className="text-muted-foreground text-center mb-6">
                Assine um plano e receba créditos para comprar personagens exclusivos
              </p>
              <Button asChild>
                <Link to="/planos">Ver Planos Disponíveis</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* My Subscription Section */}
              <MySubscriptionSection subscription={subscription} />

              {/* My Credits Section */}
              {credits && <MyCreditsSection credits={credits} />}

              {/* My Automatic Order Section */}
              <MyAutomaticOrderSection subscriptionId={subscription.id} />
            </div>

            {/* Right Column - Quick Actions */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                  <CardDescription>Gerencie sua assinatura</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/catalogo-personagens">
                      <Package className="h-4 w-4 mr-2" />
                      Ver Catálogo
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/coins/purchase">
                      <Coins className="h-4 w-4 mr-2" />
                      Comprar Coins
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
