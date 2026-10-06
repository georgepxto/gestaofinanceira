-- ═══════════════════════════════════════════════════════════════════════════
-- Hedge — o schema como está no banco
--
-- Gerado a partir do banco de produção em 06/10/2026 (information_schema,
-- pg_constraint, pg_indexes e pg_policies). É a referência fiel de tabelas,
-- colunas, tipos, restrições, índices e regras de acesso (RLS).
--
-- NÃO é para rodar por cima de um banco que já existe. Os outros arquivos
-- desta pasta contam como o banco foi montado; este diz como ele ficou.
--
-- O que este retrato não traz: funções e RPCs (check_login_blocked,
-- record_login_attempt, delete_user_account e as do painel de admin),
-- gatilhos, a precisão dos campos NUMERIC e os papéis de cada política.
-- As tabelas *_backup_20260728 ficaram de fora de propósito: são cópias
-- soltas, não fazem parte do app.
--
-- Para atualizar: siga os passos no topo de scripts/gerar-schema.py.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── activity_logs ─────────────────────────────────────────────────────────
CREATE TABLE activity_logs (
  id          UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id     UUID,
  email       TEXT,
  action      TEXT NOT NULL,
  details     JSONB DEFAULT '{}'::jsonb,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);

-- ─── cartoes_credito ───────────────────────────────────────────────────────
CREATE TABLE cartoes_credito (
  id                 UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id            UUID,
  nome               TEXT NOT NULL,
  conta_id           UUID,
  dia_vencimento     INTEGER DEFAULT 10 NOT NULL,
  limite             NUMERIC,
  created_at         TIMESTAMPTZ DEFAULT now(),
  melhor_dia_compra  INTEGER,
  divida_inicial     NUMERIC DEFAULT 0,
  cor                TEXT DEFAULT '#3B82F6'::text,
  abertura           JSONB,
  CONSTRAINT cartoes_credito_pkey PRIMARY KEY (id)
);

-- ─── categorias_usuario ────────────────────────────────────────────────────
CREATE TABLE categorias_usuario (
  id          UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id     UUID NOT NULL,
  tipo        TEXT NOT NULL,
  nome        TEXT NOT NULL,
  ordem       INTEGER DEFAULT 0 NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT categorias_usuario_pkey PRIMARY KEY (id),
  CONSTRAINT categorias_usuario_nome_check CHECK ((btrim(nome) <> ''::text)),
  CONSTRAINT categorias_usuario_tipo_check CHECK ((tipo = ANY (ARRAY['gasto'::text, 'receita'::text])))
);

-- ─── configuracoes ─────────────────────────────────────────────────────────
CREATE TABLE configuracoes (
  user_id     UUID NOT NULL,
  salario     NUMERIC DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT configuracoes_pkey PRIMARY KEY (user_id)
);

-- ─── contas_bancarias ──────────────────────────────────────────────────────
CREATE TABLE contas_bancarias (
  id             UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id        UUID,
  nome           TEXT NOT NULL,
  banco          TEXT,
  saldo_inicial  NUMERIC DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  saldo_atual    NUMERIC,
  CONSTRAINT contas_bancarias_pkey PRIMARY KEY (id)
);

-- ─── gastos ────────────────────────────────────────────────────────────────
CREATE TABLE gastos (
  id            UUID DEFAULT gen_random_uuid() NOT NULL,
  descricao     VARCHAR NOT NULL,
  pessoa        VARCHAR NOT NULL,
  valor_total   NUMERIC NOT NULL,
  num_parcelas  INTEGER DEFAULT 1 NOT NULL,
  data_inicio   DATE NOT NULL,
  tipo          VARCHAR NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  user_id       UUID,
  categoria     TEXT DEFAULT 'Outros'::text,
  subcategoria  TEXT DEFAULT 'Gastos diversos'::text,
  cartao_id     UUID,
  conta_id      UUID,
  recorrente    BOOLEAN DEFAULT false,
  origem_id     TEXT,
  CONSTRAINT gastos_pkey PRIMARY KEY (id),
  CONSTRAINT gastos_num_parcelas_check CHECK (((num_parcelas >= 1) AND (num_parcelas <= 48))),
  CONSTRAINT gastos_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['credito'::character varying, 'debito'::character varying])::text[])))
);

