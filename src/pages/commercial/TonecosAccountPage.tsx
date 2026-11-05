import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  getTonecosCurrentUser, getMyTonecosProfile, registerTonecosAccount,
  signInTonecosAccount, signOutTonecosAccount, updateMyTonecosProfile,
} from "@/services/customer/tonecos-account-service";
import { actionClass, CommercialPage, fieldClass, panelClass, secondaryClass } from "./CommercialPage";

type Identity = { id: string; email: string | null };
const safeNext = new Set<string>([TONECOS_COMMERCIAL_ROUTES.account, TONECOS_COMMERCIAL_ROUTES.request, TONECOS_COMMERCIAL_ROUTES.history]);

function errorText(value: unknown) {
  return value instanceof Error ? value.message : "Não foi possível completar a operação.";
}

export default function TonecosAccountPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext.has(params.get("next") ?? "") ? params.get("next")! : TONECOS_COMMERCIAL_ROUTES.account;
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [identity, setIdentity] = useState<Identity | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getTonecosCurrentUser()
      .then((user) => { if (active) setIdentity(user); })
      .catch((err: unknown) => {
        if (active) { setIdentity(null); setError(errorText(err)); }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!identity) return;
    let active = true;
    setProfileLoading(true);
    getMyTonecosProfile()
      .then((profile) => {
        if (!active) return;
        setName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");
      })
      .catch((err: unknown) => { if (active) setError(errorText(err)); })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [identity?.id]);

  async function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "signup") {
        const result = await registerTonecosAccount({ email, password, fullName: name });
        setPassword("");
        if (result.emailConfirmationRequired) {
          setNotice("Cadastro recebido. Confirme seu e-mail antes de entrar.");
        } else {
          const current = await getTonecosCurrentUser();
          if (!current) throw new Error("Confirme a sessão antes de continuar.");
          setIdentity(current);
          navigate(next);
        }
      } else {
        const id = await signInTonecosAccount(email, password);
        setPassword("");
        setIdentity({ id, email });
        navigate(next);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await updateMyTonecosProfile({ fullName: name, phone });
      setNotice("Dados da conta atualizados.");
    } catch (err) {
      setError(errorText(err));
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setError(""); setNotice("");
    try {
      await signOutTonecosAccount();
      setIdentity(null); setPassword("");
      navigate(TONECOS_COMMERCIAL_ROUTES.login, { replace: true });
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }

  return (
    <CommercialPage title="Minha conta" intro="Acesse seus dados e acompanhe suas solicitações de orçamento. Não há cobrança online nesta etapa.">
      <div className="mx-auto max-w-xl">
        {error && <p role="alert" className="mb-5 border border-red-500/40 p-4 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="mb-5 border border-white/20 p-4 text-sm text-white/80">{notice}</p>}
        {identity === undefined ? (
          <p role="status">Verificando sessão...</p>
        ) : identity ? (
          <div className={panelClass}>
            <p className="mb-4 text-sm text-white/60">Conectado como {identity.email ?? "cliente"}</p>
            {profileLoading ? <p role="status" className="mb-4 text-white/60">Carregando dados...</p> : null}
            <form onSubmit={(event) => { void saveProfile(event); }} className="space-y-5">
              <label className="block space-y-2 text-sm">
                <span>Nome completo</span>
                <input className={fieldClass} required maxLength={160} autoComplete="name"
                  value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block space-y-2 text-sm">
                <span>Telefone (opcional)</span>
                <input className={fieldClass} maxLength={40} autoComplete="tel"
                  value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <button type="submit" disabled={busy || profileLoading} className={actionClass}>Salvar dados</button>
            </form>
            <div className="mt-7 flex flex-wrap gap-3 border-t border-white/15 pt-6">
              <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.history}>Meus orçamentos</Link>
              {import.meta.env.VITE_TONECOS_COINS_ENABLED === "true" &&
                <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.coins}>Minhas moedas</Link>}
              <Link className={secondaryClass} to="/modelos">Explorar modelos</Link>
              {identity.email?.trim().toLowerCase() === "tonecosstudio@gmail.com" &&
                <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.adminQuotes}>
                  Atendimento Tonecos
                </Link>
              }
              <button type="button" onClick={() => { void signOut(); }} disabled={busy}
                className={secondaryClass}>Sair da conta</button>
            </div>
          </div>
        ) : (
          <div className={panelClass}>
            <div className="mb-6 flex gap-3" aria-label="Acesso à conta">
              <button className={mode === "login" ? actionClass : secondaryClass} type="button"
                onClick={() => { setMode("login"); setError(""); setNotice(""); }}>Acessar conta</button>
              <button className={mode === "signup" ? actionClass : secondaryClass} type="button"
                onClick={() => { setMode("signup"); setError(""); setNotice(""); }}>Cadastrar</button>
            </div>
            <form onSubmit={(event) => { void submitAccess(event); }} className="space-y-5">
              {mode === "signup" && <label className="block space-y-2 text-sm">
                <span>Nome completo</span>
                <input className={fieldClass} required autoComplete="name" maxLength={160}
                  value={name} onChange={(e) => setName(e.target.value)} />
              </label>}
              <label className="block space-y-2 text-sm">
                <span>E-mail</span>
                <input className={fieldClass} type="email" required maxLength={320} autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="block space-y-2 text-sm">
                <span>Senha</span>
                <input className={fieldClass} type="password" required minLength={mode === "signup" ? 12 : 1}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              {mode === "login" && <div className="text-right">
                <Link className="text-xs text-[hsl(var(--gold-accent))] underline underline-offset-4"
                  to={TONECOS_COMMERCIAL_ROUTES.recovery}>Esqueci minha senha</Link>
              </div>}
              {mode === "signup" && <p className="text-xs text-white/55">
                Use pelo menos 12 caracteres, incluindo maiúscula, minúscula, número e símbolo.
              </p>}
              <button type="submit" disabled={busy} className={actionClass}>
                {busy ? "Processando..." : mode === "signup" ? "Criar conta" : "Entrar"}
              </button>
            </form>
          </div>
        )}
      </div>
    </CommercialPage>
  );
}
