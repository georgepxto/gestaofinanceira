-- ===========================================
-- ADICIONAR TABELA MEUS_GASTOS AO SUPABASE
-- Execute este SQL no Supabase SQL Editor
-- ===========================================

-- Criar tabela meus_gastos
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_meus_gastos_data ON meus_gastos(data);
CREATE INDEX IF NOT EXISTS idx_meus_gastos_categoria ON meus_gastos(categoria);
CREATE INDEX IF NOT EXISTS idx_meus_gastos_pago ON meus_gastos(pago);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_meus_gastos_updated_at ON meus_gastos;
CREATE TRIGGER update_meus_gastos_updated_at 
    BEFORE UPDATE ON meus_gastos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Desabilitar RLS (para uso pessoal sem autenticação)
ALTER TABLE meus_gastos DISABLE ROW LEVEL SECURITY;

-- Habilitar Realtime para sincronização
ALTER PUBLICATION supabase_realtime ADD TABLE meus_gastos;
