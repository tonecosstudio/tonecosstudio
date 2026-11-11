/** TONART private owner portal. No customer account, public Supabase client or payment APIs. */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Inbox, LockKeyhole, RefreshCw } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { PUBLIC_ROUTES } from "@/config/routes";

type Status = "novo" | "em_analise" | "respondido" | "arquivado";
type Quote = {
  id: string; created_at: string; updated_at: string;
  customer_name: string; customer_email: string; customer_whatsapp: string | null;
  postal_code: string | null; items: {slug:string; name:string; quantity:number}[];
  desired_scale: string; finishing: string; notes: string | null;
  status: Status; admin_note: string;
};
const statuses: {value:Status; label:string}[] = [
  { value:"novo",label:"Novo" }, { value:"em_analise",label:"Em análise" },
  { value:"respondido",label:"Respondido" }, { value:"arquivado",label:"Arquivado" },
];
const inputClass = "w-full min-h-11 border border-[hsl(0,0%,30%)] bg-[hsl(0,0%,8%)] px-3 py-2 text-sm text-white focus:border-[hsl(var(--gold-accent))] focus:outline-none";
function quoteReplyHref(item: Quote) {
  const subject = `Orçamento TONART Studio — solicitação ${item.id.slice(0, 8)}`;
  const message = `Olá, ${item.customer_name}!\n\nRecebemos sua solicitação de orçamento na TONART Studio.\n\nReferência: ${item.id}\n\n`;
  return `mailto:${encodeURIComponent(item.customer_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
async function requestJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials:"same-origin",...init });
  const data: Record<string, unknown> = await res.json();
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível concluir.");
  return data;
}
export default function TonartQuotePortal() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [items, setItems] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [edited, setEdited] = useState<Record<string,{status:Status;adminNote:string}>>({});

  const load = useCallback(async (nextPage: number, nextStatus: string) => {
    const qs = new URLSearchParams({page:String(nextPage)});
    if (nextStatus) qs.set("status",nextStatus);
    const data = await requestJSON("/api/tonart-quotes?" + qs.toString());
    setItems(Array.isArray(data.items) ? data.items as Quote[] : []);
    setTotal(typeof data.total === "number" ? data.total : 0);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function start() {
      try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const query = new URLSearchParams(window.location.search);
        const accessError = hash.get("error") || query.get("error");
        if (accessError) {
          window.history.replaceState(null, "", window.location.pathname);
          throw new Error("O link de acesso expirou ou não pôde ser validado. Solicite um novo acesso.");
        }
        const accessToken = hash.get("access_token");
        const tokenHash = query.get("token_hash");
        const action = accessToken
          ? {action:"session",accessToken}
          : tokenHash ? {action:"verify",tokenHash} : null;
        if (action) {
          // Erase sensitive tokens from history immediately.
          window.history.replaceState(null, "", window.location.pathname);
          await requestJSON("/api/tonart-auth", {
            method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action),
          });
        }
        const result = await requestJSON("/api/tonart-auth");
        if (!mounted) return;
        const ok = result.authenticated === true;
        setAuthorized(ok);
        if (ok) {
          try {
            await load(0,"");
          } catch (e) {
            if (mounted) setError(e instanceof Error ? e.message : "A sessão está ativa, mas não foi possível carregar as solicitações.");
          }
        }
      } catch (e) {
        if (mounted) { setAuthorized(false); setError(e instanceof Error ? e.message : "Sessão indisponível."); }
      }
    }
    void start();
    return () => { mounted = false; };
  }, [load]);
  async function sendAccess() {
    setBusy(true); setError("");
    try {
      await requestJSON("/api/tonart-auth",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"request"}),
      });
      setSent(true);
    } catch (e) {setError(e instanceof Error ? e.message : "Não foi possível enviar o acesso.");}
    finally {setBusy(false);}
  }
  async function verify() {
    setBusy(true);setError("");
    try {
      const result = await requestJSON("/api/tonart-auth",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"verify",token:token.trim()}),
      });
      if (result.authenticated !== true) throw new Error("Não foi possível validar a conta.");
      setAuthorized(true); await load(0,"");
    }catch(e){setError(e instanceof Error?e.message:"Código inválido.");}
    finally{setBusy(false);}
  }
  async function changePage(nextPage: number, nextStatus=status) {
    setPage(nextPage);setStatus(nextStatus);setError("");
    try{await load(nextPage,nextStatus);}catch(e){setError(e instanceof Error?e.message:"Falha ao atualizar lista.");}
  }
  async function save(item: Quote) {
    const value = edited[item.id] ?? {status:item.status,adminNote:item.admin_note};
    setSavingId(item.id);setError("");
    try {
      await requestJSON("/api/tonart-quotes", {
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:item.id,status:value.status,adminNote:value.adminNote}),
      });
      await load(page,status);
      setEdited(old => {
        const next = {...old};
        delete next[item.id];
        return next;
      });
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");}
    finally{setSavingId("");}
  }
  async function logout() {
    await requestJSON("/api/tonart-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})});
    setAuthorized(false);setItems([]);setEdited({});setSent(false);
  }
  const filtered = items.filter(item => [item.customer_name,item.customer_email,
    ...item.items.map(x=>x.name)].join(" ").toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")));
  return (
    <Page title="Gestão de orçamentos" description="Painel privado de solicitações TONART Studio.">
      <main className="mx-auto min-h-[70vh] max-w-6xl space-y-8 px-4 py-10 text-[hsl(0,0%,90%)] sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-[hsl(var(--gold-accent))]">TONART STUDIO · ÁREA PRIVADA</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">Solicitações de orçamento</h1>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 text-sm text-[hsl(0,0%,70%)] hover:underline" to={PUBLIC_ROUTES.home}>
            <ArrowLeft size={16} aria-hidden="true"/> Voltar ao site
          </Link>
        </div>
        {error && <p role="alert" className="border border-red-500/50 p-4 text-sm text-red-200">{error}</p>}
        {authorized === null ? <p role="status">Verificando acesso…</p> : authorized === false ? (
          <div className="max-w-lg space-y-5 border border-[hsl(0,0%,25%)] bg-[hsl(0,0%,7%)] p-6 sm:p-8">
            <LockKeyhole className="text-[hsl(var(--gold-accent))]" aria-hidden="true"/>
            <h2 className="text-xl font-semibold">Acesso do estúdio</h2>
            <p className="text-sm leading-relaxed text-[hsl(0,0%,70%)]">
              Painel reservado ao e-mail administrativo autorizado. Solicite um link de acesso, sem abrir cadastro público de clientes.
            </p>
            <button className="min-h-11 w-full bg-[hsl(var(--gold-accent))] p-3 text-sm font-semibold text-black disabled:opacity-50"
              type="button" onClick={()=>void sendAccess()} disabled={busy}>
              {busy?"Solicitando…":"Enviar link de acesso"}
            </button>
            {sent && <p role="status" className="text-sm">A solicitação de acesso foi enviada ao serviço de autenticação. Verifique a caixa de entrada do estúdio.</p>}
            <div className="space-y-2">
              <label htmlFor="tonart-admin-token" className="block text-sm">Código recebido por e-mail (se disponível)</label>
              <input id="tonart-admin-token" className={inputClass} inputMode="numeric" autoComplete="one-time-code"
                placeholder="Código de 6 dígitos" value={token} onChange={e=>setToken(e.target.value)} maxLength={8} />
              <button className="min-h-11 border border-[hsl(var(--gold-accent))] px-5 text-sm disabled:opacity-50"
                type="button" disabled={busy||!/^\d{6,8}$/.test(token)} onClick={()=>void verify()}>Confirmar código</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-sm text-[hsl(var(--gold-accent))]"><Inbox size={17} aria-hidden="true"/> {total} solicitações</span>
              <button className="inline-flex min-h-11 items-center gap-2 border border-white/25 px-4 text-sm" type="button" onClick={()=>void changePage(page)}>
                <RefreshCw size={15} aria-hidden="true"/> Atualizar
              </button>
              <button className="ml-auto min-h-11 px-4 text-sm underline-offset-4 hover:underline" onClick={()=>void logout()} type="button">Sair da conta</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">Filtrar por situação
                <select className={inputClass+" mt-2"} value={status} onChange={e=>void changePage(0,e.target.value)}>
                  <option value="">Todas</option>
                  {statuses.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </label>
              <label className="block text-sm">Buscar nesta página
                <input className={inputClass+" mt-2"} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome, e-mail ou modelo"/>
              </label>
            </div>
            {filtered.length===0 ? <p role="status" className="border border-white/20 p-6 text-sm">Nenhuma solicitação nesta página com os filtros atuais.</p> : (
              <div className="grid gap-4">
                {filtered.map(item=>{
                  const draft=edited[item.id] ?? {status:item.status,adminNote:item.admin_note};
                  return <article key={item.id} className="space-y-4 border border-[hsl(0,0%,25%)] bg-[hsl(0,0%,7%)] p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h2 className="text-lg font-semibold">{item.customer_name}</h2>
                        <p className="text-xs text-[hsl(0,0%,55%)]">{new Date(item.created_at).toLocaleString("pt-BR")} · {item.id}</p>
                      </div>
                      <span className="border border-[hsl(var(--gold-accent)/0.4)] px-3 py-1 text-xs">{statuses.find(s=>s.value===item.status)?.label||item.status}</span>
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p>E-mail: <span className="break-all text-[hsl(0,0%,75%)]">{item.customer_email}</span></p>
                      <p>WhatsApp: <span className="text-[hsl(0,0%,75%)]">{item.customer_whatsapp||"Não informado"}</span></p>
                      <p>CEP: {item.postal_code||"Não informado"}</p>
                      <p>Escala: {item.desired_scale} · Acabamento: {item.finishing}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
                      <a href={quoteReplyHref(item)}
                        className="inline-flex min-h-11 items-center border border-[hsl(var(--gold-accent))] px-4 text-sm font-semibold text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)]"
                        aria-label={"Responder por e-mail a " + item.customer_name}>
                        Responder por e-mail
                      </a>
                      <span className="text-xs text-[hsl(0,0%,57%)]">Abre seu aplicativo de e-mail. Nenhuma mensagem é enviada automaticamente.</span>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <h3 className="mb-2 text-sm font-semibold">Modelos</h3>
                      <ul className="space-y-1 text-sm text-[hsl(0,0%,75%)]">
                        {item.items.map(x=><li key={x.slug}>{x.quantity} × {x.name} <span className="text-xs text-[hsl(0,0%,50%)]">({x.slug})</span></li>)}
                      </ul>
                    </div>
                    {item.notes&&<p className="whitespace-pre-wrap border-t border-white/10 pt-3 text-sm">Observações: {item.notes}</p>}
                    <div className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                      <label className="text-sm">Situação
                        <select className={inputClass+" mt-2"} value={draft.status}
                          onChange={e=>setEdited(old=>({...old,[item.id]:{...draft,status:e.target.value as Status}}))}>
                          {statuses.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
                        </select>
                      </label>
                      <label className="text-sm">Nota interna
                        <textarea className={inputClass+" mt-2"} value={draft.adminNote} maxLength={1500} rows={2}
                          onChange={e=>setEdited(old=>({...old,[item.id]:{...draft,adminNote:e.target.value}}))}
                          placeholder="Análise, preço calculado ou retorno combinado..." />
                      </label>
                    </div>
                    <button className="min-h-11 border border-[hsl(var(--gold-accent))] px-5 text-sm disabled:opacity-50"
                      disabled={savingId===item.id} onClick={()=>void save(item)} type="button">
                      {savingId===item.id?"Salvando…":"Salvar andamento"}
                    </button>
                  </article>;
                })}
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <button className="min-h-11 border border-white/20 px-4 text-sm disabled:opacity-40" disabled={page===0} onClick={()=>void changePage(page-1)} type="button">Anterior</button>
              <span className="text-xs">Página {page+1} de {Math.max(1,Math.ceil(total/30))}</span>
              <button className="min-h-11 border border-white/20 px-4 text-sm disabled:opacity-40"
                disabled={(page+1)*30>=total} onClick={()=>void changePage(page+1)} type="button">Próxima</button>
            </div>
          </>
        )}
      </main>
    </Page>
  );
}
