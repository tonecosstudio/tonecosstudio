#!/usr/bin/env node

console.log('\n🔍 Testando formatação de datas...\n');

const testDates = ['2026-03', '2026-04', '2026-05'];

console.log('Método ANTIGO (com problema):');
testDates.forEach(deliveryMonth => {
  const date = new Date(deliveryMonth + '-01');
  const formatted = date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  console.log(`  ${deliveryMonth} → ${formatted}`);
});

console.log('\nMétodo NOVO (corrigido):');
testDates.forEach(deliveryMonth => {
  const [year, month] = deliveryMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const formatted = date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  console.log(`  ${deliveryMonth} → ${formatted}`);
});

console.log('\n✅ Teste concluído!\n');
