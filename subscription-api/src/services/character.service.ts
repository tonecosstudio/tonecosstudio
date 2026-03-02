/**
 * Character Management Service
 * 
 * Serviço que gerencia personagens do catálogo.
 * Garante:
 * - Filtragem por exclusividade baseada no tipo de plano
 * - Validação de acesso a personagens exclusivos
 * - Retorno apenas de personagens ativos
 * - Paginação básica para listagens
 * 
 * Regras de Negócio:
 * - Plano Trimestral: acesso apenas a personagens não exclusivos
 * - Plano Semestral: acesso a todos os personagens (incluindo exclusivos)
 * - Apenas personagens com isActive = true são retornados
 */

import { getPrismaClient } from '../config/database';
import { PlanType } from '../models/types';

const prisma = getPrismaClient();

/**
 * Filtros para busca de personagens
 */
export interface CharacterFilters {
  isActive?: boolean;
  isExclusiveSemestral?: boolean;
  isStandardCollection?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Resultado paginado de personagens
 */
export interface PaginatedCharacters {
  characters: CharacterResult[];
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Personagem retornado pela API
 */
export interface CharacterResult {
  id: number;
  name: string;
  description: string | null;
  priceCash: number;
  priceCredits: number;
  isExclusiveSemestral: boolean;
  isActive: boolean;
  isStandardCollection: boolean;
  imageUrl: string | null;
}

/**
 * Obtém lista de personagens com filtragem por exclusividade baseada no plano
 * 
 * Regras de filtragem:
 * - Plano Trimestral: retorna apenas personagens não exclusivos (isExclusiveSemestral = false)
 * - Plano Semestral: retorna todos os personagens
 * - Sempre filtra por isActive = true
 * 
 * @param filters - Filtros opcionais para busca
 * @param planType - Tipo de plano do usuário (trimestral ou semestral)
 * @returns Lista paginada de personagens
 */
export async function getCharacters(
  filters: CharacterFilters = {},
  planType?: PlanType
): Promise<PaginatedCharacters> {
  const {
    isActive = true,
    isStandardCollection,
    page = 1,
    limit = 20
  } = filters;

  // Valida paginação
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));
  const skip = (validPage - 1) * validLimit;

  // Constrói filtros de busca
  const where: any = {
    isActive
  };

  // Filtra por exclusividade baseado no plano
  if (planType === 'trimestral') {
    // Plano trimestral: apenas personagens não exclusivos
    where.isExclusiveSemestral = false;
  }
  // Plano semestral: todos os personagens (não adiciona filtro)

  // Filtro opcional por coleção padrão
  if (isStandardCollection !== undefined) {
    where.isStandardCollection = isStandardCollection;
  }

