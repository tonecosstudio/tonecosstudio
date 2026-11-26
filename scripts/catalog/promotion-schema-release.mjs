/** Independent schema feature. Reuses the existing M5 owner checks and isolated Wrangler staging.
 * Never widens the historical M5 authorization or stages editorial migrations 0034–0053.
 */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadContract,verifyRetiredSource,d1Fetch,getBookmark,stageOnly} from './m5-d1-bounded-release.mjs';
import {inspectRetiredWorkersBuilds,isRetiredWorkersBuilds} from './cutover-readiness.mjs';

export const MIGRATION='0054_promotion_image_selections.sql';
const ACK='GO-PROMOTION-SELECTION-0054-ONLY';
const TABLE='promotion_image_selections';
const FIELDS=[
  ['campaign','TEXT',1,1],['sha256','TEXT',1,2],['model_id','TEXT',1,0],
  ['media_path','TEXT',1,0],['mime','TEXT',1,0],['selected_at','TEXT',1,0],
];
function requireThat(condition,code){if(!condition)throw Error('promotion_schema_blocked:'+code)}
export function authorize(env){
  requireThat(env.GITHUB_ACTIONS==='true'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&
    env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_REPOSITORY==='tonecosstudio/tonecosstudio','canonical_main_dispatch_required');
  requireThat(env.PROMOTION_OPERATION==='promotion-schema'&&env.PROMOTION_ACK===ACK,'exact_ack_required');
  requireThat(typeof env.CLOUDFLARE_API_TOKEN==='string'&&env.CLOUDFLARE_API_TOKEN.length>10&&
    typeof env.GITHUB_TOKEN==='string'&&env.GITHUB_TOKEN.length>10,'production_credentials_required');
}
export function plan(applied,baseline){
  requireThat(Array.isArray(applied)&&Array.isArray(baseline)&&baseline.length===33&&
    new Set(applied).size===applied.length,'invalid_ledger');
  requireThat(baseline.every(name=>applied.includes(name)),'baseline_missing');
  const expected=new Set([...baseline,MIGRATION]);
  requireThat(applied.every(name=>expected.has(name)),'unrelated_migration_present');
  return applied.includes(MIGRATION)?[]:[MIGRATION];
}
export function validateTable(columns){
  requireThat(Array.isArray(columns)&&columns.length===FIELDS.length,'physical_table_missing_or_drifted');
  for(const [name,type,notnull,pk] of FIELDS){
    requireThat(columns.some(c=>c.name===name&&c.type===type&&Number(c.notnull)===notnull&&Number(c.pk)===pk),'physical_column_mismatch_'+name);
  }
}
async function inspect(env,context){
  const {manifest,db}=context,account=manifest.runtime.cloudflareAccountId;
  requireThat(env.CLOUDFLARE_ACCOUNT_ID===account,'account_mismatch');
  const rows=await d1Fetch(env.CLOUDFLARE_API_TOKEN,account,db.database_id,
    'SELECT name FROM d1_migrations ORDER BY id');
  const applied=rows.map(row=>row.name);
  const pending=plan(applied,context.schema.requiredMigrations);
  const columns=await d1Fetch(env.CLOUDFLARE_API_TOKEN,account,db.database_id,
    "SELECT name,type,\"notnull\",pk FROM pragma_table_info('"+TABLE+"') ORDER BY cid");
  if(pending.length)requireThat(columns.length===0,'unrecorded_table_exists');
  else validateTable(columns);
  return {applied,pending};
}
export async function perform(mode,env,stagePath){
  requireThat(['prepare','verify','ready'].includes(mode),'unknown_operation');
  if(mode!=='ready')authorize(env);
  const context=loadContract();
  const state=await inspect(env,context);
  if(mode==='ready'){
    requireThat(!state.pending.length,'promotion_migration_not_applied');
    return {status:'READY',migration:MIGRATION};
  }
  const {manifest,db,wrangler}=context;
  await verifyRetiredSource(env.GITHUB_TOKEN,manifest);
  const builds=await inspectRetiredWorkersBuilds(manifest.runtime.cloudflareAccountId,env.CLOUDFLARE_API_TOKEN);
  requireThat(isRetiredWorkersBuilds(builds,manifest.productionObservation.workersBuildsScriptTag),'parallel_worker_publisher');
  if(mode==='prepare'){
    if(!state.pending.length)return {status:'VERIFIED_ALREADY_APPLIED',migration:MIGRATION};
    const bookmark=await getBookmark(env.CLOUDFLARE_API_TOKEN,manifest.runtime.cloudflareAccountId,db.database_id);
    stageOnly(stagePath,[MIGRATION],db,wrangler);
    writeFileSync(join(resolve(stagePath),'promotion-preflight.json'),JSON.stringify({previous:state.applied,bookmark,sha:env.GITHUB_SHA})+'\n',{flag:'wx',mode:0o600});
    return {status:'PREPARED_ONLY',migration:MIGRATION,bookmarkCaptured:true};
  }
  requireThat(!state.pending.length,'migration_not_applied');
  const receipt=join(resolve(stagePath),'promotion-preflight.json');
  if(existsSync(receipt)){
    const before=JSON.parse(readFileSync(receipt,'utf8'));
    requireThat(before.sha===env.GITHUB_SHA&&before.bookmark?.length>10,'preflight_receipt_invalid');
    requireThat(JSON.stringify(state.applied)===JSON.stringify([...before.previous,MIGRATION]),'ledger_changed_outside_scope');
  }
  return {status:'VERIFIED',migration:MIGRATION,physicalTable:true};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  perform(process.argv[2],process.env,process.argv[3]).then(out=>console.log(JSON.stringify(out))).catch(e=>{
    console.error(String(e?.message??e));process.exitCode=2;
  });
}
