import fs from "node:fs/promises";
import path from "node:path";
import { defaultTelegramRoot, defaultTelegramWebpOutput } from "./telegram-paths.mjs";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function countJsonl(filePath) {
  if (!(await exists(filePath))) return 0;
  const raw = await fs.readFile(filePath, "utf8");
  return raw.split(/\r?\n/).filter(Boolean).length;
}

async function countFiles(dir, predicate = () => true) {
  if (!(await exists(dir))) return 0;
  let total = 0;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isFile() && predicate(entry.name)) total += 1;
  }
  return total;
}

async function listWorkerStatus(workerDir) {
  if (!(await exists(workerDir))) return [];
  const files = (await fs.readdir(workerDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^lote_.*\.csv$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  const result = [];
  for (const file of files.slice(-32)) {
    const filePath = path.join(workerDir, file);
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const headers = (lines[0] || "").split(",");
    const required = ["category", "franchise", "folder", "filename", "confidence"];
    const indexes = Object.fromEntries(required.map((key) => [key, headers.indexOf(key)]));
    let complete = 0;
    let incomplete = 0;
    for (const line of lines.slice(1)) {
      const cells = line.split(",");
      const ok = required.every((key) => indexes[key] >= 0 && String(cells[indexes[key]] || "").trim());
      if (ok) complete += 1;
      else incomplete += 1;
    }
    result.push({ file, rows: Math.max(lines.length - 1, 0), complete, incomplete });
  }
  return result;
}

async function prependOnce(filePath, marker, content) {
  const current = (await exists(filePath)) ? await fs.readFile(filePath, "utf8") : "";
  if (current.includes(marker)) return false;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (current) await fs.copyFile(filePath, `${filePath}.before-operacao-v2-${stamp}.bak`);
  await fs.writeFile(filePath, `${content}\n\n${current}`, "utf8");
  return true;
}

function mdTable(rows, columns) {
  const header = `| ${columns.join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(row[column] ?? "")).join(" | ")} |`);
  return [header, sep, ...body].join("\n");
}

async function writeExecutorPrompts(ops, generatedAt) {
  const dir = path.join(ops, "07_prompts_executores");
  await fs.mkdir(dir, { recursive: true });

  const commonHeader =
    `Atualizado em: ${generatedAt}\n\n` +
    `Regras fixas:\n\n` +
    `- Nao mover, renomear ou apagar nada na raiz do Telegram.\n` +
    `- Nao editar imagens diretamente.\n` +
    `- Nao aplicar migracao nem converter WebP sem ordem do coordenador.\n` +
    `- Trabalhar somente no arquivo/lote reservado para este executor.\n` +
    `- Registrar incerteza em campo proprio; nao inventar personagem/franquia.\n`;

  const prompts = [
    {
      name: "01_COORDENADOR.md",
      body:
        `# Prompt Executor 01 - Coordenador\n\n${commonHeader}\n` +
        `Responsabilidade:\n\n` +
        `- Criar checkpoint antes de qualquer onda de trabalho.\n` +
        `- Gerar plano de normalizacao e revisar resumo por categoria.\n` +
        `- Gerar relatorio de ondas seguras antes de aplicar migracoes.\n` +
        `- Executar dry-run por fatia pequena.\n` +
        `- Aplicar migracoes somente quando o dry-run vier sem issues.\n` +
        `- Atualizar manifestos, hash index, relatorios e tarefas abertas.\n\n` +
        `Comandos principais:\n\n` +
        `\`\`\`powershell\n` +
        `npm run catalog:ops-v2\n` +
        `npm run catalog:plan-staging-normalization\n` +
        `npm run catalog:normalization-waves\n` +
        `npm run catalog:apply-staging-normalization -- --reason=main_root_consolidation --source-category=terrain --target-category=outros\n` +
        `\`\`\`\n`,
    },
    {
      name: "02_EXECUTOR_PARES.md",
      body:
        `# Prompt Executor 02 - Lotes Pares\n\n${commonHeader}\n` +
        `Responsabilidade:\n\n` +
        `- Trabalhar somente em lotes pares reservados pelo coordenador.\n` +
        `- Preencher categoria, franquia, personagem/modelo, flags NSFW/sensitive e confianca.\n` +
        `- Marcar watermark externo quando houver logo/site/Telegram repetido na imagem.\n` +
        `- Diferenciar watermark externo de assinatura/logo do modelador.\n` +
        `- Devolver CSV preenchido em \`04_respostas/\`.\n`,
    },
    {
      name: "03_EXECUTOR_IMPARES.md",
      body:
        `# Prompt Executor 03 - Lotes Impares\n\n${commonHeader}\n` +
        `Responsabilidade:\n\n` +
        `- Trabalhar somente em lotes impares reservados pelo coordenador.\n` +
        `- Usar a sequencia original do Telegram apenas para identificacao visual, sem alterar origem.\n` +
        `- Manter variacao normal e variacao NSFW separadas por flag, nao por exclusao.\n` +
        `- Quando houver colorido e preto-e-branco do mesmo modelo, registrar como variacao se tiver certeza.\n` +
        `- Devolver CSV preenchido em \`04_respostas/\`.\n`,
    },
    {
      name: "04_EXECUTOR_FRENTE_C.md",
      body:
        `# Prompt Executor 04 - Frente C\n\n${commonHeader}\n` +
        `Responsabilidade:\n\n` +
        `- Atacar somente filas de revisao Frente C ou baixa confianca.\n` +
        `- Conferir pastas suspeitas de personagem/franquia trocada.\n` +
        `- Identificar duplicidade de pasta antes de sugerir merge.\n` +
        `- Separar sugestoes de mover fisico em relatorio; quem aplica e sempre o coordenador.\n` +
        `- Devolver achados em \`04_respostas/\` com evidencia objetiva.\n`,
    },
    {
      name: "05_EXECUTOR_WEBP_SITE.md",
      body:
        `# Prompt Executor 05 - WebP e Site\n\n${commonHeader}\n` +
        `Responsabilidade:\n\n` +
        `- Validar se display/thumb/manifest tem a mesma contagem e caminhos equivalentes.\n` +
        `- Conferir nomes e paths finais antes de upload para Cloudflare.\n` +
        `- Preparar metadados para Supabase sem mover arquivos do catalogo staging.\n` +
        `- Confirmar regra de NSFW: item pode existir no catalogo normal, mas so a variacao impropria recebe blur.\n` +
        `- Reportar divergencias em \`05_validacoes/\`.\n`,
    },
  ];

  for (const prompt of prompts) {
    await fs.writeFile(path.join(dir, prompt.name), prompt.body, "utf8");
  }
}

async function main() {
  const root = path.resolve(argValue("root", process.env.TELEGRAM_ROOT || defaultTelegramRoot()));
  const webp = path.resolve(argValue("output", process.env.ORDAX_WEBP_OUTPUT || defaultTelegramWebpOutput()));
  const control = path.join(root, "catalogo", "_controle");
  const ops = path.join(control, "00_operacao_v2");
  const communication = path.join(control, "comunicacao");
  const generatedAt = new Date().toISOString();

  const dirs = [
    ops,
    "00_checkpoints",
    "01_planos",
    "02_tarefas_abertas",
    "03_tarefas_em_execucao",
    "04_respostas",
    "05_validacoes",
    "06_migracoes",
    "07_prompts_executores",
    "99_arquivo",
  ].map((dir) => (dir === ops ? dir : path.join(ops, dir)));

  for (const dir of dirs) await fs.mkdir(dir, { recursive: true });

  const catalogManifest = path.join(control, "catalog_manifest.jsonl");
  const webpManifest = path.join(webp, "manifests", "manifest_final.jsonl");
  const display = path.join(webp, "display");
  const thumb = path.join(webp, "thumb");
  const checkpoint = {
    generated_at: generatedAt,
    telegram_root: root,
    catalog_control: control,
    webp_output: webp,
    catalog_manifest_rows: await countJsonl(catalogManifest),
    webp_manifest_rows: await countJsonl(webpManifest),
    webp_display_top_categories: await countFiles(display),
    webp_thumb_top_categories: await countFiles(thumb),
    worker_status_recent: {
      pc_auxiliar: await listWorkerStatus(path.join(control, "workers", "pc-auxiliar")),
      frente_c: await listWorkerStatus(path.join(control, "workers", "pc-auxiliar-frente-c")),
    },
  };

  const checkpointPath = path.join(
    ops,
    "00_checkpoints",
    `checkpoint_${generatedAt.replace(/[:.]/g, "-")}.json`,
  );
  await fs.writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");

  const executorRows = [
    {
      executor: "01 coordenador",
      dono: "este Codex",
      permissao: "cria checkpoints, planos, dry-run, aplica migracoes aprovadas",
    },
    {
      executor: "02 pares",
      dono: "PC auxiliar A",
      permissao: "preenche somente lotes pares reservados, dry-run, sem mover arquivos",
    },
    {
      executor: "03 impares",
      dono: "PC auxiliar B",
      permissao: "preenche somente lotes impares reservados, dry-run, sem mover arquivos",
    },
    {
      executor: "04 frente-c",
      dono: "PC auxiliar C",
      permissao: "preenche somente fila frente-c reservada, dry-run, sem mover arquivos",
    },
    {
      executor: "05 webp-site",
      dono: "PC auxiliar D / coordenador",
      permissao: "audita WebP, nomes PT-BR, Cloudflare/Supabase; aplica apenas com plano",
    },
  ];

  await fs.writeFile(
    path.join(ops, "README.md"),
    `# Operacao V2 - Catalogo Ordax\n\n` +
      `Atualizado em: ${generatedAt}\n\n` +
      `Esta pasta passa a ser o ponto unico de coordenacao. O material antigo em ` +
      `\`comunicacao/\` fica como historico/legado ate ser arquivado com seguranca.\n\n` +
      `## Regra principal\n\n` +
      `- A raiz do Telegram e fonte bruta imutavel: nao mover, renomear ou apagar.\n` +
      `- \`catalogo/\` e staging fisico: pode ser reorganizado somente por migracao planejada.\n` +
      `- \`ordax-catalogo-webp-final/\` e saida derivada: nao recebe copia direta.\n` +
      `- Nenhum executor aplica lote, move arquivo ou publica sem checkpoint e dry-run do coordenador.\n\n` +
      `## Estado inicial\n\n` +
      `- Manifesto catalogo: ${checkpoint.catalog_manifest_rows} registros.\n` +
      `- Manifesto WebP: ${checkpoint.webp_manifest_rows} registros.\n` +
      `- Checkpoint: \`${path.basename(checkpointPath)}\`.\n\n` +
      `## Executores\n\n${mdTable(executorRows, ["executor", "dono", "permissao"])}\n`,
    "utf8",
  );

  await fs.writeFile(
    path.join(ops, "FLUXO_OPERACIONAL.md"),
    `# Fluxo Operacional Profissional\n\n` +
      `1. **Telegram bruto**: entrada imutavel baixada pelo downloader.\n` +
      `2. **Catalogo staging**: copia organizada, auditavel, com manifesto e hash index.\n` +
      `3. **Curadoria por tarefas**: executores editam CSVs reservados, nunca imagens.\n` +
      `4. **Migracao coordenada**: coordenador aplica movimentos internos no catalogo/WebP com backup.\n` +
      `5. **WebP final**: display/thumb derivados de manifestos validados.\n` +
      `6. **Publicacao**: Cloudflare recebe assets; Supabase recebe metadados.\n\n` +
      `## Padrao de pasta esperado\n\n` +
      `\`categoria/franquia/personagem-ou-modelo/imagem-id.webp\`\n\n` +
      `Exemplo correto: \`anime/bleach/rukia-kuchiki/kuchiki-rukia-bleach-108025.webp\`.\n` +
      `Exemplo a corrigir: \`anime/bleach-rukia-kuchiki/rukia-kuchiki/...\`.\n\n` +
      `Exemplo correto: \`desenhos-animacao/tartarugas-ninja/raphael/...\`.\n` +
      `Exemplo a corrigir: \`tmnt/Teenage Mutant Ninja Turtles/Raphael/...\`.\n\n` +
      `## Categorias raiz principais\n\n` +
      `- \`anime\`: anime/manga/japones fica separado.\n` +
      `- \`desenhos-animacao\`: desenhos, cartoons, animation e animacao ficam juntos.\n` +
      `- \`marvel\`: Marvel sobe para a raiz; o subgrupo vira funcao do item, ex. \`marvel/herois/homem-aranha/...\`, \`marvel/viloes/thanos/...\`, \`marvel/objetos-acessorios/...\`.\n` +
      `- \`dc\`: DC sobe para a raiz; o subgrupo vira funcao do item, ex. \`dc/herois/batman/...\`, \`dc/viloes/coringa/...\`, \`dc/outros/...\` quando nao houver confianca.\n` +
      `- \`filmes-series\`: filmes, movies, TV e series ficam juntos.\n` +
      `- \`games\`: jogos, games e Pokemon ficam juntos; franquia de origem game, como Street Fighter, Mortal Kombat e Sonic, permanece em \`games\` mesmo quando tambem existir filme.\n` +
      `- \`outros\`: raiz de agrupamento para fantasia, tabletop, acessorios, brinquedos, educacional, animais, arte, decoracao, musica, pessoas e itens sem universo claro.\n\n` +
      `## Regras anti-redundancia\n\n` +
      `- Nao criar raiz para estudios/modeladores; estudo e marca do modelador ficam como metadado, nao como pasta.\n` +
      `- Exemplo correto: \`outros/fantasia/orc-warrior/...\`.\n` +
      `- Exemplo a corrigir: \`fantasy/C27 Studio/orc warrior/...\`.\n` +
      `- Nao duplicar franquia no nivel de categoria e franquia: use uma franquia canonica em portugues quando houver confianca.\n` +
      `- Marvel e DC nao usam \`quadrinhos\` como subpasta fixa; o subgrupo e funcao do item: \`herois\`, \`viloes\`, \`anti-herois\`, \`equipes\`, \`coadjuvantes\`, \`objetos-acessorios\`, \`cenas-dioramas\` ou \`outros\`.\n`,
    "utf8",
  );

  await fs.writeFile(
    path.join(ops, "PAUSAR_E_RETOMAR.md"),
    `# Pausar e Retomar\n\n` +
      `## Pausar agora\n\n` +
      `- Nao reservar novos lotes.\n` +
      `- Nao executar apply central.\n` +
      `- Nao converter novos WebPs.\n` +
      `- Preservar lotes preenchidos como material de revisao.\n\n` +
      `## Retomar depois da migracao\n\n` +
      `1. Reconstruir \`catalog_hash_index.json\`.\n` +
      `2. Regenerar \`pendentes.csv\`.\n` +
      `3. Arquivar lotes vazios ou superseded.\n` +
      `4. Reservar nova onda para os 5 executores.\n` +
      `5. Atualizar prompts em \`07_prompts_executores/\`.\n`,
    "utf8",
  );

  await fs.writeFile(
    path.join(ops, "EXECUTORES.md"),
    `# Executores\n\n${mdTable(executorRows, ["executor", "dono", "permissao"])}\n\n` +
      `## Regra de escala\n\n` +
      `Para 90 mil imagens e crescimento futuro, as conversas nao compartilham CSV. ` +
      `Cada executor recebe lotes fechados e responde em arquivo proprio. O coordenador ` +
      `consolida, valida e aplica.\n\n` +
      `## Raizes permitidas\n\n` +
      `As raizes principais do catalogo fisico sao: \`anime\`, \`desenhos-animacao\`, ` +
      `\`marvel\`, \`dc\`, \`filmes-series\`, \`games\` e \`outros\`. ` +
      `Pastas como \`tmnt\`, \`fantasy\`, \`animals\`, \`educational\`, \`props\`, ` +
      `\`sci-fi\`, \`tabletop\`, \`movies\`, \`tv\`, \`cartoons\` e nomes de estudio ` +
      `devem passar por plano/dry-run do coordenador antes de serem migradas.\n`,
    "utf8",
  );

  await writeExecutorPrompts(ops, generatedAt);

  const pauseMarker = "OPERACAO_V2_ATIVA";
  const pauseBlock =
    `<!-- ${pauseMarker} -->\n` +
    `# ATENCAO - Operacao V2 ativa\n\n` +
    `Atualizado em: ${generatedAt}\n\n` +
    `Antes de qualquer tarefa nova, leia:\n\n` +
    `\`catalogo/_controle/00_operacao_v2/README.md\`\n\n` +
    `O fluxo antigo esta pausado para reorganizacao profissional do catalogo. ` +
    `Nao reservar novos lotes, nao executar apply e nao converter WebP ate o coordenador liberar.\n`;

  await prependOnce(path.join(communication, "LEIA_ANTES_DE_QUALQUER_TAREFA.md"), pauseMarker, pauseBlock);
  await fs.writeFile(
    path.join(communication, "OPERACAO_V2_ATIVA.md"),
    `${pauseBlock}\nCheckpoint criado em:\n\n\`${checkpointPath}\`\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        root,
        control,
        ops,
        checkpoint: checkpointPath,
        catalog_manifest_rows: checkpoint.catalog_manifest_rows,
        webp_manifest_rows: checkpoint.webp_manifest_rows,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
