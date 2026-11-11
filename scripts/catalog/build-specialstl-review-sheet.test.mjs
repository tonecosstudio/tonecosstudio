import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";

const script = path.resolve("scripts/catalog/build-specialstl-review-sheet.mjs");
const ace = "mdl_ae8d28d2fa93b1367b0a";
test("offline reviewer opens bounded local batches, never fetches remote images", async t => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"specialstl-review-"));
  t.after(async()=>fs.rm(dir,{recursive:true,force:true}));
  const root=path.join(dir,"cache");
  const key="media/"+ace+"/img_1ccf2edb6736ca445dea/card.webp";
  await fs.mkdir(path.dirname(path.join(root,key)),{recursive:true});
  await fs.writeFile(path.join(root,key),"local-image-placeholder");
  const manifest=path.join(dir,"snapshot.json");
  await fs.writeFile(manifest,JSON.stringify({items:[{id:ace,slug:"as-tartarugas-ninja-ace-duck",name:"Ace Duck",cover_storage_key:key}]}));
  const out=path.join(dir,"sheet.html");
  const response=execFileSync(process.execPath,[script,"--manifest="+manifest,"--assets-root="+root,"--out="+out],{encoding:"utf8"});
  const summary=JSON.parse(response);
  assert.equal(summary.models,1);
  assert.equal(summary.locallyAvailable,1);
  assert.equal(summary.networkRequests,0);
  const html=await fs.readFile(out,"utf8");
  assert.match(html,/SpecialSTL confirmado/);
  assert.match(html,/Ace Duck/);
  assert.match(html,/file:\/\//);
  assert.match(html,/perPage = 48/);
  assert.doesNotMatch(html,/<script[^>]+src=/);
});
test("rejects remote URLs and path traversal without opening local media",async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"specialstl-reject-"));
  t.after(async()=>fs.rm(dir,{recursive:true,force:true}));
  const manifest=path.join(dir,"snapshot.json");
  for(const key of ["https://remote.example/test.webp","media/../escape.webp","media/"+ace+"/../other.webp"]){
    await fs.writeFile(manifest,JSON.stringify({items:[{id:ace,slug:"ace-duck",cover_storage_key:key}]}));
    await assert.rejects(async()=>{
      execFileSync(process.execPath,[script,"--manifest="+manifest,"--assets-root="+dir,"--out="+path.join(dir,"out.html")],{stdio:"pipe"});
    });
  }
});
