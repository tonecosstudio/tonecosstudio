import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
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

function simulatedDrive({loseUploadResponse=false,loseFolderResponse=false}={}) {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../migrations/0054_blackfriday_drive_exports.sql'),'utf8'))
  const root = env.BLACKFRIDAY_DRIVE_FOLDER_ID, game = 'folder_abcdefghijklm'
  const FOLDER = 'application/vnd.google-apps.folder'
  const files = new Map([
    [root,{id:root,name:'Blackfriday',mimeType:FOLDER,capabilities:{canAddChildren:true,canEdit:true}}],
    [game,{id:game,name:'Games [1]',mimeType:FOLDER,parents:[root],capabilities:{canAddChildren:true,canEdit:true}}],
    ['manual_abcdefghijk',{id:'manual_abcdefghijk',name:'Manual.webp',mimeType:'image/webp',parents:[game],sha256Checksum:'f'.repeat(64),size:'10'}],
  ])
  let generated=0, uploads=0, foldersCreated=0
  const original = globalThis.fetch
  const configured={...env,BLACKFRIDAY_DRIVE_OAUTH:JSON.stringify({client_id:'c',client_secret:'s',refresh_token:'r'}),
    DB:{prepare(sql){let values=[];return {bind(...v){values=v;return this},
      async first(){return db.prepare(sql).get(...values)??null},
      async run(){return db.prepare(sql).run(...values)}}}}}
  globalThis.fetch=async (u,o={})=>{
    const url=new URL(String(u))
    if (url.hostname==='mockproject.supabase.co') {
      assert.equal(o.headers.authorization,token)
      return url.pathname.endsWith('/user')?json({id:'owner'}):json(true)
    }
    if (url.hostname==='oauth2.googleapis.com') {
      assert.equal(o.body.get('grant_type'),'refresh_token')
      return json({access_token:'fake-drive-access-token'})
    }
    assert.equal(url.hostname,'www.googleapis.com')
    assert.equal(new Headers(o.headers).get('authorization'),'Bearer fake-drive-access-token')
    if (url.pathname.endsWith('/generateIds')) return json({ids:['reserved_abcdefghijk'+(++generated)]})
    if (url.pathname==='/drive/v3/files' && o.method==='POST') {
      const meta=JSON.parse(o.body)
      if (files.has(meta.id)) return json({},409)
      foldersCreated++
      files.set(meta.id,{...meta,capabilities:{canAddChildren:true,canEdit:true}})
      if(loseFolderResponse){loseFolderResponse=false;throw Error('simulated lost folder receipt')}
      return json({id:meta.id})
    }
    if (url.pathname==='/drive/v3/files') {
      const parent=url.searchParams.get('q').match(/^'([A-Za-z0-9_-]+)' in parents and trashed = false$/)?.[1]
      assert.ok(parent)
      return json({files:[...files.values()].filter(x=>x.parents?.includes(parent)&&!x.trashed)})
    }
    if (url.pathname==='/upload/drive/v3/files') {
      const body=Buffer.from(o.body)
      const text=body.toString('utf8')
      const meta=JSON.parse(text.match(/\r\n\r\n(\{[^\r\n]+\})\r\n--/)[1])
      const boundary=new Headers(o.headers).get('content-type').split('boundary=')[1]
      const start=body.indexOf(Buffer.from('\r\n\r\n'),body.indexOf(Buffer.from('Content-Type: '+meta.mimeType)))+4
      const end=body.lastIndexOf(Buffer.from('\r\n--'+boundary+'--\r\n'))
      const bytes=body.subarray(start,end)
      assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.appProperties.tonartSha256)
      if (files.has(meta.id)) return json({},409)
      uploads++
      files.set(meta.id,{...meta,size:String(bytes.length),sha256Checksum:meta.appProperties.tonartSha256})
      if(loseUploadResponse){loseUploadResponse=false;throw Error('simulated lost upload receipt')}
      return json({id:meta.id})
    }
    const id=url.pathname.split('/').pop()
    const file=files.get(id)
    if(!file)return json({},404)
    if(o.method==='PATCH'){Object.assign(file,JSON.parse(o.body));return json(file)}
    return json(file)
  }
  return {configured,files,game,db,counts:()=>({generated,uploads,foldersCreated}),restore:()=>{globalThis.fetch=original;db.close()}}
}
const imageBytes=new TextEncoder().encode('RIFF TONART TEST WEBP')
function mediaFor(model) {
  return async p=>p===path?new Response(imageBytes,{headers:{'content-type':'image/webp'}}):json(model)
}
test('verified transfer keeps one file, counts actual images, and releases the lock', async ()=>{
  const d=simulatedDrive()
  try{
    const media=mediaFor({name:'Modelo Épico',categorySlug:'games',franchise:'Franquia'})
    let r=await routeBlackFridayDrive(req('POST',{path}),d.configured,media)
    assert.equal(r.status,200)
    const first=await r.json()
    assert.equal(first.saved,true);assert.equal(first.duplicate,false)
    assert.equal(first.folderName,'Games [2]')
    assert.equal(d.files.get(first.fileId).name.startsWith('Modelo Épico - Franquia - '),true)
    assert.equal(d.files.get(d.game).name,'Games [2]')
    r=await routeBlackFridayDrive(req('POST',{path}),d.configured,media)
    assert.equal(r.status,200)
    const second=await r.json()
    assert.equal(second.duplicate,true);assert.equal(second.fileId,first.fileId)
    assert.equal(second.count,2)
    assert.deepEqual(d.counts(),{generated:1,uploads:1,foldersCreated:0})
    assert.equal(d.db.prepare('SELECT COUNT(*) AS n FROM blackfriday_drive_lock').get().n,0)
  }finally{d.restore()}
})
test('an ambiguous upload is reconciled on retry without a second creation',async()=>{
  const d=simulatedDrive({loseUploadResponse:true})
  try{
    const media=mediaFor({name:'Modelo',categorySlug:'games'})
    assert.equal((await routeBlackFridayDrive(req('POST',{path}),d.configured,media)).status,503)
    const retry=await routeBlackFridayDrive(req('POST',{path}),d.configured,media)
    assert.equal(retry.status,200)
    assert.deepEqual(d.counts(),{generated:1,uploads:1,foldersCreated:0})
    const out=await retry.json()
    assert.equal(out.duplicate,true);assert.equal(out.folderName,'Games [2]')
  }finally{d.restore()}
})
test('a provisional title goes to A identificar, even after an ambiguous category creation',async()=>{
  const d=simulatedDrive({loseFolderResponse:true})
  try{
    const media=mediaFor({name:'Modelo sem nome',categorySlug:'games',provisional:true})
    assert.equal((await routeBlackFridayDrive(req('POST',{path}),d.configured,media)).status,503)
    const retry=await routeBlackFridayDrive(req('POST',{path}),d.configured,media)
    assert.equal(retry.status,200)
    const out=await retry.json()
    assert.equal(out.folderName,'A identificar [1]')
    assert.equal(d.files.get(out.fileId).name.startsWith('A identificar - '),true)
    assert.deepEqual(d.counts(),{generated:2,uploads:1,foldersCreated:1})
  }finally{d.restore()}
})
test('root-scoped lock rejects concurrent uploads before Drive side effects',async()=>{
  const d=simulatedDrive()
  try{
    d.db.prepare('INSERT INTO blackfriday_drive_lock VALUES(?,?,?)').run(env.BLACKFRIDAY_DRIVE_FOLDER_ID,'other',Date.now()+60000)
    const response=await routeBlackFridayDrive(req('POST',{path}),d.configured,mediaFor({name:'Modelo',categorySlug:'games'}))
    assert.equal(response.status,409)
    assert.deepEqual(d.counts(),{generated:0,uploads:0,foldersCreated:0})
  }finally{d.restore()}
})
