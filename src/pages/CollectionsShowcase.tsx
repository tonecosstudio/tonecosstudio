import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, Shield, Crosshair, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

function CollectionsShowcase() {
  const navigate = useNavigate();

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections-showcase"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name, slug, description, cover_image_url, total_characters, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-[hsl(0,0%,7%)] text-[hsl(0,0%,98%)]">
      <SEOHead
        title="Coleções | ORDAX Collectibles Arsenal"
        description="Explore nossas coleções exclusivas de peças artesanais feitas à mão. Edição limitada."
      />

      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 0%) 2px, hsl(0 0% 0%) 4px)",
        }}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-[hsl(0,0%,20%)] bg-[hsl(0,0%,7%)]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-[hsl(0,0%,98%)] hover:text-[hsl(var(--gold-accent))] transition-colors font-mono uppercase tracking-wider text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            VOLTAR
          </button>
          <Link
            to="/"
            className="font-black text-2xl tracking-[0.3em] text-[hsl(0,0%,98%)]"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            ORDAX
          </Link>
          <div className="w-20" />
        </div>
      </nav>

      {/* Hero Banner */}
      <section className="relative py-20 px-6 overflow-hidden">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--gold-accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold-accent)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(0,0%,7%)]/50 to-[hsl(0,0%,7%)]" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 border border-[hsl(var(--gold-accent)/0.4)] bg-[hsl(var(--gold-accent)/0.05)] rounded-none">
            <Shield className="w-4 h-4 text-[hsl(var(--gold-accent))]" />
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))]">
              Arsenal de Coleções
            </span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-black tracking-[0.15em] mb-4"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            COLEÇÕES
          </h1>
          <p className="text-[hsl(0,0%,60%)] font-mono text-sm md:text-base max-w-xl mx-auto tracking-wider">
            Peças artesanais únicas organizadas em coleções temáticas. Cada coleção conta uma história.
          </p>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[4/5] bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,15%)] animate-pulse"
              />
            ))}
          </div>
        ) : collections && collections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection, index) => (
              <Link
                key={collection.id}
                to={`/colecoes/${collection.slug}`}
                className="group relative flex flex-col border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,9%)] hover:border-[hsl(var(--gold-accent)/0.5)] transition-all duration-500 overflow-hidden"
              >
                {/* Collection Image */}
                <div className="relative aspect-[4/3] bg-[hsl(0,0%,12%)] overflow-hidden">
                  {collection.cover_image_url ? (
                    <img
                      src={collection.cover_image_url}
                      alt={collection.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Crosshair className="w-16 h-16 text-[hsl(0,0%,20%)] group-hover:text-[hsl(var(--gold-accent)/0.3)] transition-colors duration-500" />
                    </div>
                  )}

                  {/* Index badge */}
                  <div className="absolute top-3 left-3 font-mono text-xs text-[hsl(var(--gold-accent))] bg-[hsl(0,0%,7%)]/80 px-2 py-1 tracking-widest">
                    #{String(index + 1).padStart(2, "0")}
                  </div>

                  {/* Hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,7%)] via-transparent to-transparent opacity-60" />
                </div>

                {/* Info */}
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <h2
                      className="text-xl font-black tracking-[0.1em] mb-2 group-hover:text-[hsl(var(--gold-accent))] transition-colors"
                      style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                    >
                      {collection.name}
                    </h2>
                    {collection.description && (
                      <p className="text-[hsl(0,0%,50%)] text-sm leading-relaxed line-clamp-2 font-mono">
                        {collection.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs font-mono text-[hsl(0,0%,40%)]">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        {collection.total_characters} peças
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-mono text-[hsl(var(--gold-accent))] opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wider">
                      VER DETALHES
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Bottom accent line */}
                <div className="h-[2px] bg-[hsl(var(--gold-accent))] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </Link>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-24 border border-dashed border-[hsl(0,0%,20%)]">
            <Crosshair className="w-16 h-16 text-[hsl(0,0%,20%)] mx-auto mb-6" />
            <h2
              className="text-3xl font-black tracking-[0.15em] mb-3"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              EM BREVE
            </h2>
            <p className="text-[hsl(0,0%,50%)] font-mono text-sm tracking-wider mb-8 max-w-md mx-auto">
              Nossas coleções estão sendo preparadas. Volte em breve para explorar peças exclusivas.
            </p>
            <Button
              onClick={() => navigate("/")}
              className="bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] hover:brightness-110 font-mono uppercase tracking-[0.15em] text-sm h-12 px-8 rounded-none"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              VOLTAR AO INÍCIO
            </Button>
          </div>
        )}
      </section>

      {/* CTA bottom */}
      <section className="border-t border-[hsl(0,0%,15%)] bg-[hsl(0,0%,5%)]">
        <div className="max-w-4xl mx-auto text-center py-16 px-6">
          <p className="font-mono text-xs text-[hsl(0,0%,40%)] tracking-[0.2em] uppercase mb-4">
            Quer garantir sua vaga?
          </p>
          <h2
            className="text-3xl md:text-4xl font-black tracking-[0.1em] mb-6"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            ASSINE E RECEBA TODO MÊS
          </h2>
          <Button
            onClick={() => navigate("/planos")}
            className="bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] hover:brightness-110 font-mono uppercase tracking-[0.15em] text-sm h-12 px-10 rounded-none"
          >
            VER PLANOS
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

export default CollectionsShowcase;
