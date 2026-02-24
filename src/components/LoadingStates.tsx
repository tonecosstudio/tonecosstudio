import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Loading States Reutilizáveis
 * Componentes de skeleton e loading para melhor UX
 */

// Loading Spinner Centralizado
export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

// Loading Overlay (para ações em andamento)
export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">{message || "Carregando..."}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton para Card de Cupom
export function CouponCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

// Skeleton para Lista de Coleções
export function CollectionCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-full max-w-lg" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

// Skeleton para Tabela
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <div className="bg-muted/30 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton para Card de Assinatura
export function SubscriptionCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="pt-2 border-t">
          <Skeleton className="h-4 w-full max-w-xs" />
        </div>
      </div>
    </div>
  );
}

// Skeleton para Card de Modelo
export function ModelCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton para Wishlist Item
export function WishlistItemSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <Skeleton className="w-full sm:w-48 h-48 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton para Stats Card
export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

// Skeleton para Form
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// Empty State Genérico
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Icon className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}

// Error State Genérico
export function ErrorState({
  title = "Algo deu errado",
  description = "Ocorreu um erro ao carregar os dados. Tente novamente.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">{description}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Tentar Novamente
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// Inline Loading (para botões)
export function InlineLoading({ text = "Carregando..." }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </span>
  );
}

// Page Loading (tela cheia)
export function PageLoading({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        {message && <p className="text-lg text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
