# TONART — Estratégia de coleções, planos e Coins

Data: 15/11/2026. Owner: tonecosstudio/tonecosstudio.

## Status e finalidade

Documento solicitado pelo proprietário para orientar o Codex. Consolida a direção comercial final desta discussão, substituindo as alternativas exploratórias descritas abaixo. É uma especificação para implementação e validação, não prova de funcionalidade nem autorização para publicar checkout, cobrar clientes, alterar o Supabase produtivo ou liberar indexação.

Preços de trabalho: avulso 1/10 R$250 e anual R$200 por peça, definidos pelo proprietário; trimestral R$235, semestral R$225, bônus e desconto de extras são propostas consolidadas para implementação configurável. Margens, taxas, capacidade e termos precisam ser validados antes de ativar ofertas reais. Não inventar custos, personagens, licenças, estoque, acabamento, dados legais ou integrações.

## 1. Decisão comercial

O produto principal é um plano de coleção física com quantidade e entregas definidas. O pagamento compra essas peças; NÃO se converte integralmente em Coins livres. Coins são bônus e eventual recarga para compras extras elegíveis.

Ficam superadas as propostas exploratórias de assinatura universal de créditos, de creditar o principal da assinatura e também entregar peças, dos pacotes históricos com Coins vendidos abaixo da nova referência e do abatimento universal em qualquer orçamento.

Coleções organizam ofertas; catálogo apresenta modelos; oferta vendável define modelo/variante, escala, acabamento, conteúdo, preço e prazo. Não confundir render de catálogo com evidência de fabricação ou entrega.

## 2. Matriz comercial de referência

| Modalidade Terror 1/10 | Peças | Preço unitário | Total-base | Bônus total à vista | Disponibilidade planejada |
| --- | ---: | ---: | ---: | ---: | --- |
| Avulso | 1 | R$250 | R$250 | 0 | Primeira liberação comercial |
| Trimestral | 3 | R$235 | R$705 | 15 Coins | Primeira liberação comercial |
| Semestral | 6 | R$225 | R$1.350 | 30 Coins | Primeira liberação comercial |
| Anual | 12 | R$200 | R$2.400 | 120 Coins | Implementar, manter desativado até validar capacidade |

- Frete separado, informado antes da contratação. Não prometer frete grátis.
- Escala 1/6: oferta futura, sem preço definido; não herdar automaticamente valores 1/10.
- Os cerca de R$400 mencionados pelo proprietário são referência de valor usual, não preço anterior comprovado nem autorização para selo “de/por”.
- Não criar plano bimestral inicialmente. Duração, quantidade, frequência de entrega e parcelamento são dimensões distintas.
- Preços/configuração comercial têm autoridade única; não espalhar constantes divergentes pela interface.

## 3. Pagamento do plano

Oferecer compra integral à vista (PIX) ou compra integral parcelada no cartão, se houver integração realmente suportada. Não implementar cobrança mensal recorrente nesta primeira versão.

Parcelamento é forma de pagar uma compra total; não cria novas peças a cada parcela nem concede novamente benefícios. Total e eventuais encargos devem estar explícitos. Não prometer parcelamento sem juros ou recebimento imediato pela TONART sem taxas e liquidação verificadas.

Bônus da matriz é incentivo à vista. Parcelado começa sem esse bônus; qualquer mudança deve ser configurada e validada na margem. Comprovante enviado não significa pagamento confirmado. Não simular integração de cartão se o fluxo disponível for apenas PIX manual.

## 4. Curadoria, escolha e entregas

Coleção Terror: proposta de 20 personagens elegíveis, escolhidos pela administração a partir de identidades reais do catálogo canônico. Não inventar nem semear 20 modelos fictícios. Cliente seleciona exatamente 3, 6 ou 12 personagens distintos, conforme plano, e sua ordem de envio.

Persistir a versão das condições e a seleção contratada. Mudanças futuras na curadoria não podem apagar direitos adquiridos. Referenciar IDs/slugs existentes; não duplicar catálogo D1/R2.

Envios mensais começam a partir do segundo mês após contratação confirmada:
- 3 peças: meses 2 a 4;
- 6 peças: meses 2 a 7;
- 12 peças: meses 2 a 13.

Mostrar datas concretas e distinguir postagem de chegada. Não confundir plano de seis peças com todas entregues em seis meses desde a compra.

