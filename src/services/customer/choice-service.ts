/**
 * Customer Character Choice Service
 *
 * Este serviço permite que clientes escolham e gerenciem suas escolhas de personagens
 * para pedidos de coleções. Respeita as RLS policies e valida que o usuário só pode
 * acessar suas próprias escolhas.
 *
 * Requirements: 2.2.2, 2.2.5
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Tipos
// ============================================================================

export type ChoiceStatus = "pending" | "submitted" | "approved" | "rejected" | "locked";

export interface Character {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  collectionId: string;
  isAvailable: boolean;
  stockLevel?: number;
}

export interface CharacterChoice {
  id: string;
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  userId: string;
  collectionId: string;
  characterId: string | null;
  characterName: string | null;
  characterImageUrl: string | null;
  status: ChoiceStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  deadline: string;
  remindersSent: number;
  lastReminderAt: string | null;
  previousChoiceId: string | null;
  changeReason: string | null;
  changeCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Função: Buscar Personagens Disponíveis
// ============================================================================

/**
 * Busca personagens disponíveis de uma coleção
 *
 * Esta função:
 * 1. Busca todos os personagens da coleção especificada
 * 2. Verifica disponibilidade de cada personagem
 * 3. Retorna lista de personagens com informações de disponibilidade
 *
 * @param collectionId - ID da coleção
 * @returns Lista de personagens disponíveis
 */
export async function getAvailableCharacters(collectionId: string): Promise<Character[]> {
  if (!collectionId) {
    throw new Error("Collection ID é obrigatório");
  }

  // Buscar personagens da coleção
  const { data, error } = await supabase
    .from("collection_characters")
    .select("id, name, description, image_url, collection_id")
    .eq("collection_id", collectionId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar personagens: ${error.message}`);
  }

  // Transformar dados para o formato da interface
  const characters: Character[] = (data || []).map((char) => ({
    id: char.id,
    name: char.name,
    description: char.description,
    imageUrl: char.image_url,
    collectionId: char.collection_id,
    isAvailable: true, // TODO: Implementar verificação de estoque real
  }));

  return characters;
}

// ============================================================================
// Função: Submeter Escolha de Personagem
// ============================================================================

/**
 * Submete a escolha de personagem do cliente
 *
 * Esta função:
 * 1. Valida que o personagem pertence à coleção do pedido
 * 2. Verifica se o prazo não expirou
 * 3. Cria ou atualiza o registro de escolha
 * 4. Atualiza o status para 'submitted'
 *
 * @param orderId - ID do pedido
 * @param characterId - ID do personagem escolhido
 * @returns Escolha de personagem criada/atualizada
 */
export async function submitCharacterChoice(
  orderId: string,
  characterId: string
): Promise<CharacterChoice> {
  if (!orderId || !characterId) {
    throw new Error("Order ID e Character ID são obrigatórios");
  }

  // Buscar o usuário atual
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Usuário não autenticado");
  }

  // Buscar escolha existente para este pedido
  const { data: existingChoice, error: fetchError } = await supabase
    .from("character_choices")
    .select("*")
    .eq("order_id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Erro ao buscar escolha existente: ${fetchError.message}`);
  }

  // Verificar se já existe uma escolha e se pode ser modificada
  if (existingChoice) {
    // Verificar se a escolha pode ser modificada
    if (existingChoice.status === "approved" || existingChoice.status === "locked") {
      throw new Error("Esta escolha já foi aprovada e não pode ser modificada");
    }

    // Verificar se o prazo expirou
    const deadline = new Date(existingChoice.deadline);
    if (deadline < new Date()) {
      throw new Error("O prazo para escolher o personagem expirou");
    }

    // Verificar limite de mudanças
    if (existingChoice.change_count >= 3) {
      throw new Error("Você atingiu o limite de 3 mudanças. Entre em contato com o suporte.");
    }
  }

  // Buscar informações do personagem
  const { data: character, error: charError } = await supabase
    .from("collection_characters")
    .select("name, image_url, collection_id")
    .eq("id", characterId)
    .single();

  if (charError || !character) {
    throw new Error("Personagem não encontrado");
  }

  // Se existe uma escolha, atualizar; caso contrário, criar nova
  if (existingChoice) {
    // Atualizar escolha existente
    const { data: updatedChoice, error: updateError } = await supabase
      .from("character_choices")
      .update({
        character_id: characterId,
        character_name: character.name,
        character_image_url: character.image_url,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        change_count: existingChoice.change_count + 1,
        previous_choice_id: existingChoice.id,
      })
      .eq("id", existingChoice.id)
      .select()
      .single();

    if (updateError || !updatedChoice) {
      throw new Error(
        `Erro ao atualizar escolha: ${updateError?.message || "Falha na atualização"}`
      );
    }

    return transformCharacterChoice(updatedChoice);
  } else {
    // Criar nova escolha
    // Primeiro, precisamos buscar informações do pedido para obter order_type e collection_id
    const { data: orderInfo, error: orderError } = await supabase
      .from("production_queue")
      .select("order_type, collection_id, choice_deadline")
      .eq("order_id", orderId)
      .single();

    if (orderError || !orderInfo) {
      throw new Error("Pedido não encontrado na fila de produção");
    }

    // Validar que o personagem pertence à coleção do pedido
    if (character.collection_id !== orderInfo.collection_id) {
      throw new Error("O personagem escolhido não pertence à coleção deste pedido");
    }

    const { data: newChoice, error: insertError } = await supabase
      .from("character_choices")
      .insert({
        order_id: orderId,
        order_type: orderInfo.order_type,
        user_id: user.id,
        collection_id: orderInfo.collection_id,
        character_id: characterId,
        character_name: character.name,
        character_image_url: character.image_url,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        deadline:
          orderInfo.choice_deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError || !newChoice) {
      throw new Error(`Erro ao criar escolha: ${insertError?.message || "Falha na criação"}`);
    }

    return transformCharacterChoice(newChoice);
  }
}

