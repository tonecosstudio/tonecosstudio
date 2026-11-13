import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { hasTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";
import {
  changeTonecosPassword,
  getTonecosCurrentUser,
  getMyTonecosProfile,
  registerTonecosAccount,
  resendTonecosSignupConfirmation,
  signInTonecosAccount,
  signOutTonecosAccount,
  updateMyTonecosProfile,
} from "@/services/customer/tonecos-account-service";
import {
  actionClass,
  CommercialPage,
  fieldClass,
  panelClass,
  secondaryClass,
} from "./CommercialPage";
import PasswordField from "./PasswordField";
import { commercialAccountErrorText } from "./commercial-account-error-text";

type Identity = { id: string; email: string | null };
const safeNext = new Set<string>([
  TONECOS_COMMERCIAL_ROUTES.account,
  TONECOS_COMMERCIAL_ROUTES.adminHome,
  ...(import.meta.env.VITE_CATALOG_QUOTES_ENABLED === "true"
    ? [
        TONECOS_COMMERCIAL_ROUTES.request,
        TONECOS_COMMERCIAL_ROUTES.history,
        TONECOS_COMMERCIAL_ROUTES.adminQuotes,
      ]
    : []),
  ...(import.meta.env.VITE_TONECOS_COINS_ENABLED === "true"
    ? [TONECOS_COMMERCIAL_ROUTES.coins, TONECOS_COMMERCIAL_ROUTES.adminCoins]
    : []),
]);

 export default function TonecosAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const next = safeNext.has(params.get("next") ?? "")
    ? params.get("next")!
    : TONECOS_COMMERCIAL_ROUTES.account;
  const [mode, setMode] = useState(
    params.get("mode") === "signup" ? "signup" : "login",
  );
  const [identity, setIdentity] = useState<Identity | null | undefined>(
    undefined,
  );
  const [sessionError, setSessionError] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [profileError, setProfileError] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() =>
    (location.state as { recovered?: unknown } | null)?.recovered === true
      ? "Senha atualizada com sucesso. Entre com sua nova senha."
      : "",
  );

  useEffect(() => {
    let active = true;
    setIdentity(undefined);
    setSessionError(false);
    setError("");
    getTonecosCurrentUser()
      .then((user) => {
        if (active) setIdentity(user);
      })
      .catch((err: unknown) => {
        if (active) {
          setIdentity(null);
          setSessionError(true);
          setError(commercialAccountErrorText(err));
        }
      });
    return () => {
      active = false;
    };
  }, [sessionAttempt]);

  useEffect(() => {
    if (!identity) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    hasTonecosAdminAccess()
      .then((allowed) => {
        if (active) setIsAdmin(allowed);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [identity]);

  useEffect(() => {
    if (!identity) return;
    let active = true;
    setProfileLoading(true);
    setProfileError(false);
    setError("");
    getMyTonecosProfile()
      .then((profile) => {
        if (!active) return;
        setName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");
      })
      .catch((err: unknown) => {
        if (active) {
          setProfileError(true);
          setError(commercialAccountErrorText(err));
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [identity, profileAttempt]);

  async function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signup") {
        const result = await registerTonecosAccount({
          email,
          password,
          fullName: name,
        });
        setPassword("");
        if (result.emailConfirmationRequired) {
          setConfirmationPending(true);
          setNotice(
            "Solicitação processada. Se esta for uma nova conta, verifique o e-mail de confirmação, inclusive no spam. Se já tem cadastro, entre com sua senha ou use a recuperação de acesso.",
          );
          setMode("login");
        } else {
          const current = await getTonecosCurrentUser();
          if (!current)
            throw new Error("Confirme a sessão antes de continuar.");
          setIdentity(current);
          navigate(next);
        }
      } else {
        const id = await signInTonecosAccount(email, password);
        setPassword("");
        setConfirmationPending(false);
        setIdentity({ id, email });
        const admin = await hasTonecosAdminAccess().catch(() => false);
        setIsAdmin(admin);
        navigate(
          next === TONECOS_COMMERCIAL_ROUTES.account && admin
            ? TONECOS_COMMERCIAL_ROUTES.adminHome
            : next,
        );
      }
    } catch (err) {
      setError(commercialAccountErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await resendTonecosSignupConfirmation(email);
      setNotice(
        "Nova confirmação solicitada. Verifique seu e-mail e a pasta de spam. O envio está sujeito aos limites de segurança do serviço.",
      );
    } catch (err) {
      setError(commercialAccountErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateMyTonecosProfile({ fullName: name, phone });
      setNotice("Dados da conta atualizados.");
    } catch (err) {
      setError(commercialAccountErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    if (newPassword !== confirmPassword) {
      setError("As novas senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      await changeTonecosPassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPassword("");
      setIdentity(null);
      setIsAdmin(false);
      setNotice("Senha alterada com sucesso. Entre novamente com a nova senha.");
      navigate(TONECOS_COMMERCIAL_ROUTES.login, { replace: true });
    } catch (err) {
      setError(commercialAccountErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await signOutTonecosAccount();
      setIdentity(null);
      setIsAdmin(false);
      setPassword("");
      navigate(TONECOS_COMMERCIAL_ROUTES.login, { replace: true });
    } catch (err) {
      setError(commercialAccountErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CommercialPage
      title="Minha conta"
      intro="Acesse seus dados e acompanhe suas solicitações de orçamento. Não há cobrança online nesta etapa."
    >
      <div className="mx-auto max-w-xl">
        {error && (
          <p
            role="alert"
            className="mb-5 border border-red-500/40 p-4 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mb-5 border border-white/20 p-4 text-sm text-white/80"
          >
            {notice}
          </p>
        )}
        {sessionError ? (
          <div className={panelClass}>
            <p className="mb-4 text-sm text-white/70">
              Não foi possível verificar sua sessão. Tente novamente antes de
              entrar na conta.
            </p>
            <button
              type="button"
              className={secondaryClass}
              onClick={() => setSessionAttempt((current) => current + 1)}
            >
              Tentar novamente
            </button>
          </div>
        ) : identity === undefined ? (
          <p role="status">Verificando sessão...</p>
        ) : identity ? (
          <div className={panelClass}>
            <p className="mb-4 text-sm text-white/60">
              Conectado como {identity.email ?? "cliente"}
            </p>
            {profileLoading ? (
              <p role="status" className="mb-4 text-white/60">
                Carregando dados...
              </p>
            ) : null}
            {profileError ? (
              <div className="mb-5 border border-white/15 p-4">
                <p className="mb-4 text-sm text-white/70">
                  Não foi possível carregar seus dados. Nenhuma alteração será
                  enviada antes de recuperá-los.
                </p>
                <button
                  type="button"
                  className={secondaryClass}
                  onClick={() => setProfileAttempt((current) => current + 1)}
                >
                  Tentar carregar dados
                </button>
              </div>
            ) : !profileLoading ? (
              <form
                onSubmit={(event) => {
                  void saveProfile(event);
                }}
                className="space-y-5"
              >
                <label className="block space-y-2 text-sm">
                  <span>Nome completo</span>
                  <input
                    className={fieldClass}
                    required
                    maxLength={160}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>Telefone (opcional)</span>
                  <input
                    className={fieldClass}
                    maxLength={40}
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <button type="submit" disabled={busy} className={actionClass}>
                  Salvar dados
                </button>
              </form>
            ) : null}
            <section
              className="mt-7 border-t border-white/15 pt-6"
              aria-labelledby="account-security-title"
            >
              <h2 id="account-security-title" className="text-base font-semibold">
                Segurança da conta
              </h2>
              <p className="mt-2 text-xs text-white/55">
                Para trocar a senha, confirme a senha atual. Após a alteração,
                será necessário entrar novamente.
              </p>
              <form
                className="mt-5 space-y-4"
                onSubmit={(event) => {
                  void changePassword(event);
                }}
              >
                <PasswordField
                  label="Senha atual"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  required
                  minLength={1}
                  autoComplete="current-password"
                />
                <PasswordField
                  label="Nova senha"
                  value={newPassword}
                  onChange={setNewPassword}
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
                <PasswordField
                  label="Confirmar nova senha"
                  visibilityLabel="confirmação da nova senha"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
                <p className="text-xs text-white/55">
                  Use pelo menos 12 caracteres com maiúscula, minúscula, número
                  e símbolo.
                </p>
                <button type="submit" disabled={busy} className={secondaryClass}>
                  {busy ? "Processando..." : "Alterar senha"}
                </button>
              </form>
            </section>
            <div className="mt-7 flex flex-wrap gap-3 border-t border-white/15 pt-6">
              {import.meta.env.VITE_CATALOG_QUOTES_ENABLED === "true" && (
                <Link
                  className={secondaryClass}
                  to={TONECOS_COMMERCIAL_ROUTES.history}
                >
                  Meus orçamentos
                </Link>
              )}
              {import.meta.env.VITE_TONECOS_COINS_ENABLED === "true" && (
                <Link
                  className={secondaryClass}
                  to={TONECOS_COMMERCIAL_ROUTES.coins}
                >
                  Minhas moedas
                </Link>
              )}
              <Link className={secondaryClass} to="/modelos">
                Explorar modelos
              </Link>
              {isAdmin && (
                <Link
                  className={actionClass}
                  to={TONECOS_COMMERCIAL_ROUTES.adminHome}
                >
                  Painel administrativo
                </Link>
              )}
              {import.meta.env.VITE_TONECOS_COINS_ENABLED === "true" &&
                isAdmin && (
                  <Link
                    className={secondaryClass}
                    to={TONECOS_COMMERCIAL_ROUTES.adminCoins}
                  >
                    Administração de moedas
                  </Link>
                )}
              <button
                type="button"
                onClick={() => {
                  void signOut();
                }}
                disabled={busy}
                className={secondaryClass}
              >
                Sair da conta
              </button>
            </div>
          </div>
        ) : (
          <div className={panelClass}>
            <div className="mb-6 flex gap-3" aria-label="Acesso à conta">
              <button
                className={mode === "login" ? actionClass : secondaryClass}
                type="button"
                onClick={() => {
                  setMode("login");
                  setConfirmationPending(false);
                  setError("");
                  setNotice("");
                }}
              >
                Acessar conta
              </button>
              <button
                className={mode === "signup" ? actionClass : secondaryClass}
                type="button"
                onClick={() => {
                  setMode("signup");
                  setConfirmationPending(false);
                  setError("");
                  setNotice("");
                }}
              >
                Cadastrar
              </button>
            </div>
            <form
              onSubmit={(event) => {
                void submitAccess(event);
              }}
              className="space-y-5"
            >
              {mode === "signup" && (
                <label className="block space-y-2 text-sm">
                  <span>Nome completo</span>
                  <input
                    className={fieldClass}
                    required
                    autoComplete="name"
                    maxLength={160}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              <label className="block space-y-2 text-sm">
                <span>E-mail</span>
                <input
                  className={fieldClass}
                  type="email"
                  required
                  maxLength={320}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <PasswordField
                key={mode}
                label="Senha"
                value={password}
                onChange={setPassword}
                required
                minLength={mode === "signup" ? 12 : 1}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
              />
              {mode === "login" && (
                <div className="text-right">
                  <Link
                    className="text-xs text-[hsl(var(--gold-accent))] underline underline-offset-4"
                    to={TONECOS_COMMERCIAL_ROUTES.recovery}
                  >
                    Esqueci minha senha
                  </Link>
                </div>
              )}
              {mode === "signup" && (
                <p className="text-xs text-white/55">
                  Use pelo menos 12 caracteres, incluindo maiúscula, minúscula,
                  número e símbolo.
                </p>
              )}
              <button type="submit" disabled={busy} className={actionClass}>
                {busy
                  ? "Processando..."
                  : mode === "signup"
                    ? "Criar conta"
                    : "Entrar"}
              </button>
            </form>
            {mode === "login" && confirmationPending && (
              <div className="mt-5 border-t border-white/15 pt-5">
                <p className="mb-3 text-xs text-white/60">
                  Não recebeu a confirmação? Você pode solicitar um novo envio
                  para o e-mail informado acima.
                </p>
                <button
                  type="button"
                  className={secondaryClass}
                  disabled={busy || !email.trim()}
                  onClick={() => {
                    void resendConfirmation();
                  }}
                >
                  {busy ? "Processando..." : "Reenviar confirmação"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </CommercialPage>
  );
}
