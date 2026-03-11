/**
 * Page - Wrapper simples para páginas com SEO
 * 
 * Usado para adicionar metadados SEO às páginas.
 * O layout (header/footer) é gerenciado pelo MainLayout.
 */

import { PropsWithChildren } from "react";
import SEOHead from "@/components/SEOHead";

interface PageProps extends PropsWithChildren {
  title: string;
  description: string;
  keywords?: string[];
}

export function Page({ title, description, keywords, children }: PageProps) {
  return (
    <>
      <SEOHead title={title} description={description} keywords={keywords} />
      {children}
    </>
  );
}
