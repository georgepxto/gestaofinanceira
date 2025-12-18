-- ===========================================
-- SCHEMA SQL PARA SUPABASE - CONTROLE DE FINANÇAS PARCELADAS (COMPLETO)
-- ===========================================

-- ========== TABELA PESSOAS ==========
CREATE TABLE IF NOT EXISTS pessoas (
    id TEXT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== TABELA GASTOS ==========
CREATE TABLE IF NOT EXISTS gastos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    pessoa VARCHAR(100) NOT NULL,
    valor_total DECIMAL(10, 2) NOT NULL,
    num_parcelas INTEGER NOT NULL DEFAULT 1 CHECK (num_parcelas >= 1 AND num_parcelas <= 24),
    data_inicio DATE NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('credito', 'debito')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== TABELA SALDOS DEVEDORES ==========
CREATE TABLE IF NOT EXISTS saldos_devedores (
    id TEXT PRIMARY KEY,
    pessoa VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    valor_original DECIMAL(10, 2) NOT NULL,
    valor_atual DECIMAL(10, 2) NOT NULL,
    data_criacao DATE NOT NULL,
    historico JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== TABELA MEUS GASTOS (PESSOAIS) ==========
CREATE TABLE IF NOT EXISTS meus_gastos (
    id TEXT PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('credito', 'debito')),
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('pessoal', 'dividido', 'fixo')),
    data DATE NOT NULL,
    pago BOOLEAN DEFAULT false,
    data_pagamento DATE,
    dividido_com VARCHAR(100),
    minha_parte DECIMAL(10, 2),
    dia_vencimento INTEGER CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
    ativo BOOLEAN DEFAULT true,
    num_parcelas INTEGER DEFAULT 1,
    parcela_atual INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== ÍNDICES ==========
CREATE INDEX IF NOT EXISTS idx_gastos_data_inicio ON gastos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_gastos_pessoa ON gastos(pessoa);
CREATE INDEX IF NOT EXISTS idx_gastos_tipo ON gastos(tipo);
CREATE INDEX IF NOT EXISTS idx_saldos_pessoa ON saldos_devedores(pessoa);
CREATE INDEX IF NOT EXISTS idx_saldos_valor_atual ON saldos_devedores(valor_atual);

-- ========== FUNÇÃO PARA ATUALIZAR UPDATED_AT ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ========== TRIGGERS ==========
DROP TRIGGER IF EXISTS update_gastos_updated_at ON gastos;
CREATE TRIGGER update_gastos_updated_at 
    BEFORE UPDATE ON gastos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saldos_updated_at ON saldos_devedores;
CREATE TRIGGER update_saldos_updated_at 
    BEFORE UPDATE ON saldos_devedores 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========== ROW LEVEL SECURITY (RLS) ==========
-- Habilitar RLS nas tabelas
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE saldos_devedores ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON pessoas;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON gastos;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON saldos_devedores;

-- Criar políticas para permitir acesso a usuários autenticados
CREATE POLICY "Enable all access for authenticated users" ON pessoas
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON gastos
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON saldos_devedores
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
