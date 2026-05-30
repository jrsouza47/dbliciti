-- Migration: M3.5 — Elaboração do Edital
-- Tabelas: edital_versao, edital_comentario

CREATE TABLE IF NOT EXISTS edital_versao (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  id_pedido       TEXT        NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  id_organizacao  TEXT        NOT NULL,
  versao          INT         NOT NULL DEFAULT 1,
  nome            TEXT        NOT NULL,
  tamanho         INT         NOT NULL,
  mime_type       TEXT        NOT NULL,
  dados           BYTEA       NOT NULL,
  observacao      TEXT,
  status          TEXT        NOT NULL DEFAULT 'ELABORACAO',
  id_usuario      TEXT        NOT NULL REFERENCES usuario(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edital_versao_pedido ON edital_versao(id_pedido);
CREATE INDEX IF NOT EXISTS idx_edital_versao_org    ON edital_versao(id_organizacao);

CREATE TABLE IF NOT EXISTS edital_comentario (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  id_pedido   TEXT        NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  id_versao   TEXT        REFERENCES edital_versao(id) ON DELETE SET NULL,
  id_usuario  TEXT        NOT NULL REFERENCES usuario(id),
  texto       TEXT        NOT NULL,
  tipo        TEXT        NOT NULL DEFAULT 'COMENTARIO',
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edital_comentario_pedido ON edital_comentario(id_pedido);
