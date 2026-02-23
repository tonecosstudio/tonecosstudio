import { useState } from "react";
import { CreateGroupModal } from "./CreateGroupModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

/**
 * Exemplo de uso do CreateGroupModal
 * 
 * Este componente demonstra como integrar o modal de criação de grupos
 * em uma página de administração.
 */
export function CreateGroupModalExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = () => {
    console.log("Grupo criado com sucesso!");
    // Aqui você pode recarregar a lista de grupos ou fazer outras ações
  };

  return (
    <div className="p-8 space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Gerenciar Grupos de Broadcast</h1>
        <p className="text-muted-foreground">
          Crie e gerencie grupos para enviar mensagens broadcast para clientes
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Novo Grupo
        </Button>
      </div>

      <CreateGroupModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={handleSuccess}
      />

      <div className="mt-8 p-4 border rounded-lg bg-muted/50">
        <h2 className="font-semibold mb-2">Como usar:</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Clique no botão "Criar Novo Grupo"</li>
          <li>Preencha o nome do grupo (3-100 caracteres)</li>
          <li>Selecione o tipo de grupo:
            <ul className="list-disc list-inside ml-6 mt-1">
              <li><strong>Manual:</strong> Adicione membros manualmente</li>
              <li><strong>Assinantes:</strong> Inclui assinantes ativos (com filtros opcionais)</li>
              <li><strong>Coleção:</strong> Inclui assinantes de uma coleção específica</li>
              <li><strong>Lançamentos:</strong> Para notificações de novos produtos</li>
              <li><strong>Pedidos:</strong> Baseado em status e período de pedidos</li>
            </ul>
          </li>
          <li>Configure os critérios específicos do tipo selecionado</li>
          <li>Clique em "Criar Grupo"</li>
        </ol>
      </div>

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
        <h2 className="font-semibold mb-2">Tipos de Grupo:</h2>
        <div className="space-y-3 text-sm">
          <div>
            <strong>Manual:</strong> Você adiciona e remove membros manualmente.
            Ideal para grupos pequenos ou específicos.
          </div>
          <div>
            <strong>Assinantes:</strong> Inclui automaticamente todos os assinantes ativos.
            Você pode filtrar por coleção ou plano específico.
          </div>
          <div>
            <strong>Coleção:</strong> Inclui automaticamente assinantes de uma coleção específica.
            Requer seleção de uma coleção existente.
          </div>
          <div>
            <strong>Lançamentos:</strong> Para notificações de novos produtos.
            Pode incluir todos os usuários ou apenas compradores anteriores.
          </div>
          <div>
            <strong>Pedidos:</strong> Baseado em status e período de pedidos.
            Útil para comunicações sobre pedidos específicos.
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
        <h2 className="font-semibold mb-2">⚠️ Importante:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Grupos automáticos (não manuais) são sincronizados a cada 10-15 minutos</li>
          <li>Membros são adicionados/removidos automaticamente baseado nos critérios</li>
          <li>Para grupos de coleção, a coleção deve existir no sistema</li>
          <li>Nomes de grupos devem ser únicos</li>
        </ul>
      </div>
    </div>
  );
}