-- ─── login_attempts ────────────────────────────────────────────────────────
CREATE TABLE login_attempts (
  id            UUID DEFAULT gen_random_uuid() NOT NULL,
  email         TEXT NOT NULL,
  ip_address    TEXT,
  success       BOOLEAN DEFAULT false,
  attempted_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);

-- ─── metas_gasto ───────────────────────────────────────────────────────────
CREATE TABLE metas_gasto (
  id         UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id    UUID,
  categoria  TEXT NOT NULL,
  limite     NUMERIC NOT NULL,
  CONSTRAINT metas_gasto_pkey PRIMARY KEY (id),
  CONSTRAINT metas_gasto_user_id_categoria_key UNIQUE (user_id, categoria)
);

-- ─── meus_gastos ───────────────────────────────────────────────────────────
CREATE TABLE meus_gastos (
  id               TEXT NOT NULL,
  descricao        VARCHAR NOT NULL,
  valor            NUMERIC NOT NULL,
  tipo             VARCHAR NOT NULL,
  categoria        VARCHAR NOT NULL,
  data             DATE NOT NULL,
  pago             BOOLEAN DEFAULT false,
  data_pagamento   DATE,
  dividido_com     VARCHAR,
  minha_parte      NUMERIC,
  dia_vencimento   INTEGER,
  ativo            BOOLEAN DEFAULT true,
  num_parcelas     INTEGER DEFAULT 1,
  parcela_atual    INTEGER DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  user_id          UUID,
  cartao_id        UUID,
  categoria_gasto  TEXT,
  conta_id         UUID,
  meses_suspensos  TEXT[],
  encerrado_em     DATE,
  CONSTRAINT meus_gastos_pkey PRIMARY KEY (id),
  CONSTRAINT meus_gastos_categoria_check CHECK (((categoria)::text = ANY ((ARRAY['pessoal'::character varying, 'dividido'::character varying, 'fixo'::character varying, 'divida'::character varying])::text[]))),
  CONSTRAINT meus_gastos_dia_vencimento_check CHECK (((dia_vencimento >= 1) AND (dia_vencimento <= 31))),
  CONSTRAINT meus_gastos_num_parcelas_check CHECK (((num_parcelas >= 1) AND (num_parcelas <= 48))),
  CONSTRAINT meus_gastos_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['credito'::character varying, 'debito'::character varying])::text[])))
);

-- ─── observacoes_mes ───────────────────────────────────────────────────────
CREATE TABLE observacoes_mes (
  id          UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id     UUID NOT NULL,
  pessoa      VARCHAR NOT NULL,
  mes         VARCHAR NOT NULL,
  observacao  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT observacoes_mes_pkey PRIMARY KEY (id),
  CONSTRAINT observacoes_mes_user_id_pessoa_mes_key UNIQUE (user_id, pessoa, mes)
);

-- ─── pagamentos_fatura ─────────────────────────────────────────────────────
CREATE TABLE pagamentos_fatura (
  id          UUID DEFAULT gen_random_uuid() NOT NULL,
  cartao_id   UUID NOT NULL,
  mes         TEXT NOT NULL,
  valor_pago  NUMERIC NOT NULL,
  conta_id    UUID,
  user_id     UUID,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT pagamentos_fatura_pkey PRIMARY KEY (id)
);

