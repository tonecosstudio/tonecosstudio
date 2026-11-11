import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {propose} from "./propose-specialstl-quarantine.mjs";
const ace="mdl_ae8d28d2fa93b1367b0a";
const other="mdl_5f5953cbdc3a39536df3";
const maker="mdl_e8b7681b5258d694b9c4";
const row=(id,slug)=>({id,slug,name:slug,cover_storage_key:"media/"+id+"/img_abc123/card.webp"});
const snapshot={items:[row(ace,"ace-duck"),row(other,"duckpool"),row(maker,"10h")]};
const base={version:1,policy:"SpecialSTL only, not legitimate author marks",
  confirmed:[{modelId:ace,slug:"ace-duck",coverStorageKey:snapshot.items[0].cover_storage_key,
    evidence:"Photo visually reviewed"}]};
const decision=(row,kind)=>({modelId:row.id,slug:row.slug,coverStorageKey:row.cover_storage_key,decision:kind,reviewedAt:"2026-11-07T00:00:00.000Z"});
test("candidate merges only confirmed images, retains existing and creator credits",()=>{
  const r=propose(snapshot,{version:1,decisions:[decision(snapshot.items[1],"specialstl"),decision(snapshot.items[2],"creator")]},base);
  assert.equal(r.summary.confirmedNew,1);assert.equal(r.summary.legitimateCreatorCredits,1);
  assert.deepEqual(r.candidate.confirmed.map(x=>x.modelId).sort(),[ace,other].sort());
  assert.equal(r.summary.networkRequests,0);
  const pending = r.candidate.confirmed.find(x=>x.modelId===other);
  assert.deepEqual(pending.replacement,{
    status:"pending_authorized_clean_photo",approvedImageStorageKey:null,
  });
  // Existing quarantined records are preserved, never auto-published.
  assert.deepEqual(r.candidate.confirmed.find(x=>x.modelId===ace),base.confirmed[0]);
  assert.equal(base.confirmed.length,1);
});
test("rejects missing IDs, key mismatches, and conflicting creator decisions",()=>{
  const sample=decision(snapshot.items[1],"specialstl");
  assert.throws(()=>propose(snapshot,{version:1,decisions:[{...sample,coverStorageKey:"media/"+other+"/wrong/card.webp"}]},base),/stale_unmapped/);
  assert.throws(()=>propose(snapshot,{version:1,decisions:[sample,sample]},base),/stale_unmapped/);
  assert.throws(()=>propose(snapshot,{version:1,decisions:[decision(snapshot.items[0],"creator")]},base),/conflicting_creator/);
  assert.throws(()=>propose(snapshot,{version:1,decisions:[{...sample,modelId:"mdl_00000000000000000000"}]},base),/stale_unmapped/);
});
test("writes candidate only and refuses to overwrite it or canonical quarantine",async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"tonart-proposal-"));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const file=(name,obj)=>fs.writeFile(path.join(dir,name),JSON.stringify(obj));
  await file("snapshot.json",snapshot);
  await file("decisions.json",{version:1,decisions:[decision(snapshot.items[1],"specialstl")]});
  await file("current.json",base);
  const cli=path.resolve("scripts/catalog/propose-specialstl-quarantine.mjs");
  const args=["--snapshot="+path.join(dir,"snapshot.json"),
    "--decisions="+path.join(dir,"decisions.json"),
    "--quarantine="+path.join(dir,"current.json"),
    "--out="+path.join(dir,"candidate.json")];
  const output=JSON.parse(execFileSync(process.execPath,[cli,...args],{encoding:"utf8"}));
  assert.equal(output.status,"CANDIDATE_ONLY_NOT_PUBLISHED_OR_APPLIED");
  assert.equal(output.proposedTotal,2);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir,"current.json"),"utf8")),base);
  assert.throws(()=>execFileSync(process.execPath,[cli,...args],{stdio:"pipe"}));
  assert.throws(()=>execFileSync(process.execPath,[cli,...args.slice(0,3),"--out="+path.join(dir,"current.json")],{stdio:"pipe"}));
});
