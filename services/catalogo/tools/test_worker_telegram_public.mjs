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
 const row={id,name:"Escultura Teste",telegram_studio:"Studio A",telegram_character:"Escultura Teste",variant_name:"Busto",telegram_origin_id:"2370335738",telegram_name_provisional:1,telegram_gallery_order:'[1212]',image_count:1,cover_sha:sha,category:"Anime",category_slug:"anime"};
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
 assert.equal(res.headers.get("cache-control"),"public, max-age=0, s-maxage=60");
 const b=await res.json();
 assert.equal(b.total,1);assert.equal(b.items[0].id,id);assert.equal(b.items[0].provisional,true);
 assert.equal(b.items[0].cover,"/api/telegram-studios/"+id+"/media/"+sha+"/thumb");
 assert.ok(queries.every(s=>!s.includes("m.published=1")));
 assert.ok(queries.some(s=>s.includes("m.telegram_group_key IS NOT NULL")));
 assert.equal(keys.length,0);
 const studios=await routeTelegramStudioShowcase(request("/studios"),env);
 assert.deepEqual((await studios.json()).studios,[{studio:"Studio A",total:1}]);
 assert.equal(studios.headers.get("cache-control"),"public, max-age=0, s-maxage=300");
});
test("only anonymous successful Telegram lists are CDN cacheable; details, invalid and errors never are",async()=>{
 const {env}=fixture();
 for (const url of ["?limit=24", "/studios"]) {
  const request=new Request(base+url,{headers:{authorization:"Bearer private-request"}});
  const response=await routeTelegramStudioShowcase(request,env);
  assert.equal(response.headers.get("cache-control"),"no-store");
  const cookieRequest=new Request(base+url,{headers:{cookie:"session=private-request"}});
  assert.equal((await routeTelegramStudioShowcase(cookieRequest,env)).headers.get("cache-control"),"no-store");
 }
 assert.equal((await routeTelegramStudioShowcase(request("/"+id),env)).headers.get("cache-control"),"no-store");
 assert.equal((await routeTelegramStudioShowcase(request("?limit=999"),env)).headers.get("cache-control"),"no-store");
 const down=await routeTelegramStudioShowcase(request("/studios"),{...env,DB:undefined});
 assert.equal(down.status,503);
 assert.equal(down.headers.get("cache-control"),"no-store");
});


test("Worker edge cache reuses anonymous list/studio responses without repeat D1 reads", async () => {
 const previous=Object.getOwnPropertyDescriptor(globalThis,"caches");
 const entries=new Map(),seen={match:0,put:0};
 const fake={
   default:{
     async match(req){seen.match++;return entries.get(req.url)?.clone()},
     async put(req,res){seen.put++;entries.set(req.url,res.clone())},
   },
 };
 Object.defineProperty(globalThis,"caches",{configurable:true,writable:true,value:fake});
 try {
   const {env,queries}=fixture(),pending=[];
   const bg={waitUntil(p){pending.push(p)}};
   const url=request("?limit=24&offset=0");
   const first=await routeTelegramStudioShowcase(url,env,bg);
   assert.equal(first.status,200);
   await Promise.all(pending);
   const d1AfterFirst=queries.length;
   assert.equal(d1AfterFirst,2);
   const second=await routeTelegramStudioShowcase(url,env,bg);
   assert.equal(second.status,200);
   assert.deepEqual(await second.json(),await first.json());
   assert.equal(queries.length,d1AfterFirst,"repeated model listing must use cache");
   assert.equal(seen.put,1);
   const studioUrl=request("/studios");
   const studio=await routeTelegramStudioShowcase(studioUrl,env,bg);
   assert.equal(studio.status,200);
   await Promise.all(pending);
   const d1AfterStudio=queries.length;
   assert.equal(d1AfterStudio,3);
   assert.deepEqual(await (await routeTelegramStudioShowcase(studioUrl,env,bg)).json(),
                    await studio.json());
   assert.equal(queries.length,d1AfterStudio,"repeated studio list must use cache");
   assert.equal(seen.put,2);
 } finally {
   if(previous)Object.defineProperty(globalThis,"caches",previous);
   else delete globalThis.caches;
 }
});

