/**
 * Read-only verification of TONART's existing Worker during M5 release.
 * Publishing is owned only by the canonical gated quality workflow.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const manifest = JSON.parse(readFileSync(new URL('../../../config/catalog-code-consolidation.json', import.meta.url)))
const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url)))
const schema = JSON.parse(readFileSync(new URL('../config/catalog-schema-contract.json', import.meta.url)))
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

function validId(value) {
  if (typeof value !== 'string' || !uuid.test(value)) throw Error('Invalid Worker version ID')
  return value
}
export function deploymentVersions(payload) {
  const list = payload?.result?.deployments
  if (!Array.isArray(list) || !list.length) throw Error('No Worker deployment found')
  const latest = [...list].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0]
  if (!Number.isFinite(Date.parse(latest?.created_on)) || !Array.isArray(latest.versions)) {
    throw Error('Invalid deployment metadata')
  }
  const versions = latest.versions.map(x=>({id:validId(x.version_id),percent:Number(x.percentage)}))
  if (!versions.length || new Set(versions.map(x=>x.id)).size!==versions.length ||
      versions.some(x=>!Number.isFinite(x.percent)||x.percent<0||x.percent>100) ||
      versions.reduce((a,x)=>a+x.percent,0)!==100) throw Error('Invalid version traffic split')
  return versions
}
export function assertTraffic(versions, previous, candidate, phase) {
  validId(previous)
  if (candidate!==null) validId(candidate)
  const expected = phase==='before'?[{id:previous,percent:100}]
    :phase==='staged'?[{id:previous,percent:100},{id:candidate,percent:0}]
      :phase==='promoted'?[{id:candidate,percent:100}]:null
  if (!expected||expected.some(x=>!x.id)||versions.length!==expected.length||
      expected.some(x=>!versions.some(y=>x.id===y.id&&x.percent===y.percent))) {
    throw Error('Worker deployment does not match expected release phase')
  }
}
export function uploadedVersion(text) {
  const entries=String(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map((s,i)=>{
    try{return JSON.parse(s)}catch{throw Error('Malformed Wrangler upload line '+(i+1))}
  }).filter(x=>x?.type==='version-upload')
  if(entries.length!==1)throw Error('Expected exactly one Wrangler version-upload event')
  return validId(entries[0].version_id)
}
export async function readLiveDeployment(env=process.env, fetchImpl=fetch) {
  if(env.CLOUDFLARE_ACCOUNT_ID!==manifest.runtime.cloudflareAccountId||
     !/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID)||!env.CLOUDFLARE_API_TOKEN) {
    throw Error('Canonical Cloudflare authorization unavailable')
  }
  const url='https://api.cloudflare.com/client/v4/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+
    '/workers/scripts/'+encodeURIComponent(config.name)+'/deployments'
  const response=await fetchImpl(url,{method:'GET',headers:{
    authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,accept:'application/json'
  },signal:AbortSignal.timeout(12000)})
  if(response.status!==200)throw Error('Cloudflare deployment metadata HTTP '+response.status)
  const data=await response.json()
  if(data?.success!==true)throw Error('Cloudflare deployment metadata not verified')
  return deploymentVersions(data)
}
export async function smoke(apiUrl, candidate=null, fetchImpl=fetch) {
  const url=new URL(String(apiUrl??''))
  if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||
     url.username||url.password||!url.hostname.startsWith(config.name+'.')||
     !url.hostname.endsWith('.workers.dev'))throw Error('Use direct canonical Worker HTTPS origin')
  const headers={accept:'application/json','cache-control':'no-cache'}
  if(candidate)headers['Cloudflare-Workers-Version-Overrides']=config.name+'="'+validId(candidate)+'"'
  async function json(path) {
    const response=await fetchImpl(url.origin+path,{method:'GET',headers,signal:AbortSignal.timeout(12000)})
    if(response.status!==200)throw Error('Worker smoke HTTP '+response.status+' '+path.split('?')[0])
    return response.json()
  }
  const health=await json('/api/health')
  const status=health?.schema
  if(health?.ok!==true||status?.ready!==true||status.contractVersion!==schema.version||
     status.latestMigration!==schema.latestMigration||
     status.requiredMigrations!==schema.requiredMigrations.length||
     status.appliedMigrations!==schema.requiredMigrations.length||
     !Array.isArray(status.missingMigrations)||status.missingMigrations.length||
     !Array.isArray(status.missingStructures)||status.missingStructures.length)
    throw Error('Worker schema not ready for release')
  const catalog=await json('/api/telegram-studios?limit=1&offset=0')
  if(!Number.isSafeInteger(catalog?.total)||catalog.total<1||
     !Array.isArray(catalog.items)||catalog.items.length!==1||
     !/^tg_[a-f0-9]{24}$/.test(catalog.items[0]?.id??''))
    throw Error('Telegram showcase listing unhealthy')
  const studios=await json('/api/telegram-studios/studios')
  if(!Array.isArray(studios?.studios)||studios.studios.length<1)throw Error('Studio directory unhealthy')
  const thumb=catalog.items[0].cover
  if(thumb!=null) {
    if(!/^\/api\/telegram-studios\/tg_[a-f0-9]{24}\/media\/[a-f0-9]{64}\/thumb$/.test(thumb))
      throw Error('Invalid thumbnail route')
    const response=await fetchImpl(url.origin+thumb,{
      method:'GET',headers:{...headers,accept:'image/webp'},signal:AbortSignal.timeout(12000)
    })
    try {
      if(response.status!==200||!String(response.headers.get('content-type')).startsWith('image/webp'))
        throw Error('Telegram thumbnail unavailable')
    } finally {
      if(response.body?.cancel)await response.body.cancel().catch(()=>undefined)
    }
  }
  return {ok:true,schemaVersion:schema.version,models:catalog.total,studios:studios.studios.length}
}
async function main(){
  const [mode,a,b]=process.argv.slice(2)
  let result
  if(mode==='before'){
    if(manifest.migration.phase!=='cutover-approved'||manifest.migration.releaseAuthorized!==true||
       manifest.migration.sourceWriterDisabled!==true||manifest.migration.targetWorkerReleaseEnabled!==true)
      throw Error('M5 release not authorized')
    const old=validId(manifest.productionObservation.currentVersionId)
    assertTraffic(await readLiveDeployment(),old,null,'before')
    result=old
  }else if(mode==='uploaded'){
    if(!a)throw Error('Missing Wrangler NDJSON file')
    result=uploadedVersion(readFileSync(a,'utf8'))
  }else if(mode==='staged'){
    assertTraffic(await readLiveDeployment(),a,b,'staged')
    result=await smoke(process.env.CATALOG_API_URL,b)
  }else if(mode==='promoted'){
    assertTraffic(await readLiveDeployment(),a,a,'promoted')
    result=await smoke(process.env.CATALOG_API_URL)
  }else throw Error('Unknown M5 read-only release verification')
  process.stdout.write(typeof result==='string'?result+'\n':JSON.stringify(result)+'\n')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(e=>{console.error('M5 release check: '+e.message);process.exitCode=2})
}
