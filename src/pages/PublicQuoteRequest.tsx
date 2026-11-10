/** Quote inquiry only: no cart checkout, payment or account requirement. */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Send, ShieldCheck } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { ArcadeHero } from "@/components/arcade/ArcadeLayout";
import { PUBLIC_ROUTES, catalogModelDetailsPath } from "@/config/routes";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";

type QuoteItem = { slug: string; name: string; quantity: number };
const inputClass = "mt-2 block min-h-11 w-full border border-[hsl(0,0%,25%)] bg-[hsl(0,0%,8%)] px-3 py-2 text-sm text-white outline-none focus:border-[hsl(var(--gold-accent))]";
const labelClass = "block text-sm text-[hsl(0,0%,82%)]";
export default function PublicQuoteRequest() {
  const { selectedModels, setSelectedModels } = useCatalogBrowsing();
  const navigate = useNavigate();
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [scale, setScale] = useState("a definir");
  const [finishing, setFinishing] = useState("a definir");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");
  const models = selectedModels.map((model) =>
    items.find((item) => item.slug === model.slug) ?? { slug: model.slug, name: model.name, quantity: 1 });
  function changeQuantity(slug: string, quantity: number) {
    setItems((old) => {
      const current = models.find((item) => item.slug === slug);
      return current ? [...old.filter((item) => item.slug !== slug), { ...current, quantity }] : old;
    });
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !models.length) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/tonart-quotes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, whatsapp, postalCode, scale, finishing, notes, website, consent,
          items: models,
        }),
      });
      const data: { received?: boolean; reference?: string; error?: string } = await response.json();
      if (!response.ok || !data.received || !data.reference) throw new Error(data.error || "Não foi possível registrar o orçamento.");
      setReceipt(data.reference);
      setSelectedModels([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha de conexão. Nenhum envio foi confirmado.");
    } finally { setBusy(false); }
  }
  return (
    <Page title="Solicitar orçamento" description="Envie sua seleção de modelos e preferências à TONART Studio. Sem compras ou pagamentos online.">
      <ArcadeHero badge="TONART STUDIO" title="ORÇAMENTO" subtitle="CONTE COMO VOCÊ IMAGINA SUA PEÇA." compact />
      <section className="mx-auto max-w-3xl space-y-7 px-4 pb-20 text-[hsl(0,0%,90%)] sm:px-6">
        {receipt ? (
          <div role="status" className="space-y-4 border border-[hsl(var(--gold-accent))] bg-[hsl(0,0%,7%)] p-8">
            <ShieldCheck aria-hidden="true" className="text-[hsl(var(--gold-accent))]" />
            <h2 className="text-2xl font-semibold">Solicitação recebida</h2>
            <p className="text-sm leading-relaxed">Seu pedido de orçamento foi registrado para análise. Isso ainda não representa encomenda, reserva ou pagamento.</p>
            <p className="break-all font-mono text-xs text-[hsl(0,0%,65%)]">Referência: {receipt}</p>
            <Link className="inline-flex min-h-11 items-center border border-[hsl(var(--gold-accent))] px-5 text-sm" to={PUBLIC_ROUTES.catalogModels}>Voltar aos modelos</Link>
          </div>
        ) : models.length === 0 ? (
          <div className="space-y-4 border border-[hsl(0,0%,20%)] p-7">
            <h2 className="text-xl font-semibold">Escolha os modelos primeiro</h2>
            <p className="text-sm text-[hsl(0,0%,65%)]">Adicione uma ou mais referências à sua seleção no catálogo para pedir uma cotação.</p>
            <Link className="inline-flex min-h-11 items-center border border-[hsl(var(--gold-accent))] px-5 text-sm" to={PUBLIC_ROUTES.catalogModels}>Explorar modelos</Link>
          </div>
        ) : (
          <form onSubmit={(event) => void send(event)} className="space-y-6">
            <div className="space-y-3 border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,7%)] p-5 sm:p-7">
              <h2 className="text-lg font-semibold">Modelos selecionados</h2>
              {models.map((model) => (
                <div key={model.slug} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-3">
                  <div className="min-w-0 flex-1">
                    <Link to={catalogModelDetailsPath(model.slug)} className="text-sm font-medium hover:underline">{model.name}</Link>
                    <p className="break-all text-xs text-[hsl(0,0%,58%)]">{model.slug}</p>
                  </div>
                  <label className="text-xs">Quantidade
                    <input aria-label={"Quantidade de " + model.name} className={inputClass + " w-20"}
                      type="number" min={1} max={10} step={1} value={model.quantity} required
                      onChange={(e) => changeQuantity(model.slug, Number(e.target.value))} />
                  </label>
                </div>
              ))}
              <Link className="inline-flex min-h-11 items-center text-sm text-[hsl(var(--gold-accent))] hover:underline" to={PUBLIC_ROUTES.catalogModels}>Adicionar mais modelos</Link>
            </div>
            <div className="grid gap-5 border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,7%)] p-5 sm:grid-cols-2 sm:p-7">
              <h2 className="text-lg font-semibold sm:col-span-2">Seus dados de contato</h2>
              <label className={labelClass}>Nome completo *
                <input className={inputClass} type="text" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" />
              </label>
              <label className={labelClass}>E-mail *
                <input className={inputClass} type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} autoComplete="email" />
              </label>
              <label className={labelClass}>WhatsApp (opcional)
                <input className={inputClass} type="tel" inputMode="tel" value={whatsapp} maxLength={30} onChange={e=>setWhatsapp(e.target.value)} placeholder="(71) 99999-9999" autoComplete="tel" />
              </label>
              <label className={labelClass}>CEP (opcional)
                <input className={inputClass} type="text" inputMode="numeric" value={postalCode} maxLength={9} onChange={e=>setPostalCode(e.target.value)} placeholder="00000-000" autoComplete="postal-code" />
              </label>
            </div>
            <div className="grid gap-5 border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,7%)] p-5 sm:grid-cols-2 sm:p-7">
              <h2 className="text-lg font-semibold sm:col-span-2">Preferências da peça</h2>
              <label className={labelClass}>Escala
                <select value={scale} onChange={e=>setScale(e.target.value)} className={inputClass}>
                  <option value="a definir">A definir</option>
                  <option value="1/10">1/10 — aprox. 21 cm</option>
                  <option value="1/6">1/6 — aprox. 36 cm</option>
                  <option value="outro">Outra escala (descrever abaixo)</option>
                </select>
              </label>
              <label className={labelClass}>Acabamento
                <select value={finishing} onChange={e=>setFinishing(e.target.value)} className={inputClass}>
                  <option value="a definir">A definir</option>
                  <option value="pintado">Pintado</option>
                  <option value="sem pintura">Sem pintura</option>
                </select>
              </label>
              <label className={labelClass + " sm:col-span-2"}>Observações (opcional)
                <textarea className={inputClass} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1200} rows={4} placeholder="Pose, acabamento, prazo ou outros detalhes..." />
              </label>
            </div>
            <div className="hidden" aria-hidden="true">
              <label>Não preencha<input type="text" value={website} onChange={e=>setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label>
            </div>
            <label className="flex items-start gap-3 text-sm text-[hsl(0,0%,72%)]">
              <input type="checkbox" className="mt-1" checked={consent} onChange={e=>setConsent(e.target.checked)} required />
              <span>Autorizo o uso dos meus dados para receber uma resposta a esta solicitação, conforme a <Link to={PUBLIC_ROUTES.privacy} className="underline">Política de Privacidade</Link>. Nenhum pedido ou pagamento é confirmado aqui.</span>
            </label>
            {error && <p role="alert" className="border border-red-500/50 p-4 text-sm text-red-200">{error}</p>}
            <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[hsl(var(--gold-accent))] px-5 text-sm font-semibold text-black disabled:opacity-50"
              disabled={busy||!consent} type="submit">
              {busy ? "Enviando…" : <><Send size={17} aria-hidden="true" /> Enviar solicitação de orçamento</>}
            </button>
            <p className="flex items-center gap-2 text-xs text-[hsl(0,0%,55%)]"><Mail size={14} aria-hidden="true"/> A resposta será combinada diretamente com o estúdio; o envio não gera cobrança.</p>
          </form>
        )}
      </section>
    </Page>
  );
}
