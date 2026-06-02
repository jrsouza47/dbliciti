-- Migration: controle de leitura de comentários do edital
-- Caminho: prisma/migrations/20250601_edital_leitura/migration.sql

CREATE TABLE IF NOT EXISTS edital_comentario_leitura (
  id         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  id_comentario TEXT     NOT NULL,
  id_usuario TEXT        NOT NULL,
  lido_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_edital_comentario_leitura PRIMARY KEY (id),
  CONSTRAINT uq_edital_comentario_leitura UNIQUE (id_comentario, id_usuario),
  CONSTRAINT fk_edital_comentario_leitura_comentario
    FOREIGN KEY (id_comentario) REFERENCES edital_comentario(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_edital_comentario_leitura_usuario
  ON edital_comentario_leitura(id_usuario, id_comentario);
