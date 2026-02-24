/**
 * FAQ Dinâmico com dados do SSOT
 * Usa configurações de system_settings para manter FAQs atualizados
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContentSettings } from "@/hooks/useContentSettings";
import { processContentVariables } from "@/lib/services/contentService";

interface FAQItem {
  q: string;
  a: string | ((content: any) => string);
}

interface DynamicFAQProps {
  items: FAQItem[];
  className?: string;
}

export function DynamicFAQ({ items, className = "" }: DynamicFAQProps) {
  const { data: content, isLoading } = useContentSettings();

  if (isLoading) {
    return (
      <div className={`grid gap-6 md:grid-cols-2 ${className}`}>
        {items.map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className={`grid gap-6 md:grid-cols-2 ${className}`}>
      {items.map((faq, index) => {
        const answer = typeof faq.a === "function" ? faq.a(content) : faq.a;
        const processedAnswer = processContentVariables(answer, content);

        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{faq.q}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{processedAnswer}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
