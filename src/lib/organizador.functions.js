import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
const Dispositivo = z.object({ dispositivoId: z.string().uuid() });
const Dados = Dispositivo.extend({
  celular: z.string().max(20),
  listas: z.array(z.object({ id: z.number().int(), nome: z.string().min(1).max(100) })).max(200),
  tarefas: z
    .array(
      z.object({
        id: z.number().int(),
        listaId: z.number().int(),
        texto: z.string().min(1).max(500),
        concluida: z.boolean(),
        prioridade: z.enum(["alta", "media", "baixa"]),
        criadaEm: z.string(),
        agendadaPara: z.string(),
      }),
    )
    .max(2000),
});
export const carregarDados = createServerFn({ method: "POST" })
  .inputValidator((i) => Dispositivo.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.dispositivoId;
    const [d, l, t] = await Promise.all([
      supabaseAdmin.from("dispositivos").select("celular").eq("id", id).maybeSingle(),
      supabaseAdmin.from("listas").select("id, nome").eq("dispositivo_id", id),
      supabaseAdmin.from("tarefas").select("*").eq("dispositivo_id", id),
    ]);
    if (!d.data) return null;
    return {
      celular: d.data.celular,
      listas: (l.data ?? []).map((x) => ({ id: Number(x.id), nome: x.nome })),
      tarefas: (t.data ?? []).map((x) => ({
        id: Number(x.id),
        listaId: Number(x.lista_id),
        texto: x.texto,
        concluida: x.concluida,
        prioridade: x.prioridade,
        criadaEm: x.criada_em,
        agendadaPara: x.agendada_para ?? "",
      })),
    };
  });
export const salvarDados = createServerFn({ method: "POST" })
  .inputValidator((i) => Dados.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.dispositivoId;
    await supabaseAdmin.from("dispositivos").upsert({ id, celular: data.celular });
    const { data: antigas } = await supabaseAdmin
      .from("tarefas")
      .select("id, agendada_para, lembrete_enviado")
      .eq("dispositivo_id", id);
    const enviado = new Map((antigas ?? []).map((x) => [Number(x.id), x]));
    await supabaseAdmin.from("tarefas").delete().eq("dispositivo_id", id);
    await supabaseAdmin.from("listas").delete().eq("dispositivo_id", id);
    if (data.listas.length)
      await supabaseAdmin
        .from("listas")
        .insert(data.listas.map((l) => ({ dispositivo_id: id, id: l.id, nome: l.nome })));
    if (data.tarefas.length)
      await supabaseAdmin.from("tarefas").insert(
        data.tarefas.map((t) => {
          const agendada = t.agendadaPara ? new Date(t.agendadaPara).toISOString() : null;
          const ant = enviado.get(t.id);
          const mesmo =
            ant &&
            ant.agendada_para &&
            agendada &&
            new Date(ant.agendada_para).getTime() === new Date(agendada).getTime();
          return {
            dispositivo_id: id,
            id: t.id,
            lista_id: t.listaId,
            texto: t.texto,
            concluida: t.concluida,
            prioridade: t.prioridade,
            criada_em: t.criadaEm,
            agendada_para: agendada,
            lembrete_enviado: Boolean(mesmo && ant?.lembrete_enviado),
          };
        }),
      );
    return { ok: true };
  });
