/**
 * Banner de Informações do Lote Atual
 * Busca dados dinamicamente de system_settings (SSOT)
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useContentSettings } from "@/hooks/useContentSettings";
import { processContentVariables, getFullScheduleText } from "@/lib/services/contentService";
import { Skeleton } from "@/components/ui/skeleton";

interface BatchInfoBannerProps {
  showButton?: boolean;
  buttonText?: string;
  buttonLink?: string;
}

export function BatchInfoBanner({ 
  showButton = true, 
  buttonText = "Ver Planos",
  buttonLink = "/planos"
}: BatchInfoBannerProps) {
  const { data: content, isLoading } = useContentSettings();

  if (isLoading) {
    return (
      <Alert className="border-primary/20 bg-primary/5">
        <Skeleton className="h-20 w-full" />
      </Alert>
    );
  }

  if (!content) {
    return null;
  }

  const title = processContentVariables(content.batchBannerTitle, content);
  const subtitle = getFullScheduleText(content);
  const note = processContentVariables(content.batchBannerNote, content);

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <Calendar className="h-5 w-5 text-primary" />
      <AlertDescription className="ml-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="font-semibold text-lg">{title}</span>
            <p className="text-sm text-muted-foreground mt-1">
              {subtitle}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {note}
            </p>
          </div>
          {showButton && (
            <Button asChild>
              <Link to={buttonLink}>
                {buttonText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
