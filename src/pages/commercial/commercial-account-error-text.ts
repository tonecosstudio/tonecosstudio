const exactMessages: Record<string, string> = {
  tonecos_account_input_invalid: "Confira os dados informados e tente novamente.",
  tonecos_account_credentials_invalid: "Informe um e-mail válido e uma senha.",
  tonecos_auth_redirect_unavailable: "Não foi possível preparar a confirmação de e-mail. Tente novamente.",
  tonecos_current_password_invalid: "Informe sua senha atual.",
  tonecos_new_password_invalid: "A nova senha deve ser diferente da atual e ter pelo menos 12 caracteres, com maiúscula, minúscula, número e símbolo.",
  tonecos_login_required: "Sua sessão expirou. Entre novamente para continuar.",
  tonecos_account_session_mismatch: "Não foi possível confirmar a conta atual. Entre novamente e tente de novo.",
  tonecos_password_update_incomplete: "A senha não foi atualizada. Entre novamente e tente de novo.",
  tonecos_account_phone_invalid: "Informe um telefone válido com DDD ou deixe o campo vazio.",
  tonecos_recovery_link_invalid: "O link de recuperação é inválido ou expirou. Solicite um novo.",
  tonecos_recovery_password_invalid: "A nova senha não cumpre os requisitos de segurança.",
  tonecos_recovery_session_required: "O link de recuperação não possui uma sessão válida. Solicite um novo.",
  tonecos_login_incomplete: "Não foi possível concluir o login. Tente novamente.",
  "Muitas tentativas. Aguarde alguns minutos.": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "As senhas não coincidem.": "As senhas não coincidem.",
  "A senha não cumpre os requisitos de segurança.": "A senha não cumpre os requisitos de segurança.",
};

export function commercialAccountErrorText(value: unknown): string {
  const message = value instanceof Error ? value.message.trim() : "";
  if (message && exactMessages[message]) return exactMessages[message];

  const normalized = message.toLocaleLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (normalized.includes("user already registered")) {
    return "Este e-mail já possui conta. Entre com sua senha ou use a recuperação de acesso.";
  }
  if (
    normalized.includes("rate limit") ||
    normalized.includes("security purposes") ||
    normalized.includes("too many requests")
  ) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("offline") ||
    normalized.includes("connection")
  ) {
    return "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.";
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}
