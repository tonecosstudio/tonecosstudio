/**
 * NotificationBadge - Componente para exibir badge de notificação in-app
 *
 * Requirements: 10.1-10.10
 * Design: .kiro/specs/manual-payment-system/design.md
 *
 * Este componente exibe um badge com a contagem de notificações não lidas
 * e atualiza em tempo real usando Supabase Realtime.
 */

import React from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormattedNotificationCount } from "@/hooks/use-notification-count";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Props do componente NotificationBadge
 */
interface NotificationBadgeProps {
  /** Classe CSS adicional */
  className?: string;
  /** Tamanho do badge (sm, md, lg) */
  size?: "sm" | "md" | "lg";
  /** Se deve mostrar dropdown com detalhes */
  showDetails?: boolean;
  /** Callback quando clicado */
  onClick?: () => void;
}

/**
 * Componente NotificationBadge
 *
 * Exibe um badge com contagem de notificações e atualiza em tempo real.
 * Pode ser usado como botão simples ou dropdown com detalhes.
 */
export function NotificationBadge({
  className,
  size = "md",
  showDetails = false,
  onClick,
}: NotificationBadgeProps) {
  const {
    total,
    formattedTotal,
    hasNotifications,
    pendingPayments,
    underReviewPayments,
    requiresInfoPayments,
    unreadMessages,
    isAdmin,
    isLoading,
    error,
  } = useFormattedNotificationCount();

  // Tamanhos do badge
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  // Tamanhos do ícone
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  // Tamanhos do texto do badge
  const badgeTextSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  /**
   * Navega para a página apropriada baseada no tipo de usuário
   */
  const handleNavigation = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (isAdmin) {
      window.location.href = "/admin/payments";
    } else {
      window.location.href = "/my-payments";
    }
  };

  /**
   * Renderiza o conteúdo do dropdown com detalhes das notificações
   */
  const renderDropdownContent = () => (
    <DropdownMenuContent align="end" className="w-80">
      <DropdownMenuLabel className="flex items-center justify-between">
        <span>Notificações</span>
        {hasNotifications && (
          <span className="text-xs text-muted-foreground">
            {total} não lida{total !== 1 ? "s" : ""}
          </span>
        )}
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      {isLoading ? (
        <DropdownMenuItem disabled className="text-center">
          Carregando notificações...
        </DropdownMenuItem>
      ) : error ? (
        <DropdownMenuItem disabled className="text-center text-destructive">
          Erro ao carregar notificações
        </DropdownMenuItem>
      ) : !hasNotifications ? (
        <DropdownMenuItem disabled className="text-center">
          Nenhuma notificação
        </DropdownMenuItem>
      ) : (
        <>
          {isAdmin ? (
            <>
              {pendingPayments > 0 && (
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/admin/payments?status=pending")}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Pagamentos Pendentes</span>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                      {pendingPayments}
                    </span>
                  </div>
                </DropdownMenuItem>
              )}

              {underReviewPayments > 0 && (
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/admin/payments?status=under_review")}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Pagamentos em Análise</span>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                      {underReviewPayments}
                    </span>
                  </div>
                </DropdownMenuItem>
              )}
            </>
          ) : (
            <>
              {requiresInfoPayments > 0 && (
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/my-payments?status=requires_info")}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Pagamentos com Informações Solicitadas</span>
                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                      {requiresInfoPayments}
                    </span>
                  </div>
                </DropdownMenuItem>
              )}
            </>
          )}

          {unreadMessages > 0 && (
            <DropdownMenuItem onClick={() => (window.location.href = "/support")}>
              <div className="flex items-center justify-between w-full">
                <span>Mensagens Não Lidas</span>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                  {unreadMessages}
                </span>
              </div>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleNavigation} className="text-center font-medium">
            Ver todas as notificações
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );

  /**
   * Renderiza o botão do badge
   */
  const renderBadgeButton = () => (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative rounded-full",
        sizeClasses[size],
        className,
        hasNotifications && "text-primary"
      )}
      onClick={showDetails ? undefined : handleNavigation}
      aria-label={`Notificações ${hasNotifications ? `(${formattedTotal} não lidas)` : ""}`}
    >
      <Bell size={iconSizes[size]} />

      {hasNotifications && (
        <span
          className={cn(
            "absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 rounded-full",
            "bg-destructive text-destructive-foreground font-bold",
            badgeTextSizes[size]
          )}
        >
          {formattedTotal}
        </span>
      )}
    </Button>
  );

  // Se showDetails estiver ativado, renderiza como dropdown
  if (showDetails) {
    return (
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{renderBadgeButton()}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {hasNotifications
                  ? `${formattedTotal} notificação${total !== 1 ? "es" : ""} não lida${total !== 1 ? "s" : ""}`
                  : "Nenhuma notificação"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {renderDropdownContent()}
      </DropdownMenu>
    );
  }

  // Caso contrário, renderiza apenas o botão com tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{renderBadgeButton()}</TooltipTrigger>
        <TooltipContent>
          <p>
            {hasNotifications
              ? `${formattedTotal} notificação${total !== 1 ? "es" : ""} não lida${total !== 1 ? "s" : ""}`
              : "Nenhuma notificação"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Componente NotificationBadge simplificado para uso em navegação
 */
export function SimpleNotificationBadge({ className }: { className?: string }) {
  const { formattedTotal, hasNotifications } = useFormattedNotificationCount();

  if (!hasNotifications) return null;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 rounded-full",
        "bg-destructive text-destructive-foreground text-xs font-bold",
        className
      )}
    >
      {formattedTotal}
    </span>
  );
}
