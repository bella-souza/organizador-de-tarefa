import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { carregarDados, salvarDados } from "@/lib/organizador.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meu Organizador de Estudos" },
      { name: "description", content: "Organize suas tarefas acadêmicas de forma simples e acolhedora." },
      { property: "og:title", content: "Meu Organizador de Estudos" },
      { property: "og:description", content: "Organize suas tarefas acadêmicas de forma simples e acolhedora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Prioridade = "alta" | "media" | "baixa";
type Lista = { id: number; nome: string };
type Tarefa = {
  id: number;
  texto: string;
  concluida: boolean;
  criadaEm: string;
  prioridade: Prioridade;
  agendadaPara: string;
  listaId: number;
};

const PRIORIDADES: Record<Prioridade, { rotulo: string; cor: string; borda: string }> = {
  alta: { rotulo: "Alta", cor: "bg-prio-alta", borda: "border-l-prio-alta" },
  media: { rotulo: "Média", cor: "bg-prio-media", borda: "border-l-prio-media" },
  baixa: { rotulo: "Baixa", cor: "bg-prio-baixa", borda: "border-l-prio-baixa" },
};
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const campo = "rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary";

function usePersistente<T>(chave: string, inicial: T) {
  const [v, setV] = useState<T>(inicial);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const salvo = localStorage.getItem(chave);
    if (salvo) setV(JSON.parse(salvo));
    setPronto(true);
  }, [chave]);
  useEffect(() => {
    if (pronto) localStorage.setItem(chave, JSON.stringify(v));
  }, [chave, v, pronto]);
  return [v, setV] as const;
}

