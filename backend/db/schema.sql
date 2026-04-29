-- Schema idempotente recomendado para Supabase/PostgreSQL.
-- Pode ser executado mais de uma vez no SQL Editor do Supabase.
-- Se voce ja tem dados reais, revise antes de dropar/recriar qualquer coisa.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar NOT NULL,
  email varchar NOT NULL UNIQUE,
  senha_hash varchar NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.barbearias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_dono_id uuid NOT NULL,
  nome varchar NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.barbeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL,
  nome varchar NOT NULL,
  cargo varchar NOT NULL DEFAULT 'barbeiro',
  comissao_percent numeric(5,2) NOT NULL DEFAULT 50.00,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL,
  nome varchar NOT NULL,
  preco numeric(10,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL,
  nome varchar NOT NULL,
  preco numeric(10,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL,
  descricao varchar NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  data date NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Catalogo flexivel: voce pode adicionar/renomear formas sem alterar coluna/check.
CREATE TABLE IF NOT EXISTS public.formas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar NOT NULL UNIQUE,
  nome varchar NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.formas_pagamento (codigo, nome)
VALUES
  ('dinheiro', 'Dinheiro'),
  ('pix', 'Pix'),
  ('cartao_debito', 'Cartao de debito'),
  ('cartao_credito', 'Cartao de credito'),
  ('fiado', 'Fiado'),
  ('outro', 'Outro')
ON CONFLICT (codigo) DO UPDATE
SET nome = EXCLUDED.nome;

CREATE TABLE IF NOT EXISTS public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL,
  barbeiro_id uuid,
  cliente_nome varchar NOT NULL,
  data date NOT NULL,
  hora varchar NOT NULL,
  valor_manual numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status_atendimento varchar NOT NULL DEFAULT 'agendado',
  status_pagamento varchar NOT NULL DEFAULT 'pendente',
  forma_pagamento_id uuid,
  prazo_fiado_data date,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agendamento_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL,
  servico_id uuid NOT NULL,
  nome_servico varchar NOT NULL,
  preco_unitario numeric(10,2) NOT NULL DEFAULT 0,
  quantidade integer NOT NULL DEFAULT 1,
  subtotal numeric(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.agendamento_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  nome_produto varchar NOT NULL,
  preco_unitario numeric(10,2) NOT NULL DEFAULT 0,
  quantidade integer NOT NULL DEFAULT 1,
  subtotal numeric(10,2) NOT NULL DEFAULT 0
);

-- Preparada para evoluir o app para multiplos pagamentos/parciais sem quebrar agendamentos.
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id uuid NOT NULL,
  agendamento_id uuid,
  forma_pagamento_id uuid,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  pago_em timestamptz,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Colunas adicionadas de forma segura caso as tabelas ja tenham sido criadas antes.
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.barbearias ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.barbeiros ADD COLUMN IF NOT EXISTS criado_em timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.barbeiros ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS criado_em timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS criado_em timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS forma_pagamento_id uuid;
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS observacoes text;

-- Foreign keys. Drop/recreate somente as FKs do app para garantir ON DELETE correto.
ALTER TABLE public.barbearias DROP CONSTRAINT IF EXISTS barbearias_usuario_dono_id_fkey;
ALTER TABLE public.barbearias
  ADD CONSTRAINT barbearias_usuario_dono_id_fkey
  FOREIGN KEY (usuario_dono_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.barbeiros DROP CONSTRAINT IF EXISTS barbeiros_barbearia_id_fkey;
ALTER TABLE public.barbeiros
  ADD CONSTRAINT barbeiros_barbearia_id_fkey
  FOREIGN KEY (barbearia_id) REFERENCES public.barbearias(id) ON DELETE CASCADE;

ALTER TABLE public.servicos DROP CONSTRAINT IF EXISTS servicos_barbearia_id_fkey;
ALTER TABLE public.servicos
  ADD CONSTRAINT servicos_barbearia_id_fkey
  FOREIGN KEY (barbearia_id) REFERENCES public.barbearias(id) ON DELETE CASCADE;

ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_barbearia_id_fkey;
ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_barbearia_id_fkey
  FOREIGN KEY (barbearia_id) REFERENCES public.barbearias(id) ON DELETE CASCADE;

ALTER TABLE public.despesas DROP CONSTRAINT IF EXISTS despesas_barbearia_id_fkey;
ALTER TABLE public.despesas
  ADD CONSTRAINT despesas_barbearia_id_fkey
  FOREIGN KEY (barbearia_id) REFERENCES public.barbearias(id) ON DELETE CASCADE;

ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_barbearia_id_fkey;
ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_barbearia_id_fkey
  FOREIGN KEY (barbearia_id) REFERENCES public.barbearias(id) ON DELETE CASCADE;

ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_barbeiro_id_fkey;
ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_barbeiro_id_fkey
  FOREIGN KEY (barbeiro_id) REFERENCES public.barbeiros(id) ON DELETE SET NULL;

ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_forma_pagamento_id_fkey;
ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_forma_pagamento_id_fkey
  FOREIGN KEY (forma_pagamento_id) REFERENCES public.formas_pagamento(id) ON DELETE SET NULL;

ALTER TABLE public.agendamento_servicos DROP CONSTRAINT IF EXISTS agendamento_servicos_agendamento_id_fkey;
ALTER TABLE public.agendamento_servicos
  ADD CONSTRAINT agendamento_servicos_agendamento_id_fkey
  FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id) ON DELETE CASCADE;

ALTER TABLE public.agendamento_servicos DROP CONSTRAINT IF EXISTS agendamento_servicos_servico_id_fkey;
ALTER TABLE public.agendamento_servicos
  ADD CONSTRAINT agendamento_servicos_servico_id_fkey
  FOREIGN KEY (servico_id) REFERENCES public.servicos(id) ON DELETE RESTRICT;

ALTER TABLE public.agendamento_produtos DROP CONSTRAINT IF EXISTS agendamento_produtos_agendamento_id_fkey;
ALTER TABLE public.agendamento_produtos
  ADD CONSTRAINT agendamento_produtos_agendamento_id_fkey
  FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id) ON DELETE CASCADE;

ALTER TABLE public.agendamento_produtos DROP CONSTRAINT IF EXISTS agendamento_produtos_produto_id_fkey;
ALTER TABLE public.agendamento_produtos
  ADD CONSTRAINT agendamento_produtos_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE RESTRICT;

ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_barbearia_id_fkey;
ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_barbearia_id_fkey
  FOREIGN KEY (barbearia_id) REFERENCES public.barbearias(id) ON DELETE CASCADE;

ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_agendamento_id_fkey;
ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_agendamento_id_fkey
  FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id) ON DELETE SET NULL;

ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_forma_pagamento_id_fkey;
ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_forma_pagamento_id_fkey
  FOREIGN KEY (forma_pagamento_id) REFERENCES public.formas_pagamento(id) ON DELETE SET NULL;

