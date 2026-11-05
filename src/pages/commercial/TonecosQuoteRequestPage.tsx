import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";
import { quoteItemsFromSelection, submitCatalogQuoteRequest } from "@/services/customer/catalog-quote-service";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import { actionClass, CommercialPage, fieldClass, panelClass, secondaryClass } from "./CommercialPage";

type Identity = { id: string; email: string | null };

export default function TonecosQuoteRequestPage() {
  const { selectedModels, setSelectedModels } = useCatalogBrowsing();
  const navigate = useNavigate();
  const [user, setUser] = useState<Identity | null | undefined>(undefined);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getTonecosCurrentUser()
      .then((identity) => { if (active) setUser(identity); })
      .catch(() => { if (active) setUser(null); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !user || selectedModels.length === 0) return;
    setBusy(true); setError("");
    try {
      const items = quoteItemsFromSelection(selectedModels).map((item) => ({
        ...item, quantity: quantities[item.slug] ?? 1,
      }));
      const quoteId = await submitCatalogQuoteRequest(user.id, items, notes);
      setSelectedModels([]);
      navigate("/meus-orcamentos", { replace: true, state: { sent: quoteId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o orçamento.");
    } finally { setBusy(false); }
  }

  return (
    <CommercialPage title="Solicitar orçamento" intro="Selecione modelos do catálogo, informe as quantidades e envie sua solicitação. O estúdio analisará os itens e informará valores e prazos. Nenhum pagamento é realizado agora.">
      <div className="max-w-3xl">
        {error && <p role="alert" className="mb-5 border border-red-500/40 p-4 text-sm text-red-200">{error}</p>}
        {user === undefined ? <p role="status">Verificando sua conta...</p> : null}
        {user === null ? (
          <div className={panelClass}>
            <p className="mb-5 text-sm leading-relaxed text-white/70">Entre ou crie uma conta para enviar a seleção e acompanhar a resposta da Tonecos.</p>
            <Link className={actionClass} to="/login?next=%2Forcamento">Entrar ou criar conta</Link>
          </div>
        ) : null}
        {selectedModels.length === 0 ? (
          <div className={panelClass}>
            <p className="mb-5 text-white/70">Nenhum modelo selecionado nesta visita.</p>
            <Link className={secondaryClass} to="/modelos">Escolher modelos</Link>
          </div>
        ) : (
          <form className={panelClass + " space-y-6"} onSubmit={(event) => { void submit(event); }}>
            <div>
              <h2 className="text-lg font-semibold">{selectedModels.length} {selectedModels.length === 1 ? "modelo selecionado" : "modelos selecionados"}</h2>
              <p className="mt-1 text-xs text-white/55">Os preços serão definidos após análise da solicitação.</p>
            </div>
            <ul className="space-y-3">
              {selectedModels.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-4 border-b border-white/15 pb-4">
                  <div className="min-w-0 flex-1">
                    <Link className="font-medium text-white/90 hover:underline" to={"/modelos/" + encodeURIComponent(item.slug)}>{item.name}</Link>
                    <p className="text-xs text-white/50">{item.code}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <span>Quantidade</span>
                    <input aria-label={"Quantidade de " + item.name} type="number" min={1} max={10} step={1} required
                      className={fieldClass + " w-20"} value={quantities[item.slug] ?? 1}
                      onChange={(e) => setQuantities((before) => ({ ...before, [item.slug]: Number(e.target.value) }))} />
                  </label>
                  <button type="button" className="min-h-11 px-2 text-xs text-white/55 hover:text-white"
                    aria-label={"Remover " + item.name}
                    onClick={() => setSelectedModels((models) => models.filter((model) => model.id !== item.id))}>Remover</button>
                </li>
              ))}
            </ul>
            <label className="block space-y-2 text-sm">
              <span>Observações (opcional)</span>
              <textarea className={fieldClass + " min-h-28"} value={notes} maxLength={2000}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Escala desejada, acabamento, prazo ou detalhes importantes." />
            </label>
            <p className="text-xs text-white/55">O envio registra apenas a referência dos modelos e sua solicitação; não gera compra ou cobrança.</p>
            <div className="flex flex-wrap gap-3">
              <button className={actionClass} type="submit" disabled={!user || busy}>
                {busy ? "Enviando..." : "Enviar solicitação"}
              </button>
              <Link className={secondaryClass} to="/modelos">Adicionar modelos</Link>
            </div>
          </form>
        )}
      </div>
    </CommercialPage>
  );
}
