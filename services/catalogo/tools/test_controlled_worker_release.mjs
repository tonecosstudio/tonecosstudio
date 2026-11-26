import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {deploymentVersions,assertTraffic,rollbackPlan,uploadedVersion,readLiveDeployment,smoke,smokePreviousTelegram,smokeGlobalSearch} from './controlled_worker_release.mjs'

const previous='aa8fd20c-857c-4780-a15e-021569a32251'
const candidate='dddddddd-1111-2222-3333-aaaaaaaaaaaa'
const deployment=entries=>({result:{deployments:[{created_on:'2026-11-22T00:00:00Z',
  versions:entries.map(([version_id,percentage])=>({version_id,percentage}))}]}})

test('exact previous, zero-traffic candidate and promoted version are verified',()=>{
  assert.doesNotThrow(()=>assertTraffic(deploymentVersions(deployment([[previous,100]])),previous,null,'before'))
  assert.doesNotThrow(()=>assertTraffic(deploymentVersions(deployment([[previous,100],[candidate,0]])),previous,candidate,'staged'))
  assert.doesNotThrow(()=>assertTraffic(deploymentVersions(deployment([[candidate,100]])),candidate,candidate,'promoted'))
  assert.throws(()=>assertTraffic(deploymentVersions(deployment([[previous,100]])),candidate,null,'before'))
  assert.throws(()=>assertTraffic(deploymentVersions(deployment([[previous,50],[candidate,50]])),previous,candidate,'staged'))
  assert.throws(()=>deploymentVersions(deployment([[previous,100],[previous,0]])))
  assert.throws(()=>deploymentVersions(deployment([[previous,101]])))
  assert.throws(()=>deploymentVersions({result:{deployments:[]}}))
})
test('rollback planning handles partial staging, promotion and already-restored traffic',()=>{
  const read=entries=>deploymentVersions(deployment(entries))
  assert.equal(rollbackPlan(read([[previous,100]]),previous),'no-op')
  assert.equal(rollbackPlan(read([[previous,100],[candidate,0]]),previous),'restore')
  assert.equal(rollbackPlan(read([[previous,60],[candidate,40]]),previous),'restore')
  assert.equal(rollbackPlan(read([[candidate,100]]),previous),'restore')
  assert.throws(()=>rollbackPlan([],previous))
  assert.throws(()=>rollbackPlan(read([[previous,100]]),'not-a-version'))
})

test('Wrangler event file must contain exactly one version-upload event',()=>{
  assert.equal(uploadedVersion(JSON.stringify({type:'version-upload',version_id:candidate})),candidate)
  assert.throws(()=>uploadedVersion('invalid json'))
  assert.throws(()=>uploadedVersion('{}'))
  assert.throws(()=>uploadedVersion(JSON.stringify({type:'version-upload',version_id:'invalid'})))
  assert.throws(()=>uploadedVersion([previous,candidate].map(version_id=>JSON.stringify({type:'version-upload',version_id})).join('\n')))
})
test('Cloudflare verification is GET-only and uses the pinned account',async()=>{
  let requests=0
  const env={CLOUDFLARE_ACCOUNT_ID:'8827c547d6def5ee5b9ca550fdd5680a',CLOUDFLARE_API_TOKEN:'fake-test-secret'}
  const result=await readLiveDeployment(env,async(url,init)=>{
    requests++
    assert.equal(init.method,'GET')
    assert.ok(url.endsWith('/workers/scripts/tonecos-catalogo-api/deployments'))
    return Response.json({success:true,...deployment([[previous,100]])})
  })
  assert.equal(result[0].id,previous)
  assert.equal(requests,1)
  await assert.rejects(readLiveDeployment({...env,CLOUDFLARE_ACCOUNT_ID:'00000000-0000-0000-0000-000000000000'},
    async()=>{throw Error('unexpected network')}))
})
test('version-override smoke verifies v9 schema, Telegram models, studios and thumb',async()=>{
  const contract=JSON.parse(readFileSync(new URL('../config/catalog-schema-contract.json',import.meta.url)))
  const id='tg_abcdef0123456789abcdef01',sha='a'.repeat(64)
  const cover='/api/telegram-studios/'+id+'/media/'+sha+'/thumb'
  let count=0
  const result=await smoke('https://tonecos-catalogo-api.tonecosstudio.workers.dev',candidate,async(url,init)=>{
    count++
    assert.equal(init.method,'GET')
    assert.equal(init.headers['Cloudflare-Workers-Version-Overrides'],'tonecos-catalogo-api="'+candidate+'"')
    if(url.endsWith('/api/health'))return Response.json({ok:true,schema:{
      ready:true,contractVersion:contract.version,latestMigration:contract.latestMigration,
      requiredMigrations:contract.requiredMigrations.length,
      appliedMigrations:contract.requiredMigrations.length,missingMigrations:[],missingStructures:[]
    }})
    if(url.includes('limit=1'))return Response.json({total:4262,items:[{id,cover}]})
    if(url.endsWith('/studios'))return Response.json({studios:[{studio:'Studio A',total:1}]})
    return new Response(new Uint8Array([1]),{status:200,headers:{'content-type':'image/webp'}})
  })
  assert.equal(result.ok,true)
  assert.equal(count,4)
  await assert.rejects(smoke('https://catalogo.tonartstudio.com.br',candidate,async()=>{throw Error('unexpected fetch')}))
})
test('zero-traffic rollback drill verifies previous Telegram service without claiming v63 core health',async()=>{
  const id='tg_abcdef0123456789abcdef01'
  const requests=[]
  const restored=await smokePreviousTelegram(
    'https://tonecos-catalogo-api.tonecosstudio.workers.dev',
    async(url,init)=>{
      requests.push(url)
      assert.equal(init.method,'GET')
      assert.ok(!url.includes('/api/health'),'old v63 is not the corrected candidate')
      if(url.endsWith('/studios'))return Response.json({studios:[{studio:'Studio A',total:1}]})
      return Response.json({total:4262,items:[{id}]})
    }
  )
  assert.equal(restored.previousWorkerRestored,true)
  assert.equal(restored.telegramModels,4262)
  assert.equal(requests.length,2)
  await assert.rejects(smokePreviousTelegram(
    'https://catalogo.tonartstudio.com.br',
    async()=>{throw Error('unexpected external origin')}
  ))
  await assert.rejects(smokePreviousTelegram(
    'https://tonecos-catalogo-api.tonecosstudio.workers.dev',
    async()=>new Response('error',{status:503})
  ))
})

