export const PUBLIC_ROUTES = {
  home: "/",
  landing: "/landing",
  migrateOrder: "/migrar-pedido",
  catalog: "/universo",
  catalogCharacter: "/universo/personagem/:slug",
  catalogDetails: "/universo/:id",
  legacyCatalog: "/catalogo",
  legacyCatalogDetails: "/catalogo/:id",
  about: "/sobre",
  plans: "/planos",
  collections: "/colecoes",
  collectionsArcade: "/colecoes-arcade",
  collectionCharacterDetails: "/colecoes/:slug/:characterId",
  characterDetails: "/personagem/:characterId",
  characterSelect: "/selecionar-personagem",
  collectionDetails: "/colecoes/:slug",
  buyCharacter: "/colecoes/:slug/comprar",
  terms: "/termos",
  privacy: "/privacidade",
  contact: "/contato",
  login: "/login",
  publicProfile: "/collector/:username",
  preLaunch: "/pre-lancamento",
} as const;

export const AUTH_ROUTES = {
  profile: "/perfil",
  support: "/suporte",
  payments: "/pagamentos",
  paymentDetails: "/pagamentos/:paymentId",
  subscribeCollection: "/colecoes/:slug/assinar",
  wishlist: "/wishlist",
  dashboard: "/dashboard",
  notifications: "/notificacoes",
  orderProgress: "/pedido/:orderType/:orderId/progresso",
  groups: "/grupos",
  groupDetails: "/grupos/:groupId",
  subscriberDashboard: "/painel-assinante",
  coinsPurchase: "/coins/purchase",
} as const;

export const ADMIN_ROUTES = {
  home: "/admin",
  users: "/admin/users",
  userDetails: "/admin/users/:userId",
  catalog: "/admin/catalogo",
  financialHub: "/admin/financeiro-hub",
  orders: "/admin/pedidos",
  production: "/admin/producao",
  credits: "/admin/creditos",
  audit: "/admin/auditoria",
  packaging: "/admin/embalagem",
  analytics: "/admin/analytics",
  settings: "/admin/configuracoes",
  payments: "/admin/pagamentos",
  paymentDetails: "/admin/pagamentos/:paymentId",
  communication: "/admin/comunicacao",
  groupDetails: "/admin/grupos/:groupId",
} as const;

export const APP_ROUTES = {
  ...PUBLIC_ROUTES,
  ...AUTH_ROUTES,
  admin: ADMIN_ROUTES,
} as const;

export const ADMIN_REDIRECTS = [
  { from: "/admin/colecoes", to: `${ADMIN_ROUTES.catalog}?tab=collections` },
  { from: "/admin/financeiro", to: `${ADMIN_ROUTES.financialHub}?tab=collections` },
  { from: "/admin/pre-vendas", to: `${ADMIN_ROUTES.orders}?type=quote` },
  { from: "/admin/gerenciar-colecoes", to: `${ADMIN_ROUTES.catalog}?tab=collections` },
  { from: "/admin/precos", to: `${ADMIN_ROUTES.credits}?tab=plans` },
  { from: "/admin/niveis-preco", to: `${ADMIN_ROUTES.credits}?tab=plans` },
  { from: "/admin/precos-planos", to: `${ADMIN_ROUTES.credits}?tab=plans` },
  { from: "/admin/precos-gerenciar", to: `${ADMIN_ROUTES.credits}?tab=plans` },
  { from: "/admin/pricing", to: `${ADMIN_ROUTES.credits}?tab=plans` },
  { from: "/admin/fila-producao", to: `${ADMIN_ROUTES.production}?tab=list` },
  { from: "/admin/escolhas-personagens", to: `${ADMIN_ROUTES.production}?tab=choices` },
  { from: "/admin/creditos/planos", to: `${ADMIN_ROUTES.credits}?tab=plans` },
  { from: "/admin/planos", to: `${ADMIN_ROUTES.credits}?tab=plans` },
  { from: "/admin/planos-configuracao", to: `${ADMIN_ROUTES.credits}?tab=plans` },
  { from: "/admin/creditos/dashboard", to: ADMIN_ROUTES.credits },
  { from: "/admin/creditos/analytics", to: `${ADMIN_ROUTES.credits}?tab=analytics` },
  { from: "/admin/creditos/personagens", to: `${ADMIN_ROUTES.catalog}?tab=credit-characters` },
  { from: "/admin/coins", to: `${ADMIN_ROUTES.credits}?tab=coins` },
  { from: "/admin/ciclos", to: `${ADMIN_ROUTES.credits}?tab=cycles` },
  { from: "/admin/assinaturas", to: `${ADMIN_ROUTES.orders}?type=subscription` },
  { from: "/admin/assinaturas-gerenciar", to: `${ADMIN_ROUTES.orders}?type=subscription` },
  { from: "/admin/entregas", to: `${ADMIN_ROUTES.orders}?type=subscription` },
  { from: "/admin/compras-avulsas", to: `${ADMIN_ROUTES.orders}?type=standalone` },
  { from: "/admin/creditos/assinaturas", to: `${ADMIN_ROUTES.orders}?type=subscription` },
  { from: "/admin/feriados", to: `${ADMIN_ROUTES.settings}?tab=holidays` },
  { from: "/admin/chaves-pagamento", to: `${ADMIN_ROUTES.payments}?tab=keys` },
  { from: "/admin/notificacoes", to: `${ADMIN_ROUTES.communication}?tab=notifications` },
  { from: "/admin/notificacoes/historico", to: `${ADMIN_ROUTES.communication}?tab=history` },
  { from: "/admin/configuracoes-sistema", to: `${ADMIN_ROUTES.settings}?tab=general` },
  { from: "/admin/configuracoes-conteudo", to: `${ADMIN_ROUTES.settings}?tab=content` },
  { from: "/admin/limite-producao", to: `${ADMIN_ROUTES.settings}?tab=production` },
  { from: "/admin/conformidade-legal", to: `${ADMIN_ROUTES.settings}?tab=legal` },
  { from: "/admin/calculadora", to: `${ADMIN_ROUTES.payments}?tab=calculator` },
  { from: "/admin/payments", to: `${ADMIN_ROUTES.payments}?tab=payments` },
  { from: "/admin/metodos-pagamento", to: `${ADMIN_ROUTES.payments}?tab=methods` },
  { from: "/admin/suporte", to: `${ADMIN_ROUTES.communication}?tab=support` },
  { from: "/admin/grupos", to: `${ADMIN_ROUTES.communication}?tab=groups` },
  { from: "/admin/respostas-rapidas", to: `${ADMIN_ROUTES.communication}?tab=quick-replies` },
  { from: "/admin/templates-comunicacao", to: `${ADMIN_ROUTES.communication}?tab=templates` },
] as const;