  // Busca personagens e contagem total
  const [characters, total] = await Promise.all([
    prisma.character.findMany({
      where,
      skip,
      take: validLimit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.character.count({ where })
  ]);

  // Calcula informações de paginação
  const totalPages = Math.ceil(total / validLimit);

  return {
    characters: characters.map(mapCharacterToResult),
    pagination: {
      currentPage: validPage,
      perPage: validLimit,
      total,
      totalPages,
      hasNext: validPage < totalPages,
      hasPrev: validPage > 1
    }
  };
}

/**
 * Obtém um personagem específico por ID com validação de acesso
 * 
 * Valida que:
 * - Personagem existe e está ativo
 * - Se personagem é exclusivo, usuário tem plano semestral
 * 
 * @param id - ID do personagem
 * @param planType - Tipo de plano do usuário (opcional)
 * @returns Personagem ou null se não encontrado/sem acesso
 */
export async function getCharacterById(
  id: number,
  planType?: PlanType
): Promise<CharacterResult | null> {
  const character = await prisma.character.findUnique({
    where: { id: BigInt(id) }
  });

  if (!character) {
    return null;
  }

  // Verifica se personagem está ativo
  if (!character.isActive) {
    return null;
  }

  // Valida acesso a personagens exclusivos
  if (character.isExclusiveSemestral && planType === 'trimestral') {
    // Plano trimestral não tem acesso a personagens exclusivos
    return null;
  }

  return mapCharacterToResult(character);
}

/**
 * Obtém a coleção padrão de personagens
 * 
 * Retorna todos os personagens marcados como parte da coleção padrão
 * (isStandardCollection = true) que estão ativos.
 * 
 * Esta coleção é usada para criar pedidos automáticos quando
 * uma assinatura é ativada.
 * 
 * @returns Lista de personagens da coleção padrão
 */
export async function getStandardCollection(): Promise<CharacterResult[]> {
  const characters = await prisma.character.findMany({
    where: {
      isStandardCollection: true,
      isActive: true
    },
    orderBy: { name: 'asc' }
  });

  return characters.map(mapCharacterToResult);
}

/**
 * Mapeia um personagem do Prisma para o formato de resultado
 */
function mapCharacterToResult(character: any): CharacterResult {
  return {
    id: Number(character.id),
    name: character.name,
    description: character.description,
    priceCash: Number(character.priceCash),
    priceCredits: character.priceCredits,
    isExclusiveSemestral: character.isExclusiveSemestral,
    isActive: character.isActive,
    isStandardCollection: character.isStandardCollection,
    imageUrl: character.imageUrl
  };
}

/**
 * Dados para criação de personagem
 */
export interface CreateCharacterData {
  name: string;
  description?: string;
  priceCash: number;
  priceCredits: number;
  isExclusiveSemestral?: boolean;
  isStandardCollection?: boolean;
  imageUrl?: string;
}

/**
 * Dados para atualização de personagem
 */
export interface UpdateCharacterData {
  name?: string;
  description?: string;
  priceCash?: number;
  priceCredits?: number;
  isExclusiveSemestral?: boolean;
  isStandardCollection?: boolean;
  isActive?: boolean;
  imageUrl?: string;
}

/**
 * Cria um novo personagem no catálogo
 *
 * Validações:
 * - Nome é obrigatório
 * - Preço em dinheiro é obrigatório e deve ser positivo
 * - Preço em créditos é obrigatório e deve ser positivo
 *
 * @param data - Dados do personagem a ser criado
 * @returns Personagem criado
 * @throws Error se validação falhar
 */
export async function createCharacter(data: CreateCharacterData): Promise<CharacterResult> {
  // Validação de campos obrigatórios
  if (!data.name || data.name.trim().length === 0) {
    throw new Error('Nome do personagem é obrigatório');
  }

  if (data.priceCash === undefined || data.priceCash === null) {
    throw new Error('Preço em dinheiro é obrigatório');
  }

  if (data.priceCredits === undefined || data.priceCredits === null) {
    throw new Error('Preço em créditos é obrigatório');
  }

  // Validação de valores positivos
  if (data.priceCash <= 0) {
    throw new Error('Preço em dinheiro deve ser positivo');
  }

  if (data.priceCredits <= 0) {
    throw new Error('Preço em créditos deve ser positivo');
  }

  // Cria personagem no banco de dados
  const character = await prisma.character.create({
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      priceCash: data.priceCash,
      priceCredits: data.priceCredits,
      isExclusiveSemestral: data.isExclusiveSemestral ?? false,
      isStandardCollection: data.isStandardCollection ?? false,
      isActive: true, // Novos personagens são criados ativos por padrão
      imageUrl: data.imageUrl?.trim() || null
    }
  });

  return mapCharacterToResult(character);
}

/**
 * Atualiza um personagem existente
 *
 * Validações:
 * - Personagem deve existir
 * - Se preços forem fornecidos, devem ser positivos
 * - Nome não pode ser vazio se fornecido
 *
 * @param id - ID do personagem a ser atualizado
 * @param data - Dados a serem atualizados
 * @returns Personagem atualizado
 * @throws Error se personagem não existir ou validação falhar
 */
export async function updateCharacter(
  id: number,
  data: UpdateCharacterData
): Promise<CharacterResult> {
  // Verifica se personagem existe
  const existing = await prisma.character.findUnique({
    where: { id: BigInt(id) }
  });

  if (!existing) {
    throw new Error(`Personagem com ID ${id} não encontrado`);
  }

  // Validação de nome se fornecido
  if (data.name !== undefined && data.name.trim().length === 0) {
    throw new Error('Nome do personagem não pode ser vazio');
  }

  // Validação de preço em dinheiro se fornecido
  if (data.priceCash !== undefined && data.priceCash <= 0) {
    throw new Error('Preço em dinheiro deve ser positivo');
  }

  // Validação de preço em créditos se fornecido
  if (data.priceCredits !== undefined && data.priceCredits <= 0) {
    throw new Error('Preço em créditos deve ser positivo');
  }

  // Prepara dados para atualização (apenas campos fornecidos)
  const updateData: any = {};

  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }

  if (data.description !== undefined) {
    updateData.description = data.description?.trim() || null;
  }

  if (data.priceCash !== undefined) {
    updateData.priceCash = data.priceCash;
  }

  if (data.priceCredits !== undefined) {
    updateData.priceCredits = data.priceCredits;
  }

  if (data.isExclusiveSemestral !== undefined) {
    updateData.isExclusiveSemestral = data.isExclusiveSemestral;
  }

  if (data.isStandardCollection !== undefined) {
    updateData.isStandardCollection = data.isStandardCollection;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  if (data.imageUrl !== undefined) {
    updateData.imageUrl = data.imageUrl?.trim() || null;
  }

  // Atualiza personagem no banco de dados
  const character = await prisma.character.update({
    where: { id: BigInt(id) },
    data: updateData
  });

  return mapCharacterToResult(character);
}

/**
 * Desativa um personagem (soft delete)
 *
 * Define isActive = false ao invés de deletar o registro do banco.
 * Isso preserva o histórico de pedidos e transações vinculadas ao personagem.
 *
 * @param id - ID do personagem a ser desativado
 * @returns Personagem desativado
 * @throws Error se personagem não existir
 */
export async function deactivateCharacter(id: number): Promise<CharacterResult> {
  // Verifica se personagem existe
  const existing = await prisma.character.findUnique({
    where: { id: BigInt(id) }
  });

  if (!existing) {
    throw new Error(`Personagem com ID ${id} não encontrado`);
  }

  // Desativa personagem (soft delete)
  const character = await prisma.character.update({
    where: { id: BigInt(id) },
    data: { isActive: false }
  });

  return mapCharacterToResult(character);
}
