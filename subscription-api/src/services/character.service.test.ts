/**
 * Character Service Unit Tests
 * 
 * Testa funcionalidades do serviço de gerenciamento de personagens:
 * - Filtragem por tipo de plano (trimestral vs semestral)
 * - Validação de acesso a personagens exclusivos
 * - Retorno apenas de personagens ativos
 * - Busca de coleção padrão
 * - Paginação básica
 */

import { getPrismaClient } from '../config/database';
import {
  getCharacters,
  getCharacterById,
  getStandardCollection,
  createCharacter,
  updateCharacter,
  deactivateCharacter
} from './character.service';

const prisma = getPrismaClient();

describe('Character Service', () => {
  beforeEach(async () => {
    // Limpa dados de teste
    await prisma.character.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getCharacters', () => {
    it('deve retornar apenas personagens não exclusivos para plano trimestral', async () => {
      // Arrange: cria personagens de teste
      await prisma.character.createMany({
        data: [
          {
            name: 'Personagem Normal 1',
            priceCash: 50.00,
            priceCredits: 100,
            isExclusiveSemestral: false,
            isActive: true
          },
          {
            name: 'Personagem Exclusivo',
            priceCash: 75.00,
            priceCredits: 150,
            isExclusiveSemestral: true,
            isActive: true
          },
          {
            name: 'Personagem Normal 2',
            priceCash: 60.00,
            priceCredits: 120,
            isExclusiveSemestral: false,
            isActive: true
          }
        ]
      });

      // Act: busca personagens com plano trimestral
      const result = await getCharacters({}, 'trimestral');

      // Assert: deve retornar apenas os 2 personagens não exclusivos
      expect(result.characters).toHaveLength(2);
      expect(result.characters.every(c => !c.isExclusiveSemestral)).toBe(true);
      expect(result.pagination.total).toBe(2);
    });

    it('deve retornar todos os personagens para plano semestral', async () => {
      // Arrange: cria personagens de teste
      await prisma.character.createMany({
        data: [
          {
            name: 'Personagem Normal',
            priceCash: 50.00,
            priceCredits: 100,
            isExclusiveSemestral: false,
            isActive: true
          },
          {
            name: 'Personagem Exclusivo 1',
            priceCash: 75.00,
            priceCredits: 150,
            isExclusiveSemestral: true,
            isActive: true
          },
          {
            name: 'Personagem Exclusivo 2',
            priceCash: 80.00,
            priceCredits: 160,
            isExclusiveSemestral: true,
            isActive: true
          }
        ]
      });

      // Act: busca personagens com plano semestral
      const result = await getCharacters({}, 'semestral');

      // Assert: deve retornar todos os 3 personagens
      expect(result.characters).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
    });

    it('deve retornar apenas personagens ativos', async () => {
      // Arrange: cria personagens ativos e inativos
      await prisma.character.createMany({
        data: [
          {
            name: 'Personagem Ativo',
            priceCash: 50.00,
            priceCredits: 100,
            isActive: true
          },
          {
            name: 'Personagem Inativo',
            priceCash: 60.00,
            priceCredits: 120,
            isActive: false
          }
        ]
      });

      // Act: busca personagens
      const result = await getCharacters({});

      // Assert: deve retornar apenas o personagem ativo
      expect(result.characters).toHaveLength(1);
      expect(result.characters[0]!.name).toBe('Personagem Ativo');
      expect(result.characters[0]!.isActive).toBe(true);
    });

    it('deve implementar paginação corretamente', async () => {
      // Arrange: cria 5 personagens
      const characters = Array.from({ length: 5 }, (_, i) => ({
        name: `Personagem ${i + 1}`,
        priceCash: 50.00,
        priceCredits: 100,
        isActive: true
      }));
      await prisma.character.createMany({ data: characters });

      // Act: busca primeira página com limite de 2
      const page1 = await getCharacters({ page: 1, limit: 2 });

      // Assert: primeira página
      expect(page1.characters).toHaveLength(2);
      expect(page1.pagination.currentPage).toBe(1);
      expect(page1.pagination.perPage).toBe(2);
      expect(page1.pagination.total).toBe(5);
      expect(page1.pagination.totalPages).toBe(3);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);

      // Act: busca segunda página
      const page2 = await getCharacters({ page: 2, limit: 2 });

      // Assert: segunda página
      expect(page2.characters).toHaveLength(2);
      expect(page2.pagination.currentPage).toBe(2);
      expect(page2.pagination.hasNext).toBe(true);
      expect(page2.pagination.hasPrev).toBe(true);

      // Act: busca terceira página
      const page3 = await getCharacters({ page: 3, limit: 2 });

      // Assert: terceira página (última)
      expect(page3.characters).toHaveLength(1);
      expect(page3.pagination.currentPage).toBe(3);
      expect(page3.pagination.hasNext).toBe(false);
      expect(page3.pagination.hasPrev).toBe(true);
    });

    it('deve filtrar por coleção padrão quando especificado', async () => {
      // Arrange: cria personagens com e sem flag de coleção padrão
      await prisma.character.createMany({
        data: [
          {
            name: 'Personagem Padrão 1',
            priceCash: 50.00,
            priceCredits: 100,
            isStandardCollection: true,
            isActive: true
          },
          {
            name: 'Personagem Normal',
            priceCash: 60.00,
            priceCredits: 120,
            isStandardCollection: false,
            isActive: true
          },
          {
            name: 'Personagem Padrão 2',
            priceCash: 55.00,
            priceCredits: 110,
            isStandardCollection: true,
            isActive: true
          }
        ]
      });

      // Act: busca apenas personagens da coleção padrão
      const result = await getCharacters({ isStandardCollection: true });

      // Assert: deve retornar apenas os 2 personagens da coleção padrão
      expect(result.characters).toHaveLength(2);
      expect(result.characters.every(c => c.isStandardCollection)).toBe(true);
    });
  });

  describe('getCharacterById', () => {
    it('deve retornar personagem por ID quando ativo', async () => {
      // Arrange: cria personagem
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Teste',
          priceCash: 50.00,
          priceCredits: 100,
          isActive: true
        }
      });

      // Act: busca personagem por ID
      const result = await getCharacterById(Number(created.id));

      // Assert: deve retornar o personagem
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Personagem Teste');
      expect(result?.priceCredits).toBe(100);
    });

    it('deve retornar null para personagem inativo', async () => {
      // Arrange: cria personagem inativo
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Inativo',
          priceCash: 50.00,
          priceCredits: 100,
          isActive: false
        }
      });

      // Act: busca personagem por ID
      const result = await getCharacterById(Number(created.id));

      // Assert: deve retornar null
      expect(result).toBeNull();
    });

    it('deve retornar null para personagem exclusivo quando plano é trimestral', async () => {
      // Arrange: cria personagem exclusivo
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Exclusivo',
          priceCash: 75.00,
          priceCredits: 150,
          isExclusiveSemestral: true,
          isActive: true
        }
      });

      // Act: busca personagem com plano trimestral
      const result = await getCharacterById(Number(created.id), 'trimestral');

      // Assert: deve retornar null (sem acesso)
      expect(result).toBeNull();
    });

    it('deve retornar personagem exclusivo quando plano é semestral', async () => {
      // Arrange: cria personagem exclusivo
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Exclusivo',
          priceCash: 75.00,
          priceCredits: 150,
          isExclusiveSemestral: true,
          isActive: true
        }
      });

      // Act: busca personagem com plano semestral
      const result = await getCharacterById(Number(created.id), 'semestral');

      // Assert: deve retornar o personagem
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Personagem Exclusivo');
      expect(result?.isExclusiveSemestral).toBe(true);
    });

    it('deve retornar null para ID inexistente', async () => {
      // Act: busca personagem com ID inexistente
      const result = await getCharacterById(99999);

      // Assert: deve retornar null
      expect(result).toBeNull();
    });
  });

  describe('getStandardCollection', () => {
    it('deve retornar apenas personagens da coleção padrão ativos', async () => {
      // Arrange: cria personagens variados
      await prisma.character.createMany({
        data: [
          {
            name: 'Padrão Ativo 1',
            priceCash: 50.00,
            priceCredits: 100,
            isStandardCollection: true,
            isActive: true
          },
          {
            name: 'Padrão Inativo',
            priceCash: 55.00,
            priceCredits: 110,
            isStandardCollection: true,
            isActive: false
          },
          {
            name: 'Normal Ativo',
            priceCash: 60.00,
            priceCredits: 120,
            isStandardCollection: false,
            isActive: true
          },
          {
            name: 'Padrão Ativo 2',
            priceCash: 65.00,
            priceCredits: 130,
            isStandardCollection: true,
            isActive: true
          }
        ]
      });

      // Act: busca coleção padrão
      const result = await getStandardCollection();

      // Assert: deve retornar apenas os 2 personagens da coleção padrão ativos
      expect(result).toHaveLength(2);
      expect(result.every(c => c.isStandardCollection && c.isActive)).toBe(true);
      
      // Verifica ordenação por nome
      expect(result[0]!.name).toBe('Padrão Ativo 1');
      expect(result[1]!.name).toBe('Padrão Ativo 2');
    });

    it('deve retornar array vazio quando não há personagens na coleção padrão', async () => {
      // Arrange: cria apenas personagens normais
      await prisma.character.create({
        data: {
          name: 'Personagem Normal',
          priceCash: 50.00,
          priceCredits: 100,
          isStandardCollection: false,
          isActive: true
        }
      });

      // Act: busca coleção padrão
      const result = await getStandardCollection();

      // Assert: deve retornar array vazio
      expect(result).toHaveLength(0);
    });

    it('deve incluir personagens exclusivos na coleção padrão', async () => {
      // Arrange: cria personagem exclusivo que faz parte da coleção padrão
      await prisma.character.create({
        data: {
          name: 'Exclusivo Padrão',
          priceCash: 75.00,
          priceCredits: 150,
          isExclusiveSemestral: true,
          isStandardCollection: true,
          isActive: true
        }
      });

      // Act: busca coleção padrão
      const result = await getStandardCollection();

      // Assert: deve incluir o personagem exclusivo
      expect(result).toHaveLength(1);
      expect(result[0]!.isExclusiveSemestral).toBe(true);
      expect(result[0]!.isStandardCollection).toBe(true);
    });
  });

  describe('createCharacter', () => {
    it('deve criar personagem com dados válidos', async () => {
      // Arrange: dados válidos
      const data = {
        name: 'Novo Personagem',
        description: 'Descrição do personagem',
        priceCash: 50.00,
        priceCredits: 100,
        isExclusiveSemestral: false,
        isStandardCollection: true,
        imageUrl: 'https://example.com/image.jpg'
      };

      // Act: cria personagem
      const result = await createCharacter(data);

      // Assert: personagem foi criado corretamente
      expect(result).not.toBeNull();
      expect(result.name).toBe('Novo Personagem');
      expect(result.description).toBe('Descrição do personagem');
      expect(result.priceCash).toBe(50.00);
      expect(result.priceCredits).toBe(100);
      expect(result.isExclusiveSemestral).toBe(false);
      expect(result.isStandardCollection).toBe(true);
      expect(result.isActive).toBe(true); // Deve ser ativo por padrão
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('deve criar personagem com valores padrão quando opcionais não fornecidos', async () => {
      // Arrange: apenas campos obrigatórios
      const data = {
        name: 'Personagem Simples',
        priceCash: 60.00,
        priceCredits: 120
      };

      // Act: cria personagem
      const result = await createCharacter(data);

      // Assert: valores padrão aplicados
      expect(result.name).toBe('Personagem Simples');
      expect(result.isExclusiveSemestral).toBe(false);
      expect(result.isStandardCollection).toBe(false);
      expect(result.isActive).toBe(true);
      expect(result.description).toBeNull();
      expect(result.imageUrl).toBeNull();
    });

    it('deve rejeitar criação sem nome', async () => {
      // Arrange: dados sem nome
      const data = {
        name: '',
        priceCash: 50.00,
        priceCredits: 100
      };

      // Act & Assert: deve lançar erro
      await expect(createCharacter(data)).rejects.toThrow('Nome do personagem é obrigatório');
    });

    it('deve rejeitar criação sem preço em dinheiro', async () => {
      // Arrange: dados sem priceCash
      const data = {
        name: 'Personagem',
        priceCash: undefined as any,
        priceCredits: 100
      };

      // Act & Assert: deve lançar erro
      await expect(createCharacter(data)).rejects.toThrow('Preço em dinheiro é obrigatório');
    });

    it('deve rejeitar criação sem preço em créditos', async () => {
      // Arrange: dados sem priceCredits
      const data = {
        name: 'Personagem',
        priceCash: 50.00,
        priceCredits: undefined as any
      };

      // Act & Assert: deve lançar erro
      await expect(createCharacter(data)).rejects.toThrow('Preço em créditos é obrigatório');
    });

    it('deve rejeitar criação com preço em dinheiro negativo', async () => {
      // Arrange: priceCash negativo
      const data = {
        name: 'Personagem',
        priceCash: -10.00,
        priceCredits: 100
      };

      // Act & Assert: deve lançar erro
      await expect(createCharacter(data)).rejects.toThrow('Preço em dinheiro deve ser positivo');
    });

    it('deve rejeitar criação com preço em dinheiro zero', async () => {
      // Arrange: priceCash zero
      const data = {
        name: 'Personagem',
        priceCash: 0,
        priceCredits: 100
      };

      // Act & Assert: deve lançar erro
      await expect(createCharacter(data)).rejects.toThrow('Preço em dinheiro deve ser positivo');
    });

    it('deve rejeitar criação com preço em créditos negativo', async () => {
      // Arrange: priceCredits negativo
      const data = {
        name: 'Personagem',
        priceCash: 50.00,
        priceCredits: -50
      };

      // Act & Assert: deve lançar erro
      await expect(createCharacter(data)).rejects.toThrow('Preço em créditos deve ser positivo');
    });

    it('deve rejeitar criação com preço em créditos zero', async () => {
      // Arrange: priceCredits zero
      const data = {
        name: 'Personagem',
        priceCash: 50.00,
        priceCredits: 0
      };

      // Act & Assert: deve lançar erro
      await expect(createCharacter(data)).rejects.toThrow('Preço em créditos deve ser positivo');
    });

    it('deve remover espaços em branco do nome', async () => {
      // Arrange: nome com espaços
      const data = {
        name: '  Personagem com Espaços  ',
        priceCash: 50.00,
        priceCredits: 100
      };

      // Act: cria personagem
      const result = await createCharacter(data);

      // Assert: espaços removidos
      expect(result.name).toBe('Personagem com Espaços');
    });
  });

  describe('updateCharacter', () => {
    it('deve atualizar personagem existente', async () => {
      // Arrange: cria personagem
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Original',
          priceCash: 50.00,
          priceCredits: 100,
          isActive: true
        }
      });

      // Act: atualiza personagem
      const result = await updateCharacter(Number(created.id), {
        name: 'Personagem Atualizado',
        priceCash: 60.00,
        priceCredits: 120,
        description: 'Nova descrição'
      });

      // Assert: personagem foi atualizado
      expect(result.name).toBe('Personagem Atualizado');
      expect(result.priceCash).toBe(60.00);
      expect(result.priceCredits).toBe(120);
      expect(result.description).toBe('Nova descrição');
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      // Arrange: cria personagem
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Original',
          description: 'Descrição original',
          priceCash: 50.00,
          priceCredits: 100,
          isActive: true
        }
      });

      // Act: atualiza apenas o nome
      const result = await updateCharacter(Number(created.id), {
        name: 'Novo Nome'
      });

      // Assert: apenas nome foi atualizado
      expect(result.name).toBe('Novo Nome');
      expect(result.description).toBe('Descrição original');
      expect(result.priceCash).toBe(50.00);
      expect(result.priceCredits).toBe(100);
    });

    it('deve permitir desativar personagem via update', async () => {
      // Arrange: cria personagem ativo
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Ativo',
          priceCash: 50.00,
          priceCredits: 100,
          isActive: true
        }
      });

      // Act: desativa via update
      const result = await updateCharacter(Number(created.id), {
        isActive: false
      });

      // Assert: personagem foi desativado
      expect(result.isActive).toBe(false);
    });

    it('deve rejeitar atualização de personagem inexistente', async () => {
      // Act & Assert: deve lançar erro
      await expect(
        updateCharacter(99999, { name: 'Novo Nome' })
      ).rejects.toThrow('Personagem com ID 99999 não encontrado');
    });

    it('deve rejeitar atualização com nome vazio', async () => {
      // Arrange: cria personagem
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Original',
          priceCash: 50.00,
          priceCredits: 100,
          isActive: true
        }
      });

      // Act & Assert: deve lançar erro
      await expect(
        updateCharacter(Number(created.id), { name: '' })
      ).rejects.toThrow('Nome do personagem não pode ser vazio');
    });

    it('deve rejeitar atualização com preço em dinheiro negativo', async () => {
      // Arrange: cria personagem
      const created = await prisma.character.create({
        data: {
          name: 'Personagem',
          priceCash: 50.00,
          priceCredits: 100,
          isActive: true
        }
      });

      // Act & Assert: deve lançar erro
      await expect(
        updateCharacter(Number(created.id), { priceCash: -10.00 })
      ).rejects.toThrow('Preço em dinheiro deve ser positivo');
    });

    it('deve rejeitar atualização com preço em créditos negativo', async () => {
      // Arrange: cria personagem
      const created = await prisma.character.create({
        data: {
          name: 'Personagem',
          priceCash: 50.00,
          priceCredits: 100,
          isActive: true
        }
      });

      // Act & Assert: deve lançar erro
      await expect(
        updateCharacter(Number(created.id), { priceCredits: -50 })
      ).rejects.toThrow('Preço em créditos deve ser positivo');
    });

    it('deve atualizar flags de exclusividade e coleção padrão', async () => {
      // Arrange: cria personagem normal
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Normal',
          priceCash: 50.00,
          priceCredits: 100,
          isExclusiveSemestral: false,
          isStandardCollection: false,
          isActive: true
        }
      });

      // Act: torna exclusivo e parte da coleção padrão
      const result = await updateCharacter(Number(created.id), {
        isExclusiveSemestral: true,
        isStandardCollection: true
      });

      // Assert: flags foram atualizadas
      expect(result.isExclusiveSemestral).toBe(true);
      expect(result.isStandardCollection).toBe(true);
    });
  });

  describe('deactivateCharacter', () => {
    it('deve desativar personagem existente', async () => {
      // Arrange: cria personagem ativo
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Ativo',
          priceCash: 50.00,
          priceCredits: 100,
          isActive: true
        }
      });

      // Act: desativa personagem
      const result = await deactivateCharacter(Number(created.id));

      // Assert: personagem foi desativado
      expect(result.isActive).toBe(false);
      expect(result.name).toBe('Personagem Ativo'); // Outros dados preservados
    });

    it('deve rejeitar desativação de personagem inexistente', async () => {
      // Act & Assert: deve lançar erro
      await expect(
        deactivateCharacter(99999)
      ).rejects.toThrow('Personagem com ID 99999 não encontrado');
    });

    it('deve permitir desativar personagem já inativo', async () => {
      // Arrange: cria personagem já inativo
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Inativo',
          priceCash: 50.00,
          priceCredits: 100,
          isActive: false
        }
      });

      // Act: desativa novamente
      const result = await deactivateCharacter(Number(created.id));

      // Assert: permanece inativo
      expect(result.isActive).toBe(false);
    });

    it('deve preservar todos os dados do personagem ao desativar', async () => {
      // Arrange: cria personagem com todos os dados
      const created = await prisma.character.create({
        data: {
          name: 'Personagem Completo',
          description: 'Descrição detalhada',
          priceCash: 75.00,
          priceCredits: 150,
          isExclusiveSemestral: true,
          isStandardCollection: true,
          imageUrl: 'https://example.com/image.jpg',
          isActive: true
        }
      });

      // Act: desativa personagem
      const result = await deactivateCharacter(Number(created.id));

      // Assert: todos os dados preservados, apenas isActive mudou
      expect(result.isActive).toBe(false);
      expect(result.name).toBe('Personagem Completo');
      expect(result.description).toBe('Descrição detalhada');
      expect(result.priceCash).toBe(75.00);
      expect(result.priceCredits).toBe(150);
      expect(result.isExclusiveSemestral).toBe(true);
      expect(result.isStandardCollection).toBe(true);
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });
  });
});
