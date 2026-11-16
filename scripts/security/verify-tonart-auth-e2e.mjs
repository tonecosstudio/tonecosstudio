/**
 * TONART DEV: HTTP smoke test with real, existing Supabase Auth sessions.
 *
 * Usage (Node.js 24+, local terminal only):
 *   # Set TONART_SUPABASE_PUBLISHABLE_KEY, TONART_ADMIN_JWT and
 *   # TONART_CUSTOMER_JWT through a trusted private environment.
 *   node scripts/security/verify-tonart-auth-e2e.mjs
 *   # Public-only (one publishable key, no user credentials):
 *   node scripts/security/verify-tonart-auth-e2e.mjs --anonymous
 *
 * Obtain each short-lived token through a normal sign-in to the existing TONART
 * Supabase project. Do not commit tokens, put them in CI secrets, or paste them
 * into issue trackers. This script performs no commercial mutations; the
 * existing admin RPC may update rate-limit and security audit counters.
 */

const PROJECT_URL = 'https://icmtmaakjucmuzxnofkd.supabase.co';
const TIMEOUT_MS = 15_000;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}; no requests sent`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertUser(value, label) {
  assert(
    value && typeof value === 'object' &&
      typeof value.id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id),
    `${label}: valid authenticated user not returned`,
  );
  return value.id;
}

function assertRows(value, label) {
  assert(Array.isArray(value) && value.every(row => row && typeof row.id === 'string'),
    `${label}: invalid profiles response`);
  return value.map(row => row.id);
}

async function main() {
  const anonymousMode = process.argv.length === 3 && process.argv[2] === '--anonymous';
  assert(process.argv.length === 2 || anonymousMode,
    'Usage: node verify-tonart-auth-e2e.mjs [--anonymous]');
  const key = requiredEnvironment('TONART_SUPABASE_PUBLISHABLE_KEY');
  const adminJwt = anonymousMode ? null : requiredEnvironment('TONART_ADMIN_JWT');
  const customerJwt = anonymousMode ? null : requiredEnvironment('TONART_CUSTOMER_JWT');
  if (!anonymousMode) {
    assert(adminJwt !== customerJwt, 'Admin and customer must use distinct Auth sessions');
    assert(adminJwt.split('.').length === 3 && customerJwt.split('.').length === 3,
      'Both credentials must be real access JWTs, not passwords or API keys');
  }

  async function call(path, { token, method = 'GET', body, origin, preflight = false } = {}) {
    const headers = { apikey: key };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (origin) headers.Origin = origin;
    if (preflight) {
      headers['Access-Control-Request-Method'] = 'POST';
      headers['Access-Control-Request-Headers'] = 'authorization,apikey,content-type';
    }
    const response = await fetch(`${PROJECT_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'error',
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return {
      status: response.status,
      data,
      allowOrigin: response.headers.get('access-control-allow-origin'),
    };
  }

  if (anonymousMode) {
    const origin = 'https://tonartstudio.com.br';
    const deny = (result) => result.status === 401 || result.status === 403;
    const noRows = (result) => result.status === 200 &&
      Array.isArray(result.data) && result.data.length === 0;
    const checks = [
      {
        name: 'profiles are private',
        path: '/rest/v1/profiles?select=id',
        valid: (r) => deny(r) || noRows(r),
      },
      {
        name: 'commerce switches are not readable by anon',
        path: '/rest/v1/system_settings?select=key,value&key=in.(tonart_collection_commerce_enabled,tonart_extra_commerce_enabled)',
        valid: (r) => deny(r) || noRows(r),
      },
      {
        name: 'administrator role is not public',
        path: '/rest/v1/rpc/is_tonecos_admin',
        method: 'POST',
        body: {},
        valid: (r) => deny(r) || r.status === 404 ||
          (r.status === 200 && r.data === false),
      },
      {
        name: 'admin-rpc requires user JWT',
        path: '/functions/v1/admin-rpc',
        method: 'POST',
        body: { functionName: 'admin_list_internal_collections', args: {} },
        valid: (r) => r.status === 401,
      },
      {
        name: 'invalid user JWT is rejected',
        path: '/functions/v1/admin-rpc',
        method: 'POST',
        token: 'invalid.jwt.signature',
        body: { functionName: 'admin_list_internal_collections', args: {} },
        valid: (r) => r.status === 401,
      },
      {
        name: 'public commercial offers remain empty',
        path: '/functions/v1/tonart-commercial-offers',
        method: 'POST',
        body: { modelSlug: 'tonart-e2e-gate-probe' },
        valid: (r) => r.status === 200 && Array.isArray(r.data?.data) &&
          r.data.data.length === 0,
      },
      ...['admin-rpc', 'tonart-commercial-offers'].map((name) => ({
        name: name + ' CORS allows canonical site',
        path: '/functions/v1/' + name,
        method: 'OPTIONS',
        origin,
        preflight: true,
        valid: (r) => r.status === 200 && r.allowOrigin === origin,
      })),
      {
        name: 'public signup is disabled while existing email sign-in remains enabled',
        path: '/auth/v1/settings',
        valid: (r) => r.status === 200 &&
          r.data?.disable_signup === true && r.data?.external?.email === true,
      },
    ];
    for (const check of checks) {
      const result = await call(check.path, check);
      assert(check.valid(result), 'Anonymous HTTP contract failed: ' + check.name);
      console.log('PASS: ' + check.name);
    }
    console.log('TONART anonymous HTTP E2E: PASS (9/9, no user tokens or commercial mutations)');
    return;
  }

  const [adminUser, customerUser] = await Promise.all([
    call('/auth/v1/user', { token: adminJwt }),
    call('/auth/v1/user', { token: customerJwt }),
  ]);
  assert(adminUser.status === 200, 'Admin session was rejected by Supabase Auth');
  assert(customerUser.status === 200, 'Customer session was rejected by Supabase Auth');
  const adminId = assertUser(adminUser.data, 'Admin');
  const customerId = assertUser(customerUser.data, 'Customer');
  assert(adminId !== customerId, 'Both sessions resolve to the same identity');
  console.log('PASS: two different live Supabase Auth sessions');

  const [adminRole, customerRole] = await Promise.all([
    call('/rest/v1/rpc/is_tonecos_admin', { method: 'POST', token: adminJwt, body: {} }),
    call('/rest/v1/rpc/is_tonecos_admin', { method: 'POST', token: customerJwt, body: {} }),
  ]);
  assert(adminRole.status === 200 && adminRole.data === true,
    'Canonical administrator role was not confirmed');
  assert(customerRole.status === 200 && customerRole.data === false,
    'Customer unexpectedly has administrator privileges');
  console.log('PASS: authorization distinguishes admin and customer');

  const [adminProfiles, customerProfiles] = await Promise.all([
    call('/rest/v1/profiles?select=id', { token: adminJwt }),
    call('/rest/v1/profiles?select=id', { token: customerJwt }),
  ]);
  assert(adminProfiles.status === 200 && customerProfiles.status === 200,
    'Profiles read failed under caller JWT');
  const visibleToAdmin = assertRows(adminProfiles.data, 'Admin');
  const visibleToCustomer = assertRows(customerProfiles.data, 'Customer');
  assert(visibleToAdmin.includes(adminId) && visibleToAdmin.includes(customerId),
    'Administrator cannot read both existing profiles');
  assert(visibleToCustomer.length === 1 && visibleToCustomer[0] === customerId,
    'Customer can read another profile or cannot read their own');
  console.log('PASS: real HTTP/RLS profile separation');

  const rpcRequest = { functionName: 'admin_list_internal_collections', args: {} };
  const customerRpc = await call('/functions/v1/admin-rpc', {
    token: customerJwt, method: 'POST', body: rpcRequest,
  });
  assert(customerRpc.status === 403, 'Customer did not receive HTTP 403 on admin-rpc');
  const adminRpc = await call('/functions/v1/admin-rpc', {
    token: adminJwt, method: 'POST', body: rpcRequest,
  });
  assert(adminRpc.status === 200 && adminRpc.data?.ok === true &&
    Array.isArray(adminRpc.data?.data),
    'Administrator read-only editorial RPC did not succeed');
  console.log('PASS: admin-rpc denies customer and accepts administrator');

  // This RPC intentionally uses the caller's JWT in admin-rpc (rather than a
  // service-role RPC). It proves auth.uid() survives the Edge Function hop.
  const commercialRequest = {
    functionName: 'tonart_admin_commercial_offers_directory', args: {},
  };
  const customerCommercial = await call('/functions/v1/admin-rpc', {
    token: customerJwt, method: 'POST', body: commercialRequest,
  });
  assert(customerCommercial.status === 403,
    'Customer was allowed into the commercial administration RPC');
  const adminCommercial = await call('/functions/v1/admin-rpc', {
    token: adminJwt, method: 'POST', body: commercialRequest,
  });
  assert(adminCommercial.status === 200 && adminCommercial.data?.ok === true &&
    adminCommercial.data?.data?.commerce_enabled === false &&
    Array.isArray(adminCommercial.data?.data?.rows),
    'Admin commercial RPC failed or extra commerce was unexpectedly enabled');
  console.log('PASS: commercial admin RPC retains user JWT; checkout gate remains closed');

  // Prove BOTH commercial switches are closed at the single database authority.
  // An empty offers table alone would also return [] with an open gate.
  const gateKeys = [
    'tonart_collection_commerce_enabled',
    'tonart_extra_commerce_enabled',
  ];
  const gateQuery = '/rest/v1/system_settings?select=key,value&key=in.(' +
    gateKeys.join(',') + ')';
  const [adminGateRead, customerGateRead] = await Promise.all([
    call(gateQuery, { token: adminJwt }),
    call(gateQuery, { token: customerJwt }),
  ]);
  assert(adminGateRead.status === 200 && Array.isArray(adminGateRead.data),
    'Admin cannot read canonical commercial gates');
  assert(customerGateRead.status === 200 && Array.isArray(customerGateRead.data) &&
    customerGateRead.data.length === 0,
    'Commercial gate settings were visible to the customer');
  const gates = new Map(adminGateRead.data.map((row) => [row.key, row.value]));
  assert(gates.size === gateKeys.length && gateKeys.every((key) => gates.get(key) === 'false'),
    'A commercial gate is missing or enabled on the server');
  console.log('PASS: both authoritative commerce gates are false and hidden from customer');

  const publicOffers = await call('/functions/v1/tonart-commercial-offers', {
    method: 'POST', body: { modelSlug: 'tonart-e2e-gate-probe' },
  });
  assert(publicOffers.status === 200 && Array.isArray(publicOffers.data?.data) &&
    publicOffers.data.data.length === 0,
    'Commercial public offers gate returned unexpected results');
  console.log('PASS: unauthenticated public offer lookup stays empty with commerce disabled');

  const unauthRpc = await call('/functions/v1/admin-rpc', {
    method: 'POST', body: rpcRequest,
  });
  assert(unauthRpc.status === 401,
    'admin-rpc accepted a request without a user Authorization header');
  console.log('PASS: anonymous admin-rpc access denied');
  console.log('TONART real-session E2E: PASS (no commercial writes or checkout)');
}

main().catch(error => {
  // Never include response payloads, HTTP headers, email, user IDs or JWTs.
  console.error(`TONART real-session E2E: FAIL — ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
