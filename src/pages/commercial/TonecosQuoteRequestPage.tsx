import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";
import {
  quoteItemsFromSelection,
  submitCatalogQuoteRequest,
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

type Identity = { id: string; email: string | null };
type CustomerProfile = Awaited<ReturnType<typeof getMyTonecosProfile>>;
function quotePhone(phone: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return /^(?:55)?[1-9][0-9]{9,10}$/.test(digits) ? digits : "";
}

export default function TonecosQuoteRequestPage() {
  const { selectedModels, setSelectedModels } = useCatalogBrowsing();
  const navigate = useNavigate();
  const [user, setUser] = useState<Identity | null | undefined>(undefined);
  const [authError, setAuthError] = useState(false);
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
      const quoteId = await submitCatalogQuoteRequest(user.id, items, notes, {
        whatsapp: quotePhone(profile.phone),
        postalCode: "",
        scale,
        finishing,
      });
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
      intro="Selecione modelos do catálogo, informe as quantidades e envie sua solicitação. O estúdio analisará os itens e informará valores e prazos. Nenhum pagamento é realizado agora."
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
          </div>
        ) : user === null && selectedModels.length > 0 ? (
          <div className={panelClass}>
            <p className="mb-5 text-sm leading-relaxed text-white/70">
              Entre ou crie uma conta para enviar a seleção e acompanhar a
              resposta da TONART Studio.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className={actionClass}
                to={TONECOS_COMMERCIAL_ROUTES.login + "?next=" + encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.request)}
              >
                Entrar
              </Link>
              <Link
                className={secondaryClass}
                to={TONECOS_COMMERCIAL_ROUTES.login + "?mode=signup&next=" + encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.request)}
              >
                Criar conta
              </Link>
            </div>
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
            <section
              className="border-y border-white/15 py-4"
              aria-label="Dados da conta utilizados no orçamento"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Seus dados de contato</h3>
                <Link className="text-xs text-[hsl(var(--gold-accent))] underline-offset-2 hover:underline" to={TONECOS_COMMERCIAL_ROUTES.account}>
                  Editar na Minha Conta
                </Link>
              </div>
              <p className="text-sm text-white/85">{profile.full_name}</p>
              <p className="mt-1 text-xs text-white/60">{user.email ?? profile.email}</p>
              <p className="mt-1 text-xs text-white/60">
                Telefone: {profile.phone || "Não cadastrado — contato por e-mail"}
              </p>
              <p className="mt-2 text-xs text-white/50">
                Dados pessoais da mesma conta. Dados de entrega serão mantidos na Minha Conta após a integração cadastral.
              </p>
            </section>
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
              O envio registra apenas a referência dos modelos e sua
              solicitação; não gera compra ou cobrança.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className={actionClass}
                type="submit"
                disabled={!user || !profile || busy}
              >
                {busy ? "Enviando..." : "Enviar solicitação"}
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
