-- ===========================================
-- SCHEMA SQL PARA SUPABASE - CONTROLE DE FINANÇAS PARCELADAS
-- ===========================================

-- Criação da tabela de gastos
CREATE TABLE gastos (
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

-- Índices para melhor performance nas consultas
CREATE INDEX idx_gastos_data_inicio ON gastos(data_inicio);
CREATE INDEX idx_gastos_pessoa ON gastos(pessoa);
CREATE INDEX idx_gastos_tipo ON gastos(tipo);

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_gastos_updated_at 
    BEFORE UPDATE ON gastos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS) - Opcional
-- ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (ajuste conforme necessário)
-- CREATE POLICY "Enable all access for authenticated users" ON gastos
--     FOR ALL
--     USING (true)
--     WITH CHECK (true);

-- ===========================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- ===========================================

INSERT INTO gastos (descricao, pessoa, valor_total, num_parcelas, data_inicio, tipo) VALUES
    ('iPhone 15', 'Pai', 5999.00, 12, '2024-01-15', 'credito'),
    ('Geladeira Brastemp', 'Mãe', 3500.00, 10, '2024-02-01', 'credito'),
    ('Supermercado', 'Pai', 850.00, 1, '2024-03-10', 'debito'),
    ('Curso de Inglês', 'Mãe', 2400.00, 6, '2024-01-20', 'credito'),
    ('TV 55 polegadas', 'Pai', 2800.00, 5, '2023-10-01', 'credito'),
    ('Academia Anual', 'Mãe', 1200.00, 12, '2024-01-01', 'credito'),
    ('Conta de Luz', 'Pai', 350.00, 1, '2024-03-05', 'debito'),
    ('Notebook Dell', 'Pai', 4500.00, 8, '2023-11-15', 'credito'),
    ('Roupas Inverno', 'Mãe', 1500.00, 3, '2024-02-20', 'credito'),
    ('Restaurante', 'Pai', 280.00, 1, '2024-03-12', 'debito');
