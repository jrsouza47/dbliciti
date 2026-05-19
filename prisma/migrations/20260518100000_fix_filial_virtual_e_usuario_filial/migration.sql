-- ============================================================
-- Migration: 20260518100000_fix_filial_virtual_e_usuario_filial
-- Adiciona is_virtual na tabela filial
-- Cria tabela usuario_filial se nao existir
-- ============================================================

-- 1. Adicionar is_virtual em filial
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'filial' AND column_name = 'is_virtual'
  ) THEN
    ALTER TABLE "filial" ADD COLUMN "is_virtual" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END$$;

-- 2. Criar tabela usuario_filial se nao existir
CREATE TABLE IF NOT EXISTS "usuario_filial" (
  "id"         TEXT         NOT NULL,
  "id_usuario" TEXT         NOT NULL,
  "id_filial"  TEXT         NOT NULL,
  "criado_em"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "usuario_filial_pkey" PRIMARY KEY ("id")
);

-- 3. FK: usuario_filial.id_usuario -> usuario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'usuario_filial_id_usuario_fkey'
  ) THEN
    ALTER TABLE "usuario_filial"
      ADD CONSTRAINT "usuario_filial_id_usuario_fkey"
      FOREIGN KEY ("id_usuario")
      REFERENCES "usuario"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- 4. FK: usuario_filial.id_filial -> filial
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'usuario_filial_id_filial_fkey'
  ) THEN
    ALTER TABLE "usuario_filial"
      ADD CONSTRAINT "usuario_filial_id_filial_fkey"
      FOREIGN KEY ("id_filial")
      REFERENCES "filial"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- 5. Unique: um usuario so pode ter um vinculo por filial
CREATE UNIQUE INDEX IF NOT EXISTS "usuario_filial_id_usuario_id_filial_key"
  ON "usuario_filial" ("id_usuario", "id_filial");
