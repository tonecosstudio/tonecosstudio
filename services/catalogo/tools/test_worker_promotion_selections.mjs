import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { dirname,join } from 'node:path'
import { fileURLToPath } from 'node:url'
import esbuild from 'esbuild'
const dir=dirname(fileURLToPath(import.meta.url))
const bundle=await esbuild.build({entryPoints:[join(dir,'../worker/promotionSelections.ts')],bundle:true,platform:'browser',format:'esm',target:'es2022',write:false})
const {routePromotion,PROMOTION_ROUTE}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const id='tg_'+'a'.repeat(24), path='/api/telegram-studios/'+id+'/media/'+'b'.repeat(64)+'/display'
const token='Bearer '+'a'.repeat(100), origin='https://tonartstudio.com.br'
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}})
function req(data,auth=token){
 return new Request(origin+PROMOTION_ROUTE,{method:data?'POST':'GET',headers:{origin,...(auth?{authorization:auth}:{}),...(data?{'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})})
}
function setup(admin=true){
 const db=new DatabaseSync(':memory:')
 db.exec("CREATE TABLE models(id TEXT PRIMARY KEY,name TEXT,slug TEXT,published INTEGER,telegram_group_key TEXT,telegram_showcase_visible INTEGER,telegram_review_status TEXT,telegram_rights_status TEXT,telegram_name_provisional INTEGER,franchise_id TEXT);CREATE TABLE franchises(id TEXT PRIMARY KEY,name TEXT,category_id TEXT);CREATE TABLE categories(id TEXT PRIMARY KEY,name TEXT,slug TEXT);")
 db.exec(readFileSync(join(dir,'../migrations/0054_promotion_image_selections.sql'),'utf8'))
 db.prepare('INSERT INTO models VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,'Modelo','modelo',0,'group',1,'confirmed','not_reviewed',0,'f')
 db.exec("INSERT INTO franchises VALUES('f','Franquia','c');INSERT INTO categories VALUES('c','Games','games')")
 const original=globalThis.fetch
 globalThis.fetch=async u=>String(u).endsWith('/auth/v1/user')?json({id:'owner'}):json(admin)
 const env={ADMIN_SUPABASE_URL:'https://mock.supabase.co',ADMIN_SUPABASE_ANON_KEY:'mock',CORS_ORIGINS:origin,DB:{prepare(sql){let v=[];return{bind(...args){v=args;return this},async first(){return db.prepare(sql).get(...v)??null},async all(){return{results:db.prepare(sql).all(...v)}},async run(){return db.prepare(sql).run(...v)}}}}}
 const read=async p=>p===path?new Response('image bytes',{headers:{'content-type':'image/webp'}}):p==='/api/telegram-studios/'+id?json({id,name:'Modelo'}):json({},404)
 return {db,env,read,close(){globalThis.fetch=original;db.close()}}
}
test('guest and signed-in non-admin cannot read or write',async()=>{
 const t=setup(false);try{
  assert.equal((await routePromotion(req(null,null),t.env,t.read)).status,403)
  assert.equal((await routePromotion(req({action:'add',path}),t.env,t.read)).status,403)
  assert.equal(t.db.prepare('SELECT COUNT(*) n FROM promotion_image_selections').get().n,0)
 }finally{t.close()}
})
test('selection is durable and idempotent, rights and current identity remain live, removal touches only selection',async()=>{
 const t=setup();try{
  const add=()=>routePromotion(req({action:'add',path}),t.env,t.read)
  const first=await(await add()).json(),second=await(await add()).json()
  assert.equal(first.saved,true);assert.deepEqual(first,second)
  let snapshot=await(await routePromotion(req(),t.env,t.read)).json()
  assert.equal(snapshot.items.length,1);assert.equal(snapshot.items[0].exportable,false)
  t.db.prepare("UPDATE models SET telegram_rights_status='approved',name='Nome corrigido' WHERE id=?").run(id)
  snapshot=await(await routePromotion(req(),t.env,t.read)).json()
  assert.equal(snapshot.items[0].exportable,true);assert.equal(snapshot.items[0].name,'Nome corrigido')
  t.db.prepare('UPDATE models SET telegram_showcase_visible=0 WHERE id=?').run(id)
  snapshot=await(await routePromotion(req(),t.env,t.read)).json()
  assert.equal(snapshot.items[0].exportable,false);assert.equal(snapshot.items[0].mediaPath,null)
  const removed=await(await routePromotion(req({action:'remove',sha256:first.sha256}),t.env,t.read)).json()
  assert.equal(removed.removed,true);assert.equal(t.db.prepare('SELECT COUNT(*) n FROM promotion_image_selections').get().n,0)
  assert.equal(t.db.prepare('SELECT COUNT(*) n FROM models').get().n,1)
 }finally{t.close()}
})
test('arbitrary and private media references fail closed',async()=>{
 const t=setup();try{
  for(const p of ['https://example.org/test.webp','/api/admin/telegram-drafts/'+id+'/media/'+'b'.repeat(64)+'/display',path+'?x=1',path+'\u0000',path+'\u007f']){
   assert.equal((await routePromotion(req({action:'add',path:p}),t.env,t.read)).status,400)
  }
  assert.equal(t.db.prepare('SELECT COUNT(*) n FROM promotion_image_selections').get().n,0)
 }finally{t.close()}
})