-- ─── pagamentos_parciais ───────────────────────────────────────────────────
CREATE TABLE pagamentos_parciais (
  id              UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id         UUID NOT NULL,
  pessoa          VARCHAR NOT NULL,
  mes             VARCHAR NOT NULL,
  valor           NUMERIC NOT NULL,
  data_pagamento  VARCHAR NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  conta_id        UUID,
  CONSTRAINT pagamentos_parciais_pkey PRIMARY KEY (id)
);

-- ─── pessoas ───────────────────────────────────────────────────────────────
CREATE TABLE pessoas (
  id          TEXT NOT NULL,
  nome        VARCHAR NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  user_id     UUID,
  CONSTRAINT pessoas_pkey PRIMARY KEY (id),
  CONSTRAINT pessoas_user_id_nome_key UNIQUE (user_id, nome)
);

-- ─── push_subscriptions ────────────────────────────────────────────────────
CREATE TABLE push_subscriptions (
  id          UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id     UUID,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint)
);

-- ─── receitas ──────────────────────────────────────────────────────────────
CREATE TABLE receitas (
  id               UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id          UUID,
  conta_id         UUID,
  descricao        TEXT NOT NULL,
  valor            NUMERIC NOT NULL,
  categoria        TEXT DEFAULT 'Outras Receitas'::text NOT NULL,
  tipo             TEXT DEFAULT 'avulso'::text NOT NULL,
  data             TEXT NOT NULL,
  num_meses        INTEGER DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT now(),
  dia_recebimento  INTEGER DEFAULT 1,
  CONSTRAINT receitas_pkey PRIMARY KEY (id)
);

-- ─── receitas_confirmacoes ─────────────────────────────────────────────────
CREATE TABLE receitas_confirmacoes (
  id             UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id        UUID NOT NULL,
  receita_id     UUID NOT NULL,
  mes            TEXT NOT NULL,
  status         TEXT NOT NULL,
  data_recebida  DATE,
  valor          NUMERIC,
  perguntar_em   DATE,
  perguntar_ate  DATE,
  created_at     TIMESTAMPTZ DEFAULT now(),
  motivo         TEXT,
  CONSTRAINT receitas_confirmacoes_pkey PRIMARY KEY (id),
  CONSTRAINT receitas_confirmacoes_mes_check CHECK ((mes ~ '^\d{4}-\d{2}$'::text)),
  CONSTRAINT receitas_confirmacoes_receita_id_mes_key UNIQUE (receita_id, mes),
  CONSTRAINT receitas_confirmacoes_status_check CHECK ((status = ANY (ARRAY['recebida'::text, 'adiada'::text])))
);

-- ─── saldos_devedores ──────────────────────────────────────────────────────
CREATE TABLE saldos_devedores (
  id              TEXT NOT NULL,
  pessoa          VARCHAR NOT NULL,
  descricao       VARCHAR NOT NULL,
  valor_original  NUMERIC NOT NULL,
  valor_atual     NUMERIC NOT NULL,
  data_criacao    DATE NOT NULL,
  historico       JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  user_id         UUID,
  mes_fechado     TEXT,
  CONSTRAINT saldos_devedores_pkey PRIMARY KEY (id)
);

-- ─── transacoes_cartao ─────────────────────────────────────────────────────
CREATE TABLE transacoes_cartao (
  id             UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id        UUID,
  cartao_id      UUID,
  descricao      TEXT NOT NULL,
  valor          NUMERIC NOT NULL,
  categoria      TEXT DEFAULT 'Outras Despesas'::text,
  data           TEXT NOT NULL,
  num_parcelas   INTEGER DEFAULT 1,
  parcela_atual  INTEGER DEFAULT 1,
  pago           BOOLEAN DEFAULT false,
  recorrente     BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT transacoes_cartao_pkey PRIMARY KEY (id),
  CONSTRAINT transacoes_cartao_num_parcelas_check CHECK (((num_parcelas >= 1) AND (num_parcelas <= 48)))
);