test('routine global-search smoke checks bounded results and private cover isolation',async()=>{
  const id='tg_'+'a'.repeat(24)
  const cover='/api/telegram-studios/'+id+'/media/'+'b'.repeat(64)+'/thumb'
  const base='https://tonecos-catalogo-api.tonecosstudio.workers.dev'
  const response=items=>async(url,init)=>{
    assert.ok(url.endsWith('/api/catalog?q=Thanos&scope=all&limit=12'))
    assert.equal(init.headers['Cloudflare-Workers-Version-Overrides'],'tonecos-catalogo-api="'+candidate+'"')
    return Response.json({items})
  }
  const item={id,cover_storage_key:null,telegram_preview:{pending:true,cover}}
  assert.deepEqual(await smokeGlobalSearch(base,candidate,response([{id:'old'},item])),{items:2,telegram:1})
  await assert.rejects(smokeGlobalSearch(base,candidate,response([{...item,cover_storage_key:'private/key'}])))
  await assert.rejects(smokeGlobalSearch(base,candidate,response([item,item])))
})

test('one existing workflow owns controlled release, protected by M5 and rollback',()=>{
  const m=JSON.parse(readFileSync(new URL('../../../config/catalog-code-consolidation.json',import.meta.url)))
  const approved=['cutover-approved','cutover-complete'].includes(m.migration.phase)
  assert.equal(m.migration.releaseAuthorized,approved,'Owner GO must match the canonical phase')
  assert.equal(m.migration.targetWorkerReleaseEnabled,approved,'Only one approved target publisher is allowed')
  assert.equal(m.activeWorkerPublisher,approved ? m.target.repository : m.origin.repository,
    'M5 ownership must remain single-writer and phase-specific')
  assert.equal(m.migration.targetD1MigrationEnabled,false,'D1 migrations must use only the bounded M5 operation')
  if(!m.productionObservation.targetProductionCredentialsVerified||
     !m.productionObservation.rollbackTestedAgainstProduction) {
    assert.equal(m.productionObservation.runtimeCutoverPerformed,false,
      'GO alone cannot imply credentials, rollback or a completed Worker cutover')
  }
  const workflow=readFileSync(new URL('../../../.github/workflows/quality.yml',import.meta.url),'utf8')
  assert.ok(workflow.includes('catalog-controlled-worker-release:'))
  assert.ok(workflow.includes("inputs.operation == 'worker-release'"))
  const remaining=workflow.split('  catalog-controlled-worker-release:')[1]
  assert.ok(remaining,'Existing Quality Gate must have exactly one Worker release job')
  // Stop at the next YAML job. The same Quality Gate owns D1 migrations,
  // but their Wrangler commands must not be attributed to Worker release.
  const job=remaining.split(/\r?\n {2}[a-z][a-z0-9-]*:/,1)[0]
  assert.ok(job.includes('environment: production'))
  assert.ok(job.indexOf('cutover-readiness.mjs --worker-stage')<job.indexOf('wrangler versions upload'))
  assert.ok(job.indexOf('controlled_worker_release.mjs rollback-drill') > job.indexOf('controlled_worker_release.mjs staged'))
  assert.ok(job.indexOf('controlled_worker_release.mjs rollback-drill') < job.indexOf('Promote validated candidate'))
  assert.ok(job.indexOf('Restage and verify candidate after rollback drill') < job.indexOf('Promote validated candidate'))
  assert.ok(job.includes('@0%'))
  assert.ok(job.includes("steps.stage.outcome == 'failure'"))
  assert.ok(job.includes("steps.stage.outcome == 'success'"))
  assert.ok(job.includes('cancelled()'))
  assert.ok(job.indexOf('rollback-plan') < job.indexOf('rollback-verify'))
  assert.ok(job.includes('ROLLBACK_PREVIOUS_VERSION'))
  assert.doesNotMatch(job,/wrangler d1|migrations apply|wrangler r2 object put/i)
})
