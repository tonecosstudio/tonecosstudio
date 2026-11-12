export const PUBLIC_ROUTES = {
  home: "/",
  landing: "/landing",
  arcadeLab: "/arcade-lab",
  migrateOrder: "/migrar-pedido",
  catalog: "/universo",
  catalogModels: "/modelos",
  catalogUniverseTheme: "/universo/:themeKey",
  catalogUniverseFranchise: "/universo/:themeKey/:franchiseKey",
  catalogUniverseCharacter: "/universo/:themeKey/:franchiseKey/:characterSlug",
  catalogCharacter: "/universo/personagem/:slug",
  catalogDetails: "/modelos/:id",
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
  quoteRequest: "/solicitar-orcamento",
  quotePortal: "/gestao",
  login: "/login",
  preLaunch: "/pre-lancamento",
} as const;

export const TONECOS_COMMERCIAL_ROUTES = {
  login: PUBLIC_ROUTES.login,
  account: "/perfil",
  recovery: "/recuperar-senha",
  request: PUBLIC_ROUTES.quoteRequest,
  history: "/meus-orcamentos",
  coins: "/moedas",
  adminHome: "/admin",
  adminQuotes: "/admin/orcamentos",
  adminCoins: "/admin/moedas",
} as const;

export const PUBLIC_COLLECTIONS_ENABLED = false;

export const AUTH_ROUTES = {
  profile: "/perfil",
  profileSection: "/perfil/:section",
  payments: "/perfil/pagamentos",
  paymentDetails: "/perfil/pagamentos/:paymentId",
  subscribeCollection: "/colecoes/:slug/assinar",
  wishlist: "/wishlist",
  dashboard: "/dashboard",
  notifications: "/notificacoes",
  orderProgress: "/pedido/:orderType/:orderId/progresso",
  groups: "/grupos",
  groupDetails: "/grupos/:groupId",
  subscriberDashboard: "/painel-assinante",
} as const;

const PROFILE_SECTION_SEGMENTS = {
  info: "conta",
  payment: "pagamentos",
  notifications: "notificacoes",
  support: "suporte",
  subscriptions: "assinatura",
} as const;

type ProfileSectionRouteId = keyof typeof PROFILE_SECTION_SEGMENTS;

const PROFILE_SECTION_ROUTE_SEGMENTS = Object.fromEntries(
  Object.entries(PROFILE_SECTION_SEGMENTS).map(([sectionId, segment]) => [
    segment,
    sectionId,
  ]),
) as Record<string, ProfileSectionRouteId>;

export const ADMIN_ROUTES = {
  home: "/admin",
  users: "/admin/users",
  userDetails: "/admin/users/:userId",
  userDetailsSection: "/admin/users/:userId/:section",
  catalog: "/admin/catalogo",
  catalogCollections: "/admin/catalogo/colecoes",
  catalogCreditCharacters: "/admin/catalogo/personagens-coins",
  financialHub: "/admin/financeiro",
  financialCollections: "/admin/financeiro/colecoes",
  orders: "/admin/pedidos",
  production: "/admin/producao",
  productionKanban: "/admin/producao/kanban",
  productionList: "/admin/producao/lista",
  productionCalendar: "/admin/producao/calendario",
  productionAnalytics: "/admin/producao/analises",
  productionChoices: "/admin/producao/escolhas",
  credits: "/admin/creditos",
  creditsCoins: "/admin/creditos/moedas",
  creditsCycles: "/admin/creditos/ciclos",
  creditsPlans: "/admin/creditos/planos",
  creditsAnalytics: "/admin/creditos/analises",
  audit: "/admin/auditoria",
  packaging: "/admin/embalagem",
  analytics: "/admin/analytics",
  settings: "/admin/configuracoes",
  settingsOperational: "/admin/configuracoes/operacional",
  settingsHolidays: "/admin/configuracoes/feriados",
  settingsLegal: "/admin/configuracoes/legal",
  payments: "/admin/pagamentos",
  paymentMethods: "/admin/pagamentos/metodos",
  paymentKeys: "/admin/pagamentos/chaves",
  paymentCalculator: "/admin/pagamentos/calculadora",
  paymentDetails: "/admin/pagamentos/:paymentId",
  communication: "/admin/comunicacao",
  communicationGroups: "/admin/comunicacao/grupos",
  communicationQuickReplies: "/admin/comunicacao/respostas-rapidas",
  communicationTemplates: "/admin/comunicacao/modelos-de-mensagem",
  communicationNotifications: "/admin/comunicacao/notificacoes",
  communicationHistory: "/admin/comunicacao/historico",
  communicationConversation: "/admin/comunicacao/conversas/:conversationId",
  groupDetails: "/admin/grupos/:groupId",
} as const;

