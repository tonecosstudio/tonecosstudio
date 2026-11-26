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
