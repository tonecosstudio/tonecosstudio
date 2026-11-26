import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACTIVE_CATALOG_CLOUD, ACTIVE_CATALOG_ORIGIN, resolveCatalogCloud, checkCatalogBinding, assertImportCloud, receiptMatchesCloud, assertCatalogCsp } from "../../config/catalog-cloud-routing.mjs";
test("two fixed authorities; reject unknown and external destinations",()=>{
 assert.equal(resolveCatalogCloud("tonecos").origin,"https://tonecos-catalogo-api.tonecosstudio.workers.dev");
 assert.equal(resolveCatalogCloud("ordax").origin,"https://tonecos-catalogo-api.ordaxsystems.workers.dev");
 for(const x of [undefined,"", "other","https://attacker.test"])assert.throws(()=>resolveCatalogCloud(x),/unknown_catalog_cloud/);
});
test("Pages binding and import cannot silently route to another account",()=>{
 assert.equal(checkCatalogBinding("tonecos",undefined),true);
 assert.equal(checkCatalogBinding("ordax",undefined),false);
 assert.equal(checkCatalogBinding("ordax","tonecos"),false);
 assert.equal(checkCatalogBinding("ordax","ordax"),true);
 assert.throws(()=>assertImportCloud("ordax",undefined),/identity_mismatch/);
 assert.doesNotThrow(()=>assertImportCloud("ordax","ordax"));
});
test("migration receipts remain account-specific",()=>{
 assert.equal(receiptMatchesCloud("tonecos",{}),true);
 assert.equal(receiptMatchesCloud("ordax",{}),false);
 assert.equal(receiptMatchesCloud("ordax",{catalogCloud:"tonecos"}),false);
 assert.equal(receiptMatchesCloud("ordax",{catalogCloud:"ordax"}),true);
});
test("deployment CSP matches only the selected authority",()=>{
 const v=JSON.parse(readFileSync(new URL("../../vercel.json",import.meta.url),"utf8"));
 const csp=v.headers.flatMap(h=>h.headers).find(h=>h.key==="Content-Security-Policy").value;
 assert.equal(ACTIVE_CATALOG_ORIGIN,resolveCatalogCloud(ACTIVE_CATALOG_CLOUD).origin);
 assert.doesNotThrow(()=>assertCatalogCsp(csp,ACTIVE_CATALOG_CLOUD));
 assert.throws(()=>assertCatalogCsp(csp,ACTIVE_CATALOG_CLOUD==="tonecos"?"ordax":"tonecos"),/catalog_cloud_csp_mismatch/);
 assert.throws(()=>assertCatalogCsp("connect-src 'self' https://tonecos-catalogo-api.tonecosstudio.workers.dev https://tonecos-catalogo-api.ordaxsystems.workers.dev;","tonecos"),/catalog_cloud_csp_mismatch/);
});