export const APP_ROUTES = {
  ...PUBLIC_ROUTES,
  ...AUTH_ROUTES,
  admin: ADMIN_ROUTES,
} as const;

export const NOTIFICATION_ROUTES = {
  adminPayments: ADMIN_ROUTES.payments,
  adminPaymentsPending: `${ADMIN_ROUTES.payments}?status=pending`,
  adminPaymentsUnderReview: `${ADMIN_ROUTES.payments}?status=under_review`,
  myPayments: AUTH_ROUTES.payments,
  myPaymentsRequiresInfo: `${AUTH_ROUTES.payments}?status=requires_info`,
  support: `${AUTH_ROUTES.profile}/${PROFILE_SECTION_SEGMENTS.support}`,
} as const;

export function adminPaymentDetailsPath(paymentId: string) {
  return ADMIN_ROUTES.paymentDetails.replace(":paymentId", encodeURIComponent(paymentId));
}

export function adminSupportConversationPath(conversationId: string) {
  return ADMIN_ROUTES.communicationConversation.replace(
    ":conversationId",
    encodeURIComponent(conversationId),
  );
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
  const searchParams = new URLSearchParams();

  if (params?.month) {
    searchParams.set("month", String(params.month));
  }

  if (params?.year) {
    searchParams.set("year", String(params.year));
  }

  const query = searchParams.toString();
  return query ? `${ADMIN_ROUTES.creditsCycles}?${query}` : ADMIN_ROUTES.creditsCycles;
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

export function catalogUniverseThemePath(themeKey: string) {
  return PUBLIC_ROUTES.catalogUniverseTheme.replace(":themeKey", encodeURIComponent(themeKey));
}

export function catalogUniverseFranchisePath(themeKey: string, franchiseKey: string) {
  return PUBLIC_ROUTES.catalogUniverseFranchise
    .replace(":themeKey", encodeURIComponent(themeKey))
    .replace(":franchiseKey", encodeURIComponent(franchiseKey));
}

export function catalogUniverseCharacterPath(
  themeKey: string,
  franchiseKey: string,
  characterSlug: string,
) {
  return PUBLIC_ROUTES.catalogUniverseCharacter
    .replace(":themeKey", encodeURIComponent(themeKey))
    .replace(":franchiseKey", encodeURIComponent(franchiseKey))
    .replace(":characterSlug", encodeURIComponent(characterSlug));
}

export function subscribeCollectionPath(slug: string) {
  return AUTH_ROUTES.subscribeCollection.replace(":slug", encodeURIComponent(slug));
}

export function resolveProfileSectionId(
  section: string | null | undefined,
): ProfileSectionRouteId | null {
  if (!section) return null;
  const normalized = section.trim().toLocaleLowerCase();
  if (normalized in PROFILE_SECTION_SEGMENTS) return normalized as ProfileSectionRouteId;
  return PROFILE_SECTION_ROUTE_SEGMENTS[normalized] ?? null;
}

export function resolveProfileRouteSectionId(
  section: string | null | undefined,
): ProfileSectionRouteId | null {
  if (!section) return null;
  const normalized = section.trim().toLocaleLowerCase();
  return PROFILE_SECTION_ROUTE_SEGMENTS[normalized] ?? null;
}

export function profileSectionPath(section: string) {
  const resolvedSection = resolveProfileSectionId(section) ?? "info";
  return `${AUTH_ROUTES.profile}/${PROFILE_SECTION_SEGMENTS[resolvedSection]}`;
}

export function loginReturnToPath(returnTo: string) {
  const safeReturnTo = isSafeInAppPath(returnTo) ? returnTo : PUBLIC_ROUTES.home;
  return `${PUBLIC_ROUTES.login}?next=${encodeURIComponent(safeReturnTo)}`;
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

export function adminUserDetailsSectionPath(userId: string, section: string) {
  return ADMIN_ROUTES.userDetailsSection
    .replace(":userId", encodeURIComponent(userId))
    .replace(":section", encodeURIComponent(section));
}

export function adminGroupDetailsPath(groupId: string) {
  return ADMIN_ROUTES.groupDetails.replace(":groupId", encodeURIComponent(groupId));
}
