// @ts-nocheck
import { useState } from "react";
import { GroupList } from "./GroupList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Exemplo de uso do componente GroupList
 *
 * Este exemplo demonstra:
 * - Listagem de grupos com métricas
 * - Botão de criar grupo (callback)
 * - Seleção de grupo (callback)
 * - Ação de deletar com confirmação
 * - Loading states
 * - Empty state
 */
export function GroupListExample() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const handleCreateGroup = () => {
    console.log("Criar novo grupo - abrir modal de criação");
    // Aqui você abriria um modal/dialog para criar grupo
    // Exemplo: setCreateModalOpen(true)
  };

  const handleSelectGroup = (groupId: string) => {
    console.log("Grupo selecionado:", groupId);
    setSelectedGroupId(groupId);
    // Aqui você navegaria para a página de detalhes do grupo
    // Exemplo: navigate(`/admin/groups/${groupId}`)
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exemplo: GroupList Component</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Este componente lista todos os grupos de broadcast com suas métricas básicas. Clique em
            um grupo para selecioná-lo ou use o botão de deletar para remover.
          </p>

          {selectedGroupId && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
              <p className="text-sm">
                <strong>Grupo selecionado:</strong> {selectedGroupId}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <GroupList onCreateGroup={handleCreateGroup} onSelectGroup={handleSelectGroup} />
    </div>
  );
}

/**
 * Exemplo de uso sem callbacks (apenas visualização)
 */
export function GroupListReadOnlyExample() {
  return (
    <div className="container mx-auto py-8">
      <GroupList />
    </div>
  );
}

/**
 * Exemplo de integração com roteamento
 */
export function GroupListWithRoutingExample() {
  // Exemplo usando react-router-dom
  // import { useNavigate } from "react-router-dom";
  // const navigate = useNavigate();

  const handleCreateGroup = () => {
    // navigate("/admin/groups/create");
    console.log("Navegar para /admin/groups/create");
  };

  const handleSelectGroup = (groupId: string) => {
    // navigate(`/admin/groups/${groupId}`);
    console.log(`Navegar para /admin/groups/${groupId}`);
  };

  return (
    <div className="container mx-auto py-8">
      <GroupList onCreateGroup={handleCreateGroup} onSelectGroup={handleSelectGroup} />
    </div>
  );
}