-- Constraints idempotentes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'barbeiros_comissao_percent_check') THEN
    ALTER TABLE public.barbeiros ADD CONSTRAINT barbeiros_comissao_percent_check CHECK (comissao_percent >= 0 AND comissao_percent <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicos_preco_check') THEN
    ALTER TABLE public.servicos ADD CONSTRAINT servicos_preco_check CHECK (preco >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_preco_check') THEN
    ALTER TABLE public.produtos ADD CONSTRAINT produtos_preco_check CHECK (preco >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'despesas_valor_check') THEN
    ALTER TABLE public.despesas ADD CONSTRAINT despesas_valor_check CHECK (valor >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamentos_valores_check') THEN
    ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_valores_check CHECK (valor_manual >= 0 AND total >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamentos_status_atendimento_check') THEN
    ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_status_atendimento_check CHECK (status_atendimento IN ('agendado', 'concluido', 'cancelado'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamentos_status_pagamento_check') THEN
    ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_status_pagamento_check CHECK (status_pagamento IN ('pendente', 'pago', 'fiado'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamento_servicos_quantidade_check') THEN
    ALTER TABLE public.agendamento_servicos ADD CONSTRAINT agendamento_servicos_quantidade_check CHECK (quantidade > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamento_servicos_valores_check') THEN
    ALTER TABLE public.agendamento_servicos ADD CONSTRAINT agendamento_servicos_valores_check CHECK (preco_unitario >= 0 AND subtotal >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamento_produtos_quantidade_check') THEN
    ALTER TABLE public.agendamento_produtos ADD CONSTRAINT agendamento_produtos_quantidade_check CHECK (quantidade > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamento_produtos_valores_check') THEN
    ALTER TABLE public.agendamento_produtos ADD CONSTRAINT agendamento_produtos_valores_check CHECK (preco_unitario >= 0 AND subtotal >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagamentos_valor_check') THEN
    ALTER TABLE public.pagamentos ADD CONSTRAINT pagamentos_valor_check CHECK (valor >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamento_servicos_unique') THEN
    ALTER TABLE public.agendamento_servicos ADD CONSTRAINT agendamento_servicos_unique UNIQUE (agendamento_id, servico_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agendamento_produtos_unique') THEN
    ALTER TABLE public.agendamento_produtos ADD CONSTRAINT agendamento_produtos_unique UNIQUE (agendamento_id, produto_id);
  END IF;
END $$;

-- Indices.
CREATE INDEX IF NOT EXISTS idx_barbearias_usuario_dono ON public.barbearias(usuario_dono_id);
CREATE INDEX IF NOT EXISTS idx_barbeiros_barbearia_ativo ON public.barbeiros(barbearia_id, ativo);
CREATE INDEX IF NOT EXISTS idx_servicos_barbearia_ativo ON public.servicos(barbearia_id, ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_barbearia_ativo ON public.produtos(barbearia_id, ativo);
CREATE INDEX IF NOT EXISTS idx_despesas_barbearia_data ON public.despesas(barbearia_id, data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia_data ON public.agendamentos(barbearia_id, data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_barbeiro_data ON public.agendamentos(barbeiro_id, data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_pagamento ON public.agendamentos(barbearia_id, status_pagamento);
CREATE INDEX IF NOT EXISTS idx_agendamento_servicos_agendamento ON public.agendamento_servicos(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_produtos_agendamento ON public.agendamento_produtos(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_barbearia_criado ON public.pagamentos(barbearia_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_pagamentos_agendamento ON public.pagamentos(agendamento_id);

-- Trigger generica para manter atualizado_em.
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_atualizado_em ON public.usuarios;
CREATE TRIGGER trg_usuarios_atualizado_em
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS trg_barbearias_atualizado_em ON public.barbearias;
CREATE TRIGGER trg_barbearias_atualizado_em
BEFORE UPDATE ON public.barbearias
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS trg_barbeiros_atualizado_em ON public.barbeiros;
CREATE TRIGGER trg_barbeiros_atualizado_em
BEFORE UPDATE ON public.barbeiros
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS trg_servicos_atualizado_em ON public.servicos;
CREATE TRIGGER trg_servicos_atualizado_em
BEFORE UPDATE ON public.servicos
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS trg_produtos_atualizado_em ON public.produtos;
CREATE TRIGGER trg_produtos_atualizado_em
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS trg_despesas_atualizado_em ON public.despesas;
CREATE TRIGGER trg_despesas_atualizado_em
BEFORE UPDATE ON public.despesas
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS trg_agendamentos_atualizado_em ON public.agendamentos;
CREATE TRIGGER trg_agendamentos_atualizado_em
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

COMMIT;
