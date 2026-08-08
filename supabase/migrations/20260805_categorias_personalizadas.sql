-- ═══════════════════════════════════════════════════════════════════════════
-- Categorias personalizáveis por usuário
--
-- Até aqui as categorias eram uma constante no código: 8 de gasto e 6 de
-- receita, iguais para todo mundo. Esta tabela dá a cada pessoa a chance de
-- criar, renomear e excluir as suas.
--
-- A tabela nasce VAZIA de propósito. Enquanto o usuário não tiver nenhuma
-- linha de um tipo, o app mostra a lista padrão do código — é o comportamento
-- de hoje, sem escrita nenhuma no banco. Na primeira personalização o app
-- grava a lista padrão inteira e aplica a mudança em cima dela ("materializar").
-- A partir daí a tabela é a verdade.
--
-- Por isso o app impede excluir a última categoria de um tipo: uma lista
-- vazia seria lida como "nunca personalizou" e o padrão voltaria sozinho.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categorias_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('gasto', 'receita')),
  nome TEXT NOT NULL CHECK (btrim(nome) <> ''),
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Duas categorias que só diferem no caixa alta ("Mercado" e "mercado") são a
-- mesma categoria para quem lê o gráfico. O índice barra o par no banco, não só
-- na tela.
CREATE UNIQUE INDEX IF NOT EXISTS categorias_usuario_unicas
  ON categorias_usuario (user_id, tipo, lower(btrim(nome)));

CREATE INDEX IF NOT EXISTS categorias_usuario_por_tipo
  ON categorias_usuario (user_id, tipo, ordem);

ALTER TABLE categorias_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own categorias" ON categorias_usuario;
CREATE POLICY "Users manage own categorias" ON categorias_usuario
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- A exclusão de conta precisa levar as categorias junto.
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM pagamentos_fatura WHERE user_id = auth.uid();
  DELETE FROM transacoes_cartao WHERE user_id = auth.uid();
  DELETE FROM metas_gasto WHERE user_id = auth.uid();
  DELETE FROM meus_gastos WHERE user_id = auth.uid();
  DELETE FROM gastos WHERE user_id = auth.uid();
  DELETE FROM saldos_devedores WHERE user_id = auth.uid();
  DELETE FROM observacoes_mes WHERE user_id = auth.uid();
  DELETE FROM pagamentos_parciais WHERE user_id = auth.uid();
  DELETE FROM receitas WHERE user_id = auth.uid();
  DELETE FROM cartoes_credito WHERE user_id = auth.uid();
  DELETE FROM contas_bancarias WHERE user_id = auth.uid();
  DELETE FROM categorias_usuario WHERE user_id = auth.uid();
  DELETE FROM pessoas WHERE user_id = auth.uid();

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
