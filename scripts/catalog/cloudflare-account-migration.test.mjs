import test from "node:test";
import assert from "node:assert/strict";
import { planObjects, evaluateCutover } from "./cloudflare-account-migration.mjs";
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
