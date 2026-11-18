import type { SystemSettings } from "@/hooks/useSystemSettings";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeHero,
  ArcadeCard,
  ArcadeSectionTitle,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import { FileText, Shield, AlertTriangle, Scale } from "lucide-react";
import { PUBLIC_ROUTES } from "@/config/routes";
import { CONTACT } from "@/config/constants";
import { isCatalogPublicMvpEnabled } from "@/config/catalog-public-mvp";

export function TermsArcadeView({ settings }: { settings?: SystemSettings }) {
  const readOnly = import.meta.env.VITE_PREVIEW_READ_ONLY === "true";
  const publicMvp = readOnly && isCatalogPublicMvpEnabled();
  const commercialMvp = import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true";

  const sections = publicMvp ? [
    { num: "01", title: "Uso do catálogo", icon: <Shield className="w-4 h-4" />, content: "O site apresenta um acervo público de modelos, categorias e imagens para consulta e referência. A navegação não representa reserva, contratação ou pedido." },
    { num: "02", title: "Modelos e disponibilidade", icon: <FileText className="w-4 h-4" />, content: "Imagens, nomes e descrições são referências do catálogo e podem ser atualizados. A presença de um modelo não garante disponibilidade de produção ou preço." },
    { num: "03", title: "Sem transações no site", icon: <AlertTriangle className="w-4 h-4" />, content: "O catálogo não permite concluir compras, pagamentos ou encomendas diretamente pelo site.", highlight: true },
    { num: "04", title: "Contato", icon: <FileText className="w-4 h-4" />, content: "A página Contato oferece comunicação por e-mail. O envio de um e-mail não confirma pedido, preço, disponibilidade ou prazo." },
    { num: "05", title: "Marcas e personagens", icon: <Scale className="w-4 h-4" />, content: "Marcas, nomes e personagens de franquias podem pertencer a seus respectivos titulares. O uso como referência no catálogo não transfere direitos sobre essas obras." },
    { num: "06", title: "Uso responsável", icon: <Shield className="w-4 h-4" />, content: "Não são permitidos acesso não autorizado, exploração abusiva do serviço, envio de conteúdo malicioso ou violação de direitos de terceiros." },
    { num: "07", title: "Mudanças", icon: <FileText className="w-4 h-4" />, content: "Estes termos se aplicam aos recursos disponíveis no site. Eventuais serviços adicionais terão condições específicas antes de sua utilização." },
  ] : commercialMvp ? [
    { num: "01", title: "Catálogo público", icon: <Shield className="w-4 h-4" />, content: "A consulta aos modelos e referências é livre. As imagens e descrições não garantem disponibilidade, valor ou prazo de produção." },
    { num: "02", title: "Conta", icon: <FileText className="w-4 h-4" />, content: "Enviar e acompanhar orçamentos registrados no portal exige uma conta autenticada. Visitantes também podem pedir informações por e-mail sem cadastro; esse contato não cria protocolo no portal. Proteja suas credenciais e informe dados de contato corretos." },
    { num: "03", title: "Orçamento", icon: <FileText className="w-4 h-4" />, content: "A solicitação registrada reúne modelos, quantidades e preferências. O estúdio pode responder com disponibilidade, valores e prazos. Consultas por e-mail seguem atendimento externo ao portal. Nenhum desses contatos gera cobrança ou contratação automática." },
    { num: "04", title: "Pagamento e pré-venda", icon: <AlertTriangle className="w-4 h-4" />, content: "O recebimento e a resposta de orçamentos não autorizam cobranças. Recursos de PIX, links de pagamento, envio de comprovantes e pré-venda somente podem ser usados quando a operação correspondente estiver habilitada e suas condições forem apresentadas expressamente ao cliente antes da contratação.", highlight: true },
    { num: "05", title: "TONART Coins", icon: <AlertTriangle className="w-4 h-4" />, content: "Coins são créditos virtuais da conta, sem saque ou transferência. A visualização de saldo não significa que compras, créditos ou abatimentos estejam liberados. Uso e eventual equivalência dependem de habilitação, elegibilidade e condições da oferta confirmadas antes da contratação; não presumir desconto por esta página. Frete, orçamentos, entrada de pré-venda e parcelas de planos não são elegíveis para abatimento." },
    { num: "06", title: "Direitos de terceiros", icon: <Scale className="w-4 h-4" />, content: "Marcas, personagens e obras de terceiros permanecem sob os direitos de seus titulares. O catálogo não transfere tais direitos." },
    { num: "07", title: "Uso adequado", icon: <Shield className="w-4 h-4" />, content: "São vedados acesso não autorizado, fraude, abuso de sistemas e uso indevido de conteúdo ou dados." },
  ] : [
    {
      num: "01",
      title: "Aceitação dos Termos",
      icon: <Shield className="w-4 h-4" />,
      content: "Ao acessar e usar o site TONART Studio, você concorda com os seguintes termos e condições de uso.",
    },
    {
      num: "02",
      title: "Descrição do Serviço",
      icon: <FileText className="w-4 h-4" />,
      content: "Universo de colecionáveis • Sistema de orçamentos • Assinaturas mensais • Perfil de colecionador • Sistema de suporte",
    },
    {
      num: "03",
      title: "Cadastro e Conta",
      icon: <Shield className="w-4 h-4" />,
      content: "Você é responsável por manter a confidencialidade de sua senha, todas as atividades em sua conta, e fornecer informações verdadeiras e atualizadas.",
    },
    {
      num: "04",
      title: "Produtos e Pedidos",
      icon: <FileText className="w-4 h-4" />,
      content: "Produtos sob encomenda: valores, prazos de produção, frete e pagamento são definidos no orçamento aprovado. A navegação no catálogo não confirma pedidos.",
    },
    {
      num: "05",
      title: "Sistema de Coins",
      icon: <AlertTriangle className="w-4 h-4" />,
      content: "Coins não possuem valor monetário, não são transferíveis, servem apenas para seleção na plataforma, e expiram em caso de cancelamento com reembolso.",
      highlight: true,
    },
    {
      num: "06",
      title: "Propriedade Intelectual",
      icon: <Scale className="w-4 h-4" />,
      content: "Textos, identidade visual e conteúdos originais pertencem à TONART Studio ou a seus respectivos titulares. Marcas e personagens de terceiros permanecem sob os direitos de seus proprietários.",
    },
    {
      num: "07",
      title: "Uso Aceitável",
      icon: <Shield className="w-4 h-4" />,
      content: "Proibido: uso ilegal, acesso não autorizado, interferência no funcionamento, upload malicioso, violação de direitos de terceiros.",
    },
    {
      num: "08",
      title: "Limitação de Responsabilidade",
      icon: <Scale className="w-4 h-4" />,
      content: "Não nos responsabilizamos por danos indiretos, perda de dados/lucros, interrupções no serviço ou atrasos por terceiros.",
    },
    {
      num: "09",
      title: "Modificações",
      icon: <FileText className="w-4 h-4" />,
      content: "Reservamo-nos o direito de modificar estes termos. O uso continuado após alterações constitui aceitação.",
    },
    {
      num: "10",
      title: "Lei Aplicável",
      icon: <Scale className="w-4 h-4" />,
      content: "Termos regidos pelas leis do Brasil. Disputas resolvidas nos tribunais competentes.",
    },
  ];

  return (
    <Page
      title="Termos de Uso"
      description="Termos e condições de uso do TONART Studio"
      keywords={["termos", "condições", "uso", "legal"]}
    >
      <ArcadeHero
        badge="TONART STUDIO"
        title="TERMOS DE USO"
        subtitle={publicMvp ? "Informações sobre o uso do catálogo" : commercialMvp ? "Condições para contas e orçamentos" : "Última atualização: 03/02/2026"}
        compact
      />

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <ArcadeSectionTitle>{publicMvp ? "Regras do catálogo" : "Cláusulas"}</ArcadeSectionTitle>

        <div className="space-y-4">
          {sections.map((s) => (
            <ArcadeCard key={s.num}>
              <div className={`p-4 sm:p-6 ${s.highlight ? "border-l-2 border-l-[hsl(45,100%,50%)]" : ""}`}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.05)]">
                    <span className="font-mono text-xs text-[hsl(var(--gold-accent))] font-bold">{s.num}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[hsl(var(--gold-accent)/0.6)]">{s.icon}</span>
                      <h3 className="font-mono text-sm text-[hsl(0,0%,90%)] uppercase tracking-wider font-bold">
                        {s.title}
                      </h3>
                    </div>
                    <p className="text-[hsl(0,0%,50%)] font-mono text-xs leading-relaxed tracking-wide">
                      {s.content}
                    </p>
                  </div>
                </div>
              </div>
            </ArcadeCard>
          ))}
        </div>

        {/* Contato */}
        <div className="mt-10">
          <ArcadeCard>
            <div className="p-4 text-center sm:p-6">
              <p className="text-[hsl(0,0%,40%)] font-mono text-[10px] tracking-wider uppercase mb-2">
                Contato Legal
              </p>
              <p className="text-[hsl(var(--gold-accent))] font-mono text-sm">
                {settings?.contact_email || CONTACT.CONTACT_EMAIL}
              </p>
              <p className="text-[hsl(0,0%,25%)] font-mono text-[9px] mt-3">
                © {new Date().getFullYear()} {settings?.company_name || "TONART Studio"}
              </p>
            </div>
          </ArcadeCard>
        </div>
      </section>

      <ArcadeCTA
        badge="Voltar"
        title="EXPLORAR UNIVERSO"
        description="Explore referências digitais do acervo."
        primaryAction={{ label: "VER UNIVERSO", href: PUBLIC_ROUTES.catalog }}
        secondaryAction={{ label: "INÍCIO", href: PUBLIC_ROUTES.home }}
      />
    </Page>
  );
}