function Index() {
  const [listas, setListas] = usePersistente<Lista[]>("org-listas", [{ id: 1, nome: "Geral" }]);
  const [tarefas, setTarefas] = usePersistente<Tarefa[]>("org-tarefas", []);
  const [listaAtiva, setListaAtiva] = useState(1);
  const [diaFiltro, setDiaFiltro] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [agendada, setAgendada] = useState("");
  const [novaLista, setNovaLista] = useState("");
  const [celular, setCelular] = usePersistente<string>("org-celular", "");
  const [hoje, setHoje] = useState<Date | null>(null);
  useEffect(() => setHoje(new Date()), []);

  // Sincroniza com o Lovable Cloud usando um identificador deste aparelho
  const [dispositivoId, setDispositivoId] = useState<string | null>(null);
  const [sincronizado, setSincronizado] = useState(false);
  useEffect(() => {
    let id = localStorage.getItem("org-dispositivo");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("org-dispositivo", id);
    }
    setDispositivoId(id);
    carregarDados({ data: { dispositivoId: id } })
      .then((d) => {
        if (d) {
          setCelular(d.celular);
          if (d.listas.length) setListas(d.listas);
          setTarefas(d.tarefas);
        }
      })
      .catch(console.error)
      .finally(() => setSincronizado(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!sincronizado || !dispositivoId) return;
    const t = setTimeout(() => {
      salvarDados({ data: { dispositivoId, celular: celular.trim(), listas, tarefas } }).catch(console.error);
    }, 800);
    return () => clearTimeout(t);
  }, [sincronizado, dispositivoId, celular, listas, tarefas]);

  const daLista = tarefas.filter((t) => t.listaId === listaAtiva);
  const visiveis = daLista
    .filter((t) => !diaFiltro || (t.agendadaPara && mesmoDia(new Date(t.agendadaPara), new Date(diaFiltro))))
    .sort((a, b) => Number(a.concluida) - Number(b.concluida));
  const concluidas = tarefas.filter((t) => t.concluida).length;

  const semana = hoje
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() - hoje.getDay() + i);
        return d;
      })
    : [];

  const adicionar = (e: FormEvent) => {
    e.preventDefault();
    const v = texto.trim();
    if (!v) return;
    setTarefas([
      ...tarefas,
      { id: Date.now(), texto: v, concluida: false, criadaEm: new Date().toISOString(), prioridade, agendadaPara: agendada ? new Date(agendada).toISOString() : "", listaId: listaAtiva },
    ]);
    setTexto("");
    setAgendada("");
  };

  const criarLista = (e: FormEvent) => {
    e.preventDefault();
    const n = novaLista.trim();
    if (!n) return;
    const id = Date.now();
    setListas([...listas, { id, nome: n }]);
    setListaAtiva(id);
    setNovaLista("");
  };

  const excluirLista = (id: number) => {
    setListas(listas.filter((l) => l.id !== id));
    setTarefas(tarefas.filter((t) => t.listaId !== id));
    setListaAtiva(1);
  };

  // Edição do título de uma tarefa
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState("");
  const iniciarEdicao = (t: Tarefa) => {
    setEditandoId(t.id);
    setRascunho(t.texto);
  };
  const cancelarEdicao = () => {
    setEditandoId(null);
    setRascunho("");
  };
  const salvarEdicao = (e: FormEvent, id: number) => {
    e.preventDefault();
    const novo = rascunho.trim();
    if (!novo) return;
    setTarefas(tarefas.map((x) => (x.id === id ? { ...x, texto: novo } : x)));
    cancelarEdicao();
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">Meu Organizador de Estudos</h1>
          <p className="mt-2 text-muted-foreground">Olá! Que bom ter você aqui. Vamos organizar seus estudos juntos?</p>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-card p-5 text-center shadow-card">
            <p className="text-3xl font-extrabold text-primary">{tarefas.length}</p>
            <p className="text-sm text-muted-foreground">Tarefas cadastradas</p>
          </div>
          <div className="rounded-2xl bg-card p-5 text-center shadow-card">
            <p className="text-3xl font-extrabold text-primary">{concluidas}</p>
            <p className="text-sm text-muted-foreground">Tarefas concluídas</p>
          </div>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Esta semana</h2>
            {diaFiltro && (
              <button onClick={() => setDiaFiltro(null)} className="text-sm font-semibold text-primary hover:underline">
                Ver todas
              </button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {semana.map((d) => {
              const qtd = daLista.filter((t) => t.agendadaPara && mesmoDia(new Date(t.agendadaPara), d)).length;
              const ativo = diaFiltro && mesmoDia(new Date(diaFiltro), d);
              const eHoje = hoje && mesmoDia(d, hoje);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setDiaFiltro(ativo ? null : d.toISOString())}
                  className={`rounded-xl px-1 py-2 text-center transition ${
                    ativo ? "bg-primary text-primary-foreground" : eHoje ? "bg-accent ring-2 ring-primary" : "bg-accent hover:bg-secondary"
                  }`}
                >
                  <span className="block text-xs font-semibold">{DIAS[d.getDay()]}</span>
                  <span className="block text-lg font-extrabold">{d.getDate()}</span>
                  <span className="block text-[10px]">{qtd > 0 ? `${qtd} tarefa${qtd > 1 ? "s" : ""}` : "\u00a0"}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 text-lg font-bold">Minhas listas</h2>
          <div className="space-y-2">
            {listas.map((l) => (
              <div
                key={l.id}
                className={`flex items-center rounded-xl font-semibold ${
                  l.id === listaAtiva ? "bg-primary text-primary-foreground shadow-card" : "bg-accent text-accent-foreground"
                }`}
              >
                <button onClick={() => setListaAtiva(l.id)} className="flex flex-1 items-center justify-between px-4 py-2.5 text-left">
                  <span>{l.nome}</span>
                  <span>{tarefas.filter((t) => t.listaId === l.id).length}</span>
                </button>
                {l.id !== 1 && (
                  <button onClick={() => excluirLista(l.id)} aria-label={`Excluir lista ${l.nome}`} className="pr-4 opacity-70 hover:opacity-100">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={criarLista} className="mt-3 flex gap-2">
            <input value={novaLista} onChange={(e) => setNovaLista(e.target.value)} placeholder="Nova lista" className={`${campo} min-w-0 flex-1 py-2`} />
            <button type="submit" aria-label="Criar lista" className="rounded-xl bg-primary px-4 text-lg font-bold text-primary-foreground shadow-card hover:opacity-90">
              +
            </button>
          </form>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold">Celular para lembretes</span>
            <input
              type="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="+5511999999999"
              className={`${campo} w-full py-2`}
            />
          </label>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-card">
          <form onSubmit={adicionar} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="nova" className="sr-only">Nova tarefa</label>
              <input id="nova" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Digite uma nova tarefa..." className={`${campo} flex-1`} />
              <button type="submit" className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:opacity-90">
                Adicionar
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Prioridade:</span>
                {(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPrioridade(p)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${
                      prioridade === p ? "border-primary bg-accent" : "border-border"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${PRIORIDADES[p].cor}`} />
                    {PRIORIDADES[p].rotulo}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground sm:ml-auto">
                Agendar para:
                <input type="datetime-local" value={agendada} onChange={(e) => setAgendada(e.target.value)} className={`${campo} py-1.5 text-foreground`} />
              </label>
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-4 text-lg font-bold">
            {listas.find((l) => l.id === listaAtiva)?.nome}
            {diaFiltro && ` · ${new Date(diaFiltro).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}`}
          </h2>
          {visiveis.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">Nenhuma tarefa aqui. Adicione uma acima!</p>
          ) : (
            <ul className="space-y-2">
              {visiveis.map((t) => (
                <li key={t.id} className={`flex items-start gap-3 rounded-xl border-l-4 bg-accent px-4 py-3 ${PRIORIDADES[t.prioridade].borda}`}>
                  <input
                    type="checkbox"
                    checked={t.concluida}
                    onChange={() => setTarefas(tarefas.map((x) => (x.id === t.id ? { ...x, concluida: !x.concluida } : x)))}
                    aria-label="Marcar como concluída"
                    className="mt-1 h-5 w-5 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    {editandoId === t.id ? (
                      <form onSubmit={(e) => salvarEdicao(e, t.id)} className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={rascunho}
                          onChange={(e) => setRascunho(e.target.value)}
                          onKeyDown={(e) => e.key === "Escape" && cancelarEdicao()}
                          aria-label="Editar título da tarefa"
                          autoFocus
                          className={`${campo} min-w-0 flex-1 py-1.5`}
                        />
                        <div className="flex gap-2">
                          <button type="submit" disabled={!rascunho.trim()} className="rounded-lg bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                            Salvar
                          </button>
                          <button type="button" onClick={cancelarEdicao} className="rounded-lg border border-border px-3 py-1 text-sm font-semibold">
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className={`break-words font-semibold ${t.concluida ? "text-muted-foreground line-through" : ""}`}>{t.texto}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${PRIORIDADES[t.prioridade].cor}`} />
                        {PRIORIDADES[t.prioridade].rotulo}
                      </span>
                      <span>Adicionada em {fmt(t.criadaEm)}</span>
                      {t.agendadaPara && <span className="font-semibold text-primary">Agendada: {fmt(t.agendadaPara)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row">
                    {editandoId !== t.id && (
                      <button onClick={() => iniciarEdicao(t)} className="rounded-lg px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/10">
                        Editar
                      </button>
                    )}
                    <button
                      onClick={() => setTarefas(tarefas.filter((x) => x.id !== t.id))}
                      className="rounded-lg px-3 py-1 text-sm font-semibold text-destructive hover:bg-destructive/10"
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
