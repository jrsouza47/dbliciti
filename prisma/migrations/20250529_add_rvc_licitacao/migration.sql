-- Migration: adiciona coluna rvc_licitacao na tabela analise_cpl
-- Rodar manualmente no Neon (via painel ou psql):
--   psql $DATABASE_URL -f backend_migration.sql

ALTER TABLE analise_cpl
  ADD COLUMN IF NOT EXISTS rvc_licitacao JSONB;

COMMENT ON COLUMN analise_cpl.rvc_licitacao IS
  'RVC – Roteiro de Verificação de Conformidade (Anexo IV – Licitação, Res. 273/2023 CONAD). '
  'Array JSON de itens: { item, quesito, rilc, resposta: SIM|NAO|NA|null, numSei, obs }';