Proposta operacional de corte: troca até 30 dias antes da postagem prevista, dentro da seleção elegível do contrato. Essa antecedência deve ser configurável e validada contra o tempo real de produção. A primeira escolha é confirmada na contratação; não prometer troca incompatível com seu prazo de fabricação.

Troca e início de produção devem ser validados no servidor, com proteção contra corrida. Depois do corte/início autorizado da produção, impedir troca daquela peça; futuras seleções continuam editáveis. Reagendamento administrativo não reabre automaticamente uma peça já produzida. Nunca substituir personagem sem concordância do cliente.

Não prometer troca de peças contratadas entre coleções nesta versão. A liberdade entre coleções aplica-se à carteira de Coins para compras extras; troca do contrato entre coleções exigiria regra própria.

### 4.1. Curadoria editorial privada — separação do comércio (PR #28)

A organização interna de candidatos **não é a coleção comercial vendável** descrita nas seções de preços deste documento. A [PR #28](https://github.com/tonecosstudio/tonecosstudio/pull/28), ainda em *draft*, implementa no painel administrativo coleções editoriais privadas (incluindo modelos de Terror, Digimon e Inimigos da Vizinhança, **sem seleção automática de personagens**), criação de grupos personalizados, busca paginada, comparação de variantes e classificação controlada. Associar um modelo à coleção interna, aprová-lo ou marcá-lo como `selected_for_offer` **não cria oferta, não libera checkout e não autoriza publicação**. A seleção comercial final, preços, descontos, Coins e contratos pertencem à implementação comercial separada, em evolução na [PR #27](https://github.com/tonecosstudio/tonecosstudio/pull/27).

Autoridades sem duplicação:
- **Catálogo, identidade técnica do modelo, slug e mídia:** Worker Cloudflare canônico, D1/R2; o painel consulta as referências reais e reconfirma ID + slug antes de aprovar, verificar identidade ou incluir candidatos. A validação de até 50 candidatos usa chamadas ao carregador canônico em lotes de até 20, respeitando o contrato existente de assinaturas.
- **Curadoria editorial:** `src/services/admin/catalog/admin-internal-collection-curation-service.ts`, `src/components/admin/collections/InternalCollectionCuration.tsx` e `src/pages/admin/collections/AdminCollectionsHub.tsx`. Estados de candidato: `suggested`, `approved`, `selected_for_offer`, `discarded`. Tags com dimensões independentes `theme_genre`, `characteristic` e `narrative_role`, com revisão `suggested`, `approved` ou `discarded`; nenhum rótulo livre substitui as dimensões. Identidade de personagem/franquia requer confirmação humana e evidência; variantes permanecem modelos canônicos separados.
- **Persistência privada TONART:** `supabase/migrations/20261115154500_tonart_internal_collection_curation.sql` e `20261115154600_tonart_curation_controlled_tag_creation.sql`, com `public.tonart_editorial_collections` e tabelas editoriais auxiliares (perfis, identidades, vocabulário, aliases, membros e classificações). Não dependem de `public.collections` comercial legado. Acesso somente pelo `supabase/functions/admin-rpc/index.ts`, após verificação do administrador; RPCs de escrita exigem `service_role`. A tabela editorial não contém preço, plano, produto vendável nem carteira. A existência da migration no Git **não** significa que esteja aplicada ao Supabase produtivo.

**Evidências da PR #28 em 16/11/2026:** 21/21 testes Vitest do serviço aprovados em sandbox isolado; 28/28 verificações de operações e permissões SQL aprovadas em PostgreSQL isolado (PGlite), com ambas as migrations aplicadas; **`npm run typecheck:app` integral aprovado** com o TypeScript do monorepo em build de preview Vercel `dpl_8U4RUAFXN32cjvrG99W7Zn6xwZ58` (commit de prova `ce2a8b18`, status `READY`); 44/44 testes do build aprovados. O comando original de build foi **restaurado** na branch no commit `837067fd`, sem alterar a configuração do projeto Vercel ou deixar workflow provisório.

**Conciliação da única allowlist administrativa (16/11):** a PR #28 passou a incluir também as duas entradas de RPC comercial da PR #27 (`admin_save_tonart_commercial_offer` e `tonart_admin_commercial_offers_directory`), além das onze entradas editoriais, **sem modificar a PR #27**, criar outro gateway ou habilitar venda. Comparação direta entre as branches confirmou todas as entradas e nenhuma duplicada. O backend instalado ainda não oferece `admin-rpc`; manter a implantação coordenada e não divulgar como funcionalidade produtiva.

**Gate operacional ainda não concluído:** consulta **somente de metadados** no Supabase TONART `icmtmaakjucmuzxnofkd` confirmou que a única Edge Function implantada é `tonart-quotes`; **`admin-rpc` não está implantada** e as migrations `20261115154500` / `20261115154600` não constam da lista aplicada. Portanto, o painel editorial ainda **não funciona de ponta a ponta no backend atual**, apesar do Vitest, SQL isolado, TypeScript e preview aprovados. Antes da ativação: preparar deployment coordenado da Edge Function canônica `admin-rpc` (reconciliando a allowlist com a PR #27), aplicar as migrations correspondentes em ambiente autorizado e executar E2E autenticado de admin/RPC/RLS. A criação de branch Supabase isolada exige aprovação específica de custo e não foi autorizada. **Não implantar no Supabase produtivo, não integrar a PR prematuramente nem reimplementar a infraestrutura comercial.**

## 5. Coins e compras extras

Uma carteira por cliente em toda a TONART. Coins podem comprar produtos elegíveis de outras coleções e do catálogo geral; não ficam vinculados à Terror.

Referência comercial proposta: 1 Coin = R$1 de poder de compra em ofertas elegíveis, sem saque/transferência/revenda nesta versão. Recarga, quando implementada, custa R$1 por Coin, sem pacotes históricos depreciados ou bônus de recarga. Permitir completar a compra diretamente em reais sem obrigar recarga intermediária.

Exibir preço em reais e Coins nos produtos elegíveis. Permitir pagamento integral em Coins ou misto. Produtos sem preço fechado ou sem elegibilidade não exibem preço inventado.

Exemplos:
- Terror avulso: R$250 ou 250 Coins.
- Catálogo geral com oferta real de R$400: 400 Coins.
- Frete, parcelas de planos, encomendas sob orçamento e entrada de pré-venda não aceitam Coins automaticamente.

Coins pagos e bônus acumulam sem expiração nesta proposta inicial, inclusive após o plano. Rastrear origem e condições no ledger. Cancelamento de plano não apaga saldo comprado independente nem aquisições anteriores. Estornos precisam reverter corretamente operações vinculadas, inclusive benefícios, sem apagar lançamentos e sem permitir reembolso duplicado. Regras contratuais de cancelamento/reembolso ainda precisam ser formalizadas antes da venda; não inventar multas ou perda automática de direitos.

## 6. Bônus e desconto de assinante

À vista: liberar 5 Coins por peça enviada no trimestral/semestral e 10 Coins por peça enviada no anual, até os totais 15/30/120. Exigir pagamento confirmado e envio real; evento repetido não concede duas vezes. Atraso da TONART não reduz benefício contratado.

Plano ativo: propor 5% de desconto em compras extras elegíveis, igual entre planos, desde confirmação até última entrega programada; atraso da TONART estende a vigência até concluir a entrega. Não renovar indefinidamente por saldo Coins remanescente. Definir término para cancelamento conforme termos antes da ativação.

Preço da peça dentro do pacote NÃO é o preço automático de extras:
- Terror extra: R$250 → R$237,50 / 237,50 Coins.
- Oferta geral R$400 elegível: R$380 / 380 Coins.
- Cliente com 30 Coins compra Terror extra por 30 Coins + R$207,50, além do frete.

Aceitar Coins e conceder desconto são elegibilidades independentes por oferta/variante. Aplicar desconto e uso de Coins juntos, considerando ambos na margem. Não acumular cupons/promoções indiscriminadamente: usar a melhor condição permitida. Compras extras e gasto de Coins não geram novo bônus inicialmente.

Suportar duas casas decimais com cálculo exato (inteiros em centésimos ou decimal exato). Definir arredondamento determinístico por item; dinheiro e Coins têm unidades distintas, ainda que a referência comercial seja 1:1.

## 7. Implementação canônica e migração

Ler AGENTS e o checkpoint atual de URGENTE; reutilizar curadoria, planos, checkout, Minha Conta, administração e ledger existentes. Fonte do catálogo continua no owner atual Cloudflare; identidade/comercial no backend TONART. Nenhum novo catálogo, moeda Credits paralela, carteira, login, serviço ou banco duplicado.

O checkpoint de 14/11 registra seleção de 6/12 dentro de até 20 modelos e assinatura atrás de flag. Ampliar o contrato existente para 3/6/12. Também registra ausência de schema de assinaturas no banco conectado e isolamento do host local em relação ao Supabase remoto. Revalidar somente o necessário: documentação histórica não prova disponibilidade atual.

A função histórica apply_tonecos_coins_to_quote e o crédito do principal de assinatura devem ser reconciliados com esta regra. Não habilitar esses caminhos como substituto da compra de produto elegível. Não editar migrations já aplicadas. Migração incremental deve preservar e reconciliar saldos, pedidos e referências existentes; não presumir base vazia.

Backend deve calcular preço, desconto, elegibilidade, quantidade, saldo e prazo. Débito/reserva e criação de pedido são atômicos; pagamento misto deve ter reserva, confirmação, liberação e estorno consistentes. Não consumir Coins definitivamente e deixar um pedido perdido se a parte em reais falhar. Repetições e respostas ambíguas devem consultar operação existente, não cobrar novamente.

Snapshot do contrato conserva valores e condições. Uma fonte calcula preços usados por ficha, carrinho, checkout e admin; saldo e extrato vêm do ledger, não de contador manual. Não duplicar o valor recebido pela assinatura como saldo disponível.

## 8. Ordem de execução

1. Reconciliar regras e configuração canônicas: matriz de planos, elegibilidade, centésimos, cálculo de preço e substituição da semântica antiga.
2. Atualizar interface existente: plano compra peças; bônus identificado; total/parcelamento/frete; curadoria 3/6/12; preço duplo e extras.
3. Implementar contrato, calendário, troca e bloqueio de produção no backend existente.
4. Integrar concessão idempotente de bônus, carteira única, compra de extras e pagamento misto.
5. Validar fluxos cliente/admin e persistência em ambiente local/isolado autorizado. Backend indisponível não deve aparecer como sucesso ou saldo zero.
6. Integrar trabalho validado no fluxo canônico e registrar pendências reais; manter ativação comercial e anual sob gates.

Não criar auditoria geral, workflows extras ou documentação paralela. Implementar primeiro e validar proporcionalmente. Não publicar produção, habilitar cobranças, escrever/migrar Supabase conectado ou liberar indexação apenas por este documento.

## 9. Aceitação mínima

- Plano semestral custa R$1.350 e concede seis peças; não gera 1.350 Coins livres.
- À vista e seis envios reais concedem exatamente 30 Coins; repetição não duplica.
- Anual configurado em R$2.400/12 peças, desativado até liberação específica.
- Extra Terror com benefício custa 237,50 Coins; saldo 30 deixa R$207,50 de peças.
- Oferta geral elegível de R$400 custa R$380 para assinante; recusa desconto se inelegível.
- Frete permanece fora do gasto de Coins; sem saldo negativo em concorrência.
- Curadoria valida seleção exata, identidades, variante e ausência de duplicatas.
- Troca dentro/fora do corte e corrida com produção são verificadas no servidor.
- Última postagem do semestral fica no mês 7 quando a primeira é no mês 2.
- Estorno/cancelamento/pagamento misto e confirmação repetida não criam perdas ou duplicidades.
- Mocks são identificados como mocks; não declarar E2E sem persistência real.
- Renders, quarentena SpecialSTL, noindex e isolamento do Supabase remoto preservados.

## 10. Pendências para ativação, sem bloquear implementação independente

Custos e margem por variante; acabamento incluído; seleção real dos personagens; capacidade mensal e vagas; frete; datas/corte de produção; taxas e integração de cartão; condições de cancelamento/reembolso; revisão dos termos; autorização de publicação e cobrança. Não usar valores fictícios para declarar essas pendências resolvidas.

## Referências de contexto

- Histórico econômico: supabase/migrations/20260309151804_create_coins_and_pricing_system.sql.
- Abatimento recente em orçamento: supabase/migrations/20261114150141_tonecos_quote_full_payment_and_coin_redemption.sql.
- Curadoria existente: supabase/migrations/20261114160000_tonecos_curated_subscription_models.sql.
- Status e limites atuais: URGENTE.md e AGENTS.md; conteúdo mutável deve ser conferido no momento da execução.
