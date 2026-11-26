/** Promotion selection is reference-only. No Drive credentials, external writes, R2 copies or publication changes. */
import { verifyAdmin } from './telegramDrafts'
import { publicMediaKey } from './media'
import { isRestrictedCatalogMediaPath } from '../../../scripts/security/catalog-public-media-approval-policy.mjs'

export const PROMOTION_ROUTE = '/api/admin/promotions/blackfriday'
const CAMPAIGN = 'blackfriday'
const SHA = /^[a-f0-9]{64}$/
const MAX_ITEMS = 1000
const MAX_BYTES = 8 * 1024 * 1024
const SLUG = /^[a-z0-9][a-z0-9-]{0,239}$/
const MEDIA = /^\/api\/telegram-studios\/(tg_[a-f0-9]{24})\/media\/([a-f0-9]{64})\/(?:thumb|display)$/
const MIME: Record<string, string> = {'image/webp':'webp','image/jpeg':'jpg','image/png':'png','image/avif':'avif','image/gif':'gif'}
type Statement = { bind(...values: unknown[]): Statement; first<T=unknown>(): Promise<T|null>; all<T=unknown>(): Promise<{results:T[]}>; run(): Promise<unknown> }
export type PromotionEnv = {
  DB: { prepare(sql: string): Statement }
  ADMIN_SUPABASE_URL?: string
  ADMIN_SUPABASE_ANON_KEY?: string
  CORS_ORIGINS: string
}
type ReadPublic = (path:string)=>Promise<Response>
type PublicModel = {id?:string; slug?:string; name?:string; cover_storage_key?:string}
type Row = {
  sha256:string; model_id:string; media_path:string; mime:string; selected_at:string
  name:string|null; franchise:string|null; category:string|null; category_slug:string|null; slug:string|null
  published:number|null; telegram_group_key:string|null; telegram_showcase_visible:number|null
  telegram_review_status:string|null; telegram_rights_status:string|null; telegram_name_provisional:number|null
}
class SelectionError extends Error {
  constructor(readonly code:string, readonly status:number) {super(code)}
}
function fail(code:string,status=503):never {throw new SelectionError(code,status)}
function reply(request:Request,env:PromotionEnv,data:unknown,status=200) {
  const h = new Headers({'cache-control':'private, no-store','vary':'Origin, Authorization','x-content-type-options':'nosniff','content-type':'application/json; charset=utf-8'})
  const origin=request.headers.get('origin')
  if(origin && (env.CORS_ORIGINS||'').split(',').map(x=>x.trim()).includes(origin)){
    h.set('access-control-allow-origin',origin)
    h.set('access-control-allow-methods','GET, POST, OPTIONS')
    h.set('access-control-allow-headers','authorization, content-type')
  }
  return new Response(status===204?null:JSON.stringify(data),{status,headers:h})
}
async function bytes(response:Request|Response,max:number) {
  if(Number(response.headers.get('content-length')||0)>max)fail('payload_too_large',413)
  if(!response.body)fail('empty_payload',400)
  const reader=response.body.getReader(), chunks:Uint8Array[]=[]
  let size=0
  try{
    for(;;){
      const {value,done}=await reader.read()
      if(done)break
      size+=value.byteLength
      if(size>max){await reader.cancel();fail('payload_too_large',413)}
      chunks.push(value)
    }
  }finally{reader.releaseLock()}
  if(!size)fail('empty_payload',400)
  const result=new Uint8Array(size)
  let offset=0
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength}
  return result
}
async function jsonRead<T>(read:ReadPublic,path:string):Promise<T>{
  const r=await read(path)
  if(!r.ok)fail('public_model_unavailable',r.status===404?404:503)
  return r.json() as Promise<T>
}
function storagePath(key:string){return '/'+key.split('/').map(encodeURIComponent).join('/')}
async function resolveImage(data:{path?:unknown;modelSlug?:unknown},read:ReadPublic){
  const {path,modelSlug}=data
  if(typeof path!=='string'||path.length>1400||!path.startsWith('/')||/[?#\\\x00-\x1f]/.test(path))fail('invalid_source',400)
  const tg=MEDIA.exec(path)
  let model:PublicModel,mediaPath:string
  if(tg){
    model=await jsonRead(read,'/api/telegram-studios/'+tg[1])
    if(model.id!==tg[1])fail('invalid_model',409)
    mediaPath='/api/telegram-studios/'+tg[1]+'/media/'+tg[2]+'/display'
  }else{
    const key=publicMediaKey(path)
    if(!key||isRestrictedCatalogMediaPath(path.slice(1))||typeof modelSlug!=='string'||!SLUG.test(modelSlug))fail('invalid_source',400)
    const detail='/api/models/'+modelSlug
    model=await jsonRead(read,detail)
    // Prefer the existing detail variant for a selected image; never invent a path.
    let chosen=model.cover_storage_key===key?key:null
    let cursor:string|null=null
    for(let i=0;i<10;i++){
      const params=new URLSearchParams({limit:'60'})
      if(cursor)params.set('cursor',cursor)
      const page:{items?:Array<{variantKeys?:Record<string,unknown>}>;nextCursor?:string|null}=await jsonRead(read,detail+'/images?'+params)
      const match=page.items?.find(image=>['thumb','card','detail'].some(role=>image.variantKeys?.[role]===key))
      if(match){const detailKey=match.variantKeys?.detail;chosen=typeof detailKey==='string'?detailKey:key;break}
      if(!page.nextCursor||page.nextCursor===cursor)break
      cursor=page.nextCursor
    }
    if(!chosen)fail('media_not_in_public_model',404)
    mediaPath=storagePath(chosen)
    if(!publicMediaKey(mediaPath)||isRestrictedCatalogMediaPath(mediaPath.slice(1)))fail('invalid_source',400)
  }
  if(typeof model.id!=='string'||! /^(?:tg_[a-f0-9]{24}|mdl_[a-f0-9]{16,40})$/.test(model.id))fail('invalid_model',409)
  const response=await read(mediaPath)
  const mime=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()
  if(response.status!==200||!Object.hasOwn(MIME,mime))fail('public_image_unavailable',404)
  const content=await bytes(response,MAX_BYTES)
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',content as Uint8Array<ArrayBuffer>)),x=>x.toString(16).padStart(2,'0')).join('')
  return {modelId:model.id,mediaPath,mime,sha256}
}
function safeName(value:string){return value.normalize('NFC').replace(/[\p{Cc}<>:"/\\|?*]/gu,'-').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,120)}
function project(row:Row){
  const telegram=!!row.telegram_group_key
  const visible=telegram
    ? row.telegram_showcase_visible===1&&row.telegram_review_status!=='rejected'&&row.telegram_rights_status!=='rejected'
    : row.published===1
  const blocked= !visible||!row.name || (row.media_path.startsWith('/media/')&&isRestrictedCatalogMediaPath(row.media_path.slice(1)))
  const eligible=!blocked&&(!telegram||row.telegram_rights_status==='approved')
  const category=row.telegram_name_provisional===1||!row.category||row.category_slug==='curadoria-pendente'?'A identificar':row.category
  const name=row.name||'Modelo indisponível'
  const base=safeName(name+(row.franchise&&!name.toLowerCase().includes(row.franchise.toLowerCase())?' - '+row.franchise:''))
  return {sha256:row.sha256,modelId:row.model_id,modelSlug:row.slug,name,franchise:row.franchise||'',category,
    mediaPath:blocked?null:row.media_path,mime:row.mime,selectedAt:row.selected_at,
    exportable:eligible,reason:blocked?'Mídia indisponível ou em revisão':eligible?null:'Direitos ainda não aprovados',
    filename:base+' - '+row.sha256.slice(0,12)+'.'+MIME[row.mime]}
}
async function list(env:PromotionEnv){
  const result=await env.DB.prepare('SELECT s.sha256,s.model_id,s.media_path,s.mime,s.selected_at,'+
    'm.name,m.slug,m.published,m.telegram_group_key,m.telegram_showcase_visible,m.telegram_review_status,m.telegram_rights_status,m.telegram_name_provisional,'+
    'f.name AS franchise,c.name AS category,c.slug AS category_slug FROM promotion_image_selections s '+
    'LEFT JOIN models m ON m.id=s.model_id LEFT JOIN franchises f ON f.id=m.franchise_id LEFT JOIN categories c ON c.id=f.category_id '+
    'WHERE s.campaign=? ORDER BY s.selected_at DESC,s.sha256 LIMIT ?').bind(CAMPAIGN,MAX_ITEMS+1).all<Row>()
  if(result.results.length>MAX_ITEMS)fail('selection_limit_exceeded',409)
  return result.results.map(project)
}
export async function routePromotion(request:Request,env:PromotionEnv,read:ReadPublic){
  const origin=request.headers.get('origin')
  if(origin&&!(env.CORS_ORIGINS||'').split(',').map(x=>x.trim()).includes(origin))return reply(request,env,{error:'origin_denied'},403)
  if(request.method==='OPTIONS')return reply(request,env,null,204)
  const auth=await verifyAdmin(request,env)
  if(auth!==true)return reply(request,env,{error:auth===null?'admin_auth_unconfigured':'admin_required'},auth===null?503:403)
  try{
    const query=new URL(request.url).searchParams
    if(request.method==='GET'){
      if(query.size)fail('invalid_query',400)
      return reply(request,env,{version:1,campaign:CAMPAIGN,generatedAt:new Date().toISOString(),items:await list(env)})
    }
    if(request.method!=='POST'||query.size||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))fail('invalid_request',400)
    let data: {action?:unknown;sha256?:unknown;path?:unknown;modelSlug?:unknown}
    try{data=JSON.parse(new TextDecoder().decode(await bytes(request,4096)))}catch(e){if(e instanceof SelectionError)throw e;fail('invalid_request',400)}
    if(!data||typeof data!=='object'||Array.isArray(data))fail('invalid_request',400)
    if(data.action==='remove'){
      if(typeof data.sha256!=='string'||!SHA.test(data.sha256))fail('invalid_selection',400)
      await env.DB.prepare('DELETE FROM promotion_image_selections WHERE campaign=? AND sha256=?').bind(CAMPAIGN,data.sha256).run()
      return reply(request,env,{removed:true,sha256:data.sha256})
    }
    if(data.action!=='add')fail('invalid_action',400)
    const selected=await resolveImage(data,read)
    // One row per exact content hash in each campaign; atomic bound prevents parallel cap races.
    await env.DB.prepare('INSERT INTO promotion_image_selections(campaign,sha256,model_id,media_path,mime) '+
      'SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM promotion_image_selections WHERE campaign=?)<? ON CONFLICT(campaign,sha256) DO NOTHING')
      .bind(CAMPAIGN,selected.sha256,selected.modelId,selected.mediaPath,selected.mime,CAMPAIGN,MAX_ITEMS).run()
    const persisted=await env.DB.prepare('SELECT sha256 FROM promotion_image_selections WHERE campaign=? AND sha256=?').bind(CAMPAIGN,selected.sha256).first<{sha256:string}>()
    if(persisted?.sha256!==selected.sha256)fail('selection_limit_exceeded',409)
    return reply(request,env,{saved:true,sha256:selected.sha256})
  }catch(error){return reply(request,env,{error:error instanceof SelectionError?error.code:'promotion_unavailable'},error instanceof SelectionError?error.status:503)}
}
