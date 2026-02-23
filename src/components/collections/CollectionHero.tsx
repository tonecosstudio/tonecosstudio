import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CollectionHero() {
  const scrollToInfo = () => {
    const infoSection = document.getElementById('how-it-works');
    infoSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="bg-foreground text-background border-b border-white/10 -mx-8 sm:-mx-12">
      <div className="container px-8 py-20 sm:px-12 sm:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-medium tracking-widest text-background/60 uppercase mb-6">
            Tonecos Studios
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Coleções Personalizadas
          </h1>
          <p className="text-xl sm:text-2xl text-background/80 leading-relaxed mb-8 max-w-2xl mx-auto">
            Escolha seus personagens favoritos e receba peças artesanais únicas, 
            pintadas à mão, em embalagem premium.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              asChild
              className="bg-background text-foreground hover:bg-background/90"
            >
              <Link to="/planos">
                Ver Planos e Preços
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="ghost" 
              className="text-background hover:bg-background/10"
              onClick={scrollToInfo}
            >
              Como Funciona
              <ArrowDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
