-- Schema inicial idempotente para Supabase/PostgreSQL.
-- Pode ser executado mais de uma vez no SQL Editor do Supabase.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.usuarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    nome varchar NOT NULL,
    email varchar NOT NULL UNIQUE,
    senha_hash varchar NOT NULL,
    email_verificado_em timestamptz,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_verification_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
    code_hash varchar NOT NULL,
    expira_em timestamptz NOT NULL,
    usado_em timestamptz,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.password_reset_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
    code_hash varchar NOT NULL,
    expira_em timestamptz NOT NULL,
    usado_em timestamptz,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.barbearias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    usuario_dono_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
    nome varchar NOT NULL,
    telefone varchar,
    endereco text,
    horario_abertura time,
    horario_fechamento time,
    duracao_atendimento_min integer NOT NULL DEFAULT 30 CHECK (
        duracao_atendimento_min >= 5
        AND duracao_atendimento_min <= 480
    ),
    intervalo_agenda_min integer NOT NULL DEFAULT 30 CHECK (
        intervalo_agenda_min >= 5
        AND intervalo_agenda_min <= 240
    ),
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.barbeiros (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    usuario_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
    email varchar,
    nome varchar NOT NULL,
    foto_url text,
    cargo varchar NOT NULL DEFAULT 'barbeiro',
    comissao_percent numeric(5, 2) NOT NULL DEFAULT 50.00 CHECK (
        comissao_percent >= 0
        AND comissao_percent <= 100
    ),
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.servicos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    nome varchar NOT NULL,
    preco numeric(10, 2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
    tipo_compra varchar NOT NULL DEFAULT 'avista' CHECK (tipo_compra IN ('avista', 'consignado')),
    custo numeric(10, 2) NOT NULL DEFAULT 0 CHECK (custo >= 0),
    fornecedor varchar,
    comissao_venda_percentual numeric(7, 4) NOT NULL DEFAULT 0 CHECK (
        comissao_venda_percentual >= 0
        AND comissao_venda_percentual <= 100
    ),
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.produtos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    nome varchar NOT NULL,
    preco numeric(10, 2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
    tipo_compra varchar NOT NULL DEFAULT 'avista' CHECK (tipo_compra IN ('avista', 'consignado')),
    custo numeric(10, 2) NOT NULL DEFAULT 0 CHECK (custo >= 0),
    fornecedor varchar,
    comissao_venda_percentual numeric(7, 4) NOT NULL DEFAULT 0 CHECK (
        comissao_venda_percentual >= 0
        AND comissao_venda_percentual <= 100
    ),
    quantidade_estoque integer NOT NULL DEFAULT 0 CHECK (quantidade_estoque >= 0),
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.despesas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    descricao varchar NOT NULL,
    valor numeric(10, 2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
    data date NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    barbeiro_id uuid REFERENCES public.barbeiros (id) ON DELETE SET NULL,
    nome varchar NOT NULL,
    telefone varchar,
    observacoes text,
    ativo boolean NOT NULL DEFAULT true,
    intervalo_dias integer NOT NULL DEFAULT 15 CHECK (intervalo_dias > 0),
    pacote_total_cortes integer NOT NULL DEFAULT 4 CHECK (pacote_total_cortes >= 0),
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_cortes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    cliente_id uuid NOT NULL REFERENCES public.clientes (id) ON DELETE CASCADE,
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    data date NOT NULL,
    pago boolean NOT NULL DEFAULT false,
    valor numeric(10, 2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
    observacoes text,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lista_espera (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    barbeiro_id uuid REFERENCES public.barbeiros (id) ON DELETE SET NULL,
    nome varchar NOT NULL,
    telefone varchar,
    preferencia varchar,
    observacoes text,
    status varchar NOT NULL DEFAULT 'aguardando' CHECK (
        status IN ('aguardando', 'agendado', 'cancelado')
    ),
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Catalogo flexivel: voce pode adicionar/renomear formas sem alterar coluna/check.
CREATE TABLE IF NOT EXISTS public.formas_pagamento (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    codigo varchar NOT NULL UNIQUE,
    nome varchar NOT NULL,
    taxa_percentual numeric(7, 4) NOT NULL DEFAULT 0 CHECK (
        taxa_percentual >= 0
        AND taxa_percentual <= 100
    ),
    ativo boolean NOT NULL DEFAULT true,
    ordem integer NOT NULL DEFAULT 100,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agendamentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    barbeiro_id uuid REFERENCES public.barbeiros (id) ON DELETE SET NULL,
    cliente_id uuid REFERENCES public.clientes (id) ON DELETE SET NULL,
    cliente_nome varchar NOT NULL,
    data date NOT NULL,
    hora time NOT NULL,
    valor_manual numeric(10, 2) NOT NULL DEFAULT 0 CHECK (valor_manual >= 0),
    total numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    status_atendimento varchar NOT NULL DEFAULT 'agendado' CHECK (
        status_atendimento IN (
            'agendado',
            'concluido',
            'cancelado'
        )
    ),
    status_pagamento varchar NOT NULL DEFAULT 'pendente' CHECK (
        status_pagamento IN ('pendente', 'pago', 'fiado')
    ),
    forma_pagamento_id uuid REFERENCES public.formas_pagamento (id) ON DELETE SET NULL,
    taxa_pagamento_percentual numeric(7, 4) NOT NULL DEFAULT 0 CHECK (
        taxa_pagamento_percentual >= 0
        AND taxa_pagamento_percentual <= 100
    ),
    taxa_pagamento_valor numeric(10, 2) NOT NULL DEFAULT 0 CHECK (taxa_pagamento_valor >= 0),
    valor_liquido numeric(10, 2) NOT NULL DEFAULT 0 CHECK (valor_liquido >= 0),
    prazo_fiado_data date,
    data_pagamento date,
    observacoes text,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (barbeiro_id, data, hora)
);

CREATE TABLE IF NOT EXISTS public.contas_receber (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    barbeiro_id uuid REFERENCES public.barbeiros (id) ON DELETE SET NULL,
    cliente_id uuid REFERENCES public.clientes (id) ON DELETE SET NULL,
    agendamento_id uuid REFERENCES public.agendamentos (id) ON DELETE CASCADE,
    nome_cliente varchar NOT NULL,
    descricao varchar NOT NULL,
    observacoes text,
    valor numeric(10, 2) NOT NULL CHECK (valor >= 0),
    data_divida date NOT NULL,
    hora_divida time,
    vencimento_em date,
    status varchar NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'cancelado')),
    forma_pagamento_id uuid REFERENCES public.formas_pagamento (id) ON DELETE SET NULL,
    taxa_pagamento_percentual numeric(7, 4) NOT NULL DEFAULT 0,
    taxa_pagamento_valor numeric(10, 2) NOT NULL DEFAULT 0,
    valor_liquido numeric(10, 2) NOT NULL DEFAULT 0,
    data_pagamento date,
    criado_por_usuario_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agendamento_servicos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    agendamento_id uuid NOT NULL REFERENCES public.agendamentos (id) ON DELETE CASCADE,
    servico_id uuid NOT NULL REFERENCES public.servicos (id) ON DELETE RESTRICT,
    nome_servico varchar NOT NULL,
    preco_unitario numeric(10, 2) NOT NULL DEFAULT 0 CHECK (preco_unitario >= 0),
    quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    subtotal numeric(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    UNIQUE (agendamento_id, servico_id)
);

CREATE TABLE IF NOT EXISTS public.agendamento_produtos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    agendamento_id uuid NOT NULL REFERENCES public.agendamentos (id) ON DELETE CASCADE,
    produto_id uuid NOT NULL REFERENCES public.produtos (id) ON DELETE RESTRICT,
    nome_produto varchar NOT NULL,
    preco_unitario numeric(10, 2) NOT NULL DEFAULT 0 CHECK (preco_unitario >= 0),
    quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    subtotal numeric(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tipo_compra varchar NOT NULL DEFAULT 'avista' CHECK (tipo_compra IN ('avista', 'consignado')),
    custo_unitario numeric(10, 2) NOT NULL DEFAULT 0 CHECK (custo_unitario >= 0),
    fornecedor varchar,
    comissao_venda_percentual numeric(7, 4) NOT NULL DEFAULT 0 CHECK (
        comissao_venda_percentual >= 0
        AND comissao_venda_percentual <= 100
    ),
    UNIQUE (agendamento_id, produto_id)
);

CREATE TABLE IF NOT EXISTS public.convites_barbeiros (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    barbeiro_id uuid NOT NULL REFERENCES public.barbeiros (id) ON DELETE CASCADE,
    email varchar NOT NULL,
    token_hash varchar NOT NULL UNIQUE,
    expira_em timestamptz NOT NULL,
    aceito_em timestamptz,
    revogado_em timestamptz,
    criado_por_usuario_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
    criado_em timestamptz NOT NULL DEFAULT now()
);

-- Preparada para evoluir o app para multiplos pagamentos/parciais sem quebrar agendamentos.
CREATE TABLE IF NOT EXISTS public.pagamentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    agendamento_id uuid REFERENCES public.agendamentos (id) ON DELETE SET NULL,
    forma_pagamento_id uuid REFERENCES public.formas_pagamento (id) ON DELETE SET NULL,
    valor numeric(10, 2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
    pago_em timestamptz,
    observacoes text,
    criado_em timestamptz NOT NULL DEFAULT now()
);

INSERT INTO
    public.formas_pagamento (codigo, nome, taxa_percentual, ordem)
VALUES ('dinheiro', 'Dinheiro', 0, 20),
    ('pix', 'Pix', 0, 10),
    (
        'cartao_debito',
        'Debito',
        0,
        30
    ),
    (
        'cartao_credito',
        'Credito a vista',
        0,
        40
    ),
    (
        'credito_parcelado',
        'Credito parcelado',
        0,
        50
    ),
    ('fiado', 'Fiado', 0, 60),
    ('outro', 'Outro', 0, 100) ON CONFLICT (codigo) DO
UPDATE
SET
    nome = EXCLUDED.nome;

CREATE INDEX IF NOT EXISTS idx_barbearias_usuario_dono ON public.barbearias (usuario_dono_id);

CREATE INDEX IF NOT EXISTS idx_barbeiros_barbearia_ativo ON public.barbeiros (barbearia_id, ativo);

CREATE UNIQUE INDEX IF NOT EXISTS idx_barbeiros_usuario_unique ON public.barbeiros (usuario_id)
WHERE
    usuario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_barbeiros_barbearia_usuario ON public.barbeiros (barbearia_id, usuario_id);

CREATE INDEX IF NOT EXISTS idx_servicos_barbearia_ativo ON public.servicos (barbearia_id, ativo);

CREATE INDEX IF NOT EXISTS idx_produtos_barbearia_ativo ON public.produtos (barbearia_id, ativo);

CREATE INDEX IF NOT EXISTS idx_despesas_barbearia_data ON public.despesas (barbearia_id, data);

CREATE INDEX IF NOT EXISTS idx_clientes_barbearia_ativo ON public.clientes (barbearia_id, ativo);

CREATE INDEX IF NOT EXISTS idx_clientes_barbeiro_ativo ON public.clientes (barbeiro_id, ativo);

CREATE INDEX IF NOT EXISTS idx_cliente_cortes_cliente_data ON public.cliente_cortes (cliente_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_cliente_cortes_barbearia_data ON public.cliente_cortes (barbearia_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_lista_espera_barbearia_status ON public.lista_espera (barbearia_id, status);

CREATE INDEX IF NOT EXISTS idx_lista_espera_barbeiro_status ON public.lista_espera (barbeiro_id, status);

CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia_data ON public.agendamentos (barbearia_id, data);

CREATE INDEX IF NOT EXISTS idx_agendamentos_barbeiro_data ON public.agendamentos (barbeiro_id, data);

CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON public.agendamentos (cliente_id);

CREATE INDEX IF NOT EXISTS idx_agendamentos_pagamento_data ON public.agendamentos (barbearia_id, data_pagamento);

CREATE INDEX IF NOT EXISTS idx_agendamentos_status_pagamento ON public.agendamentos (
    barbearia_id,
    status_pagamento
);

CREATE INDEX IF NOT EXISTS idx_agendamento_servicos_agendamento ON public.agendamento_servicos (agendamento_id);

CREATE INDEX IF NOT EXISTS idx_agendamento_produtos_agendamento ON public.agendamento_produtos (agendamento_id);

CREATE INDEX IF NOT EXISTS idx_convites_barbeiros_barbearia ON public.convites_barbeiros (barbearia_id, criado_em);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user ON public.email_verification_codes (user_id, expira_em);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verification_codes_active ON public.email_verification_codes (user_id)
WHERE
    usado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user ON public.password_reset_codes (user_id, expira_em);

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_codes_active ON public.password_reset_codes (user_id)
WHERE
    usado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_convites_barbeiros_barbeiro_status ON public.convites_barbeiros (
    barbeiro_id,
    aceito_em,
    revogado_em,
    expira_em
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_barbearia_criado ON public.pagamentos (barbearia_id, criado_em);

CREATE INDEX IF NOT EXISTS idx_pagamentos_agendamento ON public.pagamentos (agendamento_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contas_receber_agendamento_unique ON public.contas_receber (agendamento_id);

CREATE INDEX IF NOT EXISTS idx_contas_receber_loja_status_data ON public.contas_receber (
    barbearia_id,
    status,
    data_divida DESC
);

CREATE INDEX IF NOT EXISTS idx_contas_receber_barbeiro_status ON public.contas_receber (barbeiro_id, status);

CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_usuarios_atualizado_em') THEN
    CREATE TRIGGER trg_usuarios_atualizado_em
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_barbearias_atualizado_em') THEN
    CREATE TRIGGER trg_barbearias_atualizado_em
    BEFORE UPDATE ON public.barbearias
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_barbeiros_atualizado_em') THEN
    CREATE TRIGGER trg_barbeiros_atualizado_em
    BEFORE UPDATE ON public.barbeiros
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_servicos_atualizado_em') THEN
    CREATE TRIGGER trg_servicos_atualizado_em
    BEFORE UPDATE ON public.servicos
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_produtos_atualizado_em') THEN
    CREATE TRIGGER trg_produtos_atualizado_em
    BEFORE UPDATE ON public.produtos
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_despesas_atualizado_em') THEN
    CREATE TRIGGER trg_despesas_atualizado_em
    BEFORE UPDATE ON public.despesas
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clientes_atualizado_em') THEN
    CREATE TRIGGER trg_clientes_atualizado_em
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lista_espera_atualizado_em') THEN
    CREATE TRIGGER trg_lista_espera_atualizado_em
    BEFORE UPDATE ON public.lista_espera
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agendamentos_atualizado_em') THEN
    CREATE TRIGGER trg_agendamentos_atualizado_em
    BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contas_receber_atualizado_em') THEN
    CREATE TRIGGER trg_contas_receber_atualizado_em
    BEFORE UPDATE ON public.contas_receber
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;
END $$;

COMMIT;
