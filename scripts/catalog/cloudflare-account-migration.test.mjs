import test from "node:test";
import assert from "node:assert/strict";
import { planObjects, evaluateCutover, planScopedR2Jobs } from "./cloudflare-account-migration.mjs";
const a = {key:"a",size:12,etag:"aa"};
const b = {key:"b",size:4,etag:"bb"};
test("initial transfer and idempotent resume",()=>{
  assert.equal(planObjects([a,b],[]).missingBytes,16);
  const p=planObjects([a,b],[{...a,etag:'"aa"'}]);
  assert.deepEqual(p.missing,["b"]);assert.deepEqual(p.matched,["a"]);
  assert.equal(p.readyForMissingOnlyCopy,true);
  assert.equal(planObjects([a,b],[a,b]).metadataParity,true);
});
test("same-key mismatch and target-only objects block copy",()=>{
  const p=planObjects([a],[{...a,etag:"cc"},b]);
  assert.deepEqual(p.conflicts,["a"]);assert.deepEqual(p.extras,["b"]);
  assert.equal(p.readyForMissingOnlyCopy,false);
  assert.equal(p.metadataParity,false);
});
test("invalid and duplicated inventories fail closed",()=>{
  assert.throws(()=>planObjects([a,a],[]),/duplicate_inventory_key/);
  assert.throws(()=>planObjects([{...a,size:-1}],[]),/invalid_inventory_record/);
  assert.throws(()=>planObjects(null,[]),/inventory_required/);
});
test("every cutover proof is mandatory",()=>{
  const initial=evaluateCutover({});assert.equal(initial.ready,false);
  const e=Object.fromEntries(initial.blockers.map(k=>[k,true]));
  assert.equal(evaluateCutover(e).ready,true);
  for(const k of initial.blockers){assert.equal(evaluateCutover({...e,[k]:false}).ready,false);}
});

const scope={bucket:"private",prefix:"telegram-studios/"};
const x={key:"telegram-studios/a",size:12,etag:"aa"},y={key:"telegram-studios/b",size:4,etag:"bb"};
const input={sourceInventories:{private:{complete:true,objects:[x,y,{key:"stlforge-cl/held",size:999999,etag:"cc"}]}},targetInventories:{private:{complete:true,objects:[x]}},scopes:[scope],maxBytes:4,maxObjects:1};
test("only missing approved keys are submitted to native copy, never held archives",()=>{
 const p=planScopedR2Jobs(input);assert.equal(p.ready,true);assert.equal(p.missingBytes,4);assert.equal(p.matchedObjects,1);assert.deepEqual(p.jobs,[{overwrite:false,source:{vendor:"r2",bucket:"private",keys:[y.key]},target:{vendor:"r2",bucket:"private"}}]);
 assert.deepEqual(planScopedR2Jobs({...input,targetInventories:{private:{complete:true,objects:[x,y]}}}).jobs,[]);
});
test("incomplete inventory, overlapping scope, budget and conflicts block submission",()=>{
 assert.throws(()=>planScopedR2Jobs({...input,sourceInventories:{private:{complete:false,objects:[x]}}}),/complete_inventory_required/);
 assert.throws(()=>planScopedR2Jobs({...input,scopes:[scope,{...scope,prefix:"telegram-studios/a/"}]}),/overlapping_scope/);
 assert.deepEqual(planScopedR2Jobs({...input,maxBytes:3}).jobs,[]);
 assert.deepEqual(planScopedR2Jobs({...input,maxObjects:0}).jobs,[]);
 assert.deepEqual(planScopedR2Jobs({...input,targetInventories:{private:{complete:true,objects:[{...x,etag:"xx"}]}}}).jobs,[]);
});
test("exact-key jobs obey provider 10000-key limit",()=>{
 const objects=Array.from({length:10001},(_,i)=>({key:"telegram-studios/"+i,size:1,etag:"a"+i}));
 const p=planScopedR2Jobs({...input,sourceInventories:{private:{complete:true,objects}},targetInventories:{private:{complete:true,objects:[]}},maxBytes:10001,maxObjects:10001});
 assert.equal(p.ready,true);assert.deepEqual(p.jobs.map(j=>j.source.keys.length),[10000,1]);
});
