import { z } from "zod";

// =====================================================
// Validation Schemas for Support System
// =====================================================

// Message validation
export const messageSchema = z.object({
  message: z
    .string()
    .min(1, "Mensagem não pode estar vazia")
    .max(2000, "Mensagem não pode ter mais de 2000 caracteres")
    .refine((val) => val.trim().length > 0, {
      message: "Mensagem não pode conter apenas espaços",
    }),
  is_internal: z.boolean().optional().default(false),
});

export const sendMessageSchema = z.object({
  conversation_id: z.string().uuid("ID de conversa inválido"),
  sender_id: z.string().uuid("ID de remetente inválido"),
  sender_type: z.enum(["admin", "customer", "system"]),
  message: z
    .string()
    .min(1, "Mensagem não pode estar vazia")
    .max(2000, "Mensagem não pode ter mais de 2000 caracteres")
    .refine((val) => val.trim().length > 0, {
      message: "Mensagem não pode conter apenas espaços",
    }),
  is_internal: z.boolean().optional().default(false),
});

// File upload validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_PDF_TYPE = "application/pdf";
const ACCEPTED_FILE_TYPES = [...ACCEPTED_IMAGE_TYPES, ACCEPTED_PDF_TYPE];

export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "Arquivo deve ter no máximo 5MB",
    })
    .refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), {
      message: "Tipo de arquivo não suportado. Use JPEG, PNG ou PDF",
    }),
});

export const imageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "Imagem deve ter no máximo 5MB",
    })
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), {
      message: "Tipo de imagem não suportado. Use JPEG ou PNG",
    }),
});

export const pdfUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "PDF deve ter no máximo 5MB",
    })
    .refine((file) => file.type === ACCEPTED_PDF_TYPE, {
      message: "Arquivo deve ser um PDF",
    }),
});

// Conversation validation
export const createConversationSchema = z.object({
  user_id: z.string().uuid("ID de usuário inválido"),
  subject: z
    .string()
    .min(1, "Assunto não pode estar vazio")
    .max(200, "Assunto não pode ter mais de 200 caracteres"),
  status: z
    .enum(["new", "waiting_admin", "waiting_customer", "resolved", "closed"])
    .optional()
    .default("new"),
  priority: z
    .enum(["low", "normal", "high", "urgent"])
    .optional()
    .default("normal"),
  tags: z
    .array(
      z.enum([
        "pedido",
        "orcamento",
        "duvida",
        "reclamacao",
        "assinatura",
        "urgente",
      ])
    )
    .optional()
    .default([]),
  order_id: z.string().uuid().optional(),
  quote_id: z.string().uuid().optional(),
  subscription_id: z.string().uuid().optional(),
  payment_id: z.string().uuid().optional(),
});

export const updateConversationStatusSchema = z.object({
  status: z.enum([
    "new",
    "waiting_admin",
    "waiting_customer",
    "resolved",
    "closed",
  ]),
});

export const updateConversationTagsSchema = z.object({
  tags: z.array(
    z.enum([
      "pedido",
      "orcamento",
      "duvida",
      "reclamacao",
      "assinatura",
      "urgente",
    ])
  ),
});

export const updateConversationRiskFlagsSchema = z.object({
  risk_flags: z.array(
    z.enum(["cliente_conflito", "atraso_critico", "pagamento_problema"])
  ),
});

export const updatePromisedDateSchema = z.object({
  promised_date: z.string().datetime().nullable(),
});

// Contact form validation
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome não pode ter mais de 100 caracteres"),
  email: z.string().email("Email inválido"),
  message: z
    .string()
    .min(10, "Mensagem deve ter pelo menos 10 caracteres")
    .max(2000, "Mensagem não pode ter mais de 2000 caracteres")
    .refine((val) => val.trim().length >= 10, {
      message: "Mensagem deve ter pelo menos 10 caracteres",
    }),
});

// Quick reply validation
export const quickReplySchema = z.object({
  category: z.string().min(1, "Categoria é obrigatória"),
  title: z
    .string()
    .min(1, "Título é obrigatório")
    .max(100, "Título não pode ter mais de 100 caracteres"),
  message: z
    .string()
    .min(1, "Mensagem é obrigatória")
    .max(2000, "Mensagem não pode ter mais de 2000 caracteres"),
  display_order: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
});

// Reminder validation
export const reminderSchema = z.object({
  conversation_id: z.string().uuid("ID de conversa inválido"),
  reminder_type: z.enum(["quote_followup", "payment_pending", "promised_date"]),
  scheduled_for: z
    .string()
    .datetime()
    .refine(
      (date) => new Date(date) > new Date(),
      "Data deve ser no futuro"
    ),
  message: z.string().max(500).optional(),
});

// Production stage validation
export const productionStageSchema = z.object({
  order_id: z.string().uuid("ID de pedido inválido"),
  stage: z.enum([
    "molde_pronto",
    "impressao_iniciada",
    "pintura_iniciada",
    "finalizacao",
  ]),
  notes: z.string().max(500).optional(),
});

// Search and filter validation
export const conversationFiltersSchema = z.object({
  status: z
    .enum(["new", "waiting_admin", "waiting_customer", "resolved", "closed"])
    .optional(),
  tags: z
    .array(
      z.enum([
        "pedido",
        "orcamento",
        "duvida",
        "reclamacao",
        "assinatura",
        "urgente",
      ])
    )
    .optional(),
  risk_flags: z
    .array(
      z.enum(["cliente_conflito", "atraso_critico", "pagamento_problema"])
    )
    .optional(),
  search: z.string().max(200).optional(),
  assigned_to: z.string().uuid().optional(),
});

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  order_by: z.string().optional().default("last_message_at"),
  order_direction: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Helper function to validate file
export function validateFile(file: File): {
  valid: boolean;
  error?: string;
} {
  try {
    fileUploadSchema.parse({ file });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: "Erro ao validar arquivo" };
  }
}

// Helper function to validate message
export function validateMessage(message: string): {
  valid: boolean;
  error?: string;
} {
  try {
    messageSchema.parse({ message });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: "Erro ao validar mensagem" };
  }
}

// Type exports
export type MessageInput = z.infer<typeof messageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type QuickReplyInput = z.infer<typeof quickReplySchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;
export type ProductionStageInput = z.infer<typeof productionStageSchema>;
export type ConversationFiltersInput = z.infer<typeof conversationFiltersSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
