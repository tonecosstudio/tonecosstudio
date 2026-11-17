import { Link } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import type { getMyTonecosProfile } from "@/services/customer/tonecos-account-service";
import { panelClass } from "./CommercialPage";

type CustomerProfile = Awaited<ReturnType<typeof getMyTonecosProfile>>;

/** One representation of the profile fields already stored in the canonical
 * customer account. Supplemental documents and addresses are not inferred.
 */
export default function TonecosCustomerContactSummary({
  profile,
  email,
  variant = "compact",
}: {
  profile: CustomerProfile;
  email?: string | null;
  variant?: "compact" | "account";
}) {
  return (
    <section
      className={
        variant === "account"
          ? panelClass
          : "border-y border-white/15 py-4"
      }
      aria-label="Dados cadastrais da conta"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Seus dados de contato</h3>
        <Link
          className="text-xs text-[hsl(var(--gold-accent))] underline-offset-2 hover:underline"
          to={TONECOS_COMMERCIAL_ROUTES.account}
        >
          Editar na Minha Conta
        </Link>
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs text-white/50">Nome cadastrado</dt>
          <dd className="text-white/85">
            {profile.full_name?.trim() || "Não informado"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-white/50">E-mail da conta</dt>
          <dd className="break-all text-white/75">
            {email ?? profile.email}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-white/50">Telefone</dt>
          <dd className="text-white/75">
            {profile.phone || "Não cadastrado — contato por e-mail"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-white/50">WhatsApp adicional</dt>
          <dd className="text-white/75">
            {profile.whatsapp || "Não cadastrado"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-white/50">CEP de entrega cadastrado</dt>
          <dd className="text-white/75">
            {profile.delivery_address &&
            typeof profile.delivery_address === "object" &&
            !Array.isArray(profile.delivery_address) &&
            typeof profile.delivery_address.zipCode === "string"
              ? profile.delivery_address.zipCode
              : "Não cadastrado"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-white/50">
        Estes dados vêm da Minha Conta. O WhatsApp e o CEP guardados em
        orçamentos anteriores não são tratados como cadastro permanente.
      </p>
    </section>
  );
}
