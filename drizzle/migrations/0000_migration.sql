CREATE TABLE public.dispositivos (
  id uuid PRIMARY KEY,
  celular text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.listas (
  dispositivo_id uuid NOT NULL REFERENCES public.dispositivos(id) ON DELETE CASCADE,
  id bigint NOT NULL,
  nome text NOT NULL,
  PRIMARY KEY (dispositivo_id, id)
);
CREATE TABLE public.tarefas (
  dispositivo_id uuid NOT NULL REFERENCES public.dispositivos(id) ON DELETE CASCADE,
  id bigint NOT NULL,
  lista_id bigint NOT NULL,
  texto text NOT NULL,
  concluida boolean NOT NULL DEFAULT false,
  prioridade text NOT NULL DEFAULT 'media',
  criada_em timestamptz NOT NULL DEFAULT now(),
  agendada_para timestamptz,
  lembrete_enviado boolean NOT NULL DEFAULT false,
  PRIMARY KEY (dispositivo_id, id)
);
CREATE INDEX tarefas_lembrete_idx ON public.tarefas (agendada_para) WHERE NOT lembrete_enviado AND NOT concluida;
GRANT ALL ON public.dispositivos TO service_role;
GRANT ALL ON public.listas TO service_role;
GRANT ALL ON public.tarefas TO service_role;
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;