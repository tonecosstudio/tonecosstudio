import type { SystemSettings } from "@/hooks/useSystemSettings";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeHero,
  ArcadeCard,
  ArcadeSectionTitle,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import { Eye, Database, Lock, Users, UserCheck, Cookie, Baby, RefreshCw, Building } from "lucide-react";
import { PUBLIC_ROUTES } from "@/config/routes";
import { CONTACT } from "@/config/constants";
import { isCatalogPublicMvpEnabled } from "@/config/catalog-public-mvp";

export function PrivacyArcadeView({ settings }: { settings?: SystemSettings }) {
  const readOnly = import.meta.env.VITE_PREVIEW_READ_ONLY === "true";
  const publicMvp = readOnly && isCatalogPublicMvpEnabled();
  const contactEmail = settings?.privacy_email || CONTACT.PRIVACY_EMAIL || CONTACT.CONTACT_EMAIL;

  const sections = publicMvp ? [
    { num: "01", title: "Escopo do catálogo", icon: <Database className="w-4 h-4" />, content: "O catálogo público permite consultar modelos, categorias e imagens. Nesta versão não há cadastro, pedidos ou pagamentos pelo site." },
    { num: "02", title: "Dados técnicos", icon: <Eye className="w-4 h-4" />, content: "A navegação pode gerar registros técnicos de acesso, como endereço IP, horário e páginas solicitadas, necessários para operação e segurança da hospedagem." },
    { num: "03", title: "Contato por e-mail", icon: <Users className="w-4 h-4" />, content: "O contato abre seu aplicativo de e-mail. O endereço do remetente e o conteúdo enviado são tratados pelos respectivos serviços de correio eletrônico; não há formulário de envio pelo catálogo." },
    { num: "04", title: "Cookies e proteção", icon: <Cookie className="w-4 h-4" />, content: "Recursos de segurança e funcionamento podem utilizar cookies técnicos. O catálogo não exige uma conta de cliente para navegar." },
    { num: "05", title: "Provedores", icon: <Lock className="w-4 h-4" />, content: "A infraestrutura de hospedagem e entrega das imagens utiliza serviços Cloudflare. A comunicação por e-mail depende do provedor escolhido pelo remetente e pelo estúdio." },
    { num: "06", title: "Direitos sobre dados", icon: <UserCheck className="w-4 h-4" />, content: "Você pode solicitar informações e exercer os direitos aplicáveis pela LGPD por meio do contato de privacidade informado abaixo.", highlight: true },
    { num: "07", title: "Atualizações", icon: <RefreshCw className="w-4 h-4" />, content: "Esta descrição cobre o catálogo público somente leitura. Recursos futuros de cadastro ou compra exigirão informações e controles próprios antes de serem disponibilizados." },
  ] : [
    { num: "01", title: "Dados Coletados", icon: <Database className="w-4 h-4" />, content: "Cadastro (nome, email, CPF, telefone) • Endereço • Pagamento (criptografado) • Uso (preferências, histórico, cookies)" },
    { num: "02", title: "Finalidade", icon: <Eye className="w-4 h-4" />, content: "Processar pedidos • Comunicar status • Personalizar experiência • Processar pagamentos • Melhorar serviços • Cumprir obrigações legais" },
    { num: "03", title: "Base Legal", icon: <UserCheck className="w-4 h-4" />, content: "Consentimento expresso • Execução de contrato • Obrigação legal • Legítimo interesse para melhorias e segurança" },
    { num: "04", title: "Compartilhamento", icon: <Users className="w-4 h-4" />, content: "Processadores de pagamento • Serviços de entrega • Provedores de tecnologia • Autoridades (quando exigido). Nunca vendemos seus dados.", highlight: true },
    { num: "05", title: "Segurança", icon: <Lock className="w-4 h-4" />, content: "Transmissão HTTPS/TLS, autenticação e controles de acesso. Nenhuma solução tecnológica elimina todos os riscos." },
    { num: "06", title: "Seus Direitos (LGPD)", icon: <UserCheck className="w-4 h-4" />, content: "Confirmação • Acesso • Correção • Anonimização • Portabilidade • Eliminação • Revogação • Oposição", highlight: true },
    { num: "07", title: "Cookies", icon: <Cookie className="w-4 h-4" />, content: "Manter sessão • Lembrar preferências • Analisar uso • Melhorar experiência. Gerencie nas configurações do navegador." },
    { num: "08", title: "Menores", icon: <Baby className="w-4 h-4" />, content: "Plataforma não destinada a menores de 18 anos. Não coletamos dados de menores intencionalmente." },
    { num: "09", title: "Alterações", icon: <RefreshCw className="w-4 h-4" />, content: "Política atualizada periodicamente. Notificamos mudanças significativas por email ou plataforma." },
    { num: "10", title: "DPO & ANPD", icon: <Building className="w-4 h-4" />, content: `DPO: ${settings?.dpo_email || CONTACT.DPO_EMAIL} • ANPD: www.gov.br/anpd • Conformidade LGPD 13.709/2018` },
  ];

  return (
    <Page
      title="Política de Privacidade"
      description="Política de privacidade e proteção de dados do TONART Studio"
      keywords={["privacidade", "dados", "lgpd", "proteção"]}
    >
      <ArcadeHero
        badge="Arquivo Confidencial"
        title="PRIVACIDADE"
        subtitle={publicMvp ? "Informações sobre a navegação no catálogo" : "Seus dados estão protegidos"}
        compact
      />

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <ArcadeSectionTitle>{publicMvp ? "Privacidade do catálogo" : "Protocolo de Dados"}</ArcadeSectionTitle>

        <div className="space-y-4">
          {sections.map((s) => (
            <ArcadeCard key={s.num}>
              <div className={`p-4 sm:p-6 ${s.highlight ? "border-l-2 border-l-[hsl(120,60%,40%)]" : ""}`}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.05)]">
                    <span className="font-mono text-xs text-[hsl(var(--gold-accent))] font-bold">{s.num}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[hsl(var(--gold-accent)/0.6)]">{s.icon}</span>
                      <h3 className="font-mono text-sm text-[hsl(0,0%,90%)] uppercase tracking-wider font-bold">{s.title}</h3>
                    </div>
                    <p className="text-[hsl(0,0%,50%)] font-mono text-xs leading-relaxed tracking-wide">{s.content}</p>
                  </div>
                </div>
              </div>
            </ArcadeCard>
          ))}
        </div>

        <div className="mt-10">
          <ArcadeCard>
            <div className="p-4 sm:p-6 text-center">
              <p className="text-[hsl(0,0%,40%)] font-mono text-[10px] tracking-wider uppercase mb-2">{publicMvp ? "Contato de privacidade" : "Conformidade LGPD"}</p>
              <p className="text-[hsl(var(--gold-accent))] font-mono text-sm">{contactEmail}</p>
              <p className="text-[hsl(0,0%,25%)] font-mono text-[9px] mt-3">© {new Date().getFullYear()} TONART Studio</p>
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
