import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Apple,
  CalendarDays,
  CheckCircle2,
  ListTodo,
  Moon,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { carregarDados, salvarDados } from "@/lib/organizador.functions";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meu Organizador de Estudos" },
      {
        name: "description",
        content: "Organize suas tarefas acadêmicas de forma simples e acolhedora.",
      },
      { property: "og:title", content: "Meu Organizador de Estudos" },
      {
        property: "og:description",
        content: "Organize suas tarefas acadêmicas de forma simples e acolhedora.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});
const PRIORIDADES = {
  alta: { rotulo: "Alta", cor: "bg-prio-alta", borda: "border-l-prio-alta" },
  media: { rotulo: "Média", cor: "bg-prio-media", borda: "border-l-prio-media" },
  baixa: { rotulo: "Baixa", cor: "bg-prio-baixa", borda: "border-l-prio-baixa" },
};
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const fmt = (iso) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const mesmoDia = (a, b) => a.toDateString() === b.toDateString();
const campo =
  "nocturna-input rounded-xl border px-4 py-3 outline-none transition focus:ring-0";
function usePersistente(chave, inicial) {
  const [v, setV] = useState(inicial);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const salvo = localStorage.getItem(chave);
    if (salvo) setV(JSON.parse(salvo));
    setPronto(true);
  }, [chave]);
  useEffect(() => {
    if (pronto) localStorage.setItem(chave, JSON.stringify(v));
  }, [chave, v, pronto]);
  return [v, setV];
}
function Index() {
  const [listas, setListas] = usePersistente("org-listas", [{ id: 1, nome: "Geral" }]);
  const [tarefas, setTarefas] = usePersistente("org-tarefas", []);
  const [listaAtiva, setListaAtiva] = useState(1);
  const [diaFiltro, setDiaFiltro] = useState(null);
  const [texto, setTexto] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [agendada, setAgendada] = useState("");
  const [novaLista, setNovaLista] = useState("");
  const [celular, setCelular] = usePersistente("org-celular", "");
  const [hoje, setHoje] = useState(null);
  const [anuncio, setAnuncio] = useState("");
  useEffect(() => setHoje(new Date()), []);
  // Sincroniza com o Lovable Cloud usando um identificador deste aparelho
  const [dispositivoId, setDispositivoId] = useState(null);
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
      salvarDados({ data: { dispositivoId, celular: celular.trim(), listas, tarefas } }).catch(
        console.error,
      );
    }, 800);
    return () => clearTimeout(t);
  }, [sincronizado, dispositivoId, celular, listas, tarefas]);
  const daLista = tarefas.filter((t) => t.listaId === listaAtiva);
  const visiveis = daLista
    .filter(
      (t) =>
        !diaFiltro || (t.agendadaPara && mesmoDia(new Date(t.agendadaPara), new Date(diaFiltro))),
    )
    .sort((a, b) => Number(a.concluida) - Number(b.concluida));
  const concluidas = tarefas.filter((t) => t.concluida).length;
  const semana = hoje
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() - hoje.getDay() + i);
        return d;
      })
    : [];
  const adicionar = (e) => {
    e.preventDefault();
    const v = texto.trim();
    if (!v) return;
    setTarefas([
      ...tarefas,
      {
        id: Date.now(),
        texto: v,
        concluida: false,
        criadaEm: new Date().toISOString(),
        prioridade,
        agendadaPara: agendada ? new Date(agendada).toISOString() : "",
        listaId: listaAtiva,
      },
    ]);
    setTexto("");
    setAgendada("");
    setAnuncio(`Tarefa "${v}" adicionada.`);
  };
  const criarLista = (e) => {
    e.preventDefault();
    const n = novaLista.trim();
    if (!n) return;
    const id = Date.now();
    setListas([...listas, { id, nome: n }]);
    setListaAtiva(id);
    setNovaLista("");
    setAnuncio(`Lista "${n}" criada.`);
  };
  const excluirLista = (id) => {
    setListas(listas.filter((l) => l.id !== id));
    setTarefas(tarefas.filter((t) => t.listaId !== id));
    setListaAtiva(1);
    setAnuncio("Lista excluída.");
  };
  // Edição do título de uma tarefa
  const [editandoId, setEditandoId] = useState(null);
  const [rascunho, setRascunho] = useState("");
  const iniciarEdicao = (t) => {
    setEditandoId(t.id);
    setRascunho(t.texto);
  };
  const cancelarEdicao = () => {
    setEditandoId(null);
    setRascunho("");
  };
  const salvarEdicao = (e, id) => {
    e.preventDefault();
    const novo = rascunho.trim();
    if (!novo) return;
    setTarefas(tarefas.map((x) => (x.id === id ? { ...x, texto: novo } : x)));
    cancelarEdicao();
    setAnuncio("Tarefa atualizada.");
  };
  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncio}
      </div>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b2f3a]/80 px-6 py-8 shadow-card sm:px-10">
          <div className="absolute -right-8 -top-10 text-[#6e5138]/30">
            <Moon size={150} strokeWidth={0.8} />
          </div>
          <div className="relative flex items-start gap-4">
            <div className="rounded-2xl bg-[#2d6a4f] p-3 text-[#f3efe7] shadow-card">
              <Sparkles size={25} />
            </div>
            <div>
              <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#e1ddd5]">
                <span>Diário de estudos</span>
                <span className="h-1 w-1 rounded-full bg-[#6e5138]" />
                <span>Noite adentro</span>
              </p>
              <h1 className="text-4xl font-extrabold text-[#f3efe7] sm:text-5xl">
                Meu Organizador de Estudos
              </h1>
              <p className="mt-2 max-w-xl text-[#e1ddd5]">
                Um pequeno ritual para transformar cada tarefa em progresso.
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumo das tarefas">
          <div className="nocturna-panel rounded-2xl p-4">
            <ListTodo className="mb-3 text-[#e1ddd5]" size={19} />
            <p className="text-3xl font-extrabold text-[#f3efe7]">{tarefas.length}</p>
            <p className="text-sm text-[#e1ddd5]">Tarefas no grimório</p>
          </div>
          <div className="nocturna-panel rounded-2xl p-4">
            <CheckCircle2 className="mb-3 text-[#9bc6a7]" size={19} />
            <p className="text-3xl font-extrabold text-[#f3efe7]">{concluidas}</p>
            <p className="text-sm text-[#e1ddd5]">Feitiços concluídos</p>
          </div>
          <div className="nocturna-panel col-span-2 rounded-2xl p-4">
            <p className="mb-2 text-sm text-[#e1ddd5]">Ritmo da semana</p>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-extrabold text-[#f3efe7]">
                {tarefas.length ? Math.round((concluidas / tarefas.length) * 100) : 0}%
              </p>
              <div className="mb-2 h-2 flex-1 overflow-hidden rounded-full bg-[#0b2f3a]/70">
                <div
                  className="h-full rounded-full bg-[#2d6a4f] transition-all"
                  style={{ width: `${tarefas.length ? (concluidas / tarefas.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-[#e1ddd5]">Cada passo conta</p>
          </div>
        </section>

        <section className="nocturna-panel rounded-2xl p-5" aria-labelledby="semana-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="semana-heading" className="flex items-center gap-2 text-xl font-bold">
              <CalendarDays size={20} className="text-[#e1ddd5]" /> Esta semana
            </h2>
            {diaFiltro && (
              <button
                onClick={() => setDiaFiltro(null)}
                className="text-sm font-semibold text-[#f3efe7] underline decoration-[#6e5138] decoration-2 underline-offset-4 hover:text-[#e1ddd5]"
              >
                Ver todas
              </button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {semana.map((d) => {
              const qtd = daLista.filter(
                (t) => t.agendadaPara && mesmoDia(new Date(t.agendadaPara), d),
              ).length;
              const ativo = diaFiltro && mesmoDia(new Date(diaFiltro), d);
              const eHoje = hoje && mesmoDia(d, hoje);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => setDiaFiltro(ativo ? null : d.toISOString())}
                  aria-pressed={Boolean(ativo)}
                  aria-label={`${DIAS[d.getDay()]} ${d.getDate()}${eHoje ? ", hoje" : ""}${qtd ? `, ${qtd} tarefas` : ", sem tarefas agendadas"}`}
                  className={`rounded-xl border px-1 py-2 text-center transition ${ativo ? "border-[#f3efe7] bg-[#6e5138] text-[#f3efe7]" : eHoje ? "border-[#f3efe7] bg-[#1f6a6e] ring-2 ring-[#6e5138]" : "border-white/20 bg-[#0b2f3a]/70 hover:bg-[#1f6a6e]"}`}
                >
                  <span className="block text-xs font-semibold">{DIAS[d.getDay()]}</span>
                  <span className="block text-lg font-extrabold">{d.getDate()}</span>
                  <span className="block text-xs">
                    {qtd > 0 ? `${qtd} tarefa${qtd > 1 ? "s" : ""}` : "\u00a0"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="nocturna-panel rounded-2xl p-5" aria-labelledby="listas-heading">
          <h2 id="listas-heading" className="mb-3 flex items-center gap-2 text-xl font-bold">
            <ListTodo size={20} className="text-[#e1ddd5]" /> Minhas listas
          </h2>
          <div className="space-y-2">
            {listas.map((l) => (
              <div
                key={l.id}
                className={`flex items-center rounded-xl font-semibold ${l.id === listaAtiva ? "bg-[#2d6a4f] text-[#f3efe7] shadow-card" : "bg-[#0b2f3a]/45 text-[#f3efe7]"} border border-white/10`}
              >
                <button
                  type="button"
                  onClick={() => setListaAtiva(l.id)}
                  aria-pressed={l.id === listaAtiva}
                  aria-label={`Selecionar lista ${l.nome}, ${tarefas.filter((t) => t.listaId === l.id).length} tarefas`}
                  className="flex flex-1 items-center justify-between px-4 py-2.5 text-left"
                >
                  <span>{l.nome}</span>
                  <span>{tarefas.filter((t) => t.listaId === l.id).length}</span>
                </button>
                {l.id !== 1 && (
                  <button
                    type="button"
                    onClick={() => excluirLista(l.id)}
                    aria-label={`Excluir lista ${l.nome}`}
                    className="pr-4 opacity-70 transition hover:opacity-100"
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={criarLista} className="mt-3 flex gap-2">
            <label htmlFor="nova-lista" className="sr-only">
              Nome da nova lista
            </label>
            <input
              id="nova-lista"
              value={novaLista}
              onChange={(e) => setNovaLista(e.target.value)}
              placeholder="Nova lista"
              className={`${campo} min-w-0 flex-1 py-2`}
            />
            <button
              type="submit"
              aria-label="Criar lista"
              className="nocturna-button rounded-xl bg-[#2d6a4f] px-4 text-lg font-bold text-[#f3efe7] shadow-card"
            >
              <Plus size={21} />
            </button>
          </form>
          <div className="mt-4">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#e1ddd5]">
              <Phone size={15} /> Celular para lembretes
            </span>
            <label htmlFor="celular" className="sr-only">
              Celular para lembretes
            </label>
            <input
              id="celular"
              type="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="+5511999999999"
              className={`${campo} w-full py-2`}
            />
          </div>
        </section>

        <section className="nocturna-panel rounded-2xl p-5" aria-labelledby="adicionar-heading">
          <h2 id="adicionar-heading" className="mb-4 text-xl font-bold">
            Adicionar uma tarefa
          </h2>
          <form onSubmit={adicionar} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="nova" className="sr-only">
                Nova tarefa
              </label>
              <input
                id="nova"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite uma nova tarefa..."
                className={`${campo} flex-1`}
                aria-describedby="nova-ajuda"
              />
              <button
                type="submit"
                className="nocturna-button min-h-12 rounded-xl bg-[#2d6a4f] px-6 py-3 font-bold text-[#f3efe7] shadow-card"
              >
                Adicionar
              </button>
            </div>
            <p id="nova-ajuda" className="sr-only">
              Informe o título, escolha uma prioridade e, se desejar, agende a tarefa.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend id="prioridade-label" className="text-sm font-semibold text-muted-foreground">
                  Prioridade:
                </legend>
                {Object.keys(PRIORIDADES).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPrioridade(p)}
                    aria-pressed={prioridade === p}
                    aria-label={`Prioridade ${PRIORIDADES[p].rotulo}`}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition ${prioridade === p ? "border-[#f3efe7] bg-[#6e5138] text-[#f3efe7]" : "border-white/30 text-[#e1ddd5] hover:border-white/60"}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${PRIORIDADES[p].cor}`} />
                    {PRIORIDADES[p].rotulo}
                  </button>
                ))}
              </fieldset>
              <label className="flex w-full flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground sm:ml-auto sm:w-auto" htmlFor="agendada">
                <span>Agendar para:</span>
                <input
                  id="agendada"
                  type="datetime-local"
                  value={agendada}
                  onChange={(e) => setAgendada(e.target.value)}
                  className={`${campo} min-w-0 max-w-full py-1.5 text-foreground`}
                />
              </label>
            </div>
          </form>
        </section>

        <section className="nocturna-panel rounded-2xl p-5" aria-labelledby="tarefas-heading">
          <h2 id="tarefas-heading" className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Apple size={19} className="text-[#e1ddd5]" />
            {listas.find((l) => l.id === listaAtiva)?.nome}
            {diaFiltro &&
              ` · ${new Date(diaFiltro).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}`}
          </h2>
          {visiveis.length === 0 ? (
            <p className="py-10 text-center text-[#e1ddd5]">
              O silêncio da noite está intacto. Adicione uma tarefa acima.
            </p>
          ) : (
            <ul className="space-y-2">
              {visiveis.map((t) => (
                <li
                  key={t.id}
                  className={`nocturna-card flex items-start gap-3 rounded-xl border-l-4 px-4 py-3 ${PRIORIDADES[t.prioridade].borda}`}
                >
                  <input
                    type="checkbox"
                    checked={t.concluida}
                    aria-label={t.concluida ? `Reabrir tarefa: ${t.texto}` : `Concluir tarefa: ${t.texto}`}
                    onChange={() => {
                      setTarefas(
                        tarefas.map((x) =>
                          x.id === t.id ? { ...x, concluida: !x.concluida } : x,
                        ),
                      );
                      setAnuncio(t.concluida ? "Tarefa reaberta." : "Tarefa concluída.");
                    }}
                    className="mt-1 h-5 w-5 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    {editandoId === t.id ? (
                      <form
                        onSubmit={(e) => salvarEdicao(e, t.id)}
                        className="flex flex-col gap-2 sm:flex-row"
                      >
                        <input
                          value={rascunho}
                          onChange={(e) => setRascunho(e.target.value)}
                          onKeyDown={(e) => e.key === "Escape" && cancelarEdicao()}
                          aria-label="Editar título da tarefa"
                          autoFocus
                          className={`${campo} min-w-0 flex-1 py-1.5`}
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={!rascunho.trim()}
                            className="rounded-lg bg-[#2d6a4f] px-3 py-1 text-sm font-semibold text-[#f3efe7] disabled:opacity-50"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={cancelarEdicao}
                            className="rounded-lg border border-white/20 px-3 py-1 text-sm font-semibold"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p
                        className={`break-words font-semibold ${t.concluida ? "text-muted-foreground line-through" : ""}`}
                      >
                        {t.texto}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${PRIORIDADES[t.prioridade].cor}`} />
                        {PRIORIDADES[t.prioridade].rotulo}
                      </span>
                      <span>Adicionada em {fmt(t.criadaEm)}</span>
                      {t.agendadaPara && (
                        <span className="font-semibold text-primary">
                          Agendada: {fmt(t.agendadaPara)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row">
                    {editandoId !== t.id && (
                      <button
                        onClick={() => iniciarEdicao(t)}
                        className="rounded-lg px-3 py-1 text-sm font-semibold text-[#f3efe7] hover:bg-[#6e5138]/50"
                      >
                      <span className="flex items-center gap-1.5">
                        <Pencil size={14} /> Editar
                      </span>
                    </button>
                    )}
                    <button
                    onClick={() => setTarefas(tarefas.filter((x) => x.id !== t.id))}
                    className="rounded-lg px-3 py-1 text-sm font-semibold text-[#f3efe7] hover:bg-[#b45b52]/50"
                    >
                    <span className="flex items-center gap-1.5">
                      <Trash2 size={14} /> Excluir
                    </span>
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
