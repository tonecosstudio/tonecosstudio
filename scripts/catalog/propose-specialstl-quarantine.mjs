/**
 * Merge manual SpecialSTL classifications into a proposed quarantine JSON.
 * Purely local IO: this never updates the live quarantine, Worker, D1 or R2.
 *
 * node scripts/catalog/propose-specialstl-quarantine.mjs
 *   --snapshot=/path/catalog-snapshot.json
 *   --decisions=/path/specialstl-review-decisions.json
 *   --quarantine=src/services/catalog/specialstl-quarantine.json
 *   --out=/path/specialstl-quarantine.candidate.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";

const ID = /^mdl_[0-9a-f]{20}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,239}$/;
const DECISIONS = new Set(["specialstl", "creator", "uncertain"]);
function requiredText(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error("invalid_" + name);
  return value;
}
function validKey(key, id) {
  return typeof key === "string" && key.length <= 4096 &&
    key.startsWith("media/" + id + "/") &&
    key.split("/").every(part=>part && part !== "." && part !== ".." && /^[A-Za-z0-9._-]+$/.test(part));
}
function readArgs(argv) {
  const out={};
  for(const arg of argv){
    const match=/^--(snapshot|decisions|quarantine|out)=(.+)$/.exec(arg);
    if(!match || out[match[1]]) throw new Error("invalid_or_duplicate_argument");
    out[match[1]]=match[2];
  }
  if(Object.keys(out).length!==4) throw new Error("required_snapshot_decisions_quarantine_out");
  const abs=Object.fromEntries(Object.entries(out).map(([k,v])=>[k,path.resolve(v)]));
  if(new Set(Object.values(abs)).size!==4) throw new Error("input_output_paths_must_be_distinct");
  return abs;
}
function snapshotMap(source) {
  const rows=Array.isArray(source)?source:source?.items;
  if(!Array.isArray(rows) || rows.length>100000) throw new Error("invalid_snapshot");
  const map=new Map();
  for(const row of rows){
    const id=requiredText(row?.id??row?.modelId,"snapshot_id");
    const slug=requiredText(row?.slug,"snapshot_slug");
    const key=requiredText(row?.cover_storage_key??row?.coverStorageKey,"snapshot_key");
    if(!ID.test(id)||!SLUG.test(slug)||!validKey(key,id)||map.has(id)) throw new Error("invalid_or_duplicate_snapshot_model");
    map.set(id,{modelId:id,slug,coverStorageKey:key});
  }
  return map;
}
export function propose(snapshot, reviewed, current) {
  const models=snapshotMap(snapshot);
  if(reviewed?.version!==1||!Array.isArray(reviewed.decisions)) throw new Error("invalid_review_export");
  if(current?.version!==1||!Array.isArray(current.confirmed)||typeof current.policy!=="string") throw new Error("invalid_quarantine");
  const selected=new Map();
  for(const r of reviewed.decisions){
    const id=requiredText(r?.modelId,"review_id");
    const slug=requiredText(r?.slug,"review_slug");
    const key=requiredText(r?.coverStorageKey,"review_key");
    const kind=requiredText(r?.decision,"review_decision");
    const exact=models.get(id);
    if(!ID.test(id)||!DECISIONS.has(kind)||!exact||exact.slug!==slug||
       exact.coverStorageKey!==key||selected.has(id)) throw new Error("stale_unmapped_or_duplicate_review");
    selected.set(id,{...exact,decision:kind,reviewedAt:r.reviewedAt??null});
  }
  const existing=new Map();
  for(const c of current.confirmed){
    const id=requiredText(c?.modelId,"confirmed_id");
    if(!ID.test(id)||!SLUG.test(c.slug)||!validKey(c.coverStorageKey,id)||!c.evidence||
       existing.has(id)) throw new Error("invalid_or_duplicate_existing_quarantine");
    const snap=models.get(id);
    if(snap && (snap.slug!==c.slug||snap.coverStorageKey!==c.coverStorageKey)) {
      throw new Error("confirmed_photo_changed_requires_reverification");
    }
    existing.set(id,c);
  }
  let added=0, keptCreators=0, uncertain=0;
  for(const d of selected.values()){
    if(d.decision==="creator"){keptCreators++;if(existing.has(d.modelId))throw new Error("conflicting_creator_vs_confirmed");continue;}
    if(d.decision==="uncertain"){uncertain++;continue;}
    if(!existing.has(d.modelId)){
      existing.set(d.modelId,{
        modelId:d.modelId,
        slug:d.slug,
        coverStorageKey:d.coverStorageKey,
        evidence:"Manual visual review marked SpecialSTL; verify exported decision and image before copying candidate into SSOT" +
          (typeof d.reviewedAt==="string"?" ("+d.reviewedAt.slice(0,32)+")":""),
      });
      added++;
    }
  }
  const candidate={...current,confirmed:[...existing.values()].sort((a,b)=>a.modelId.localeCompare(b.modelId))};
  return {candidate,summary:{snapshotModels:models.size,reviewed:selected.size,confirmedNew:added,
    previouslyConfirmed:current.confirmed.length,legitimateCreatorCredits:keptCreators,
    inconclusive:uncertain,proposedTotal:candidate.confirmed.length,networkRequests:0}};
}
export async function main(argv=process.argv.slice(2)){
  const args=readArgs(argv);
  const [source, reviewed, current]=await Promise.all([
    fs.readFile(args.snapshot,"utf8").then(JSON.parse),
    fs.readFile(args.decisions,"utf8").then(JSON.parse),
    fs.readFile(args.quarantine,"utf8").then(JSON.parse),
  ]);
  const result=propose(source,reviewed,current);
  await fs.mkdir(path.dirname(args.out),{recursive:true});
  await fs.writeFile(args.out,JSON.stringify(result.candidate,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({...result.summary,output:args.out,
    status:"CANDIDATE_ONLY_NOT_PUBLISHED_OR_APPLIED"}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(e=>{console.error(e.message);process.exitCode=1;});
}
