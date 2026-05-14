-- ============================================================
-- Migration: 20260514145752_filial_separada
-- Descrição: Cria tabela `filial` como entidade separada,
--            adiciona campo `modelo` em `organizacao`,
--            adiciona `id_filial` (opcional) em `usuario_organizacao`
-- Banco: Neon PostgreSQL (dbliciti)
-- Gerado em: 2026-05-14
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Campo `modelo` em `organizacao` (1 = Gestão, 2 = Compras, 3 = Híbrido)
--    Já existe no schema Prisma mas pode não existir na base.
--    Usar IF NOT EXISTS para ser idempotente.
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizacao' AND column_name = 'modelo'
  ) THEN
    ALTER TABLE "organizacao" ADD COLUMN "modelo" INTEGER NOT NULL DEFAULT 1;
  END IF;
END$$;

-- ----------------------------------------------------------------
-- 2. Criar tabela `filial`
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "filial" (
  "id"                            TEXT        NOT NULL,
  "nome"                          TEXT        NOT NULL,
  "cnpj"                          TEXT        NOT NULL,
  "razao_social"                  TEXT,
  "nome_fantasia"                 TEXT,
  "id_organizacao"                TEXT        NOT NULL,
  "is_matriz"                     BOOLEAN     NOT NULL DEFAULT FALSE,
  "is_central_compras"            BOOLEAN     NOT NULL DEFAULT FALSE,
  "configuracao_central_compras"  JSONB,

  -- Endereço
  "logradouro"                    TEXT,
  "numero"                        TEXT,
  "complemento"                   TEXT,
  "bairro"                        TEXT,
  "municipio"                     TEXT,
  "uf"                            TEXT,
  "cep"                           TEXT,

  "ativo"                         BOOLEAN     NOT NULL DEFAULT TRUE,
  "criado_em"                     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "filial_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------
-- 3. FK: filial → organizacao
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'filial_id_organizacao_fkey'
  ) THEN
    ALTER TABLE "filial"
      ADD CONSTRAINT "filial_id_organizacao_fkey"
      FOREIGN KEY ("id_organizacao")
      REFERENCES "organizacao"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END$$;

-- ----------------------------------------------------------------
-- 4. Índice em filial.id_organizacao (consultas frequentes)
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "filial_id_organizacao_idx"
  ON "filial" ("id_organizacao");

-- ----------------------------------------------------------------
-- 5. Índice único em filial.cnpj (CNPJ deve ser único por filial)
-- ----------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "filial_cnpj_key"
  ON "filial" ("cnpj");

-- ----------------------------------------------------------------
-- 6. Adicionar `id_filial` (opcional) em `usuario_organizacao`
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuario_organizacao' AND column_name = 'id_filial'
  ) THEN
    ALTER TABLE "usuario_organizacao"
      ADD COLUMN "id_filial" TEXT;
  END IF;
END$$;

-- ----------------------------------------------------------------
-- 7. FK: usuario_organizacao.id_filial → filial
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'usuario_organizacao_id_filial_fkey'
  ) THEN
    ALTER TABLE "usuario_organizacao"
      ADD CONSTRAINT "usuario_organizacao_id_filial_fkey"
      FOREIGN KEY ("id_filial")
      REFERENCES "filial"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END$$;

-- ----------------------------------------------------------------
-- 8. Ajustar unique constraint de usuario_organizacao
--    A restrição antiga era (id_usuario, id_organizacao).
--    Com filial, um usuário pode ter perfis diferentes por filial.
--    OPÇÃO A (conservadora): manter como está — id_filial é só info.
--    OPÇÃO B (recomendada): ampliar para (id_usuario, id_organizacao, id_filial).
--
--    Este script aplica a OPÇÃO B. Se preferir A, comente este bloco.
-- ----------------------------------------------------------------
DO $$
BEGIN
  -- Remove constraint antiga se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'usuario_organizacao_id_usuario_id_organizacao_key'
      AND table_name = 'usuario_organizacao'
  ) THEN
    ALTER TABLE "usuario_organizacao"
      DROP CONSTRAINT "usuario_organizacao_id_usuario_id_organizacao_key";
  END IF;

  -- Cria nova constraint incluindo filial (NULL-safe via UNIQUE INDEX)
  -- PostgreSQL trata NULLs como distintos em UNIQUE INDEX, o que é o
  -- comportamento correto: (usuário, org, NULL) e (usuário, org, filialX)
  -- são linhas diferentes.
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "usuario_organizacao_usuario_org_filial_key"
  ON "usuario_organizacao" ("id_usuario", "id_organizacao", "id_filial");
