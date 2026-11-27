#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { appendFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const endpoint =
  'https://tonecos-catalogo-api.tonecosstudio.workers.dev/api/admin/telegram-drafts/reconcile/service/'
const idPattern = /^tg_[a-f0-9]{24}$/
const shaPattern = /^[a-f0-9]{64}$/
const fields = ['name', 'studio', 'character', 'variant']
const allowed = new Set(['id', 'revision', 'sourceSha256', ...fields])

export function parseReconciliationPlan(text) {
  const entries = []
  const ids = new Set()
  const hashes = new Set()
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue
    const fail = () => {
      throw new Error('invalid reconciliation record at line ' + (index + 1))
    }
    let row
    try { row = JSON.parse(line) } catch { fail() }
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        Object.keys(row).some(k => !allowed.has(k)) ||
        typeof row.id !== 'string' || !idPattern.test(row.id) || ids.has(row.id) ||
        !Number.isSafeInteger(row.revision) || row.revision < 0 ||
        !Array.isArray(row.sourceSha256) || row.sourceSha256.length < 1 ||
        row.sourceSha256.length > 80 ||
        new Set(row.sourceSha256).size !== row.sourceSha256.length ||
        row.sourceSha256.some(h => typeof h !== 'string' || !shaPattern.test(h) || hashes.has(h)) ||
        !fields.some(k => row[k] !== undefined)) fail()
    const body = { revision: row.revision, sourceSha256: [...row.sourceSha256].sort() }
    for (const key of fields) {
      if (row[key] === undefined) continue
      const value = row[key]
      if (typeof value !== 'string' || value.length > (key === 'studio' ? 120 : 160) ||
          /\p{Cc}/u.test(value) ||
          (['name','studio'].includes(key) && !value.trim())) fail()
      body[key] = value.trim()
    }
    ids.add(row.id)
    for (const h of row.sourceSha256) hashes.add(h)
    entries.push({ id: row.id, body })
  }
  if (!entries.length) throw new Error('empty reconciliation plan')
  return { entries, sha256: createHash('sha256').update(text).digest('hex') }
}

export function verifyReconciliationResponse(item, data) {
  if (!data || data.id !== item.id || data.published !== false ||
      data.reviewStatus !== 'pending' || data.rightsStatus !== 'not_reviewed' ||
      data.provisionalName !== true ||
      ![item.body.revision, item.body.revision + 1].includes(data.revision) ||
      !Array.isArray(data.images) ||
      data.imageCount !== item.body.sourceSha256.length ||
      data.images.length !== item.body.sourceSha256.length) return false
  const actual = data.images.map(x => x?.sha256).sort()
  if (!actual.every((sha, i) => sha === item.body.sourceSha256[i])) return false
  return fields.every(key => item.body[key] === undefined || data[key] === item.body[key])
}

async function main(argv) {
  const options = { apply: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--apply') { options.apply = true; continue }
    if (arg === '--plan' || arg === '--receipt') {
      const value = argv[++i]
      if (!value || value.startsWith('--')) throw new Error('missing ' + arg)
      options[arg.slice(2)] = resolve(value)
      continue
    }
    throw new Error('unknown argument: ' + arg)
  }
  if (!options.plan || !options.receipt) throw new Error('use --plan <jsonl> --receipt <jsonl> [--apply]')
  if (options.plan === options.receipt) throw new Error('plan and receipt must differ')
  const plan = parseReconciliationPlan(await readFile(options.plan, 'utf8'))
  console.log(JSON.stringify({ mode: options.apply ? 'apply' : 'dry-run', planSha256: plan.sha256, operations: plan.entries.length }))
  if (!options.apply) return
  const clientId = process.env.TONART_RECONCILE_CF_ACCESS_CLIENT_ID
  const clientSecret = process.env.TONART_RECONCILE_CF_ACCESS_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('dedicated reconciliation identity is not configured')
  let receipt = ''
  try { receipt = await readFile(options.receipt, 'utf8') }
  catch (error) { if (error?.code !== 'ENOENT') throw error }
  const completed = new Set()
  const planIds = new Set(plan.entries.map(x => x.id))
  for (const line of receipt.split(/\r?\n/).filter(Boolean)) {
    const row = JSON.parse(line)
    if (row.planSha256 !== plan.sha256 || row.status !== 'confirmed' ||
        !planIds.has(row.id) || completed.has(row.id)) throw new Error('invalid or mismatched receipt')
    completed.add(row.id)
  }
  for (const item of plan.entries) {
    if (completed.has(item.id)) continue
    let response
    try {
      response = await fetch(endpoint + item.id, {
        method: 'PATCH', redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: {
          'content-type': 'application/json',
          'CF-Access-Client-Id': clientId,
          'CF-Access-Client-Secret': clientSecret,
        },
        body: JSON.stringify(item.body),
      })
    } catch {
      throw new Error('transport failure for ' + item.id + '; reconcile current revision before retrying')
    }
    let data
    try { data = await response.json() } catch { data = null }
    if (!response.ok || !verifyReconciliationResponse(item, data)) {
      throw new Error('reconciliation stopped at ' + item.id + ' (HTTP ' + response.status + '); refresh evidence before retrying')
    }
    const record = { planSha256: plan.sha256, id: item.id, status: 'confirmed', revision: data.revision, confirmedAt: new Date().toISOString() }
    await appendFile(options.receipt, JSON.stringify(record) + '\n', { encoding: 'utf8', flag: 'a' })
    completed.add(item.id)
    console.log(JSON.stringify(record))
  }
  console.log(JSON.stringify({ status: 'complete', confirmed: completed.size }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
