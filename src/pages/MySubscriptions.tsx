/**
 * Página: Minhas Assinaturas
 * Sistema Híbrido - Redireciona para o novo painel do assinante
 * 
 * Esta página foi substituída pelo sistema híbrido.
 * Mantida apenas para compatibilidade com links antigos.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function MySubscriptions() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para o novo painel do sistema híbrido
    navigate('/painel-assinante', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <div>
          <h2 className="text-xl font-semibold mb-2">Redirecionando...</h2>
          <p className="text-muted-foreground">
            Você está sendo redirecionado para o novo painel de assinaturas
          </p>
        </div>
      </div>
    </div>
  );
}
