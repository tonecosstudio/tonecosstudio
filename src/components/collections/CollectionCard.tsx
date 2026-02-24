import { Collection } from "@/types/collections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CollectionCardProps {
  collection: Collection;
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  const discountPercentage = Math.round(
    ((collection.priceMonthly * 6 - collection.priceYearly) / (collection.priceMonthly * 6)) * 100
  );

  return (
    <Card className="overflow-hidden shadow-premium hover:shadow-xl transition-all duration-300 flex flex-col h-full">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={collection.coverImage}
          alt={collection.name}
          className="w-full h-full object-cover"
        />
      </div>

      <CardHeader>
        <CardTitle className="text-2xl">{collection.name}</CardTitle>
        <CardDescription className="text-base">
          {collection.totalCharacters} personagens • {collection.releaseFrequency}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-muted-foreground leading-relaxed">{collection.description}</p>
      </CardContent>

      <CardFooter className="flex-col gap-4 border-t pt-6">
        {/* Pricing */}
        <div className="w-full space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Plano Bimestral:</span>
            <span className="text-xl font-bold">
              R$ {collection.priceMonthly}
              <span className="text-sm font-normal text-muted-foreground">/2 meses</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Plano Anual:</span>
              <Badge variant="secondary" className="text-xs">
                {discountPercentage}% OFF
              </Badge>
            </div>
            <span className="text-xl font-bold text-primary">
              R$ {collection.priceYearly}
              <span className="text-sm font-normal text-muted-foreground">/ano</span>
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <Button className="w-full bg-foreground text-background hover:bg-foreground/90" size="lg">
          Assinar Agora
        </Button>
      </CardFooter>
    </Card>
  );
}
