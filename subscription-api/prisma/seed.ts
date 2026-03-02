import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar planos de assinatura
  console.log('📦 Criando planos de assinatura...');
  
  const trimestralPlan = await prisma.subscriptionPlan.upsert({
    where: { planType: 'trimestral' },
    update: {},
    create: {
      planType: 'trimestral',
      name: 'Plano Trimestral',
      durationMonths: 3,
      price: 99.90,
      baseCredits: 600,
      bonusCredits: 0,
      isActive: true,
    },
  });

  const semestralPlan = await prisma.subscriptionPlan.upsert({
    where: { planType: 'semestral' },
    update: {},
    create: {
      planType: 'semestral',
      name: 'Plano Semestral',
      durationMonths: 6,
      price: 189.90,
      baseCredits: 1200,
      bonusCredits: 200,
      isActive: true,
    },
  });

  console.log('✅ Planos de assinatura criados:');
  console.log('  - Plano Trimestral:', trimestralPlan.name);
  console.log('  - Plano Semestral:', semestralPlan.name);

  // Criar personagens de exemplo para coleção padrão
  console.log('\n🎭 Criando personagens de exemplo...');

  const characters = [
    {
      name: 'Personagem Padrão 1',
      description: 'Primeiro personagem da coleção padrão',
      priceCash: 29.90,
      priceCredits: 150,
      isExclusiveSemestral: false,
      isActive: true,
      isStandardCollection: true,
    },
    {
      name: 'Personagem Padrão 2',
      description: 'Segundo personagem da coleção padrão',
      priceCash: 29.90,
      priceCredits: 150,
      isExclusiveSemestral: false,
      isActive: true,
      isStandardCollection: true,
    },
    {
      name: 'Personagem Padrão 3',
      description: 'Terceiro personagem da coleção padrão',
      priceCash: 29.90,
      priceCredits: 150,
      isExclusiveSemestral: false,
      isActive: true,
      isStandardCollection: true,
    },
    {
      name: 'Personagem Regular',
      description: 'Personagem disponível para compra individual',
      priceCash: 39.90,
      priceCredits: 200,
      isExclusiveSemestral: false,
      isActive: true,
      isStandardCollection: false,
    },
    {
      name: 'Personagem Exclusivo Semestral',
      description: 'Personagem exclusivo para assinantes do plano semestral',
      priceCash: 49.90,
      priceCredits: 250,
      isExclusiveSemestral: true,
      isActive: true,
      isStandardCollection: false,
    },
  ];

  for (const char of characters) {
    await prisma.character.upsert({
      where: { name: char.name },
      update: {},
      create: char,
    });
  }

  console.log('✅ Personagens criados:', characters.length);

  // Criar ciclo de produção inicial
  console.log('\n🔄 Criando ciclo de produção inicial...');

  const now = new Date();
  const closeDate = new Date(now);
  closeDate.setDate(closeDate.getDate() + 30); // Fecha em 30 dias

  const productionCycle = await prisma.productionCycle.create({
    data: {
      name: `Ciclo ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      capacityLimit: 10000,
      currentCount: 0,
      status: 'open',
      closeDate: closeDate,
    },
  });

  console.log('✅ Ciclo de produção criado:', productionCycle.name);
  console.log('   - Capacidade:', productionCycle.capacityLimit);
  console.log('   - Data de fechamento:', productionCycle.closeDate.toISOString());

  // Criar limites de personagens por ciclo
  console.log('\n📊 Criando limites de personagens por ciclo...');

  await prisma.cycleLimit.create({
    data: {
      productionCycleId: productionCycle.id,
      planType: 'global',
      characterLimit: 10,
    },
  });

  await prisma.cycleLimit.create({
    data: {
      productionCycleId: productionCycle.id,
      planType: 'semestral',
      characterLimit: 15,
    },
  });

  console.log('✅ Limites de personagens configurados');
  console.log('   - Limite global: 10 personagens');
  console.log('   - Limite semestral: 15 personagens');

  console.log('\n✨ Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
