import { useQuery } from "@tanstack/react-query";
import { Countdown } from "./Countdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getNextRelease } from "@/services/collections/next-release-service";

export function NextReleaseBanner() {
  const { data: nextRelease, isLoading } = useQuery({
    queryKey: ["next-release"],
    queryFn: getNextRelease,
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-12 w-full max-w-md" />
        </div>
      </Card>
    );
  }

  if (!nextRelease) return null;

  const daysUntil = nextRelease.days_until_release;
  const isComingSoon = daysUntil <= 7;

  return (
    <Card className="overflow-hidden border-2 border-primary/20 shadow-lg">
      <div className="relative bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
              {/* Imagem do Personagem */}
              {nextRelease.character_image && (
                <div className="flex-shrink-0">
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-primary-foreground/20 shadow-2xl">
                    <img
                      src={nextRelease.character_image}
                      alt={nextRelease.character_name}
                      className="w-full h-full object-cover"
                    />
                    {isComingSoon && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                          EM BREVE
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Conteúdo */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider opacity-90">
                    Próximo Lançamento
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold mb-1">
                  {nextRelease.character_name}
                </h2>

                <p className="text-primary-foreground/90 text-lg mb-4">
                  Coleção {nextRelease.collection_name}
                </p>

                {/* Countdown */}
                <div className="flex justify-center md:justify-start mb-3">
                  <Countdown targetDate={nextRelease.release_date} />
                </div>

                {/* Data */}
                <div className="flex items-center justify-center md:justify-start gap-2 text-sm opacity-90">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Disponível em{" "}
                    {new Date(nextRelease.release_date).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* CTA Único - Ver Coleção */}
              <div className="flex-shrink-0">
                <Button
                  asChild
                  size="lg"
                  className="shadow-xl hover:shadow-2xl transition-all bg-black hover:bg-black/90 text-white h-14 px-10"
                >
                  <Link
                    to={
                      nextRelease.collection_slug
                        ? `/colecoes/${nextRelease.collection_slug}`
                        : "/colecoes"
                    }
                  >
                    <span className="flex flex-col items-center gap-1">
                      <span className="font-bold text-base">Ver Coleção</span>
                      <span className="text-xs font-normal opacity-90">
                        Comprar avulso ou assinar
                      </span>
                    </span>
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
