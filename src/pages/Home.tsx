import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, Package, Eye, Palette, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { NextReleaseBanner } from "@/components/collections/NextReleaseBanner";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="Colecionáveis Premium Sob Encomenda"
        description="Colecionáveis premium sob encomenda. Escolha, personalize e acompanhe em tempo real. Estatuetas artesanais feitas à mão."
        keywords={["colecionáveis", "premium", "sob encomenda", "estatuetas", "artesanal", "tonecos studios"]}
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Ordax - Tonecos Studios",
          "description": "Colecionáveis premium artesanais feitos à mão sob encomenda.",
          "url": typeof window !== "undefined" ? window.location.origin : "",
          "sameAs": [],
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "availableLanguage": "Portuguese"
          }
        }}
      />

      {/* One Screen - No Scroll - No Header */}
      <section className="min-h-screen flex items-center justify-center">
        <div className="container px-8 sm:px-12 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Next Release Banner */}
            <div className="mb-12">
              <NextReleaseBanner />
            </div>

            {/* Hero */}
            <div className="text-center mb-16">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-black">
                Colecionáveis Premium
                <span className="block text-black/60">Sob Encomenda</span>
              </h1>

              <p className="text-xl text-black/60 mb-8 max-w-2xl mx-auto">
                Escolha seu modelo, personalize cada detalhe e acompanhe a produção com atualizações
                ao longo do processo
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <Button
                  asChild
                  size="lg"
                  className="bg-black text-white hover:bg-black/90 h-12 px-8"
                >
                  <Link to="/catalogo">
                    Explorar Catálogo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-black text-black hover:bg-black/5 h-12 px-8"
                >
                  <Link to="/colecoes">Ver Coleções</Link>
                </Button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-black flex items-center justify-center">
                  <Package className="h-6 w-6 text-black" />
                </div>
                <h3 className="font-bold mb-2 text-black">Catálogo Organizado</h3>
                <p className="text-sm text-black/60">Centenas de modelos por franquia</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-black flex items-center justify-center">
                  <Palette className="h-6 w-6 text-black" />
                </div>
                <h3 className="font-bold mb-2 text-black">Personalização</h3>
                <p className="text-sm text-black/60">Escala, cores e detalhes sob medida</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-black flex items-center justify-center">
                  <Eye className="h-6 w-6 text-black" />
                </div>
                <h3 className="font-bold mb-2 text-black">Transparência</h3>
                <p className="text-sm text-black/60">Acompanhe com fotos ao longo do processo</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-black flex items-center justify-center">
                  <Shield className="h-6 w-6 text-black" />
                </div>
                <h3 className="font-bold mb-2 text-black">Qualidade</h3>
                <p className="text-sm text-black/60">Produção profissional, inspeção rigorosa</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