export const NOTIFICATION_ROUTES = {
  adminPayments: `${ADMIN_ROUTES.payments}?tab=payments`,
  adminPaymentsPending: `${ADMIN_ROUTES.payments}?tab=payments&status=pending`,
  adminPaymentsUnderReview: `${ADMIN_ROUTES.payments}?tab=payments&status=under_review`,
  myPayments: AUTH_ROUTES.payments,
  myPaymentsRequiresInfo: `${AUTH_ROUTES.payments}?status=requires_info`,
  support: AUTH_ROUTES.support,
} as const;

export function adminPaymentDetailsPath(paymentId: string) {
  return `${ADMIN_ROUTES.paymentDetails.replace(":paymentId", encodeURIComponent(paymentId))}?tab=payments`;
}

export function adminOrdersPath(params?: {
  type?: "subscription_delivery" | "standalone_purchase" | "manual_payment" | "quote";
  search?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params?.type) {
    searchParams.set("type", params.type);
  }

  if (params?.search?.trim()) {
    searchParams.set("q", params.search.trim());
  }

  const query = searchParams.toString();
  return query ? `${ADMIN_ROUTES.orders}?${query}` : ADMIN_ROUTES.orders;
}

export function adminCyclesPath(params?: {
  month?: number;
  year?: number;
}) {
  const searchParams = new URLSearchParams({ tab: "cycles" });

  if (params?.month) {
    searchParams.set("month", String(params.month));
  }

  if (params?.year) {
    searchParams.set("year", String(params.year));
  }

  return `${ADMIN_ROUTES.credits}?${searchParams.toString()}`;
}

export function adminCreditsTabPath(tab: "plans" | "analytics" | "credit-characters" | "coins" | "cycles") {
  return `${ADMIN_ROUTES.credits}?tab=${encodeURIComponent(tab)}`;
}

export function paymentDetailsPath(paymentId: string) {
  return AUTH_ROUTES.paymentDetails.replace(":paymentId", encodeURIComponent(paymentId));
}

export function collectionDetailsPath(slug: string) {
  return PUBLIC_ROUTES.collectionDetails.replace(":slug", encodeURIComponent(slug));
}

export function collectionCharacterDetailsPath(slug: string, characterId: string) {
  return PUBLIC_ROUTES.collectionCharacterDetails
    .replace(":slug", encodeURIComponent(slug))
    .replace(":characterId", encodeURIComponent(characterId));
}

export function characterDetailsPath(characterId: string) {
  return PUBLIC_ROUTES.characterDetails.replace(":characterId", encodeURIComponent(characterId));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function slugifyPathSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function resolveCatalogModelIdFromParam(routeParam: string) {
  const decodedParam = decodeURIComponent(routeParam);
  if (isUuid(decodedParam)) return decodedParam;

  const match = decodedParam.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  return match ? match[1] : decodedParam;
}

export function catalogModelDetailsPath(
  modelId: string,
  slugSource?: string | null,
) {
  const safeId = encodeURIComponent(modelId);
  if (!isUuid(modelId)) {
    return PUBLIC_ROUTES.catalogDetails.replace(":id", safeId);
  }

  const slug = slugifyPathSegment(slugSource ?? "");
  const routeParam = slug ? `${slug}-${modelId}` : modelId;
  return PUBLIC_ROUTES.catalogDetails.replace(":id", encodeURIComponent(routeParam));
}

export function catalogCharacterPath(
  characterName: string,
  sourceTitle?: string | null,
) {
  const baseSlug = slugifyPathSegment(
    [characterName, sourceTitle].filter(Boolean).join(" "),
  );
  return PUBLIC_ROUTES.catalogCharacter.replace(
    ":slug",
    encodeURIComponent(baseSlug || slugifyPathSegment(characterName) || "personagem"),
  );
}

export function subscribeCollectionPath(slug: string) {
  return AUTH_ROUTES.subscribeCollection.replace(":slug", encodeURIComponent(slug));
}

export function profileSectionPath(section: string) {
  return `${AUTH_ROUTES.profile}?section=${encodeURIComponent(section)}`;
}

export function loginReturnToPath(returnTo: string) {
  return `${PUBLIC_ROUTES.login}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function publicProfilePath(username: string) {
  return PUBLIC_ROUTES.publicProfile.replace(":username", encodeURIComponent(username));
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function isSafeInAppPath(path: string): boolean {
  return (
    path.length <= 2048 &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !hasControlCharacter(path)
  );
}

export function adminUserDetailsPath(userId: string) {
  return ADMIN_ROUTES.userDetails.replace(":userId", encodeURIComponent(userId));
}

export function adminGroupDetailsPath(groupId: string) {
  return ADMIN_ROUTES.groupDetails.replace(":groupId", encodeURIComponent(groupId));
}
