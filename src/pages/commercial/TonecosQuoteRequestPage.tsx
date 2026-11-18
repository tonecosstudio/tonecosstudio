import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PUBLIC_ROUTES, TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { CONTACT } from "@/config/constants";
import { buildSafeMailtoHref } from "@/lib/security/safe-open";
import type { PublicCatalogModel } from "@/services/catalog/public-catalog-gateway";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";
import {
  quoteItemsFromSelection,
  submitCatalogQuoteRequest,
  type CatalogQuoteIntent,
} from "@/services/customer/catalog-quote-service";
import { getMyTonecosProfile, getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import {
  actionClass,
  CommercialPage,
  fieldClass,
  panelClass,
  secondaryClass,
} from "./CommercialPage";
import { commercialQuoteErrorText } from "./commercial-quote-error-text";
import TonecosCustomerContactSummary from "./TonecosCustomerContactSummary";
import { useTonecosSignupAvailability } from "@/hooks/auth/useTonecosSignupAvailability";

type Identity = { id: string; email: string | null };
type CustomerProfile = Awaited<ReturnType<typeof getMyTonecosProfile>>;
function quotePhone(phone: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return /^(?:55)?[1-9][0-9]{9,10}$/.test(digits) ? digits : "";
}
function savedQuotePostalCode(profile: CustomerProfile): string {
  const address = profile.delivery_address;
  if (!address || typeof address !== "object" || Array.isArray(address)) return "";
  const code = address.zipCode;
  return typeof code === "string" && /^[0-9]{8}$/.test(code) ? code : "";
}

/** Public email contact uses the existing studio inbox, not an anonymous Supabase write. */
function guestQuoteEmailHref(models: readonly PublicCatalogModel[]): string | null {
  const recipient = buildSafeMailtoHref(CONTACT.CONTACT_EMAIL);
  if (!recipient) return null;
  const references = models.map((model, index) => {
    const name = model.name.replace(/[\\r\\n]+/g, " ").slice(0, 100);
    const code = model.code.replace(/[\\r\\n]+/g, " ").slice(0, 80);
    return `${index + 1}. ${name} — código ${code}`;
  });
  const body = [
    "Olá, TONART! Quero solicitar um orçamento sem cadastro.",
    "",
    "Modelos selecionados:",
    ...(references.length ? references : ["Gostaria de ajuda para escolher os modelos."]),
    "",
    "Escala desejada:",
    "Acabamento:",
    "CEP para estimativa de entrega:",
    "Observações:",
    "",
    "Podem informar disponibilidade, valor e prazo? Nenhum pagamento está autorizado por este contato.",
  ].join("\\n");
  return recipient + "?subject=" + encodeURIComponent("Orçamento TONART — consulta por e-mail") +
    "&body=" + encodeURIComponent(body);
}

export default function TonecosQuoteRequestPage() {
  const { selectedModels, setSelectedModels } = useCatalogBrowsing();
  const navigate = useNavigate();
  const guestEmailHref = guestQuoteEmailHref(selectedModels);
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<Identity | null | undefined>(undefined);
  const [authError, setAuthError] = useState(false);
  const signupAvailability = useTonecosSignupAvailability(
    user === null && !authError && selectedModels.length > 0,
  );
  const [authAttempt, setAuthAttempt] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [profile, setProfile] = useState<CustomerProfile | null | undefined>(undefined);
  const [profileError, setProfileError] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [scale, setScale] = useState<"a definir" | "1/10" | "1/6" | "outro">(
    "a definir",
  );
  const [finishing, setFinishing] = useState<
    "a definir" | "pintado" | "sem pintura"
  >("a definir");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [intent, setIntent] = useState<CatalogQuoteIntent>(() =>
    searchParams.get("tipo") === "pre-venda" ? "preorder" : "quote",
  );

  useEffect(() => {
    let active = true;
    setUser(undefined);
    setAuthError(false);
    getTonecosCurrentUser()
      .then((identity) => {
        if (active) setUser(identity);
      })
      .catch(() => {
        if (active) {
          setAuthError(true);
          setUser(null);
        }
      });
    return () => {
      active = false;
    };
  }, [authAttempt]);

  useEffect(() => {
    if (!user || authError) {
      setProfile(null);
      setProfileError(false);
      return;
    }
    let active = true;
    setProfile(undefined);
    setProfileError(false);
    getMyTonecosProfile()
      .then((value) => { if (active) setProfile(value); })
      .catch(() => { if (active) { setProfile(null); setProfileError(true); } });
    return () => { active = false; };
  }, [user, authError, profileAttempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !user || !profile?.full_name?.trim() || selectedModels.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const items = quoteItemsFromSelection(selectedModels).map((item) => ({
        ...item,
        quantity: quantities[item.slug] ?? 1,
      }));
      const quoteId = await submitCatalogQuoteRequest(
        user.id,
        items,
        notes,
        {
          whatsapp: quotePhone(profile.whatsapp) || quotePhone(profile.phone),
          postalCode: savedQuotePostalCode(profile),
          scale,
          finishing,
        },
        intent,
      );
      setSelectedModels([]);
      navigate(TONECOS_COMMERCIAL_ROUTES.history, {
        replace: true,
        state: { sent: quoteId },
      });
    } catch (err) {
      const errorText = commercialQuoteErrorText(err);
      setError(errorText);
      if (errorText === "Sua sessão expirou. Entre novamente para continuar.") {
        // Keep the catalog selection intact while the customer signs in again.
        setUser(null);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <CommercialPage
      title="Solicitar orçamento"
      intro={intent === "preorder"
        ? "Escolha a pré-venda para solicitar sua peça com entrada de R$50 após a confirmação do valor e do prazo. O saldo é pago na finalização."
        : "Selecione modelos do catálogo, informe as quantidades e envie sua solicitação. O estúdio analisará os itens e informará valores e prazos. Nenhum pagamento é realizado agora."}
    >
      <div className="max-w-3xl">
        {error && (
          <p
            role="alert"
            className="mb-5 border border-red-500/40 p-4 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        {user === undefined ? (
          <p role="status">Verificando sua conta...</p>
        ) : null}
        {authError ? (
          <div role="alert" className={panelClass}>
            <p className="mb-4 text-sm text-white/70">
              Não foi possível verificar sua sessão. Tente novamente antes de
              entrar na conta.
            </p>
            <button
              type="button"
              className={secondaryClass}
              onClick={() => setAuthAttempt((n) => n + 1)}
            >
              Tentar novamente
            </button>
            <Link className={secondaryClass + " ml-3"} to={PUBLIC_ROUTES.contact}>
              Contato por e-mail
            </Link>
          </div>
        ) : user === null && selectedModels.length > 0 ? (
          <div className={panelClass}>
            <p className="mb-5 text-sm leading-relaxed text-white/70">
              Entre com sua conta para enviar a seleção e acompanhar a resposta
              da TONART Studio.
              {signupAvailability === "disabled" &&
                " Novos cadastros estão fechados nesta etapa."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className={actionClass}
                to={TONECOS_COMMERCIAL_ROUTES.login + "?next=" + encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.request)}
              >
                Entrar
              </Link>
              {signupAvailability === "enabled" && (
                <Link
                  className={secondaryClass}
                  to={TONECOS_COMMERCIAL_ROUTES.login + "?mode=signup&next=" + encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.request)}
                >
                  Criar conta
                </Link>
              )}
              {guestEmailHref && (
                <a className={secondaryClass} href={guestEmailHref}>
                  Pedir orçamento por e-mail
                </a>
              )}
            </div>
            {guestEmailHref && (
              <p className="mt-4 text-xs leading-5 text-white/60">
                Sem conta? O e-mail inclui as referências selecionadas e abre no seu aplicativo de e-mail.
                Revise e envie a mensagem. A resposta será por e-mail, sem protocolo em Meus Orçamentos.
              </p>
            )}
          </div>
        ) : null}
        {selectedModels.length === 0 ? (
          <div className={panelClass}>
            <p className="mb-5 text-white/70">
              Nenhum modelo selecionado nesta visita.
            </p>
            <Link className={secondaryClass} to="/modelos">
              Escolher modelos
            </Link>
          </div>
        ) : user && !authError && profile === undefined ? (
          <p role="status">Carregando seus dados cadastrais...</p>
        ) : user && !authError && profileError ? (
          <div role="alert" className={panelClass}>
            <p className="mb-4 text-sm text-white/70">
              Não foi possível carregar seus dados. A solicitação não será enviada sem conferir sua conta.
            </p>
            <button type="button" className={secondaryClass} onClick={() => setProfileAttempt((n) => n + 1)}>
              Tentar carregar dados
            </button>
          </div>
        ) : user && !authError && profile && !profile.full_name?.trim() ? (
          <div className={panelClass}>
            <p className="mb-4 text-sm text-white/70">
              Complete seu nome na Minha Conta antes de solicitar o orçamento. Seus dados são cadastrados apenas uma vez.
            </p>
            <Link className={actionClass} to={TONECOS_COMMERCIAL_ROUTES.account}>Completar Minha Conta</Link>
          </div>
        ) : user && !authError && profile ? (
          <form
            className={panelClass + " space-y-6"}
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <div>
              <h2 className="text-lg font-semibold">
                {selectedModels.length}{" "}
                {selectedModels.length === 1
                  ? "modelo selecionado"
                  : "modelos selecionados"}
              </h2>
              <p className="mt-1 text-xs text-white/55">
                Os preços serão definidos após análise da solicitação.
              </p>
            </div>
            <fieldset className="space-y-3 border-y border-white/15 py-5">
              <legend className="px-1 text-sm font-medium">Como deseja continuar?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 border border-white/15 p-4 has-[:checked]:border-[hsl(var(--gold-accent))]">
                  <input
                    type="radio"
                    name="quote-intent"
                    value="quote"
                    checked={intent === "quote"}
                    onChange={() => setIntent("quote")}
                    className="mt-1 accent-[hsl(var(--gold-accent))]"
                  />
                  <span>
                    <span className="block text-sm font-medium">Só quero o orçamento</span>
                    <span className="mt-1 block text-xs leading-5 text-white/55">Sem compromisso de compra ou pagamento.</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 border border-white/15 p-4 has-[:checked]:border-[hsl(var(--gold-accent))]">
                  <input
                    type="radio"
                    name="quote-intent"
                    value="preorder"
                    checked={intent === "preorder"}
                    onChange={() => setIntent("preorder")}
                    className="mt-1 accent-[hsl(var(--gold-accent))]"
                  />
                  <span>
                    <span className="block text-sm font-medium">Quero fazer pré-venda</span>
                    <span className="mt-1 block text-xs leading-5 text-white/55">R$50 de entrada; saldo restante na finalização.</span>
                  </span>
                </label>
              </div>
              {intent === "preorder" && (
                <p className="text-xs leading-5 text-white/60">
                  Primeiro a TONART confirma o preço total e o prazo. Depois você recebe os dados de pagamento, envia o comprovante de R$50 e acompanha a aprovação na sua conta. O saldo é calculado como valor total menos R$50.
                </p>
              )}
            </fieldset>
            <ul className="space-y-3">
              {selectedModels.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-4 border-b border-white/15 pb-4"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-medium text-white/90 hover:underline"
                      to={"/modelos/" + encodeURIComponent(item.slug)}
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-white/50">{item.code}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <span>Quantidade</span>
                    <input
                      aria-label={"Quantidade de " + item.name}
                      type="number"
                      min={1}
                      max={10}
                      step={1}
                      required
                      className={fieldClass + " w-20"}
                      value={quantities[item.slug] ?? 1}
                      onChange={(e) =>
                        setQuantities((before) => ({
                          ...before,
                          [item.slug]: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="min-h-11 px-2 text-xs text-white/55 hover:text-white"
                    aria-label={"Remover " + item.name}
                    onClick={() =>
                      setSelectedModels((models) =>
                        models.filter((model) => model.id !== item.id),
                      )
                    }
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
            <TonecosCustomerContactSummary
              profile={profile}
              email={user.email}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span>Escala desejada</span>
                <select
                  className={fieldClass}
                  value={scale}
                  onChange={(event) =>
                    setScale(event.target.value as typeof scale)
                  }
                >
                  <option value="a definir">A definir</option>
                  <option value="1/10">1/10 — aprox. 21 cm</option>
                  <option value="1/6">1/6 — aprox. 36 cm</option>
                  <option value="outro">
                    Outra (informar nas observações)
                  </option>
                </select>
              </label>
              <label className="block space-y-2 text-sm">
                <span>Acabamento</span>
                <select
                  className={fieldClass}
                  value={finishing}
                  onChange={(event) =>
                    setFinishing(event.target.value as typeof finishing)
                  }
                >
                  <option value="a definir">A definir</option>
                  <option value="pintado">Pintado</option>
                  <option value="sem pintura">Sem pintura</option>
                </select>
              </label>
            </div>
            <label className="block space-y-2 text-sm">
              <span>Observações (opcional)</span>
              <textarea
                className={fieldClass + " min-h-28"}
                value={notes}
                maxLength={2000}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Escala desejada, acabamento, prazo ou detalhes importantes."
              />
            </label>
            <p className="text-xs text-white/55">
              {intent === "preorder"
                ? "O pedido de pré-venda não gera cobrança imediata. O pagamento de R$50 só será solicitado após confirmação do orçamento e das instruções de pagamento."
                : "O envio registra apenas a referência dos modelos e sua solicitação; não gera compra ou cobrança."}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className={actionClass}
                type="submit"
                disabled={!user || !profile || busy}
              >
                {busy
                  ? "Enviando..."
                  : intent === "preorder"
                    ? "Solicitar pré-venda"
                    : "Enviar solicitação"}
              </button>
              <Link className={secondaryClass} to="/modelos">
                Adicionar modelos
              </Link>
            </div>
          </form>
        ) : null}
      </div>
    </CommercialPage>
  );
}
