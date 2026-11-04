import { useSystemSettings } from "@/hooks/useSystemSettings";
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

export default function TermsArcade() {
  const readOnly = import.meta.env.VITE_PREVIEW_READ_ONLY === "true";
  const publicMvp = readOnly && isCatalogPublicMvpEnabled();
  const { data: settings } = useSystemSettings({ enabled: !readOnly });

  const sections = publicMvp ? [
    { num: "01", title: "Uso do catálogo", icon: <Shield className="w-4 h-4" />, content: "O site apresenta um acervo público de modelos, categorias e imagens para consulta e referência. A navegação não representa reserva, contratação ou pedido." },
    { num: "02", title: "Modelos e disponibilidade", icon: <FileText className="w-4 h-4" />, content: "Imagens, nomes e descrições são referências do catálogo e podem ser atualizados. A presença de um modelo não garante disponibilidade de produção ou preço." },
    { num: "03", title: "Sem transações no site", icon: <AlertTriangle className="w-4 h-4" />, content: "Nesta fase o catálogo não oferece cadastro, compras, pagamentos, assinaturas ou moedas virtuais. Nenhuma ação na página confirma encomenda.", highlight: true },
    { num: "04", title: "Contato", icon: <FileText className="w-4 h-4" />, content: "A página Contato oferece comunicação por e-mail. O site não recebe formulários de orçamento nem registra pedidos nesta versão." },
    { num: "05", title: "Marcas e personagens", icon: <Scale className="w-4 h-4" />, content: "Marcas, nomes e personagens de franquias podem pertencer a seus respectivos titulares. O uso como referência no catálogo não transfere direitos sobre essas obras." },
    { num: "06", title: "Uso responsável", icon: <Shield className="w-4 h-4" />, content: "Não são permitidos acesso não autorizado, exploração abusiva do serviço, envio de conteúdo malicioso ou violação de direitos de terceiros." },
    { num: "07", title: "Mudanças", icon: <FileText className="w-4 h-4" />, content: "Estes termos descrevem o catálogo público somente leitura. Funcionalidades comerciais só serão disponibilizadas após sua homologação e comunicação apropriada." },
  ] : [
    {
      num: "01",
      title: "Aceitação dos Termos",
      icon: <Shield className="w-4 h-4" />,
      content: "Ao acessar e usar o site Tonecos Studio, você concorda com os seguintes termos e condições de uso.",
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
      content: "Todo conteúdo é propriedade da Tonecos Studios, protegido por leis de direitos autorais. Reprodução, distribuição ou criação derivada requer autorização.",
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
      description="Termos e condições de uso do Tonecos Studio"
      keywords={["termos", "condições", "uso", "legal"]}
    >
      <ArcadeHero
        badge="Documento Oficial"
        title="TERMOS DE USO"
        subtitle={publicMvp ? "Catálogo público somente leitura" : "Última atualização: 03/02/2026"}
      />

      <section className="max-w-4xl mx-auto px-6 pb-16">
        <ArcadeSectionTitle>{publicMvp ? "Regras do catálogo" : "Cláusulas"}</ArcadeSectionTitle>

        <div className="space-y-4">
          {sections.map((s) => (
            <ArcadeCard key={s.num}>
              <div className={`p-6 ${s.highlight ? "border-l-2 border-l-[hsl(45,100%,50%)]" : ""}`}>
                <div className="flex items-start gap-4">
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
            <div className="p-6 text-center">
              <p className="text-[hsl(0,0%,40%)] font-mono text-[10px] tracking-wider uppercase mb-2">
                Contato Legal
              </p>
              <p className="text-[hsl(var(--gold-accent))] font-mono text-sm">
                {settings?.contact_email || CONTACT.CONTACT_EMAIL}
              </p>
              <p className="text-[hsl(0,0%,25%)] font-mono text-[9px] mt-3">
                © {new Date().getFullYear()} {settings?.company_name || "Tonecos Studios"}
              </p>
            </div>
          </ArcadeCard>
        </div>
      </section>

      <ArcadeCTA
        badge="Voltar"
        title="EXPLORAR UNIVERSO"
        description="Conheça nossas peças artesanais"
        primaryAction={{ label: "VER UNIVERSO", href: PUBLIC_ROUTES.catalog }}
        secondaryAction={{ label: "INÍCIO", href: PUBLIC_ROUTES.home }}
      />
    </Page>
  );
}
