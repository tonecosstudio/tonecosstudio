/** The single versioned site/import transport selection. Production stays on TONART.
 * Switching requires completed migration evidence, matching CSP, and verified deployment.
 * Never select an upstream from a browser request or automatically fail over writes.
 */
export const ACTIVE_CATALOG_CLOUD = "tonecos";

export function resolveCatalogCloud(selection) {
  if(selection!=="tonecos"&&selection!=="ordax")throw Error("unknown_catalog_cloud");
  return Object.freeze({cloud:selection,origin:selection==="tonecos"?"https://tonecos-catalogo-api.tonecosstudio.workers.dev":"https://tonecos-catalogo-api.ordaxsystems.workers.dev"});
}
export function checkCatalogBinding(active,configured) {
  return (configured??"tonecos")===active;
}
export function assertImportCloud(active,configured) {
  if(!checkCatalogBinding(active,configured))throw Error("import_cloud_identity_mismatch");
}
export function receiptMatchesCloud(active,receipt) {
  return (receipt.catalogCloud??"tonecos")===active;
}
export function assertCatalogCsp(csp,selection) {
  const active=resolveCatalogCloud(selection);
  const inactive=resolveCatalogCloud(selection==="tonecos"?"ordax":"tonecos");
  const connect=typeof csp==="string"?csp.split(";").map(x=>x.trim()).find(x=>x.startsWith("connect-src "))?.split(/\s+/):null;
  if(!connect?.includes(active.origin)||connect.includes(inactive.origin))throw Error("catalog_cloud_csp_mismatch");
}
export const ACTIVE_CATALOG_ORIGIN = resolveCatalogCloud(ACTIVE_CATALOG_CLOUD).origin;
