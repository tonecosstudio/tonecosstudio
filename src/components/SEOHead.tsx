import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
}

export default function SEOHead({
  title,
  description = 'Tonecos Studios - Estatuetas premium artesanais feitas à mão. Produção sob encomenda de colecionáveis de alta qualidade com pintura artística.',
  keywords = ['estatuetas', 'colecionáveis', 'premium', 'artesanal', 'tonecos', 'collectibles'],
  image = '/placeholder.svg',
  url,
  type = 'website',
  noindex = false,
}: SEOHeadProps) {
  const siteTitle = 'Tonecos Studios';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const fullImageUrl = image.startsWith('http') ? image : `${window.location.origin}${image}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteTitle} />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      
      {/* Additional Meta */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="Portuguese" />
    </Helmet>
  );
}