-- ─── user_features ─────────────────────────────────────────────────────────
CREATE TABLE user_features (
  id                     UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id                UUID,
  dashboard              BOOLEAN DEFAULT true,
  meus_gastos            BOOLEAN DEFAULT true,
  gastos_compartilhados  BOOLEAN DEFAULT true,
  saldo_devedor          BOOLEAN DEFAULT true,
  pessoas                BOOLEAN DEFAULT true,
  contas_bancarias       BOOLEAN DEFAULT true,
  cartoes_credito        BOOLEAN DEFAULT true,
  metas                  BOOLEAN DEFAULT true,
  exportar_pdf           BOOLEAN DEFAULT true,
  configuracoes          BOOLEAN DEFAULT true,
  updated_at             TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_features_pkey PRIMARY KEY (id),
  CONSTRAINT user_features_user_id_key UNIQUE (user_id)
);

-- ─── user_roles ────────────────────────────────────────────────────────────
CREATE TABLE user_roles (
  id          UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id     UUID,
  role        TEXT DEFAULT 'user'::text NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_key UNIQUE (user_id)
);

-- ─── web_vitals_metrics ────────────────────────────────────────────────────
CREATE TABLE web_vitals_metrics (
  id            UUID DEFAULT gen_random_uuid() NOT NULL,
  metric        TEXT NOT NULL,
  value         DOUBLE PRECISION NOT NULL,
  rating        TEXT,
  page_path     TEXT NOT NULL,
  metric_id     TEXT,
  target_value  DOUBLE PRECISION,
  status        TEXT,
  collected_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_agent    TEXT,
  referer       TEXT,
  origin        TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT web_vitals_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT web_vitals_metrics_metric_check CHECK ((metric = ANY (ARRAY['LCP'::text, 'INP'::text, 'CLS'::text])))
);

