import { supabase } from "@/integrations/supabase/client";
import {
  changeCharacterChoiceRpc,
  submitCharacterChoiceRpc,
} from "./choice-mutations-service";
import type { ChoiceStatus } from "@/types/production";

export type { ChoiceStatus };

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
  status: string;
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

type CharacterChoiceRow = {
  id: string;
  order_id: string;
  order_type: CharacterChoice["orderType"];
  user_id: string;
  collection_id: string;
  character_id: string | null;
  character_name: string | null;
  character_image_url?: string | null;
  status: ChoiceStatus;
  submitted_at: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  deadline: string;
  reminders_sent?: number | null;
  last_reminder_at?: string | null;
  previous_choice_id?: string | null;
  change_reason?: string | null;
  change_count?: number | null;
  created_at: string;
  updated_at: string;
};

async function checkCharacterAvailability(
  characterId: string,
  collectionId: string
): Promise<boolean> {
  const { data: character, error: charError } = await supabase
    .from("collection_characters")
    .select("id")
    .eq("id", characterId)
    .eq("collection_id", collectionId)
    .maybeSingle();

  return !charError && !!character;
}

export async function getAvailableCharacters(collectionId: string): Promise<Character[]> {
  if (!collectionId) {
    throw new Error("Collection ID e obrigatorio");
  }

  const { data, error } = await supabase
    .from("collection_characters")
    .select("id, name, description, image_url, collection_id")
    .eq("collection_id", collectionId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar personagens: ${error.message}`);
  }

  return Promise.all(
    (data || []).map(async (char) => ({
      id: char.id,
      name: char.name,
      description: char.description,
      imageUrl: char.image_url,
      collectionId: char.collection_id,
      isAvailable: await checkCharacterAvailability(char.id, char.collection_id),
    }))
  );
}

export async function submitCharacterChoice(
  orderId: string,
  characterId: string
): Promise<CharacterChoice> {
  if (!orderId || !characterId) {
    throw new Error("Order ID e Character ID sao obrigatorios");
  }

  const choice = await submitCharacterChoiceRpc<CharacterChoiceRow>(orderId, characterId);
  return transformCharacterChoice(choice);
}

export async function changeCharacterChoice(
  choiceId: string,
  newCharacterId: string,
  reason: string
): Promise<CharacterChoice> {
  if (!choiceId || !newCharacterId) {
    throw new Error("Choice ID e Character ID sao obrigatorios");
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error("Motivo da mudanca e obrigatorio");
  }

  const choice = await changeCharacterChoiceRpc<CharacterChoiceRow>(
    choiceId,
    newCharacterId,
    reason
  );
  return transformCharacterChoice(choice);
}

export async function getMyChoice(orderId: string): Promise<CharacterChoice | null> {
  if (!orderId) {
    throw new Error("Order ID e obrigatorio");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Usuario nao autenticado");
  }

  const { data: choice, error } = await supabase
    .from("character_choices")
    .select("*")
    .eq("order_id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar escolha: ${error.message}`);
  }

  return choice ? transformCharacterChoice(choice as CharacterChoiceRow) : null;
}

function transformCharacterChoice(data: CharacterChoiceRow): CharacterChoice {
  return {
    id: data.id,
    orderId: data.order_id,
    orderType: data.order_type,
    userId: data.user_id,
    collectionId: data.collection_id,
    characterId: data.character_id,
    characterName: data.character_name,
    characterImageUrl: data.character_image_url ?? null,
    status: toChoiceStatus(data.status, data.id),
    submittedAt: data.submitted_at,
    approvedAt: data.approved_at ?? null,
    approvedBy: data.approved_by ?? null,
    approvedByName: data.approved_by_name ?? null,
    rejectedAt: data.rejected_at,
    rejectionReason: data.rejection_reason,
    deadline: data.deadline,
    remindersSent: data.reminders_sent ?? 0,
    lastReminderAt: data.last_reminder_at ?? null,
    previousChoiceId: data.previous_choice_id ?? null,
    changeReason: data.change_reason ?? null,
    changeCount: data.change_count ?? 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function toChoiceStatus(status: string, choiceId: string): ChoiceStatus {
  if (
    status === "pending" ||
    status === "submitted" ||
    status === "approved" ||
    status === "rejected" ||
    status === "locked" ||
    status === "expired"
  ) {
    return status;
  }

  throw new Error(`Character choice ${choiceId} has an invalid status`);
}
