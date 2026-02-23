/**
 * RealtimeIndicator Component
 * 
 * Componente para mostrar indicadores visuais de atualizações em tempo real
 * 
 * Requirements: 16.8 (Mostrar indicador visual quando atualizações recebidas)
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export interface RealtimeIndicatorProps {
  /** Estado da conexão */
  isConnected?: boolean;
  /** Se está reconectando */
  isReconnecting?: boolean;
  /** Se há erro na conexão */
  hasError?: boolean;
  /** Mensagem de erro (opcional) */
  errorMessage?: string;
  /** Se deve mostrar badge de "Novo" */
  hasNewUpdates?: boolean;
  /** Contagem de atualizações novas */
  newUpdateCount?: number;
  /** Tamanho do indicador */
  size?: 'sm' | 'md' | 'lg';
  /** Posição do indicador */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Se deve mostrar sempre ou apenas em hover */
  showAlways?: boolean;
  /** Classe CSS adicional */
  className?: string;
  /** Callback quando clicado para reconectar */
  onReconnect?: () => void;
}

/**
 * Componente RealtimeIndicator
 * 
 * Exibe indicadores visuais para o estado de conexão em tempo real
 * e notifica sobre novas atualizações recebidas.
 */
export function RealtimeIndicator({
  isConnected = true,
  isReconnecting = false,
  hasError = false,
  errorMessage,
  hasNewUpdates = false,
  newUpdateCount = 0,
  size = 'md',
  position = 'top-right',
  showAlways = false,
  className,
  onReconnect,
}: RealtimeIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Efeito para animação de pulso quando há novas atualizações
  useEffect(() => {
    if (hasNewUpdates) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasNewUpdates]);

  // Tamanhos
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  // Posições
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Cores baseadas no estado
  const getVariant = () => {
    if (hasError) return 'destructive';
    if (isReconnecting) return 'secondary';
    if (isConnected) return 'default';
    return 'outline';
  };

  // Ícone baseado no estado
  const getIcon = () => {
    if (hasError) return <AlertCircle className="h-3 w-3" />;
    if (isReconnecting) return <RefreshCw className="h-3 w-3 animate-spin" />;
    if (isConnected) return <Wifi className="h-3 w-3" />;
    return <WifiOff className="h-3 w-3" />;
  };

  // Texto baseado no estado
  const getText = () => {
    if (hasError) return 'Erro de conexão';
    if (isReconnecting) return 'Reconectando...';
    if (isConnected) return 'Conectado';
    return 'Desconectado';
  };

  // Badge de novas atualizações
  const newUpdatesBadge = hasNewUpdates && newUpdateCount > 0 && (
    <Badge
      variant="default"
      className={cn(
        'absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center p-0',
        pulse && 'animate-pulse'
      )}
    >
      {newUpdateCount > 99 ? '99+' : newUpdateCount}
    </Badge>
  );

  return (
    <div className={cn('fixed z-50', positionClasses[position], className)}>
      <div className="relative">
        <Badge
          variant={getVariant()}
          className={cn(
            sizeClasses[size],
            'flex items-center gap-2 cursor-pointer transition-all duration-200',
            !showAlways && 'opacity-70 hover:opacity-100',
            pulse && 'ring-2 ring-primary ring-offset-2'
          )}
          onClick={() => setShowDetails(!showDetails)}
        >
          {getIcon()}
          <span className="hidden sm:inline">{getText()}</span>
          
          {onReconnect && (hasError || !isConnected) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReconnect();
              }}
              className="ml-1 hover:bg-white/20 rounded p-0.5"
              title="Reconectar"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </Badge>

        {newUpdatesBadge}

        {/* Detalhes expandidos */}
        {showDetails && (
          <div className="absolute mt-2 right-0 w-64 bg-card border rounded-lg shadow-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Status da Conexão</h4>
                <Badge variant={getVariant()} className="text-xs">
                  {getText()}
                </Badge>
              </div>

              {errorMessage && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {errorMessage}
                </div>
              )}

              {hasNewUpdates && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    {newUpdateCount} nova{newUpdateCount !== 1 ? 's' : ''} atualizaç
                    {newUpdateCount !== 1 ? 'ões' : 'ão'} recebida{newUpdateCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <p>As atualizações em tempo real mantêm a interface sincronizada automaticamente.</p>
                <p className="mt-1">Clique fora para fechar este painel.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay para fechar ao clicar fora */}
      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}

/**
 * Hook para usar com RealtimeIndicator
 * Gerencia estado de novas atualizações com debounce
 */
export function useRealtimeIndicator() {
  const [newUpdateCount, setNewUpdateCount] = useState(0);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);

  const incrementUpdateCount = () => {
    setNewUpdateCount(prev => prev + 1);
    setHasNewUpdates(true);
    
    // Reset após 5 segundos
    setTimeout(() => {
      setHasNewUpdates(false);
      setNewUpdateCount(0);
    }, 5000);
  };

  const resetUpdateCount = () => {
    setNewUpdateCount(0);
    setHasNewUpdates(false);
  };

  return {
    newUpdateCount,
    hasNewUpdates,
    incrementUpdateCount,
    resetUpdateCount,
  };
}