-- Schema inicial idempotente para Supabase/PostgreSQL.
-- Pode ser executado mais de uma vez no SQL Editor do Supabase.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.usuarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    nome varchar NOT NULL,
    email varchar NOT NULL UNIQUE,
    senha_hash varchar NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.barbearias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    usuario_dono_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
    nome varchar NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.barbeiros (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    nome varchar NOT NULL,
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
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.produtos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    nome varchar NOT NULL,
    preco numeric(10, 2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
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

-- Catalogo flexivel: voce pode adicionar/renomear formas sem alterar coluna/check.
CREATE TABLE IF NOT EXISTS public.formas_pagamento (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    codigo varchar NOT NULL UNIQUE,
    nome varchar NOT NULL,
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agendamentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
    barbeiro_id uuid REFERENCES public.barbeiros (id) ON DELETE SET NULL,
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
    prazo_fiado_data date,
    observacoes text,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (barbeiro_id, data, hora)
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
    UNIQUE (agendamento_id, produto_id)
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
    public.formas_pagamento (codigo, nome)
VALUES ('dinheiro', 'Dinheiro'),
    ('pix', 'Pix'),
    (
        'cartao_debito',
        'Cartao de debito'
    ),
    (
        'cartao_credito',
        'Cartao de credito'
    ),
    ('fiado', 'Fiado'),
    ('outro', 'Outro') ON CONFLICT (codigo) DO
UPDATE
SET
    nome = EXCLUDED.nome;

CREATE INDEX IF NOT EXISTS idx_barbearias_usuario_dono ON public.barbearias (usuario_dono_id);

CREATE INDEX IF NOT EXISTS idx_barbeiros_barbearia_ativo ON public.barbeiros (barbearia_id, ativo);

CREATE INDEX IF NOT EXISTS idx_servicos_barbearia_ativo ON public.servicos (barbearia_id, ativo);

CREATE INDEX IF NOT EXISTS idx_produtos_barbearia_ativo ON public.produtos (barbearia_id, ativo);

CREATE INDEX IF NOT EXISTS idx_despesas_barbearia_data ON public.despesas (barbearia_id, data);

CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia_data ON public.agendamentos (barbearia_id, data);

CREATE INDEX IF NOT EXISTS idx_agendamentos_barbeiro_data ON public.agendamentos (barbeiro_id, data);

CREATE INDEX IF NOT EXISTS idx_agendamentos_status_pagamento ON public.agendamentos (
    barbearia_id,
    status_pagamento
);

CREATE INDEX IF NOT EXISTS idx_agendamento_servicos_agendamento ON public.agendamento_servicos (agendamento_id);

CREATE INDEX IF NOT EXISTS idx_agendamento_produtos_agendamento ON public.agendamento_produtos (agendamento_id);

CREATE INDEX IF NOT EXISTS idx_pagamentos_barbearia_criado ON public.pagamentos (barbearia_id, criado_em);

CREATE INDEX IF NOT EXISTS idx_pagamentos_agendamento ON public.pagamentos (agendamento_id);

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

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agendamentos_atualizado_em') THEN
    CREATE TRIGGER trg_agendamentos_atualizado_em
    BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;
END $$;

COMMIT;