import { Link } from "react-router-dom";
import { PUBLIC_ROUTES, TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  actionClass,
  CommercialPage,
  panelClass,
  secondaryClass,
} from "./CommercialPage";

type Audience = "customer" | "admin";

export function TonecosSubscriptionUnavailablePanel({
  audience = "customer",
}: {
  audience?: Audience;
}) {
  const isAdmin = audience === "admin";

  return (
    <section
      role="status"
      aria-label={
        isAdmin
          ? "Fila de comprovantes indisponível"
          : "Assinaturas indisponíveis"
      }
      className={panelClass}
    >
      <h2 className="text-lg font-semibold">
        {isAdmin
          ? "Fila de comprovantes de assinatura indisponível"
          : "Assinaturas indisponíveis"}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
        {isAdmin
          ? "A revisão de assinaturas não está acessível neste canal. O fluxo atual de orçamentos segue disponível na administração."
          : "Não foi possível consultar planos ou assinaturas neste canal. Seus orçamentos e informações da conta continuam disponíveis."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {isAdmin ? (
          <>
            <Link
              className={actionClass}
              to={TONECOS_COMMERCIAL_ROUTES.adminQuotes}
            >
              Abrir orçamentos
            </Link>
            <Link
              className={secondaryClass}
              to={TONECOS_COMMERCIAL_ROUTES.adminHome}
            >
              Administração
            </Link>
          </>
        ) : (
          <>
            <Link className={actionClass} to={PUBLIC_ROUTES.quoteRequest}>
              Solicitar orçamento
            </Link>
            <Link className={secondaryClass} to={PUBLIC_ROUTES.catalogModels}>
              Ver modelos
            </Link>
            <Link className={secondaryClass} to={PUBLIC_ROUTES.contact}>
              Falar com a equipe
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

export default function TonecosSubscriptionUnavailablePage({
  audience = "customer",
}: {
  audience?: Audience;
}) {
  const isAdmin = audience === "admin";

  return (
    <CommercialPage
      title={isAdmin ? "Comprovantes de assinatura" : "Planos de assinatura"}
      intro={
        isAdmin
          ? "Revise comprovantes e pagamentos de assinaturas."
          : "Consulte as opções disponíveis para sua conta."
      }
    >
      <TonecosSubscriptionUnavailablePanel audience={audience} />
    </CommercialPage>
  );
}
