import assert from "node:assert/strict";
import { test } from "node:test";
import esbuild from "esbuild";
const entry = new URL("../worker/telegramPublic.ts", import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1");
const built = await esbuild.build({entryPoints:[entry], bundle:true, platform:"browser",format:"esm",target:"es2022",write:false});
const {routeTelegramStudioShowcase} = await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const id="tg_abcdef0123456789abcdef01",sha="a".repeat(64),base="https://worker.test/api/telegram-studios";
function fixture(){
 const queries=[],keys=[];
 const row={id,name:"Escultura Teste",telegram_studio:"Studio A",telegram_character:"Escultura Teste",variant_name:"Busto",telegram_origin_id:"2370335738",telegram_name_provisional:1,image_count:1,cover_sha:sha};
 return {queries,keys,env:{
  DB:{prepare(sql){queries.push(sql);let params=[];return {
   bind(...v){params=v;return this},
   async first(){if(sql.includes("COUNT(*)"))return {total:1};if(sql.includes("s.source_sha256")&&params[1]===sha)return {source_sha256:sha};if(sql.includes("FROM models m")&&params[0]===id)return row;return null},
   async all(){if(sql.includes("GROUP BY"))return {results:[{studio:"Studio A",total:1}]};if(sql.includes("SELECT m.id"))return {results:[row]};if(sql.includes("FROM model_image_sources"))return {results:[{image_id:"tg:1212",source_sha256:sha,position:0}]};return {results:[row]}}
  }}},
  PRIVATE_TELEGRAM:{async get(key){keys.push(key);return {body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode("RIFFxxxxWEBP"));c.close()}})}}}
 }};
}
const request=(path,method="GET")=>new Request(base+path,{method});
test("lists only Telegram D1 and studio counts",async()=>{
 const {env,queries,keys}=fixture();
 const res=await routeTelegramStudioShowcase(request("?limit=24&offset=0"),env);
 assert.equal(res.status,200);
 const b=await res.json();
 assert.equal(b.total,1);assert.equal(b.items[0].id,id);assert.equal(b.items[0].provisional,true);
 assert.equal(b.items[0].cover,"/api/telegram-studios/"+id+"/media/"+sha+"/thumb");
 assert.ok(queries.every(s=>!s.includes("m.published=1")));
 assert.ok(queries.some(s=>s.includes("m.telegram_group_key IS NOT NULL")));
 assert.equal(keys.length,0);
 const studios=await routeTelegramStudioShowcase(request("/studios"),env);
 assert.deepEqual((await studios.json()).studios,[{studio:"Studio A",total:1}]);
});
test("detail and gallery are bound to mapped model SHA",async()=>{
 const {env,keys}=fixture();
 const res=await routeTelegramStudioShowcase(request("/"+id),env);
 assert.equal(res.status,200);assert.equal((await res.json()).images.length,1);
 const img=await routeTelegramStudioShowcase(request("/"+id+"/media/"+sha+"/display"),env);
 assert.equal(img.status,200);assert.equal(img.headers.get("content-type"),"image/webp");
 assert.equal(img.headers.get("cache-control"),"no-store");
 assert.equal(keys.length,1);
 assert.equal(keys[0],"telegram-studios/v1/2370335738/telegram-webp-final-v1/aa/"+sha+"/display.webp");
 const denied=await routeTelegramStudioShowcase(request("/"+id+"/media/"+"b".repeat(64)+"/display"),env);
 assert.equal(denied.status,404);assert.equal(keys.length,1);
});
test("invalid queries, media keys and methods never read private R2",async()=>{
 const {env,keys}=fixture();
 assert.equal((await routeTelegramStudioShowcase(request("?offset=-1"),env)).status,400);
 assert.equal((await routeTelegramStudioShowcase(request("?limit=99"),env)).status,400);
 assert.equal((await routeTelegramStudioShowcase(request("?studio=A&studio=B"),env)).status,400);
 assert.equal((await routeTelegramStudioShowcase(request("/"+id+"/media/"+"x".repeat(64)+"/thumb"),env)).status,404);
 assert.equal((await routeTelegramStudioShowcase(request("","POST"),env)).status,405);
 assert.equal(keys.length,0);
});