-- ═══ Chaves estrangeiras ════════════════════════════════════════════════════
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE cartoes_credito ADD CONSTRAINT cartoes_credito_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id) ON DELETE SET NULL;
ALTER TABLE cartoes_credito ADD CONSTRAINT cartoes_credito_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE categorias_usuario ADD CONSTRAINT categorias_usuario_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE configuracoes ADD CONSTRAINT configuracoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE contas_bancarias ADD CONSTRAINT contas_bancarias_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE gastos ADD CONSTRAINT gastos_cartao_id_fkey FOREIGN KEY (cartao_id) REFERENCES cartoes_credito(id) ON DELETE SET NULL;
ALTER TABLE gastos ADD CONSTRAINT gastos_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id);
ALTER TABLE gastos ADD CONSTRAINT gastos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE metas_gasto ADD CONSTRAINT metas_gasto_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE meus_gastos ADD CONSTRAINT meus_gastos_cartao_id_fkey FOREIGN KEY (cartao_id) REFERENCES cartoes_credito(id) ON DELETE SET NULL;
ALTER TABLE meus_gastos ADD CONSTRAINT meus_gastos_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id);
ALTER TABLE meus_gastos ADD CONSTRAINT meus_gastos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE observacoes_mes ADD CONSTRAINT observacoes_mes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE pagamentos_fatura ADD CONSTRAINT pagamentos_fatura_cartao_id_fkey FOREIGN KEY (cartao_id) REFERENCES cartoes_credito(id) ON DELETE CASCADE;
ALTER TABLE pagamentos_fatura ADD CONSTRAINT pagamentos_fatura_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id) ON DELETE SET NULL;
ALTER TABLE pagamentos_fatura ADD CONSTRAINT pagamentos_fatura_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE pagamentos_parciais ADD CONSTRAINT pagamentos_parciais_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id) ON DELETE SET NULL;
ALTER TABLE pagamentos_parciais ADD CONSTRAINT pagamentos_parciais_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE pessoas ADD CONSTRAINT pessoas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE receitas ADD CONSTRAINT receitas_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id) ON DELETE SET NULL;
ALTER TABLE receitas ADD CONSTRAINT receitas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE receitas_confirmacoes ADD CONSTRAINT receitas_confirmacoes_receita_id_fkey FOREIGN KEY (receita_id) REFERENCES receitas(id) ON DELETE CASCADE;
ALTER TABLE receitas_confirmacoes ADD CONSTRAINT receitas_confirmacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE saldos_devedores ADD CONSTRAINT saldos_devedores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE transacoes_cartao ADD CONSTRAINT transacoes_cartao_cartao_id_fkey FOREIGN KEY (cartao_id) REFERENCES cartoes_credito(id) ON DELETE CASCADE;
ALTER TABLE transacoes_cartao ADD CONSTRAINT transacoes_cartao_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_features ADD CONSTRAINT user_features_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ═══ Índices (além dos que as restrições já criam) ═════════════════════════
CREATE INDEX categorias_usuario_por_tipo ON categorias_usuario USING btree (user_id, tipo, ordem);
CREATE INDEX gastos_origem_id_idx ON gastos USING btree (origem_id);
CREATE INDEX idx_activity_logs_action ON activity_logs USING btree (action, created_at DESC);
CREATE INDEX idx_activity_logs_user ON activity_logs USING btree (user_id, created_at DESC);
CREATE INDEX idx_gastos_data_inicio ON gastos USING btree (data_inicio);
CREATE INDEX idx_gastos_pessoa ON gastos USING btree (pessoa);
CREATE INDEX idx_gastos_tipo ON gastos USING btree (tipo);
CREATE INDEX idx_login_attempts_email ON login_attempts USING btree (email, attempted_at DESC);
CREATE INDEX idx_meus_gastos_categoria ON meus_gastos USING btree (categoria);
CREATE INDEX idx_meus_gastos_data ON meus_gastos USING btree (data);
CREATE INDEX idx_meus_gastos_pago ON meus_gastos USING btree (pago);
CREATE INDEX idx_observacoes_user_mes ON observacoes_mes USING btree (user_id, mes);
CREATE INDEX idx_pagamentos_user_mes ON pagamentos_parciais USING btree (user_id, mes);
CREATE INDEX idx_saldos_pessoa ON saldos_devedores USING btree (pessoa);
CREATE INDEX idx_saldos_valor_atual ON saldos_devedores USING btree (valor_atual);
CREATE INDEX idx_web_vitals_metric_collected_at ON web_vitals_metrics USING btree (metric, collected_at DESC);
CREATE INDEX idx_web_vitals_page_path_collected_at ON web_vitals_metrics USING btree (page_path, collected_at DESC);
CREATE INDEX receitas_confirmacoes_por_usuario ON receitas_confirmacoes USING btree (user_id, mes);
CREATE UNIQUE INDEX categorias_usuario_unicas ON categorias_usuario USING btree (user_id, tipo, lower(btrim(nome)));
CREATE UNIQUE INDEX idx_pagamento_fatura_unico ON pagamentos_fatura USING btree (cartao_id, mes);

-- ═══ Regras de acesso (RLS) ════════════════════════════════════════════════
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartoes_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE meus_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE observacoes_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_fatura ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_parciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas_confirmacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saldos_devedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_cartao ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_vitals_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read activity_logs" ON activity_logs FOR SELECT
  USING (is_admin());
CREATE POLICY "Allow inserts on activity_logs" ON activity_logs FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Usuários podem atualizar seus próprios cartões" ON cartoes_credito FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "Usuários podem deletar seus próprios cartões" ON cartoes_credito FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "Usuários podem inserir seus próprios cartões" ON cartoes_credito FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Usuários podem ver seus próprios cartões" ON cartoes_credito FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "Users manage own categorias" ON categorias_usuario FOR ALL
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own config" ON configuracoes FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own config" ON configuracoes FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own config" ON configuracoes FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "Usuários podem atualizar suas próprias contas" ON contas_bancarias FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "Usuários podem deletar suas próprias contas" ON contas_bancarias FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "Usuários podem inserir suas próprias contas" ON contas_bancarias FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Usuários podem ver suas próprias contas" ON contas_bancarias FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "gastos_delete" ON gastos FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "gastos_insert" ON gastos FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "gastos_select" ON gastos FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "gastos_update" ON gastos FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "Admins can read login_attempts" ON login_attempts FOR SELECT
  USING (is_admin());
