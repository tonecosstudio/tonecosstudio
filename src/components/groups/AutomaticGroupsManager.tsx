import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomaticGroupsSync } from "@/hooks/groups/useAutomaticGroupsSync";

export function AutomaticGroupsManager() {
  const { syncAll, syncing, lastSync } = useAutomaticGroupsSync();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sincronizacao Automatica</CardTitle>
        <div className="text-sm text-muted-foreground">
          Os grupos sao sincronizados automaticamente quando:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Um novo usuario se cadastra (Novos Membros)</li>
            <li>Uma assinatura e criada/atualizada (Assinantes)</li>
            <li>Uma nova colecao e criada (Grupo da Colecao)</li>
          </ul>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">Sistema Ativo</p>
            <p className="text-xs text-green-700 dark:text-green-300">
              Triggers automaticos estao funcionando
            </p>
          </div>
        </div>

        {lastSync && (
          <div className="text-sm text-muted-foreground">
            Ultima sincronizacao manual: {lastSync.toLocaleString("pt-BR")}
          </div>
        )}

        <Button onClick={syncAll} disabled={syncing} className="w-full">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar Todos os Grupos Agora"}
        </Button>

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-900 dark:text-blue-100 flex-1">
            <p className="font-medium mb-2">Quando usar sincronizacao manual?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Apos importacao em massa de usuarios</li>
              <li>Apos correcao de dados de assinaturas</li>
              <li>Se suspeitar de inconsistencias</li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Grupos Gerenciados Automaticamente:</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 border rounded">
              <div>
                <p className="text-sm font-medium">Novos Membros</p>
                <p className="text-xs text-muted-foreground">Todos os usuarios cadastrados</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <div>
                <p className="text-sm font-medium">Assinantes</p>
                <p className="text-xs text-muted-foreground">Usuarios com assinatura ativa</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <div>
                <p className="text-sm font-medium">Grupos por Colecao</p>
                <p className="text-xs text-muted-foreground">
                  Criados automaticamente para cada colecao
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
