-- ═══════════════════════════════════════════════════════════════════════════
-- Confirmação das entradas previstas (salário e outras receitas fixas)
--
-- Até aqui a receita fixa/recorrente entrava no saldo sozinha, no dia
-- previsto. Agora o app pergunta se o dinheiro caiu mesmo: cada linha é a
-- resposta para UM mês de UMA receita.
--
--   recebida → caiu em `data_recebida`, no valor `valor` (pode ser diferente
--              do previsto, e pode ser antes do dia: o adiantamento).
--   adiada   → ainda não caiu; perguntar de novo em `perguntar_em`
--              (e, se a pessoa deu um intervalo, até `perguntar_ate`).
--
-- Sem linha, a entrada está prevista (ou esperando confirmação, se o dia já
-- passou). O app só passa a pedir confirmação depois que esta tabela existe:
-- o que já tinha acontecido continua contando como antes.
--
-- Rode no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS receitas_confirmacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receita_id UUID NOT NULL REFERENCES receitas(id) ON DELETE CASCADE,
  mes TEXT NOT NULL CHECK (mes ~ '^\d{4}-\d{2}$'),
  status TEXT NOT NULL CHECK (status IN ('recebida', 'adiada')),
  data_recebida DATE,
  valor NUMERIC(15, 2),
  perguntar_em DATE,
  perguntar_ate DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (receita_id, mes)
);

CREATE INDEX IF NOT EXISTS receitas_confirmacoes_por_usuario
  ON receitas_confirmacoes (user_id, mes);

ALTER TABLE receitas_confirmacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own confirmacoes" ON receitas_confirmacoes;
CREATE POLICY "Users manage own confirmacoes" ON receitas_confirmacoes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
