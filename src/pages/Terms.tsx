import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Terms() {
  const { data: settings } = useSystemSettings();

  return (
    <AppShell>
      <SEOHead
        title="Termos de Uso"
        description="Termos e condições de uso da plataforma Ordax - Tonecos Studios"
        keywords={["termos", "condições", "uso", "legal"]}
      />

      <div className="container py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-4">Termos de Uso</h1>
          <p className="text-xs text-muted-foreground">Última atualização: 03 de Fevereiro de 2026</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {/* Seção 1 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">1. Aceitação dos Termos</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ao acessar e usar a plataforma Ordax, operada pela Tonecos Studios, você
                    concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.
                    Se você não concordar com qualquer parte destes termos, não deverá usar nossos
                    serviços.
                  </p>
                </section>

                {/* Seção 2 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">2. Descrição do Serviço</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    A Ordax é uma plataforma de catálogo e gestão de pedidos de colecionáveis
                    artesanais premium. Oferecemos:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Catálogo de produtos colecionáveis</li>
                    <li>Sistema de orçamentos personalizados</li>
                    <li>Assinaturas de coleções mensais</li>
                    <li>Perfil de colecionador público</li>
                    <li>Sistema de suporte ao cliente</li>
                  </ul>
                </section>

                {/* Seção 3 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">3. Cadastro e Conta</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Para utilizar determinadas funcionalidades, você deve criar uma conta fornecendo
                    informações precisas e completas. Você é responsável por:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Manter a confidencialidade de sua senha</li>
                    <li>Todas as atividades que ocorram em sua conta</li>
                    <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
                    <li>Fornecer informações verdadeiras e atualizadas</li>
                  </ul>
                </section>

                {/* Seção 4 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">4. Produtos e Pedidos</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>4.1 Orçamentos:</strong> Todos os produtos são feitos sob encomenda. Os
                    preços apresentados são estimativas e podem variar conforme especificações do
                    pedido.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>4.2 Prazo de Produção:</strong> Cada peça é artesanal e leva
                    aproximadamente 30 dias para produção (mês completo), mais o prazo de envio na segunda quinzena do mês seguinte.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>4.3 Pagamento:</strong> O pagamento deve ser realizado conforme as
                    condições acordadas no orçamento aprovado.
                  </p>
                </section>

                {/* Seção 5 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">5. Assinaturas e Coins</h2>
                  
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>5.1 Planos de Assinatura:</strong> Oferecemos planos trimestral, semestral e anual com
                    diferentes benefícios e quantidades de coins.
                  </p>
                  
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>5.2 Sistema de Coins:</strong> Coins são a moeda virtual da plataforma, utilizada
                    exclusivamente para seleção de personagens no catálogo. É importante entender que:
                  </p>
                  
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mb-3">
                    <h3 className="font-semibold text-sm mb-2 text-amber-900 dark:text-amber-100">
                      ⚠️ Regras Importantes sobre Coins
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-amber-900 dark:text-amber-100 ml-2">
                      <li><strong>Sem valor monetário:</strong> Coins não possuem valor monetário e não podem ser convertidos em dinheiro</li>
                      <li><strong>Não transferíveis:</strong> Coins não podem ser transferidos entre usuários</li>
                      <li><strong>Uso exclusivo:</strong> Coins servem apenas para seleção de produtos na plataforma</li>
                      <li><strong>Vinculados à assinatura:</strong> Coins são vinculados à sua assinatura ativa</li>
                      <li><strong>Não reembolsáveis:</strong> Coins não utilizados não são reembolsáveis isoladamente</li>
                      <li><strong>Expiração:</strong> Coins expiram imediatamente em caso de cancelamento com reembolso</li>
                    </ul>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>5.3 Renovação:</strong> As assinaturas são renovadas automaticamente,
                    salvo cancelamento prévio. Novos coins são creditados a cada renovação.
                  </p>
                  
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>5.4 Cancelamento com Reembolso:</strong> Ao cancelar sua assinatura com reembolso:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mb-3">
                    <li>O reembolso é calculado baseado em personagens já recebidos (não em tempo)</li>
                    <li>Todos os coins não utilizados expiram imediatamente</li>
                    <li>Coins não são reembolsados separadamente</li>
                    <li>O acesso à plataforma é encerrado imediatamente</li>
                  </ul>
                  
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>5.5 Não-Renovação (sem reembolso):</strong> Ao desativar a renovação automática:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mb-3">
                    <li>Não há reembolso do valor pago</li>
                    <li>Você mantém acesso até o fim do período contratado</li>
                    <li>Seus coins permanecem válidos até a data de expiração da assinatura</li>
                    <li>Você pode continuar usando coins normalmente até o fim</li>
                  </ul>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    <strong>5.6 Reembolso Proporcional:</strong> Em caso de cancelamento com reembolso, o valor
                    é calculado segundo o Código de Defesa do Consumidor: Valor Pago - (Personagens Recebidos × Valor Avulso).
                    Coins não entram neste cálculo.
                  </p>
                </section>

                {/* Seção 6 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">6. Propriedade Intelectual</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Todo o conteúdo da plataforma, incluindo textos, imagens, logos, designs e
                    código, é propriedade da Tonecos Studios ou de seus licenciadores e está
                    protegido por leis de direitos autorais.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Você não pode reproduzir, distribuir, modificar ou criar trabalhos derivados sem
                    autorização expressa.
                  </p>
                </section>

                {/* Seção 7 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">7. Uso Aceitável</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Você concorda em NÃO:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Usar a plataforma para fins ilegais ou não autorizados</li>
                    <li>Tentar obter acesso não autorizado a sistemas ou dados</li>
                    <li>Interferir no funcionamento da plataforma</li>
                    <li>Fazer upload de conteúdo malicioso ou ofensivo</li>
                    <li>Violar direitos de terceiros</li>
                  </ul>
                </section>

                {/* Seção 8 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">8. Limitação de Responsabilidade</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    A Tonecos Studios não se responsabiliza por:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Danos indiretos, incidentais ou consequenciais</li>
                    <li>Perda de dados ou lucros</li>
                    <li>Interrupções no serviço</li>
                    <li>Atrasos causados por terceiros (correios, fornecedores)</li>
                  </ul>
                </section>

                {/* Seção 9 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">9. Modificações dos Termos</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Reservamo-nos o direito de modificar estes termos a qualquer momento. As
                    alterações entrarão em vigor imediatamente após a publicação na plataforma. O
                    uso continuado após as alterações constitui aceitação dos novos termos.
                  </p>
                </section>

                {/* Seção 10 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">10. Lei Aplicável</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer
                    disputa será resolvida nos tribunais competentes do Brasil.
                  </p>
                </section>

                {/* Seção 11 */}
                <section>
                  <h2 className="text-base font-semibold mb-3">11. Contato</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Para questões sobre estes termos, entre em contato:
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>{settings?.company_name || "Tonecos Studios"}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Email: {settings?.contact_email || "contato@ordax.com.br"}
                    </p>
                    <p className="text-sm text-muted-foreground">Suporte: /suporte</p>
                  </div>
                </section>

                {/* Footer */}
                <div className="pt-6 border-t">
                  <p className="text-sm text-muted-foreground text-center">
                    © {new Date().getFullYear()} {settings?.company_name || "Tonecos Studios"}.
                    Todos os direitos reservados.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
