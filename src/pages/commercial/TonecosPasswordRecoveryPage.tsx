import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  resolveTonecosCustomerReturnPath,
  tonecosLoginReturnPath,
  tonecosRecoveryPath,
} from "@/config/routes";
import { isPasswordPolicyCompliant } from "@/config/auth";
import {
  completeTonecosPasswordRecovery,
  getTonecosCurrentUser,
  requestTonecosPasswordReset,
  verifyTonecosPasswordRecoveryToken,
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

export default function TonecosPasswordRecoveryPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const update = params.get("action") === "update";
  const returnTo = resolveTonecosCustomerReturnPath(params.get("next"));
  const recoveryToken = params.get("token_hash");
  const recoveryType = params.get("type");
  const validationStarted = useRef(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshSession = useCallback(async () => {
    setError("");
    try {
      if (recoveryToken) {
        // Clear the single-use token from browser history before exchanging it.
        navigate(
          tonecosRecoveryPath(returnTo, true),
          { replace: true },
        );
        if (recoveryType !== "recovery")
          throw new Error("tonecos_recovery_link_invalid");
        await verifyTonecosPasswordRecoveryToken(recoveryToken);
      }
      const user = await getTonecosCurrentUser();
      setVerified(Boolean(user));
      if (!user)
        setError(
          "Não foi possível validar o link. Solicite um novo e-mail de recuperação.",
        );
    } catch {
      setVerified(false);
      setError(
        "Não foi possível validar o link. Ele pode ter expirado ou já ter sido utilizado.",
      );
    }
  }, [navigate, recoveryToken, recoveryType, returnTo]);
  useEffect(() => {
    if (update && !validationStarted.current) {
      validationStarted.current = true;
      void refreshSession();
    }
  }, [update, refreshSession]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setError("");
    setNotice("");
    setSending(true);
    try {
      if (update) {
        if (!verified) throw new Error("tonecos_recovery_session_required");
        if (password !== confirm) throw new Error("As senhas não coincidem.");
        if (!isPasswordPolicyCompliant(password))
          throw new Error("A senha não cumpre os requisitos de segurança.");
        await completeTonecosPasswordRecovery(password);
        setPassword("");
        setConfirm("");
        navigate(tonecosLoginReturnPath(returnTo), {
          replace: true,
          state: { recovered: true },
        });
      } else {
        await requestTonecosPasswordReset(email, returnTo);
        setNotice(
          "Se o e-mail estiver cadastrado, enviaremos um link de recuperação. Confira sua caixa de entrada.",
        );
      }
    } catch (err) {
      setError(commercialAccountErrorText(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <CommercialPage
      title={update ? "Criar nova senha" : "Recuperar acesso"}
      intro={
        update
          ? "Após validar o link recebido por e-mail, escolha uma nova senha para sua conta TONART Studio."
          : "Informe o e-mail cadastrado para receber as instruções de recuperação de senha."
      }
    >
      <div className={panelClass + " max-w-lg"}>
        {error && (
          <p
            role="alert"
            className="mb-5 border border-red-500/30 p-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mb-5 border border-white/20 p-3 text-sm text-white/80"
          >
            {notice}
          </p>
        )}
        {update && verified === null && (
          <p role="status">Verificando link de recuperação...</p>
        )}
        {update && verified === false && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Este link não possui uma sessão válida ou já expirou.
            </p>
            <button
              type="button"
              className={secondaryClass}
              onClick={() => {
                void refreshSession();
              }}
            >
              Verificar novamente
            </button>
            <Link
              className={secondaryClass}
              to={tonecosRecoveryPath(returnTo)}
            >
              Solicitar outro link
            </Link>
          </div>
        )}
        {(!update || verified === true) && (
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
            className="space-y-5"
          >
            {!update ? (
              <label className="block space-y-2 text-sm">
                <span>E-mail da conta</span>
                <input
                  className={fieldClass}
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={320}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            ) : (
              <>
                <PasswordField
                  label="Nova senha"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
                <PasswordField
                  label="Confirmar nova senha"
                  visibilityLabel="confirmação da senha"
                  value={confirm}
                  onChange={setConfirm}
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
                <p className="text-xs text-white/55">
                  Use pelo menos 12 caracteres com maiúscula, minúscula, número
                  e símbolo.
                </p>
              </>
            )}
            <button type="submit" className={actionClass} disabled={sending}>
              {sending
                ? "Processando..."
                : update
                  ? "Salvar nova senha"
                  : "Enviar instruções"}
            </button>
          </form>
        )}
        <Link
          className={secondaryClass + " mt-6"}
          to={tonecosLoginReturnPath(returnTo)}
        >
          Voltar ao login
        </Link>
      </div>
    </CommercialPage>
  );
}
