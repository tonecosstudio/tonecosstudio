/**
 * Offline, read-only batch review of an already-local catalog snapshot.
 * Does not call the Worker, enumerate R2, read D1 or upload photos.
 *
 * node scripts/catalog/build-specialstl-review-sheet.mjs
 *   --manifest=PATH/catalog-snapshot.json
 *   --assets-root=PATH/already-downloaded-images
 *   --out=PATH/specialstl-review.html
 *   [--decisions=PATH/previous-review-decisions.json]
 *
 * Snapshot: {items:[{id,slug,name,cover_storage_key}, ...]}.
 * Images must already exist under assets-root/media/<model_id>/... .
 * The browser displays only 48 local thumbnails per page.
 * Exported decisions are evidence candidates, NOT automatic site blocks.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function argumentsFrom(argv) {
  const args = {};
  for (const arg of argv) {
    if (!arg.startsWith("--") || !arg.includes("=")) {
      throw new Error("Every argument must be --name=value");
    }
    const index = arg.indexOf("=");
    const key = arg.slice(2, index);
    if (!["manifest", "assets-root", "out", "decisions"].includes(key) || args[key]) {
      throw new Error("Unknown or duplicate argument: " + key);
    }
    args[key] = arg.slice(index + 1);
  }
  if (!args.manifest || !args["assets-root"] || !args.out) {
    throw new Error("Required: --manifest, --assets-root, --out");
  }
  return args;
}

function safeModel(row, root) {
  if (!row || typeof row !== "object") throw new Error("invalid_model");
  const modelId = row.id ?? row.modelId;
  const slug = row.slug;
  const key = row.cover_storage_key ?? row.coverStorageKey;
  if (typeof modelId !== "string" || !/^mdl_[a-f0-9]{20}$/.test(modelId) ||
      typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]{0,239}$/.test(slug) ||
      typeof key !== "string" || key.length > 4096 || !key.startsWith("media/")) {
    throw new Error("invalid_model_identity_or_image_key");
  }
  const segments = key.split("/");
  if (segments[1] !== modelId || segments.some(part => !part || part === "." ||
    part === ".." || !/^[a-zA-Z0-9._-]+$/.test(part))) {
    throw new Error("image_must_be_local_and_belong_to_model");
  }
  const file = path.resolve(root, ...segments);
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("image_outside_assets_root");
  }
  return {
    modelId, slug, name: String(row.name ?? slug).slice(0, 160),
    coverStorageKey: key, imageUrl: pathToFileURL(file).href, localPath: file,
  };
}

function app() {
  const payload = JSON.parse(document.getElementById("review-payload").textContent);
  const all = payload.items;
  const reviewed = new Map(payload.reviewed.map(entry => [entry.modelId, entry]));
  const perPage = 48;
  let page = 0;
  const search = document.getElementById("search");
  const filter = document.getElementById("filter");
  const grid = document.getElementById("grid");
  const summary = document.getElementById("summary");
  const status = ["pending", "specialstl", "creator", "uncertain"];
  function add(tag, parent, cls, label) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (label !== undefined) el.textContent = label;
    parent.appendChild(el);
    return el;
  }
  function visible() {
    const q = search.value.trim().toLowerCase();
    return all.filter(item => {
      const d = reviewed.get(item.modelId)?.decision || "pending";
      return (filter.value === "all" || d === filter.value) &&
        (!q || (item.name + " " + item.slug + " " + item.modelId).toLowerCase().includes(q));
    });
  }
  function render() {
    const items = visible();
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    page = Math.max(0, Math.min(page, pages - 1));
    grid.replaceChildren();
    for (const item of items.slice(page * perPage, (page + 1) * perPage)) {
      const card = add("article", grid, "card");
      if (item.available) {
        const img = add("img", card, "thumb");
        img.src = item.imageUrl;
        img.alt = "Capa local para revisão: " + item.name;
        img.loading = "lazy";
        img.decoding = "async";
      } else add("div", card, "missing", "Cópia local ausente — sem consulta externa");
      add("div", card, "title", item.name);
      add("div", card, "code", item.slug);
      add("div", card, "code", item.modelId);
      const select = add("select", card, "decision");
      select.setAttribute("aria-label", "Revisão da imagem: " + item.name);
      for (const [value, label] of [
        ["pending", "Não revisada"],
        ["specialstl", "SpecialSTL confirmado"],
        ["creator", "Crédito legítimo do modelador"],
        ["uncertain", "Origem inconclusiva"],
      ]) {
        const option = add("option", select, "", label);
        option.value = value;
      }
      select.value = reviewed.get(item.modelId)?.decision || "pending";
      select.addEventListener("change", () => {
        if (select.value === "pending") reviewed.delete(item.modelId);
        else reviewed.set(item.modelId, {
          modelId: item.modelId, slug: item.slug,
          coverStorageKey: item.coverStorageKey,
          decision: select.value, reviewedAt: new Date().toISOString(),
        });
        render();
      });
    }
    const confirmed = [...reviewed.values()].filter(entry => entry.decision === "specialstl").length;
    summary.textContent = items.length + " registros no filtro • página " + (page + 1) +
      "/" + pages + " • " + reviewed.size + " classificados • " +
      confirmed + " suspeitas confirmadas manualmente";
    document.getElementById("prev").disabled = page === 0;
    document.getElementById("next").disabled = page >= pages - 1;
  }
  search.addEventListener("input", () => { page = 0; render(); });
  filter.addEventListener("change", () => { page = 0; render(); });
  document.getElementById("prev").addEventListener("click", () => { page--; render(); });
  document.getElementById("next").addEventListener("click", () => { page++; render(); });
  document.getElementById("export").addEventListener("click", () => {
    const data = {version: 1, scope: "manual-specialstl-review",
      decisions: [...reviewed.values()].sort((a,b) => a.modelId.localeCompare(b.modelId))};
    const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], {type: "application/json"});
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "specialstl-review-decisions.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  });
  render();
}

async function main() {
  const args = argumentsFrom(process.argv.slice(2));
  const root = path.resolve(args["assets-root"]);
  const out = path.resolve(args.out);
  const raw = JSON.parse(await fs.readFile(path.resolve(args.manifest), "utf8"));
  const rows = Array.isArray(raw) ? raw : raw?.items;
  if (!Array.isArray(rows) || rows.length > 100000) throw new Error("invalid_local_snapshot");
  const items = [];
  const ids = new Set();
  for (const row of rows) {
    const item = safeModel(row, root);
    if (ids.has(item.modelId)) throw new Error("duplicate_model_id");
    ids.add(item.modelId);
    try { await fs.access(item.localPath); item.available = true; }
    catch { item.available = false; }
    items.push(item);
  }
  items.sort((a,b) => a.slug.localeCompare(b.slug));
  let previous = [];
  if (args.decisions) {
    const data = JSON.parse(await fs.readFile(path.resolve(args.decisions), "utf8"));
    if (data?.version !== 1 || !Array.isArray(data.decisions)) {
      throw new Error("invalid_previous_review");
    }
    const match = new Map(items.map(item => [item.modelId, item]));
    previous = data.decisions.filter(item =>
      match.has(item.modelId) &&
      match.get(item.modelId).coverStorageKey === item.coverStorageKey &&
      ["specialstl", "creator", "uncertain"].includes(item.decision));
  }
  const payload = JSON.stringify({items, reviewed:previous})
    .replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
  const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>TONART — revisão local SpecialSTL</title>' +
    '<style>body{background:#0e0e0e;color:#efefef;font:15px system-ui;margin:2rem}' +
    'h1{color:#d6ae53}button,select,input{font:inherit;padding:.65rem;background:#222;color:white;border:1px solid #8a6b32}' +
    'button:disabled{opacity:.35}header{display:flex;gap:.6rem;flex-wrap:wrap;margin:1rem 0}' +
    '#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:1rem}' +
    '.card{border:1px solid #444;padding:.65rem;min-width:0}.thumb{display:block;width:100%;height:205px;object-fit:contain}' +
    '.missing{height:205px;display:grid;place-items:center;color:#999}.title{font-weight:700;margin-top:.4rem}' +
    '.code{font:11px ui-monospace;overflow-wrap:anywhere;color:#aaa;margin:.3rem 0}' +
    '.decision{width:100%;margin-top:.5rem}.disclaimer{color:#c5c5c5;max-width:70rem}' +
    '</style></head><body><h1>TONART — revisão local de SpecialSTL</h1>' +
    '<p class="disclaimer">Somente imagens já armazenadas localmente. Logotipos dos escultores não indicam pirataria. ' +
    'As decisões exportadas não alteram o catálogo: apenas casos confirmados devem ser incorporados à quarentena.</p>' +
    '<header><input id="search" placeholder="Nome, slug ou ID" aria-label="Buscar">' +
    '<select id="filter" aria-label="Filtrar revisões"><option value="all">Todos</option>' +
    '<option value="pending">Não revisados</option><option value="specialstl">SpecialSTL</option>' +
    '<option value="creator">Crédito do modelador</option><option value="uncertain">Inconclusivos</option></select>' +
    '<button id="prev">Anterior</button><button id="next">Próxima</button>' +
    '<button id="export">Exportar decisões JSON</button></header>' +
    '<p id="summary" role="status"></p><main id="grid"></main>' +
    '<script type="application/json" id="review-payload">' + payload + '</script>' +
    '<script>(' + app.toString() + ')()</script></body></html>';
  await fs.mkdir(path.dirname(out), {recursive:true});
  await fs.writeFile(out, html, "utf8");
  console.log(JSON.stringify({
    output:out, models:items.length,
    locallyAvailable:items.filter(item => item.available).length,
    previouslyReviewed:previous.length,
    networkRequests:0,
    message:"No images downloaded, no D1/R2/Worker calls, no publishing.",
  }));
}
if (process.argv[1] && process.argv[1].endsWith("build-specialstl-review-sheet.mjs")) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
export { argumentsFrom, safeModel, main };
