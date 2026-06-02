-- Migration: Cadastro de Áreas Organizacionais
-- Necessário para o módulo de licitação: vincular processos às áreas demandantes da Terracap

CREATE TABLE IF NOT EXISTS area_organizacional (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  id_organizacao  TEXT        NOT NULL REFERENCES organizacao(id) ON DELETE CASCADE,
  codigo          TEXT        NOT NULL,       -- ex: 1.03.007.002
  apelido         TEXT        NOT NULL DEFAULT '',  -- ex: NUCCA
  nome            TEXT        NOT NULL,       -- ex: Núcleo de Gestão de Contratos e Convênios
  nivel           INT         NOT NULL DEFAULT 1,  -- 1=empresa, 2=diretoria, 3=gerência, 4=núcleo
  id_pai          TEXT        REFERENCES area_organizacional(id) ON DELETE SET NULL,
  ativo           BOOLEAN     NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_area_org_codigo UNIQUE (id_organizacao, codigo)
);

CREATE INDEX IF NOT EXISTS idx_area_org_organizacao ON area_organizacional(id_organizacao);
CREATE INDEX IF NOT EXISTS idx_area_org_pai         ON area_organizacional(id_pai);
CREATE INDEX IF NOT EXISTS idx_area_org_apelido     ON area_organizacional(id_organizacao, apelido);
