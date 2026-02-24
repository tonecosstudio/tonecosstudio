import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Privacy() {
  return (
    <AppShell>
      <SEOHead
        title="Política de Privacidade"
        description="Política de privacidade e proteção de dados da Ordax - Tonecos Studios"
        keywords={["privacidade", "dados", "lgpd", "proteção"]}
      />

      <div className="container py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Política de Privacidade</h1>
          <p className="text-muted-foreground">Última atualização: 03 de Fevereiro de 2026</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {/* Introdução */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">Introdução</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    A Tonecos Studios, operadora da plataforma Ordax, está comprometida em proteger
                    sua privacidade e seus dados pessoais. Esta política descreve como coletamos,
                    usamos, armazenamos e protegemos suas informações, em conformidade com a Lei
                    Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
                  </p>
                </section>

                {/* Seção 1 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">1. Dados Coletados</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Coletamos os seguintes tipos de dados:
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">1.1 Dados de Cadastro</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                        <li>Nome completo</li>
                        <li>Email</li>
                        <li>CPF</li>
                        <li>Data de nascimento</li>
                        <li>Telefone e WhatsApp</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">1.2 Dados de Endereço</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                        <li>CEP, rua, número, complemento</li>
                        <li>Bairro, cidade, estado</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">1.3 Dados de Pagamento</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                        <li>Informações de cartão de crédito (criptografadas)</li>
                        <li>Histórico de transações</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">1.4 Dados de Uso</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                        <li>Preferências de produtos</li>
                        <li>Histórico de pedidos</li>
                        <li>Interações com a plataforma</li>
                        <li>Dados de navegação (cookies)</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Seção 2 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">2. Finalidade do Uso</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Utilizamos seus dados para:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Processar e gerenciar seus pedidos</li>
                    <li>Comunicar sobre status de produção e entrega</li>
                    <li>Personalizar sua experiência na plataforma</li>
                    <li>Enviar notificações sobre produtos de seu interesse</li>
                    <li>Processar pagamentos de forma segura</li>
                    <li>Melhorar nossos serviços e produtos</li>
                    <li>Cumprir obrigações legais e fiscais</li>
                    <li>Prevenir fraudes e garantir segurança</li>
                  </ul>
                </section>

                {/* Seção 3 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">3. Base Legal</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    O tratamento de seus dados é baseado em:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>
                      <strong>Consentimento:</strong> Você autoriza expressamente o uso de seus
                      dados
                    </li>
                    <li>
                      <strong>Execução de contrato:</strong> Necessário para cumprir obrigações
                      contratuais
                    </li>
                    <li>
                      <strong>Obrigação legal:</strong> Cumprimento de leis e regulamentos
                    </li>
                    <li>
                      <strong>Legítimo interesse:</strong> Melhorias e segurança da plataforma
                    </li>
                  </ul>
                </section>

                {/* Seção 4 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">4. Compartilhamento de Dados</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Seus dados podem ser compartilhados com:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>
                      <strong>Processadores de pagamento:</strong> Para processar transações
                    </li>
                    <li>
                      <strong>Serviços de entrega:</strong> Para envio de produtos
                    </li>
                    <li>
                      <strong>Provedores de tecnologia:</strong> Supabase (hospedagem), OpenAI (IA)
                    </li>
                    <li>
                      <strong>Autoridades:</strong> Quando exigido por lei
                    </li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    <strong>Importante:</strong> Nunca vendemos seus dados para terceiros.
                  </p>
                </section>

                {/* Seção 5 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">5. Armazenamento e Segurança</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>5.1 Onde armazenamos:</strong> Seus dados são armazenados em servidores
                    seguros do Supabase, com infraestrutura na nuvem.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>5.2 Por quanto tempo:</strong> Mantemos seus dados enquanto sua conta
                    estiver ativa ou conforme necessário para cumprir obrigações legais (geralmente
                    5 anos para dados fiscais).
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>5.3 Medidas de segurança:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Criptografia de dados sensíveis (SSL/TLS)</li>
                    <li>Autenticação segura</li>
                    <li>Controle de acesso restrito</li>
                    <li>Monitoramento de segurança 24/7</li>
                    <li>Backups regulares</li>
                  </ul>
                </section>

                {/* Seção 6 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">6. Seus Direitos (LGPD)</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">Você tem direito a:</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>
                      <strong>Confirmação:</strong> Saber se tratamos seus dados
                    </li>
                    <li>
                      <strong>Acesso:</strong> Obter cópia de seus dados
                    </li>
                    <li>
                      <strong>Correção:</strong> Atualizar dados incompletos ou incorretos
                    </li>
                    <li>
                      <strong>Anonimização:</strong> Solicitar anonimização de dados
                    </li>
                    <li>
                      <strong>Portabilidade:</strong> Receber seus dados em formato estruturado
                    </li>
                    <li>
                      <strong>Eliminação:</strong> Solicitar exclusão de dados (exceto quando houver
                      obrigação legal)
                    </li>
                    <li>
                      <strong>Revogação:</strong> Retirar consentimento a qualquer momento
                    </li>
                    <li>
                      <strong>Oposição:</strong> Opor-se ao tratamento de dados
                    </li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    Para exercer seus direitos, entre em contato através do email:
                    privacidade@ordax.com.br
                  </p>
                </section>

                {/* Seção 7 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">7. Cookies</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Utilizamos cookies para:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Manter você conectado</li>
                    <li>Lembrar suas preferências</li>
                    <li>Analisar uso da plataforma</li>
                    <li>Melhorar a experiência do usuário</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    Você pode gerenciar cookies nas configurações do seu navegador.
                  </p>
                </section>

                {/* Seção 8 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">8. Menores de Idade</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Nossa plataforma não é destinada a menores de 18 anos. Não coletamos
                    intencionalmente dados de menores. Se você é pai/mãe ou responsável e acredita
                    que seu filho forneceu dados, entre em contato conosco.
                  </p>
                </section>

                {/* Seção 9 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">9. Alterações na Política</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças
                    significativas por email ou através da plataforma. A data da última atualização
                    está sempre indicada no topo desta página.
                  </p>
                </section>

                {/* Seção 10 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">10. Encarregado de Dados (DPO)</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Para questões relacionadas à proteção de dados:
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>Encarregado de Dados</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">Email: dpo@ordax.com.br</p>
                    <p className="text-sm text-muted-foreground">
                      Privacidade: privacidade@ordax.com.br
                    </p>
                  </div>
                </section>

                {/* Seção 11 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-3">11. Autoridade Nacional</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Se você não estiver satisfeito com nossas respostas, pode contatar a Autoridade
                    Nacional de Proteção de Dados (ANPD):
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Website: www.gov.br/anpd</p>
                    <p className="text-sm text-muted-foreground">Email: atendimento@anpd.gov.br</p>
                  </div>
                </section>

                {/* Footer */}
                <div className="pt-6 border-t">
                  <p className="text-sm text-muted-foreground text-center">
                    © {new Date().getFullYear()} Tonecos Studios. Todos os direitos reservados.
                  </p>
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Esta política está em conformidade com a LGPD (Lei 13.709/2018)
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
