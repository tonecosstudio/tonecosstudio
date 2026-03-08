import { Helmet } from "react-helmet-async";

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

export default function SEOHead({
  title,
  description = "Tonecos Studios - Estatuetas premium artesanais feitas à mão. Produção sob encomenda de colecionáveis de alta qualidade com pintura artística.",
  keywords = ["estatuetas", "colecionáveis", "premium", "artesanal", "tonecos", "collectibles"],
  image = "/placeholder.svg",
  url,
  type = "website",
  noindex = false,
  jsonLd,
}: SEOHeadProps) {
  const siteTitle = "Ordax | Tonecos Studios";
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const canonicalUrl = url || (typeof window !== "undefined" ? window.location.href.split("?")[0] : "");
  const fullImageUrl = image.startsWith("http") ? image : `${typeof window !== "undefined" ? window.location.origin : ""}${image}`;

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
      <meta property="og:site_name" content="Ordax" />
      <meta property="og:locale" content="pt_BR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description.slice(0, 160)} />
      <meta name="twitter:image" content={fullImageUrl} />

      <meta name="language" content="pt-BR" />
      <meta name="theme-color" content="#0a0a0a" />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
