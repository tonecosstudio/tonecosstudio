/**
 * CustomerSidebar Integration Example
 *
 * This example shows how to integrate CustomerSidebar into ChatInterface
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 8.2, 8.3, 8.4, 9.1, 9.2, 19.1, 19.2, 19.5, 25.3
 */

import { useState } from "react";
import { CustomerSidebar } from "./CustomerSidebar";
import { ChatInterface } from "./ChatInterface";

interface ChatWithSidebarExampleProps {
  conversationId: string;
  userId: string;
}

/**
 * Example of how to integrate CustomerSidebar with ChatInterface
 *
 * Usage in AdminSupportV2.tsx:
 *
 * ```tsx
 * import { CustomerSidebar } from "@/components/admin/CustomerSidebar";
 *
 * function AdminSupportV2() {
 *   const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
 *   const [sidebarOpen, setSidebarOpen] = useState(false);
 *
 *   return (
 *     <div className="flex h-screen">
 *       <ConversationList
 *         onSelect={setSelectedConversation}
 *       />
 *
 *       <div className="flex-1 flex flex-col">
 *         {selectedConversation && (
 *           <>
 *             <ChatHeader
 *               conversation={selectedConversation}
 *               actions={
 *                 <CustomerSidebar
 *                   userId={selectedConversation.user_id}
 *                   isOpen={sidebarOpen}
 *                   onToggle={() => setSidebarOpen(!sidebarOpen)}
 *                 />
 *               }
 *             />
 *             <ChatInterface conversationId={selectedConversation.id} />
 *           </>
 *         )}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function ChatWithSidebarExample({ conversationId, userId }: ChatWithSidebarExampleProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Sidebar Toggle */}
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chat</h2>
          <CustomerSidebar
            userId={userId}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>

        {/* Chat Interface */}
        <ChatInterface conversationId={conversationId} />
      </div>
    </div>
  );
}
