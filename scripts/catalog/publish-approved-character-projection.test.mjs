import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchApprovedExport,
  runApprovedEditorialSync,
  sendEditorialProjection,
  validateApprovedExport,
  validateEditorialSyncTargets,
} from './publish-approved-character-projection.mjs';

const token = 'local-sync-token-with-at-least-thirty-two-characters';
const isolatedProjectRef = 'abcdefghijabcdefghij';
const payload = {
  schemaVersion: 1,
  source: 'public.admin_export_approved_catalog_character_projection',
  generatedAt: '2026-11-18T15:00:00.000Z',
  characters: [],
};

test('only a local source or the explicitly named isolated Supabase ref and local Worker are accepted', () => {
  assert.doesNotThrow(() => validateEditorialSyncTargets(
    `https://${isolatedProjectRef}.supabase.co`, 'http://127.0.0.1:8787', token,
    isolatedProjectRef,
  ));
  assert.doesNotThrow(() => validateEditorialSyncTargets(
    'http://127.0.0.1:54321', 'http://localhost:8787', token,
  ));
  assert.throws(() => validateEditorialSyncTargets(
    `https://${isolatedProjectRef}.supabase.co`, 'http://127.0.0.1:8787', token,
  ), /explicitly_isolated_supabase/);
  assert.throws(() => validateEditorialSyncTargets(
    `https://${isolatedProjectRef}.supabase.co`, 'http://127.0.0.1:8787', token,
    'zyxwvutsrqponmlkjihg',
  ), /explicitly_isolated_supabase/);
  assert.throws(() => validateEditorialSyncTargets(
    'https://icmtmaakjucmuzxnofkd.supabase.co', 'http://127.0.0.1:8787', token,
    'icmtmaakjucmuzxnofkd',
  ), /explicitly_isolated_supabase/);
  assert.throws(() => validateEditorialSyncTargets(
    `https://${isolatedProjectRef}.supabase.co`, 'https://tonecos-catalogo-api.workers.dev', token,
    isolatedProjectRef,
  ), /target_must_be_local_worker/);
});

test('approved export adapter calls only the explicit service-role export RPC', async () => {
  let call;
  const result = await fetchApprovedExport(new URL('https://staging-project.supabase.co'), 'service-role-test-key-long-enough', async (url, options) => {
    call = { url: String(url), options };
    return Response.json(payload);
  });
  assert.deepEqual(result, payload);
  assert.match(call.url, /\/rest\/v1\/rpc\/admin_export_approved_catalog_character_projection$/);
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers.authorization, 'Bearer service-role-test-key-long-enough');
  assert.equal(call.options.body, '{}');
});

test('export schema and private Worker acknowledgement are required', async () => {
  assert.throws(() => validateApprovedExport({ ...payload, source: 'client-supplied' }), /contract_invalid/);
  let posted;
  const result = await sendEditorialProjection({
    payload,
    worker: new URL('http://127.0.0.1:8787'),
    token,
    mode: 'dry-run',
    fetchImpl: async (url, options) => {
      posted = { url: String(url), options };
      return Response.json({ ok: true, dryRun: true, counts: { characters: 0 } });
    },
  });
  assert.equal(result.dryRun, true);
  assert.equal(posted.url, 'http://127.0.0.1:8787/api/admin/editorial-projection');
  assert.equal(posted.options.headers['x-tonart-dry-run'], 'true');
});

test('rollback mode requires the explicit empty-projection header', async () => {
  let sent;
  await sendEditorialProjection({
    payload: { ...payload, characters: [{ privateContent: 'not used in this test' }] },
    worker: new URL('http://localhost:8787'),
    token,
    mode: 'rollback-clear',
    fetchImpl: async (_url, options) => {
      sent = { options, body: JSON.parse(options.body) };
      return Response.json({ ok: true, counts: { characters: 0 } });
    },
  });
  assert.equal(sent.options.headers['x-tonart-allow-empty'], 'confirm');
  assert.deepEqual(sent.body.characters, []);
});

test('emergency rollback clears only local D1 without contacting an unavailable Supabase', async () => {
  const env = {
    TONART_EDITORIAL_SOURCE_URL: 'http://127.0.0.1:54321',
    TONART_EDITORIAL_LOCAL_WORKER_URL: 'http://127.0.0.1:8787',
    TONART_EDITORIAL_SYNC_TOKEN: token,
    // Intentionally no Supabase service-role key: rollback cannot depend on it.
  };
  const calls = [];
  const originalLog = console.log;
  console.log = () => {};
  try {
    await runApprovedEditorialSync(['--rollback-clear'], env, async (url, options) => {
      const target = new URL(url);
      assert.equal(target.origin, 'http://127.0.0.1:8787');
      assert.equal(target.pathname, '/api/admin/editorial-projection');
      const body = JSON.parse(options.body);
      assert.deepEqual(body.characters, []);
      assert.equal(body.source, 'public.admin_export_approved_catalog_character_projection');
      assert.equal(options.headers['x-tonart-allow-empty'], 'confirm');
      calls.push({ dryRun: options.headers['x-tonart-dry-run'] === 'true', body });
      return Response.json({
        ok: true,
        dryRun: options.headers['x-tonart-dry-run'] === 'true',
        applied: options.headers['x-tonart-dry-run'] !== 'true',
        counts: { characters: 0, modelLinks: 0, universes: 0 },
        snapshotSha256: 'b'.repeat(64),
      });
    });
  } finally {
    console.log = originalLog;
  }
  assert.equal(calls.length, 2, 'rollback must dry-run first and then explicitly clear');
  assert.deepEqual(calls.map(call => call.dryRun), [true, false]);
  assert.equal(calls[0].body.generatedAt, calls[1].body.generatedAt);
});

test('emergency rollback refuses a missing dry-run receipt before any D1 mutation', async () => {
  const env = {
    TONART_EDITORIAL_SOURCE_URL: 'http://localhost:54321',
    TONART_EDITORIAL_LOCAL_WORKER_URL: 'http://localhost:8787',
    TONART_EDITORIAL_SYNC_TOKEN: token,
  };
  let requests = 0;
  await assert.rejects(runApprovedEditorialSync(['--rollback-clear'], env, async () => {
    requests++;
    return Response.json({ ok: true, dryRun: false });
  }), /editorial_worker_dry_run_not_confirmed/);
  assert.equal(requests, 1);
});