test("Worker cache never stores private, invalid, detail, media or D1-error responses", async () => {
 const previous=Object.getOwnPropertyDescriptor(globalThis,"caches");
 const entries=new Map(),seen={match:0,put:0};
 Object.defineProperty(globalThis,"caches",{configurable:true,value:{
   default:{
     async match(req){seen.match++;return entries.get(req.url)?.clone()},
     async put(req,res){seen.put++;entries.set(req.url,res.clone())},
   },
 }});
 try {
   const {env,queries,keys}=fixture();
   const priv=new Request(base+"?limit=24",{headers:{authorization:"Bearer sensitive"}});
   const cookie=new Request(base+"?limit=24",{headers:{cookie:"session=sensitive"}});
   for(const req of [priv,cookie]){
     const res=await routeTelegramStudioShowcase(req,env);
     assert.equal(res.status,200);
     assert.equal(res.headers.get("cache-control"),"no-store");
   }
   assert.equal(seen.match,0);
   assert.equal(seen.put,0);
   assert.equal((await routeTelegramStudioShowcase(request("?limit=100"),env)).status,400);
   assert.equal((await routeTelegramStudioShowcase(request("/"+id),env)).status,200);
   assert.equal((await routeTelegramStudioShowcase(request("/"+id+"/media/"+sha+"/thumb"),env)).status,200);
   assert.equal(keys.length,1);
   assert.equal(seen.match,0);
   assert.equal(seen.put,0);
   const failing={...env,DB:{prepare(){throw Error("D1 quota exceeded")}}};
   assert.equal((await routeTelegramStudioShowcase(request("?limit=24&offset=3"),failing)).status,503);
   assert.equal(seen.put,0,"D1 failure must never poison the edge cache");
   const recovered=await routeTelegramStudioShowcase(request("?limit=24&offset=3"),env);
   assert.equal(recovered.status,200);
   assert.equal(seen.put,1);
   assert.ok(queries.length>0);
 } finally {
   if(previous)Object.defineProperty(globalThis,"caches",previous);
   else delete globalThis.caches;
 }
});

