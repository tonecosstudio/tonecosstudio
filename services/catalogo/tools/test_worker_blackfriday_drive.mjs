import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const bundle = await esbuild.build({
  entryPoints:[join(dirname(fileURLToPath(import.meta.url)), '../worker/blackFridayDrive.ts')],
  bundle:true,platform:'browser',format:'esm',target:'es2022',write:false,logLevel:'silent',
})
const { routeBlackFridayDrive, BLACKFRIDAY_DRIVE_ROUTE } = await import('data:text/javascript;base64,'+
  Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const token = 'Bearer '+'a'.repeat(100)
const url = 'https://catalog.example.test'+BLACKFRIDAY_DRIVE_ROUTE
const modelId = 'tg_'+'a'.repeat(24)
const path = '/api/telegram-studios/'+modelId+'/media/'+'b'.repeat(64)+'/display'
const env = {
  ADMIN_SUPABASE_URL:'https://mockproject.supabase.co',ADMIN_SUPABASE_ANON_KEY:'mock',
  BLACKFRIDAY_DRIVE_FOLDER_ID:'root_abcdefghijklmno',
  DB:{prepare(){throw Error('Unexpected write')}},
}
function req(method, data, auth=token, origin='https://tonartstudio.com.br') {
  return new Request(url,{method,headers:{origin,...(auth?{authorization:auth}:{}),
    ...(data?{'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})})
}
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}})
async function withAuth(admin, fn) {
  const original = globalThis.fetch
  globalThis.fetch = async (u,o) => {
    if (String(u).endsWith('/auth/v1/user')) return json({id:'owner'})
    if (String(u).endsWith('/rest/v1/rpc/is_tonecos_admin')) return json(admin)
    throw Error('Unexpected external request '+u)
  }
  try { await fn() } finally { globalThis.fetch=original }
}
const neverRead = async () => { throw Error('Unexpected public media read') }

test('guest, customer, cross-origin and missing configuration fail closed', async () => {
  await withAuth(false,async () => {
    assert.equal((await routeBlackFridayDrive(req('POST',{path},null),env,neverRead)).status,403)
    assert.equal((await routeBlackFridayDrive(req('POST',{path}),env,neverRead)).status,403)
    assert.equal((await routeBlackFridayDrive(req('POST',{path},token,'https://example.com'),env,neverRead)).status,403)
  })
  await withAuth(true,async () => {
    assert.deepEqual(await (await routeBlackFridayDrive(req('GET'),env,neverRead)).json(),{configured:false})
    assert.equal((await routeBlackFridayDrive(req('POST',{path}),env,neverRead)).status,503)
  })
})
test('rejects private path, foreign URL, path suffix and media not belonging to model before Drive writes',async () => {
  await withAuth(true,async () => {
    const configured = {...env,BLACKFRIDAY_DRIVE_OAUTH:JSON.stringify({client_id:'c',client_secret:'s',refresh_token:'r'})}
    for (const p of ['https://example.com/image.webp','/api/admin/telegram-drafts/'+modelId,path+'?token=x']) {
      assert.equal((await routeBlackFridayDrive(req('POST',{path:p}),configured,neverRead)).status,400)
    }
    const readPublic = async (p) => p.endsWith('/images?limit=60')
      ? json({items:[],nextCursor:null}) : json({name:'Real model',cover_storage_key:'media/another/image.webp'})
    assert.equal((await routeBlackFridayDrive(req('POST',{path:'/media/model/image.webp',modelSlug:'test'}),configured,readPublic)).status,404)
  })
})
test('public Telegram route must release both model and image before any Drive write',async () => {
  await withAuth(true,async () => {
    const configured = {...env,BLACKFRIDAY_DRIVE_OAUTH:JSON.stringify({client_id:'c',client_secret:'s',refresh_token:'r'})}
    const called=[]
    const readPublic=async p=>{called.push(p); return p===path ? json({error:'not_found'},404) : json({name:'Real model',categorySlug:'games'})}
    const r=await routeBlackFridayDrive(req('POST',{path:path.replace('/display','/thumb')}),configured,readPublic)
    assert.equal(r.status,404)
    assert.deepEqual(called,['/api/telegram-studios/'+modelId,path])
  })
})