CREATE POLICY "Allow inserts on login_attempts" ON login_attempts FOR INSERT
  WITH CHECK (true);
CREATE POLICY "No direct access to login_attempts" ON login_attempts FOR SELECT
  USING (false);
CREATE POLICY "Users can manage own metas" ON metas_gasto FOR ALL
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "meus_gastos_delete" ON meus_gastos FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "meus_gastos_insert" ON meus_gastos FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "meus_gastos_select" ON meus_gastos FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "meus_gastos_update" ON meus_gastos FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own observacoes" ON observacoes_mes FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own observacoes" ON observacoes_mes FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own observacoes" ON observacoes_mes FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own observacoes" ON observacoes_mes FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can manage their own payment records" ON pagamentos_fatura FOR ALL
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own pagamentos" ON pagamentos_parciais FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own pagamentos" ON pagamentos_parciais FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own pagamentos" ON pagamentos_parciais FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own pagamentos" ON pagamentos_parciais FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "pessoas_delete" ON pessoas FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "pessoas_insert" ON pessoas FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "pessoas_select" ON pessoas FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "pessoas_update" ON pessoas FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions FOR ALL
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users manage own push subs" ON push_subscriptions FOR ALL
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can manage their own receipts" ON receitas FOR ALL
  USING ((auth.uid() = user_id));
CREATE POLICY "Usuários podem atualizar suas próprias receitas" ON receitas FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "Usuários podem deletar suas próprias receitas" ON receitas FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "Usuários podem inserir suas próprias receitas" ON receitas FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Usuários podem ver suas próprias receitas" ON receitas FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "Users manage own confirmacoes" ON receitas_confirmacoes FOR ALL
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "saldos_delete" ON saldos_devedores FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "saldos_insert" ON saldos_devedores FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "saldos_select" ON saldos_devedores FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "saldos_update" ON saldos_devedores FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "delete_transacoes" ON transacoes_cartao FOR DELETE
  USING ((auth.uid() = user_id));
CREATE POLICY "insert_transacoes" ON transacoes_cartao FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "select_transacoes" ON transacoes_cartao FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "update_transacoes" ON transacoes_cartao FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "Admins can delete features" ON user_features FOR DELETE
  USING (is_admin());
CREATE POLICY "Admins can insert features" ON user_features FOR INSERT
  WITH CHECK (is_admin());
CREATE POLICY "Admins can read all features" ON user_features FOR SELECT
  USING (is_admin());
CREATE POLICY "Admins can update features" ON user_features FOR UPDATE
  USING (is_admin());
CREATE POLICY "Users can read own features" ON user_features FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "Admins can delete roles" ON user_roles FOR DELETE
  USING (is_admin());
CREATE POLICY "Admins can insert roles" ON user_roles FOR INSERT
  WITH CHECK (is_admin());
CREATE POLICY "Admins can read all roles" ON user_roles FOR SELECT
  USING (is_admin());
CREATE POLICY "Admins can update roles" ON user_roles FOR UPDATE
  USING (is_admin());
CREATE POLICY "Users can read own role" ON user_roles FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "admins can read web vitals" ON web_vitals_metrics FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text)))));
CREATE POLICY "no direct delete web vitals" ON web_vitals_metrics FOR DELETE
  USING (false);
CREATE POLICY "no direct insert web vitals" ON web_vitals_metrics FOR INSERT
  WITH CHECK (false);
CREATE POLICY "no direct update web vitals" ON web_vitals_metrics FOR UPDATE
  USING (false)
  WITH CHECK (false);
