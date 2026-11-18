import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchApprovedExport,
  sendEditorialProjection,
  validateApprovedExport,
  validateEditorialSyncTargets,
} from './publish-approved-character-projection.mjs';

const token = 'local-sync-token-with-at-least-thirty-two-characters';
const payload = {
  schemaVersion: 1,
  source: 'public.admin_export_approved_catalog_character_projection',
  generatedAt: '2026-11-18T15:00:00.000Z',
  characters: [],
};

test('only local Worker targets and non-production Supabase sources are accepted', () => {
  assert.doesNotThrow(() => validateEditorialSyncTargets(
    'https://staging-project.supabase.co', 'http://127.0.0.1:8787', token,
  ));
  assert.doesNotThrow(() => validateEditorialSyncTargets(
    'http://127.0.0.1:54321', 'http://localhost:8787', token,
  ));
  assert.throws(() => validateEditorialSyncTargets(
    'https://icmtmaakjucmuzxnofkd.supabase.co', 'http://127.0.0.1:8787', token,
  ), /local_or_isolated_supabase/);
  assert.throws(() => validateEditorialSyncTargets(
    'https://staging-project.supabase.co', 'https://tonecos-catalogo-api.workers.dev', token,
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
