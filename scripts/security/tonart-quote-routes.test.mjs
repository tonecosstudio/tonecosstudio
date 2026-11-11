import test from "node:test";
import assert from "node:assert/strict";
import quoteHandler from "../../api/tonart-quotes.js";
import authHandler from "../../api/tonart-auth.js";

const DOMAIN = "https://tonartstudio.com.br";
const SECRET = "a".repeat(64);
function reply() {
  return {
    statusCode: 200, headers: {}, payload: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.payload = value; return this; },
    end(value) { this.payload = value; return this; },
  };
}
async function withMock(fetchMock, fn) {
  const original = globalThis.fetch;
  const secret = process.env.TONART_QUOTE_PROXY_SECRET;
  const publishable = process.env.TONART_SUPABASE_PUBLISHABLE_KEY;
  process.env.TONART_QUOTE_PROXY_SECRET = SECRET;
  process.env.TONART_SUPABASE_PUBLISHABLE_KEY = "public-unit-test-key";
  globalThis.fetch = fetchMock;
  try { await fn(); }
  finally {
    globalThis.fetch = original;
    if (secret === undefined) delete process.env.TONART_QUOTE_PROXY_SECRET;
    else process.env.TONART_QUOTE_PROXY_SECRET = secret;
    if (publishable === undefined) delete process.env.TONART_SUPABASE_PUBLISHABLE_KEY;
    else process.env.TONART_SUPABASE_PUBLISHABLE_KEY = publishable;
  }
}
test("quote proxy rejects forged origins", async () => {
  await withMock(async () => { throw Error("unexpected network"); }, async () => {
    const res=reply();
    await quoteHandler({method:"POST",headers:{origin:"https://evil.test"},body:{}},res);
    assert.equal(res.statusCode,403);
  });
});
test("quote proxy fails closed without server-to-server proof", async () => {
  await withMock(async () => { throw Error("unexpected network"); }, async () => {
    delete process.env.TONART_QUOTE_PROXY_SECRET;
    const res=reply();
    await quoteHandler({method:"POST",headers:{origin:DOMAIN},body:{}},res);
    assert.equal(res.statusCode,503);
  });
});
test("quote proxy sends its proof and relays a verified receipt", async () => {
  const calls=[];
  await withMock(async (url,init) => {
    calls.push({url:String(url),init});
    return Response.json({received:true,reference:"db-verified"},{status:201});
  }, async () => {
    const res=reply();
    await quoteHandler({method:"POST",headers:{origin:DOMAIN,"x-vercel-forwarded-for":"203.0.113.5"},body:{name:"Cliente"}},res);
    assert.equal(res.statusCode,201);
    assert.deepEqual(JSON.parse(res.payload),{received:true,reference:"db-verified"});
    assert.equal(calls.length,1);
    assert.equal(calls[0].init.headers["x-tonart-proxy-secret"],SECRET);
    assert.equal(calls[0].init.headers["x-forwarded-for"],"203.0.113.5");
    assert.equal(calls[0].init.headers.origin,DOMAIN);
  });
});
test("private listing cannot be read without cookie", async () => {
  await withMock(async () => { throw Error("unexpected network"); }, async () => {
    const res=reply();
    await quoteHandler({method:"GET",headers:{},url:"/api/tonart-quotes?page=0"},res);
    assert.equal(res.statusCode,401);
  });
});
test("private listing forwards only approved query parameters", async () => {
  await withMock(async (url,init) => {
    assert.equal(url.searchParams.get("page"),"2");
    assert.equal(url.searchParams.get("status"),"novo");
    assert.equal(url.searchParams.has("secret"),false);
    assert.equal(init.headers.Authorization,"Bearer owner-access-token");
    assert.equal(init.headers["x-tonart-proxy-secret"],SECRET);
    return Response.json({items:[],total:0});
  }, async () => {
    const res=reply();
    await quoteHandler({method:"GET",headers:{cookie:"tonart_quote_owner=owner-access-token"},
      url:"/api/tonart-quotes?page=2&status=novo&secret=untrusted"},res);
    assert.equal(res.statusCode,200);
  });
});
test("login request is pinned to the authorized mailbox", async () => {
  await withMock(async (url,init) => {
    assert.match(String(url),/\/auth\/v1\/otp/);
    assert.equal(JSON.parse(init.body).email,"tonecosstudio@gmail.com");
    return Response.json({});
  }, async () => {
    const res=reply();
    await authHandler({method:"POST",headers:{origin:DOMAIN},body:{action:"request",email:"attacker@evil.test"}},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.payload.sent,true);
  });
});
test("login rejects tokens belonging to anyone else", async () => {
  await withMock(async (url) => {
    const path=new URL(url).pathname;
    if(path.endsWith("/verify"))return Response.json({access_token:"other-token"});
    if(path.endsWith("/user"))return Response.json({email:"other@example.org",email_confirmed_at:"2026-11-11"});
    throw Error("unexpected network");
  }, async () => {
    const res=reply();
    await authHandler({method:"POST",headers:{origin:DOMAIN},body:{action:"verify",token:"123456"}},res);
    assert.equal(res.statusCode,401);
    assert.equal(res.headers["set-cookie"],undefined);
  });
});
test("verified owner obtains a secure HttpOnly cookie", async () => {
  await withMock(async (url) => {
    const path=new URL(url).pathname;
    if(path.endsWith("/verify"))return Response.json({access_token:"owner-token"});
    if(path.endsWith("/user"))return Response.json({email:"tonecosstudio@gmail.com",email_confirmed_at:"2026-11-11"});
    throw Error("unexpected network");
  }, async () => {
    const res=reply();
    await authHandler({method:"POST",headers:{origin:DOMAIN},body:{action:"verify",token:"123456"}},res);
    assert.equal(res.statusCode,200);
    assert.match(res.headers["set-cookie"],/HttpOnly; Secure; SameSite=Lax; Path=\/api/);
  });
});