// ============================================================================
// Função: Alterar Escolha de Personagem
// ============================================================================

/**
 * Altera a escolha de personagem do cliente
 *
 * Esta função:
 * 1. Valida que a escolha pode ser alterada (não aprovada/locked)
 * 2. Verifica se o limite de mudanças não foi atingido (max 3)
 * 3. Atualiza a escolha com o novo personagem
 * 4. Registra o motivo da mudança
 *
 * @param choiceId - ID da escolha a ser alterada
 * @param newCharacterId - ID do novo personagem
 * @param reason - Motivo da mudança
 * @returns Escolha atualizada
 */
export async function changeCharacterChoice(
  choiceId: string,
  newCharacterId: string,
  reason: string
): Promise<CharacterChoice> {
  if (!choiceId || !newCharacterId) {
    throw new Error("Choice ID e Character ID são obrigatórios");
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error("Motivo da mudança é obrigatório");
  }

  // Buscar o usuário atual
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Usuário não autenticado");
  }

  // Buscar escolha existente
  const { data: existingChoice, error: fetchError } = await supabase
    .from("character_choices")
    .select("*")
    .eq("id", choiceId)
    .eq("user_id", user.id) // Garantir que o usuário só pode alterar suas próprias escolhas
    .single();

  if (fetchError || !existingChoice) {
    throw new Error("Escolha não encontrada ou você não tem permissão para alterá-la");
  }

  // Verificar se a escolha pode ser alterada
  if (existingChoice.status === "approved" || existingChoice.status === "locked") {
    throw new Error("Esta escolha já foi aprovada e não pode ser alterada");
  }

  // Verificar se o prazo expirou
  const deadline = new Date(existingChoice.deadline);
  if (deadline < new Date()) {
    throw new Error("O prazo para alterar a escolha expirou");
  }

  // Verificar limite de mudanças
  if (existingChoice.change_count >= 3) {
    throw new Error("Você atingiu o limite de 3 mudanças. Entre em contato com o suporte.");
  }

  // Buscar informações do novo personagem
  const { data: character, error: charError } = await supabase
    .from("collection_characters")
    .select("name, image_url, collection_id")
    .eq("id", newCharacterId)
    .single();

  if (charError || !character) {
    throw new Error("Personagem não encontrado");
  }

  // Validar que o personagem pertence à mesma coleção
  if (character.collection_id !== existingChoice.collection_id) {
    throw new Error("O personagem escolhido não pertence à coleção deste pedido");
  }

  // Atualizar escolha
  const { data: updatedChoice, error: updateError } = await supabase
    .from("character_choices")
    .update({
      character_id: newCharacterId,
      character_name: character.name,
      character_image_url: character.image_url,
      change_reason: reason,
      change_count: existingChoice.change_count + 1,
      status: "submitted", // Resetar para submitted se estava rejected
      submitted_at: new Date().toISOString(),
    })
    .eq("id", choiceId)
    .select()
    .single();

  if (updateError || !updatedChoice) {
    throw new Error(`Erro ao alterar escolha: ${updateError?.message || "Falha na atualização"}`);
  }

  return transformCharacterChoice(updatedChoice);
}

// ============================================================================
// Função: Buscar Minha Escolha
// ============================================================================

/**
 * Busca a escolha de personagem do cliente para um pedido específico
 *
 * Esta função:
 * 1. Busca a escolha do usuário autenticado para o pedido
 * 2. Retorna null se não houver escolha
 * 3. Respeita RLS policies (usuário só vê suas próprias escolhas)
 *
 * @param orderId - ID do pedido
 * @returns Escolha de personagem ou null se não existir
 */
export async function getMyChoice(orderId: string): Promise<CharacterChoice | null> {
  if (!orderId) {
    throw new Error("Order ID é obrigatório");
  }

  // Buscar o usuário atual
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Usuário não autenticado");
  }

  // Buscar escolha do usuário para este pedido
  const { data: choice, error } = await supabase
    .from("character_choices")
    .select("*")
    .eq("order_id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar escolha: ${error.message}`);
  }

  if (!choice) {
    return null;
  }

  return transformCharacterChoice(choice);
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Transforma dados do banco para o formato da interface CharacterChoice
 */
function transformCharacterChoice(data: any): CharacterChoice {
  return {
    id: data.id,
    orderId: data.order_id,
    orderType: data.order_type,
    userId: data.user_id,
    collectionId: data.collection_id,
    characterId: data.character_id,
    characterName: data.character_name,
    characterImageUrl: data.character_image_url,
    status: data.status,
    submittedAt: data.submitted_at,
    approvedAt: data.approved_at,
    approvedBy: data.approved_by,
    approvedByName: data.approved_by_name,
    rejectedAt: data.rejected_at,
    rejectionReason: data.rejection_reason,
    deadline: data.deadline,
    remindersSent: data.reminders_sent,
    lastReminderAt: data.last_reminder_at,
    previousChoiceId: data.previous_choice_id,
    changeReason: data.change_reason,
    changeCount: data.change_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
