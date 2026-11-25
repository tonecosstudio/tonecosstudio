import { useRef, useState } from "react";
import {
  parsePrivateTelegramPlan,
  type PrivateTelegramPlan,
} from "@/services/catalog/telegram-private-import-plan";
import { importPrivateTelegramDraft } from "@/services/catalog/tonart-telegram-drafts";

const panel = "rounded-lg border border-[#56412e] bg-[#17130f] p-4";
const button = "min-h-10 rounded border border-[#997348] px-4 py-2 text-sm text-[#ecd3ad] disabled:cursor-not-allowed disabled:opacity-50";

export default function TelegramPrivateDraftBatchImport() {
  const [plan, setPlan] = useState<PrivateTelegramPlan | null>(null);
  const [filename, setFilename] = useState("");
  const [progress, setProgress] = useState(0);
  const [created, setCreated] = useState(0);
  const [reused, setReused] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const stopAfterCurrent = useRef(false);

  async function selectFile(file: File | undefined) {
    if (!file || running) return;
    setPlan(null);
    setFilename("");
    setProgress(0);
    setCreated(0);
    setReused(0);
    setConfirmed(false);
    setError("");
    setNotice("");
    setLoading(true);
    try {
      // The browser reads only the file selected by the administrator.
      // No local file path, original photograph or credential is uploaded.
      const text = await file.text();
      const parsed = await parsePrivateTelegramPlan(text);
      setFilename(file.name);
      setPlan(parsed);
      setNotice("Plano validado localmente; nenhum registro enviado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Plano inválido.");
    } finally {
      setLoading(false);
    }
  }

  async function runImport() {
    if (!plan || !confirmed || running || progress >= plan.drafts.length) return;
    stopAfterCurrent.current = false;
    setError("");
    setNotice("");
    setRunning(true);
    let i = progress;
    let nCreated = created;
    let nReused = reused;
    try {
      for (; i < plan.drafts.length; i++) {
        if (stopAfterCurrent.current) {
          setNotice("Pausado depois da última ficha confirmada. Pode retomar o mesmo arquivo.");
          break;
        }
        const item = plan.drafts[i];
        // The Worker repeats all authoritative checks and returns a stable ID.
        // A failed, ambiguous or mismatching response STOPS the entire batch.
        const result = await importPrivateTelegramDraft(item.manifest);
        if (
          result.id !== item.id ||
          result.published !== false ||
          (result.created !== true && result.reused !== true) ||
          (result.created === true && result.reused === true) ||
          (result.reused === true && result.appended !== 0)
        ) {
          throw new Error("Resposta inesperada do Worker para " + item.id);
        }
        if (result.created) nCreated++;
        if (result.reused) nReused++;
        setCreated(nCreated);
        setReused(nReused);
        setProgress(i + 1);
      }
      if (i === plan.drafts.length) {
        setNotice("Lote concluído. Todas as fichas foram verificadas como privadas.");
      }
    } catch (cause) {
      const item = plan.drafts[i];
      setError(
        "Interrompido em " + (item?.id ?? "registro desconhecido") + ": " +
        (cause instanceof Error ? cause.message : "Erro no importador"),
      );
      // The current item may have committed just before a network failure:
      // retrying the SAME manifest is idempotent at the canonical Worker.
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className={panel} aria-label="Importação privada da Curadoria">
      <h4 className="font-serif text-lg text-[#ecd3ad]">Importação privada por lote</h4>
      <p className="mt-2 text-xs leading-relaxed text-[#c7b49b]">
        Usa exclusivamente o importador autenticado do Worker canônico. Aceita o
        JSONL gerado pela Curadoria, verifica IDs, origens e hashes antes do
        envio e interrompe em qualquer conflito. Não publica modelos, não
        altera direitos e não transfere imagens para o Drive.
      </p>
      <label htmlFor="tonart-private-draft-plan" className="mt-4 block text-sm text-[#e2caa9]">
        Plano privado da Curadoria (.jsonl)
      </label>
      <input
        id="tonart-private-draft-plan"
        type="file"
        accept=".jsonl,.ndjson,text/plain"
        disabled={running || loading}
        className="mt-2 block w-full text-xs text-[#c5b39b]"
        onChange={(event) => {
          void selectFile(event.target.files?.[0]);
        }}
      />
      {loading && <p role="status" className="mt-3 text-xs">Validando arquivo local…</p>}
      {plan && (
        <>
          <div className="mt-4 space-y-1 text-xs text-[#d6c2aa]">
            <p>Arquivo: {filename}</p>
            <p>SHA-256: <code className="break-all">{plan.sha256}</code></p>
            <p>{plan.drafts.length} fichas · {plan.photoCount} imagens · {plan.studioCount} estúdios</p>
            <p role="status">
              {progress} de {plan.drafts.length} verificadas · {created} criadas · {reused} reutilizadas
            </p>
          </div>
          <progress
            max={plan.drafts.length}
            value={progress}
            className="mt-3 w-full"
            aria-label="Progresso da importação privada"
          />
          <label className="mt-4 flex items-start gap-3 text-xs text-[#d8c4ab]">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={running || progress === plan.drafts.length}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Confirmo que este arquivo pertence à Curadoria autorizada e que
            somente rascunhos privados devem ser criados, sem alteração de direitos.
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={button}
              disabled={running || loading || !confirmed || progress === plan.drafts.length}
              onClick={() => { void runImport(); }}>
              {progress ? "Retomar importação" : "Iniciar importação privada"}
            </button>
            {running && (
              <button type="button" className={button}
                onClick={() => { stopAfterCurrent.current = true; }}>
                Pausar após esta ficha
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-[#a99b89]">
            Uma requisição por vez; mantenha esta aba aberta. Se houver falha,
            o mesmo arquivo pode ser retomado sem duplicar as fichas confirmadas.
          </p>
        </>
      )}
      {notice && <p role="status" className="mt-3 text-xs text-[#cfdeb9]">{notice}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-[#ffc1b0]">{error}</p>}
    </section>
  );
}
