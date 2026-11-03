import { Helmet } from "react-helmet-async";
import { ASSETS, CONTACT } from "@/config/constants";
import { BRAND_NAME } from "@/config/brand";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

function formatBrandTitle(title?: string): string {
  const normalized = title?.trim();
  if (!normalized) return BRAND_NAME;
  if (
    normalized === BRAND_NAME ||
    normalized.endsWith(` | ${BRAND_NAME}`) ||
    normalized.endsWith(` — ${BRAND_NAME}`)
  ) {
    return normalized;
  }
  return `${normalized} | ${BRAND_NAME}`;
}

export default function SEOHead({
  title,
  description = "Tonecos Studio — modelos para referência, esculturas sob encomenda e acompanhamento de pedidos.",
  keywords = [
    "estatuetas",
    "colecionáveis",
    "premium",
    "artesanal",
    "tonecos",
    "collectibles",
  ],
  image = "/og-image.png",
  url,
  type = "website",
  noindex = false,
  jsonLd,
}: SEOHeadProps) {
  const fullTitle = formatBrandTitle(title);
  const siteUrl = CONTACT.WEBSITE_URL.replace(/\/$/, "");
  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : siteUrl;
  const canonicalUrl =
    url ||
    (typeof window !== "undefined"
      ? window.location.href.split("?")[0]
      : siteUrl);
  const fullImageUrl = image.startsWith("http")
    ? image
    : `${currentOrigin}${image}`;

  return (
    <Helmet>
      <html lang="pt-BR" />
      <title>{fullTitle}</title>
      <meta name="description" content={description.slice(0, 160)} />
      <meta name="keywords" content={keywords.join(", ")} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description.slice(0, 160)} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={BRAND_NAME} />
      <meta property="og:locale" content="pt_BR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description.slice(0, 160)} />
      <meta name="twitter:image" content={fullImageUrl} />

      <meta name="language" content="pt-BR" />
      <meta name="theme-color" content="#0a0a0a" />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
