/** Offline account migration checks. No network, credentials, writes or deletes.
 * Compare complete inventories per bucket; ETag/size equality is metadata parity,
 * not a substitute for the separate integrity check before switching authority.
 */
export function planObjects(source, target) {
  function index(rows) {
    if (!Array.isArray(rows)) throw Error("inventory_required");
    const result = new Map();
    for (const row of rows) {
      if (!row || typeof row.key !== "string" || !row.key || !Number.isSafeInteger(row.size) || row.size < 0 || typeof row.etag !== "string" || !row.etag.trim()) throw Error("invalid_inventory_record");
      if (result.has(row.key)) throw Error("duplicate_inventory_key");
      result.set(row.key, { size: row.size, etag: row.etag.replace(/^"|"$/g, "").toLowerCase() });
    }
    return result;
  }
  const a = index(source), b = index(target);
  const missing = [], matched = [], conflicts = [], extras = [];
  let missingBytes = 0;
  for (const [key, s] of a) {
    const t = b.get(key);
    if (!t) { missing.push(key); missingBytes += s.size; }
    else if (s.size === t.size && s.etag === t.etag) matched.push(key);
    else conflicts.push(key);
  }
  for (const key of b.keys()) if (!a.has(key)) extras.push(key);
  for (const list of [missing, matched, conflicts, extras]) list.sort();
  return { missing, matched, conflicts, extras, missingBytes, readyForMissingOnlyCopy: conflicts.length === 0 && extras.length === 0, metadataParity: missing.length === 0 && conflicts.length === 0 && extras.length === 0 };
}

export function evaluateCutover(evidence) {
  const required = ["sourceWritersPaused", "sourceSnapshotVerified", "targetSchemaVerified", "targetDataVerified", "ftsVerified", "r2MetadataParity", "r2IntegrityVerified", "privateAccessVerified", "targetSecretsVerified", "publicAndAdminRoutesSameAuthority", "targetSmokePassed", "rollbackRehearsed", "reverseDeltaPlanVerified", "costBudgetApproved"];
  const blockers = required.filter(key => evidence?.[key] !== true);
  return { ready: blockers.length === 0, blockers };
}

/** Build secret-free Super Slurper job bodies from verified inventories. Never submits jobs. */
export function planScopedR2Jobs({sourceInventories,targetInventories,scopes,maxBytes,maxObjects},compare=planObjects) {
  if(!Array.isArray(scopes)||!scopes.length||!Number.isSafeInteger(maxBytes)||maxBytes<0||!Number.isSafeInteger(maxObjects)||maxObjects<0)throw Error("explicit_scope_and_budget_required");
  const jobs=[],blockers=[],seen=new Set();let missingBytes=0,missingObjects=0,matchedObjects=0;
  for(const {bucket,prefix} of scopes){
    if(typeof bucket!=="string"||!bucket||typeof prefix!=="string"||!prefix||!prefix.endsWith("/"))throw Error("invalid_scope");
    const scopeId=bucket+"\0"+prefix;
    if([...seen].some(s=>s.startsWith(scopeId)||scopeId.startsWith(s)))throw Error("overlapping_scope");
    seen.add(scopeId);
    const source=sourceInventories?.[bucket],target=targetInventories?.[bucket];
    if(source?.complete!==true||target?.complete!==true||!Array.isArray(source.objects)||!Array.isArray(target.objects))throw Error("complete_inventory_required");
    const a=source.objects.filter(o=>typeof o?.key==="string"&&o.key.startsWith(prefix));
    const b=target.objects.filter(o=>typeof o?.key==="string"&&o.key.startsWith(prefix));
    if(a.length===0){blockers.push({bucket,prefix,reason:"source_scope_empty"});continue;}
    const p=compare(a,b);
    missingBytes+=p.missingBytes;missingObjects+=p.missing.length;matchedObjects+=p.matched.length;
    if(!p.readyForMissingOnlyCopy){blockers.push({bucket,prefix,reason:"conflicting_or_extra_objects",conflicts:p.conflicts,extras:p.extras});continue;}
    for(let i=0;i<p.missing.length;i+=10000)jobs.push({overwrite:false,source:{vendor:"r2",bucket,keys:p.missing.slice(i,i+10000)},target:{vendor:"r2",bucket}});
  }
  if(missingBytes>maxBytes||missingObjects>maxObjects)blockers.push({reason:"budget_exceeded",missingBytes,missingObjects});
  return {ready:blockers.length===0,jobs:blockers.length===0?jobs:[],blockers,missingBytes,missingObjects,matchedObjects};
}
