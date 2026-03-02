/**
 * Integration Tests for Production Cycle Closing Job
 * 
 * Testes de integração para o job de fechamento automático de ciclos.
 * Valida que o job:
 * - Identifica ciclos elegíveis para fechamento
 * - Processa fechamento de ciclos corretamente
 * - Trata erros adequadamente
 * 
 * Nota: Estes são testes de integração que usam o banco de dados real.
 */

import { getPrismaClient } from '../config/database';
import { runCycleClosingJob } from './close-production-cycles.job';
import { createProductionCycle } from '../services/production-cycle.service';

const prisma = getPrismaClient();

describe('Production Cycle Closing Job - Integration', () => {
  beforeEach(async () => {
    // Limpa dados de teste
    await prisma.creditTransaction.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.productionCycle.deleteMany({});
    await prisma.userCredit.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve fechar ciclos com close_date no passado', async () => {
    // Arrange: Cria um ciclo que já deveria estar fechado
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // 1 dia atrás

    const cycle = await createProductionCycle(
      'Ciclo Teste - Passado',
      100,
      pastDate
    );

    // Verifica que o ciclo está aberto
    expect(cycle.status).toBe('open');

    // Act: Executa o job
    await runCycleClosingJob();

    // Assert: Verifica que o ciclo foi fechado
    const closedCycle = await prisma.productionCycle.findUnique({
      where: { id: BigInt(cycle.id) }
    });

    expect(closedCycle).not.toBeNull();
    expect(closedCycle?.status).toBe('closed');
    expect(closedCycle?.closedAt).not.toBeNull();
  });

  it('não deve fechar ciclos com close_date no futuro', async () => {
    // Arrange: Cria um ciclo que ainda não deve ser fechado
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 dias no futuro

    const cycle = await createProductionCycle(
      'Ciclo Teste - Futuro',
      100,
      futureDate
    );

    // Verifica que o ciclo está aberto
    expect(cycle.status).toBe('open');

    // Act: Executa o job
    await runCycleClosingJob();

    // Assert: Verifica que o ciclo ainda está aberto
    const openCycle = await prisma.productionCycle.findUnique({
      where: { id: BigInt(cycle.id) }
    });

    expect(openCycle).not.toBeNull();
    expect(openCycle?.status).toBe('open');
    expect(openCycle?.closedAt).toBeNull();
  });

  it('deve processar múltiplos ciclos elegíveis', async () => {
    // Arrange: Cria múltiplos ciclos no passado
    const pastDate1 = new Date();
    pastDate1.setDate(pastDate1.getDate() - 2);

    const pastDate2 = new Date();
    pastDate2.setDate(pastDate2.getDate() - 1);

    const cycle1 = await createProductionCycle(
      'Ciclo Teste 1',
      100,
      pastDate1
    );

    const cycle2 = await createProductionCycle(
      'Ciclo Teste 2',
      100,
      pastDate2
    );

    // Act: Executa o job
    await runCycleClosingJob();

    // Assert: Verifica que ambos os ciclos foram fechados
    const closedCycle1 = await prisma.productionCycle.findUnique({
      where: { id: BigInt(cycle1.id) }
    });

    const closedCycle2 = await prisma.productionCycle.findUnique({
      where: { id: BigInt(cycle2.id) }
    });

    expect(closedCycle1?.status).toBe('closed');
    expect(closedCycle2?.status).toBe('closed');
  });

  it('não deve processar ciclos já fechados', async () => {
    // Arrange: Cria um ciclo no passado
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const cycle = await createProductionCycle(
      'Ciclo Teste - Já Fechado',
      100,
      pastDate
    );

    // Fecha o ciclo manualmente
    await prisma.productionCycle.update({
      where: { id: BigInt(cycle.id) },
      data: {
        status: 'closed',
        closedAt: new Date()
      }
    });

    const closedAtBefore = (await prisma.productionCycle.findUnique({
      where: { id: BigInt(cycle.id) }
    }))?.closedAt;

    // Act: Executa o job
    await runCycleClosingJob();

    // Assert: Verifica que o closedAt não mudou
    const closedAtAfter = (await prisma.productionCycle.findUnique({
      where: { id: BigInt(cycle.id) }
    }))?.closedAt;

    expect(closedAtAfter).toEqual(closedAtBefore);
  });
});

