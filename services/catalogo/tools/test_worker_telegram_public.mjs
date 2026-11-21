import assert from "node:assert/strict";
import { test } from "node:test";
import esbuild from "esbuild";
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const entry = new URL("../worker/telegramPublic.ts", import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1");
const built = await esbuild.build({entryPoints:[entry], bundle:true, platform:"browser",format:"esm",target:"es2022",write:false});
const {routeTelegramStudioShowcase} = await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const id="tg_abcdef0123456789abcdef01",sha="a".repeat(64),base="https://worker.test/api/telegram-studios";
function fixture(){
 const queries=[],keys=[],bindings=[];
 const row={id,name:"Escultura Teste",telegram_studio:"Studio A",telegram_character:"Escultura Teste",variant_name:"Busto",telegram_origin_id:"2370335738",telegram_name_provisional:1,telegram_gallery_order:'[1212]',image_count:1,cover_sha:sha};
 const sources=[{image_id:"tg:1212",source_sha256:sha,position:0}];
 return {row,sources,queries,keys,bindings,env:{
  DB:{prepare(sql){queries.push(sql);let params=[];return {
   bind(...v){params=v;bindings.push({sql,values:v});return this},
   async first(){if(sql.includes("COUNT(*)"))return {total:1};if(sql.includes("s.source_sha256")&&params[1]===sha)return {source_sha256:sha};if(sql.includes("FROM models m")&&params[0]===id)return row;return null},
   async all(){if(sql.includes("GROUP BY"))return {results:[{studio:"Studio A",total:1}]};if(sql.includes("SELECT m.id"))return {results:[row]};if(sql.includes("FROM model_image_sources"))return {results:sources};return {results:[row]}}
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
test("global index search checks name, character and variant with bound values",async()=>{
 const {env,queries,bindings}=fixture();
 const response=await routeTelegramStudioShowcase(request("?studio=Studio%20A&q=Chibi&limit=24"),env);
 assert.equal(response.status,200);
 const sql=queries.find(x=>x.includes("ORDER BY m.telegram_studio COLLATE NOCASE"));
 assert.match(sql,/m.name LIKE \?/);
 assert.match(sql,/m.telegram_character LIKE \?/);
 assert.match(sql,/COALESCE\(m.variant_name/);
 const bound=bindings.find(x=>x.sql===sql);
 assert.deepEqual(bound.values,["Studio A","%Chibi%","%Chibi%","%Chibi%",24,0]);
});

test("provisional filter is server-side and rejects unexpected values",async()=>{
 const {env,queries}=fixture();
 const filtered=await routeTelegramStudioShowcase(request("?provisional=1&limit=24"),env);
 assert.equal(filtered.status,200);
 assert.ok(queries.some(x=>x.includes("m.telegram_name_provisional=1")));
 assert.equal((await routeTelegramStudioShowcase(request("?provisional=2"),env)).status,400);
 assert.equal((await routeTelegramStudioShowcase(request("?provisional=1&provisional=0"),env)).status,400);
 assert.equal((await routeTelegramStudioShowcase(request("?provisional=true"),env)).status,400);
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

test("public gallery and cover follow the private editor's confirmed photo order",async()=>{
 const {env,row,sources,queries}=fixture();
 const otherSha="b".repeat(64);
 sources.push({image_id:"tg:3434",source_sha256:otherSha,position:1});
 row.image_count=2;
 row.telegram_gallery_order="[3434,1212]";
 const detail=await routeTelegramStudioShowcase(request("/"+id),env);
 assert.equal(detail.status,200);
 const gallery=(await detail.json()).images;
 assert.deepEqual(gallery.map(x=>x.position),[0,1]);
 assert.deepEqual(gallery.map(x=>x.display),[
   "/api/telegram-studios/"+id+"/media/"+otherSha+"/display",
   "/api/telegram-studios/"+id+"/media/"+sha+"/display",
 ]);
 const list=await routeTelegramStudioShowcase(request("?limit=24"),env);
 assert.equal(list.status,200);
 assert.ok(queries.some(x=>x.includes("m.cover_storage_key")&&x.includes("s.source_sha256")));
 // Malformed or repeated order metadata must never duplicate or drop a source.
 row.telegram_gallery_order="[1212,1212]";
 const repeated=await routeTelegramStudioShowcase(request("/"+id),env);
 assert.deepEqual((await repeated.json()).images.map(x=>x.display),[
   "/api/telegram-studios/"+id+"/media/"+sha+"/display",
   "/api/telegram-studios/"+id+"/media/"+otherSha+"/display",
 ]);
 row.telegram_gallery_order="invalid-json";
 const malformed=await routeTelegramStudioShowcase(request("/"+id),env);
 assert.deepEqual((await malformed.json()).images.map(x=>x.display),[
   "/api/telegram-studios/"+id+"/media/"+sha+"/display",
   "/api/telegram-studios/"+id+"/media/"+otherSha+"/display",
 ]);
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

test("all public studio listings, details and media enforce explicit showcase visibility",async()=>{
 const {env,queries,keys}=fixture();
 for(const url of ["/studios","?studio=Studio%20A","/"+id,"/"+id+"/media/"+sha+"/thumb"]){
  const response=await routeTelegramStudioShowcase(request(url),env);
  assert.equal(response.status,200);
 }
 const modelQueries=queries.filter(sql=>/FROM models m\b/.test(sql));
 assert.ok(modelQueries.length>=4);
 assert.ok(modelQueries.every(sql=>sql.includes("m.telegram_showcase_visible=1")));
 assert.equal(keys.length,1);
});

test("showcase migration preserves existing visible rows and keeps new drafts private",()=>{
 const db=new DatabaseSync(":memory:");
 try{
  db.exec("CREATE TABLE models (id TEXT PRIMARY KEY, telegram_group_key TEXT, telegram_review_status TEXT, telegram_rights_status TEXT, telegram_studio TEXT, name TEXT);");
  const put=db.prepare("INSERT INTO models (id,telegram_group_key,telegram_review_status,telegram_rights_status,telegram_studio,name) VALUES (?,?,?,?,?,?)");
  put.run("shown","a","pending","not_reviewed","Studio A","Already visible");
  put.run("shown2","b","reviewing","not_reviewed","Studio B","Another existing");
  put.run("rejected","c","rejected","not_reviewed","Studio A","Rejected");
  put.run("unrelated",null,"pending","not_reviewed","Commercial","Untouched");
  const sql=readFileSync(new URL("../migrations/0025_telegram_showcase_private_visibility.sql",import.meta.url),"utf8");
  db.exec(sql);
  const status=(name)=>db.prepare("SELECT telegram_showcase_visible AS visible FROM models WHERE id=?").get(name)?.visible;
  assert.equal(status("shown"),1);
  assert.equal(status("shown2"),1);
  assert.equal(status("rejected"),0);
  assert.equal(status("unrelated"),0);
  put.run("new-private","d","pending","not_reviewed","VX-Labs","Private draft");
  assert.equal(status("new-private"),0);
  assert.throws(()=>db.prepare("UPDATE models SET telegram_showcase_visible=1 WHERE id='new-private'").run(),/showcase requires editorial review and rights/);
  assert.throws(()=>db.prepare("INSERT INTO models(id,telegram_group_key,telegram_review_status,telegram_rights_status,telegram_studio,name,telegram_showcase_visible) VALUES('bad','e','pending','not_reviewed','VX-Labs','Wrong',1)").run(),/showcase requires editorial review and rights/);
  assert.equal(status("new-private"),0);
  db.prepare("UPDATE models SET telegram_review_status='confirmed',telegram_rights_status='approved' WHERE id='new-private'").run();
  assert.equal(status("new-private"),0,"approval must not automatically publish");
  db.prepare("UPDATE models SET telegram_showcase_visible=1 WHERE id='new-private'").run();
  assert.equal(status("new-private"),1);
  db.prepare("UPDATE models SET telegram_rights_status='not_reviewed' WHERE id='new-private'").run();
  assert.equal(status("new-private"),0,"revoking rights withdraws the public preview");
 }finally{db.close()}
});
