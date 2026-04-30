/**
 * ConversationTagsSelector - Seletor de tags da conversa
 * Requirement 12.2: Exibir e permitir editar tags (múltiplas tags)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tag } from "lucide-react";
import { toast } from "sonner";
import { conversationService } from "@/lib/services/conversationService";
import type { ConversationTag } from "@/types/support";
import { getTagLabel, CONVERSATION_TAGS } from "@/types/support";

interface ConversationTagsSelectorProps {
  conversationId: string;
  currentTags: ConversationTag[];
  onUpdate?: (tags: ConversationTag[]) => void;
}

const TAG_COLORS: Record<ConversationTag, string> = {
  pedido: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  orcamento: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  duvida: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  reclamacao: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  assinatura: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  urgente: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export function ConversationTagsSelector({
  conversationId,
  currentTags,
  onUpdate,
}: ConversationTagsSelectorProps) {
  const [tags, setTags] = useState<ConversationTag[]>(currentTags);
  const [isOpen, setIsOpen] = useState(false);

  const toggleTag = async (tag: ConversationTag) => {
    const newTags = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];

    try {
      await conversationService.updateTags(conversationId, newTags);
      setTags(newTags);
      onUpdate?.(newTags);
      toast.success(
        tags.includes(tag)
          ? `Tag "${getTagLabel(tag)}" removida`
          : `Tag "${getTagLabel(tag)}" adicionada`
      );
    } catch (error) {
      console.error("Erro ao atualizar tags:", error);
      toast.error("Erro ao atualizar tags");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Tag className="h-4 w-4" />
            Tags
            {tags.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {tags.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {CONVERSATION_TAGS.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag}
              checked={tags.includes(tag)}
              onCheckedChange={() => toggleTag(tag)}
            >
              {getTagLabel(tag)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} className={TAG_COLORS[tag]}>
              {getTagLabel(tag)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
