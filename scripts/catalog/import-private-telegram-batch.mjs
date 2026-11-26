#!/usr/bin/env node
import { appendFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parsePrivateTelegramPlan } from '../../src/services/catalog/telegram-private-import-plan.ts'

const endpoint =
  'https://tonecos-catalogo-api.tonecosstudio.workers.dev/api/admin/telegram-drafts/import'
const help = `Uso: node --experimental-strip-types scripts/catalog/import-private-telegram-batch.mjs --plan <arquivo.jsonl> --receipt <recibo.jsonl> [--apply]

Sem --apply, valida o plano sem rede. Com --apply, chama sequencialmente o importador canônico do Worker.
Credenciais Access somente por ambiente: TONART_IMPORT_CF_ACCESS_CLIENT_ID e TONART_IMPORT_CF_ACCESS_CLIENT_SECRET.
`

function args(argv) {
  const out = { apply: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help' || argv[i] === '-h') return { help: true }
    if (argv[i] === '--apply') {
      out.apply = true
      continue
    }
    if (argv[i] === '--plan' || argv[i] === '--receipt') {
      const key = argv[i].slice(2)
      const value = argv[++i]
      if (!value || value.startsWith('--'))
        throw new Error(`argumento inválido: ${argv[i - 1]}`)
      out[key] = value
      continue
    }
    throw new Error(`argumento desconhecido: ${argv[i]}`)
  }
  if (!out.plan || !out.receipt) throw new Error('informe --plan e --receipt')
  return out
}

async function main() {
  const options = args(process.argv.slice(2))
  if (options.help) {
    process.stdout.write(help)
    return
  }
  const planPath = resolve(options.plan)
  const receiptPath = resolve(options.receipt)
  const text = await readFile(planPath, 'utf8')
  const plan = await parsePrivateTelegramPlan(text)
  process.stdout.write(
    JSON.stringify({
      mode: options.apply ? 'apply' : 'dry-run',
      planSha256: plan.sha256,
      operations: plan.drafts.length,
      photos: plan.photoCount,
      studios: plan.studioCount,
    }) + '\n',
  )
  if (!options.apply) return

  const clientId = process.env.TONART_IMPORT_CF_ACCESS_CLIENT_ID
  const clientSecret = process.env.TONART_IMPORT_CF_ACCESS_CLIENT_SECRET
  if (!clientId || !clientSecret)
    throw new Error(
      'faltam as variáveis de identidade Access no ambiente seguro',
    )

  let receiptText = ''
  try {
    receiptText = await readFile(receiptPath, 'utf8')
  } catch (cause) {
    if (cause?.code !== 'ENOENT') throw cause
  }
  const completed = new Set()
  for (const line of receiptText.split(/\r?\n/).filter(Boolean)) {
    let row
    try {
      row = JSON.parse(line)
    } catch {
      throw new Error('recibo existente contém JSON inválido')
    }
    if (row.planSha256 !== plan.sha256)
      throw new Error(
        'recibo pertence a outro plano; use um caminho de recibo separado',
      )
    if (row.status === 'confirmed' && typeof row.operationId === 'string')
      completed.add(row.operationId)
  }

  let confirmed = 0
  let skipped = 0
  for (const item of plan.drafts) {
    if (completed.has(item.operationId)) {
      skipped++
      continue
    }
    const body = {
      ...item.manifest,
      operation: item.operation,
      ...(item.operation === 'append' ? { expectedModelId: item.id } : {}),
    }
    let response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'CF-Access-Client-Id': clientId,
          'CF-Access-Client-Secret': clientSecret,
        },
        body: JSON.stringify(body),
      })
    } catch {
      throw new Error(
        `falha de transporte em ${item.id}; reexecute com o mesmo plano e recibo`,
      )
    }
    let result
    try {
      result = await response.json()
    } catch {
      result = {}
    }
    const validCommon =
      result?.id === item.id &&
      result?.published === false &&
      result?.imageCount === item.manifest.images.length
    const validCreate =
      item.operation === 'create' &&
      validCommon &&
      (result.created === true || result.reused === true) &&
      !(result.created === true && result.reused === true) &&
      (result.appended ?? 0) === 0
    const validAppend =
      item.operation === 'append' &&
      validCommon &&
      result.created === false &&
      result.reused === true &&
      Number.isSafeInteger(result.appended) &&
      result.appended >= 0 &&
      result.appended <= item.manifest.images.length
    if (!response.ok || (!validCreate && !validAppend)) {
      const reason =
        typeof result?.error === 'string' ? ` (${result.error})` : ''
      throw new Error(
        `importação interrompida em ${item.id}: HTTP ${response.status}${reason}; retome com o mesmo plano e recibo`,
      )
    }
    const receipt = {
      planSha256: plan.sha256,
      operationId: item.operationId,
      modelId: item.id,
      operation: item.operation,
      status: 'confirmed',
      created: result.created,
      reused: result.reused,
      appended: result.appended ?? 0,
      imageCount: result.imageCount,
      confirmedAt: new Date().toISOString(),
    }
    await appendFile(receiptPath, JSON.stringify(receipt) + '\n', {
      encoding: 'utf8',
      flag: 'a',
    })
    completed.add(item.operationId)
    confirmed++
    process.stdout.write(
      JSON.stringify({
        modelId: item.id,
        status: 'confirmed',
        created: receipt.created,
        reused: receipt.reused,
        appended: receipt.appended,
      }) + '\n',
    )
  }
  process.stdout.write(
    JSON.stringify({
      status: 'complete',
      confirmed,
      skipped,
      receipt: receiptPath,
    }) + '\n',
  )
}

main().catch((error) => {
  process.stderr.write(
    (error instanceof Error ? error.message : 'falha no importador em lote') +
      '\n',
  )
  process.exitCode = 1
})