test("indexed page is materialized before resolving gallery covers (4,200-model SQLite fixture)",async()=>{
 const db=new DatabaseSync(":memory:");
 try {
   db.exec(`
    CREATE TABLE models(
      id TEXT PRIMARY KEY,name TEXT,telegram_studio TEXT,telegram_character TEXT,
      telegram_origin_id TEXT,variant_name TEXT,image_count INTEGER,
      telegram_name_provisional INTEGER,telegram_group_key TEXT,
      telegram_showcase_visible INTEGER,telegram_review_status TEXT,
      telegram_rights_status TEXT,franchise_id INTEGER,cover_storage_key TEXT
    );
    CREATE TABLE categories(id INTEGER PRIMARY KEY, name TEXT,slug TEXT);
    CREATE TABLE franchises(id INTEGER PRIMARY KEY,category_id INTEGER);
    CREATE TABLE model_image_sources(
      model_id TEXT,gallery_version INTEGER,source_sha256 TEXT,position INTEGER
    );
    CREATE INDEX source_page_cover ON model_image_sources(model_id,gallery_version);
    CREATE INDEX idx_models_telegram_showcase_name
      ON models(telegram_showcase_visible,name COLLATE NOCASE,
                telegram_studio COLLATE NOCASE,id)
      WHERE telegram_group_key IS NOT NULL
        AND telegram_review_status <> 'rejected'
        AND telegram_rights_status <> 'rejected';
    INSERT INTO categories VALUES (1,'Anime','anime');
    INSERT INTO franchises VALUES (1,1);
   `);
   const insertModel=db.prepare("INSERT INTO models VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
   const insertImage=db.prepare("INSERT INTO model_image_sources VALUES (?,?,?,?)");
   const a="a".repeat(64), b="b".repeat(64);
   db.exec("BEGIN");
   for(let i=0;i<4200;i++){
     const modelId="tg_"+i.toString(16).padStart(24,"0");
     const studio=i%2===0?"Studio A":"Studio B";
     const cover="telegram-studios/v1/2370335738/telegram-webp-final-v1/bb/"+b+"/display.webp";
     insertModel.run(modelId,"Modelo "+String(i).padStart(5,"0"),studio,"Escultura",
                     "2370335738","Busto",2,0,modelId,1,"pending","not_reviewed",1,cover);
     insertImage.run(modelId,1,a,0);
     insertImage.run(modelId,1,b,1);
   }
   db.exec("COMMIT");
   const statements=[];
   const env={
     DB:{prepare(sql){
       statements.push(sql);
       const native=db.prepare(sql);
       let params=[];
       return {
         bind(...values){params=values;return this},
         async first(){return native.get(...params)||null},
         async all(){return {results:native.all(...params)}},
       };
     }},
     PRIVATE_TELEGRAM:{async get(){throw Error("list must never fetch R2")}},
   };
   const result=await routeTelegramStudioShowcase(request("?limit=24&offset=1000"),env);
   assert.equal(result.status,200);
   const payload=await result.json();
   assert.equal(payload.total,4200);
   assert.equal(payload.items.length,24);
   assert.equal(payload.items[0].name,"Modelo 01000");
   assert.equal(payload.items.at(-1).name,"Modelo 01023");
   assert.ok(payload.items.every(x=>x.cover.endsWith("/"+b+"/thumb")));
   const sql=statements.find(x=>x.includes("WITH page AS MATERIALIZED"));
   assert.ok(sql,"the real production list query must materialize a bounded page");
   assert.match(sql,/FROM page p JOIN models m ON m.id=p.id/);
   assert.ok(!sql.includes("ORDER BY m.name COLLATE NOCASE,m.telegram_studio COLLATE NOCASE,m.id LIMIT ? OFFSET ?' +\n        ' FROM"),"cover lookup must not precede limiting the IDs");
   const plan=db.prepare("EXPLAIN QUERY PLAN "+sql).all(24,1000);
   assert.ok(plan.some(x=>x.detail.includes("MATERIALIZE page")),JSON.stringify(plan));
   // SQLite instrumentation: a valid 24-item page has 48 source images.
   // Without page materialization the correlated cover calculation could
   // execute for every candidate model before LIMIT/OFFSET.
   let coverVisits=0;
   db.function("cover_probe",(_modelId)=>{coverVisits++;return 1});
   const traced=sql.replace(
     "ORDER BY CASE WHEN m.cover_storage_key=",
     "ORDER BY CASE WHEN cover_probe(m.id)=1 AND m.cover_storage_key=",
   );
   assert.notEqual(traced,sql);
   const tracedPage=db.prepare(traced).all(24,1000);
   assert.equal(tracedPage.length,24);
   assert.ok(coverVisits >= 24 && coverVisits <= 48,
     "cover evaluation must be bounded by the returned page, not 4,200 candidates: "+coverVisits);
   const filtered=await routeTelegramStudioShowcase(request("?studio=Studio%20B&category=anime&limit=24&offset=100"),env);
   assert.equal(filtered.status,200);
   const page=await filtered.json();
   assert.equal(page.total,2100);
   assert.equal(page.items[0].name,"Modelo 00201");
   assert.equal(page.items.length,24);
 }finally{db.close()}
});

test("global index search checks name, character and variant with bound values",async()=>{
 const {env,queries,bindings}=fixture();
 const response=await routeTelegramStudioShowcase(request("?studio=Studio%20A&q=Chibi&limit=24"),env);
 assert.equal(response.status,200);
 const sql=queries.find(x=>x.includes("ORDER BY m.name COLLATE NOCASE,m.telegram_studio COLLATE NOCASE"));
 assert.ok(sql.includes("ORDER BY m.name COLLATE NOCASE,m.telegram_studio COLLATE NOCASE,m.id LIMIT ? OFFSET ?"));
 assert.match(sql,/m.name LIKE \?/);
 assert.match(sql,/m.telegram_character LIKE \?/);
 assert.match(sql,/COALESCE\(m.variant_name/);
 const bound=bindings.find(x=>x.sql===sql);
 assert.deepEqual(bound.values,["Studio A","%Chibi%","%Chibi%","%Chibi%",24,0]);
});

test("category filter binds canonical taxonomy and rejects invalid slugs",async()=>{
 const {env,queries,bindings}=fixture();
 const response=await routeTelegramStudioShowcase(request("?category=anime&limit=24"),env);
 assert.equal(response.status,200);
 assert.equal((await response.json()).items[0].category,"Anime");
 const countSql=queries.find(x=>x.includes("SELECT COUNT(*) AS total"));
 assert.match(countSql,/m.franchise_id IN \(SELECT f.id FROM franchises f JOIN categories c ON c.id=f.category_id WHERE c.slug=\?\)/);
 assert.ok(!countSql.includes('FROM models m JOIN'));
 assert.match(countSql,/c.slug=\?/);
 const sql=queries.find(x=>x.includes("AS category_slug"));
 assert.match(sql,/c.slug=\?/);
 assert.deepEqual(bindings.find(x=>x.sql===sql)?.values,["anime",24,0]);
 for(const url of ["?category=Anime","?category=anime%20game","?category=anime&category=anime","?category=-anime"]){
  assert.equal((await routeTelegramStudioShowcase(request(url),env)).status,400,url);
 }
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

test("Telegram showcase alphabetical pagination uses the visibility-scoped D1 index", () => {
 const db = new DatabaseSync(":memory:");
 try {
  db.exec("CREATE TABLE models(id TEXT PRIMARY KEY,name TEXT NOT NULL,telegram_studio TEXT NOT NULL,telegram_group_key TEXT,telegram_showcase_visible INTEGER NOT NULL,telegram_review_status TEXT NOT NULL,telegram_rights_status TEXT NOT NULL)");
  const put = db.prepare("INSERT INTO models VALUES(?,?,?,?,?,?,?)");
  for(const row of [
   ["z","Zeta","Studio A","group-z",1,"pending","not_reviewed"],
   ["aB","Alpha","Studio B","group-a",1,"pending","not_reviewed"],
   ["aA","alpha","Studio A","group-b",1,"pending","not_reviewed"],
   ["hidden","Aardvark","Studio A","group-c",0,"pending","not_reviewed"],
   ["rejected","Aardvark","Studio A","group-d",1,"rejected","not_reviewed"],
   ["no-rights","Aardvark","Studio A","group-e",1,"pending","rejected"],
   ["no-group","Aardvark","Studio A",null,1,"pending","not_reviewed"],
  ]) put.run(...row);
  const migration = readFileSync(new URL("../migrations/0028_telegram_showcase_listing_index.sql",import.meta.url),"utf8");
  db.exec(migration);
  const query = "SELECT m.id FROM models m WHERE m.telegram_group_key IS NOT NULL AND m.telegram_showcase_visible=1 AND m.telegram_review_status<>'rejected' AND m.telegram_rights_status<>'rejected' ORDER BY m.name COLLATE NOCASE,m.telegram_studio COLLATE NOCASE,m.id LIMIT ? OFFSET ?";
  const plan = db.prepare("EXPLAIN QUERY PLAN " + query).all(24,0).map(row=>row.detail).join("\n");
  assert.match(plan,/USING INDEX idx_models_telegram_showcase_name/);
  assert.doesNotMatch(plan,/USE TEMP B-TREE/);
  assert.deepEqual(db.prepare(query).all(24,0).map(x=>x.id),["aA","aB","z"]);
  assert.deepEqual(db.prepare(query).all(2,1).map(x=>x.id),["aB","z"]);
 } finally { db.close(); }
});
