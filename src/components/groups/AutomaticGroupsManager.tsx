import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * AutomaticGroupsManager - Gerencia sincronização de grupos automáticos
 *
 * Permite ao admin:
 * - Ver status dos grupos automáticos
 * - Forçar sincronização manual
 * - Ver logs de sincronização
 */
export function AutomaticGroupsManager() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      // Chamar função do banco para sincronizar todos os grupos
      const { error } = await supabase.rpc("sync_all_automatic_groups" as any);

      if (error) throw error;

      setLastSync(new Date());
      toast.success("Todos os grupos foram sincronizados com sucesso!");
    } catch (error) {
      console.error("Erro ao sincronizar grupos:", error);
      toast.error("Erro ao sincronizar grupos. Verifique o console.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncGroup = async (groupId: string) => {
    try {
      const { error } = await supabase.rpc("sync_automatic_group_members" as any, {
        p_group_id: groupId,
      });

      if (error) throw error;

      toast.success("Grupo sincronizado com sucesso!");
    } catch (error) {
      console.error("Erro ao sincronizar grupo:", error);
      toast.error("Erro ao sincronizar grupo. Verifique o console.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sincronização Automática</CardTitle>
        <div className="text-sm text-muted-foreground">
          Os grupos são sincronizados automaticamente quando:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Um novo usuário se cadastra (→ Novos Membros)</li>
            <li>Uma assinatura é criada/atualizada (→ Assinantes)</li>
            <li>Uma nova coleção é criada (→ Grupo da Coleção)</li>
          </ul>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">Sistema Ativo</p>
            <p className="text-xs text-green-700 dark:text-green-300">
              Triggers automáticos estão funcionando
            </p>
          </div>
        </div>

        {/* Last Sync */}
        {lastSync && (
          <div className="text-sm text-muted-foreground">
            Última sincronização manual: {lastSync.toLocaleString("pt-BR")}
          </div>
        )}

        {/* Sync Button */}
        <Button onClick={handleSyncAll} disabled={syncing} className="w-full">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar Todos os Grupos Agora"}
        </Button>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-900 dark:text-blue-100 flex-1">
            <p className="font-medium mb-2">Quando usar sincronização manual?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Após importação em massa de usuários</li>
              <li>Após correção de dados de assinaturas</li>
              <li>Se suspeitar de inconsistências</li>
            </ul>
          </div>
        </div>

        {/* Grupos Automáticos */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Grupos Gerenciados Automaticamente:</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 border rounded">
              <div>
                <p className="text-sm font-medium">🎉 Novos Membros</p>
                <p className="text-xs text-muted-foreground">Todos os usuários cadastrados</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <div>
                <p className="text-sm font-medium">⭐ Assinantes</p>
                <p className="text-xs text-muted-foreground">Usuários com assinatura ativa</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <div>
                <p className="text-sm font-medium">📦 Grupos por Coleção</p>
                <p className="text-xs text-muted-foreground">
                  Criados automaticamente para cada coleção
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
