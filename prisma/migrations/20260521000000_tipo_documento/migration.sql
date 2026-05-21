-- Migration: tipo_documento
-- Tipos de documentos configuráveis por organização

CREATE TABLE IF NOT EXISTS "tipo_documento" (
  "id"              TEXT         NOT NULL,
  "id_organizacao"  TEXT         NOT NULL,
  "nome"            TEXT         NOT NULL,
  "sigla"           TEXT         NOT NULL,
  "obrigatorio"     BOOLEAN      NOT NULL DEFAULT false,
  "ativo"           BOOLEAN      NOT NULL DEFAULT true,
  "ordem"           INTEGER      NOT NULL DEFAULT 0,
  "criado_em"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tipo_documento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tipo_documento_id_organizacao_fkey"
    FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tipo_documento_id_organizacao_sigla_key"
    UNIQUE ("id_organizacao", "sigla")
);
