export const AUTH_PASSWORD_POLICY = {
  minimumLength: 12,
  requirementsLabel: "Minimo 12 caracteres com maiuscula, minuscula, numero e simbolo.",
  htmlPattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
} as const;

export function isPasswordPolicyCompliant(password: string): boolean {
  return (
    password.length >= AUTH_PASSWORD_POLICY.minimumLength &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
