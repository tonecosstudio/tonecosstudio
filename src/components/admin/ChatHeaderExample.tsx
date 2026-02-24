/**
 * ChatHeaderExample - Exemplo de uso do ChatHeader com agendamento de lembretes
 *
 * Este componente demonstra como usar o ChatHeader em uma interface de chat.
 */

import { ChatHeader } from "./ChatHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConversationReminder } from "@/lib/reminder-service";

export function ChatHeaderExample() {
  const handleReminderCreated = (reminder: ConversationReminder) => {
    console.log("Lembrete criado:", reminder);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ChatHeader - Exemplo de Uso</CardTitle>
          <CardDescription>
            Demonstração do cabeçalho de chat com funcionalidade de agendamento de lembretes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <ChatHeader
              conversationId="00000000-0000-0000-0000-000000000000"
              userName="João Silva"
              userEmail="joao@example.com"
              subject="Dúvida sobre pedido #1234"
              onReminderCreated={handleReminderCreated}
            />

            <div className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Área de mensagens do chat apareceria aqui...
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">Funcionalidades</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Botão "Agendar Lembrete" no cabeçalho</li>
              <li>Modal com seleção de tipo de lembrete (orçamento, pagamento, data prometida)</li>
              <li>Seletor de data com validação de data futura</li>
              <li>Seletor de hora para agendamento preciso</li>
              <li>Validação que impede agendar lembretes no passado</li>
              <li>Feedback visual com toast notifications</li>
              <li>Integração com a tabela conversation_reminders</li>
            </ul>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Nota de Implementação</h4>
              <p className="text-sm text-muted-foreground">
                Este componente está pronto para ser integrado no AdminSupportV2 quando a interface
                completa de chat for implementada. O conversationId deve ser fornecido pela conversa
                ativa selecionada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
