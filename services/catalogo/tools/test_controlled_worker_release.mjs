import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {deploymentVersions,assertTraffic,uploadedVersion,readLiveDeployment,smoke} from './controlled_worker_release.mjs'

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
test('one existing workflow owns controlled release, protected by M5 and rollback',()=>{
  const m=JSON.parse(readFileSync(new URL('../../../config/catalog-code-consolidation.json',import.meta.url)))
  assert.equal(m.migration.releaseAuthorized,false)
  const workflow=readFileSync(new URL('../../../.github/workflows/quality.yml',import.meta.url),'utf8')
  assert.ok(workflow.includes('catalog-controlled-worker-release:'))
  assert.ok(workflow.includes("inputs.operation == 'worker-release'"))
  const job=workflow.split('  catalog-controlled-worker-release:')[1]
  assert.ok(job.includes('environment: production'))
  assert.ok(job.indexOf('cutover-readiness.mjs --live')<job.indexOf('wrangler versions upload'))
  assert.ok(job.includes('@0%'))
  assert.ok(job.includes('steps.stage.outcome'))
  assert.ok(job.includes('ROLLBACK_PREVIOUS_VERSION'))
  assert.doesNotMatch(job,/wrangler d1|migrations apply|wrangler r2 object put/i)
})
