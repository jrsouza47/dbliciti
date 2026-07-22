-- ============================================================
-- MIGRATION: Centro de Custo — campos de referência à estrutura do Benner
--
-- Guarda o código interno do Benner (CODIGO), o indicador de folha
-- (ULTIMONIVEL), a referência ao pai (NIVELSUPERIOR) e o caminho
-- hierárquico (ESTRUTURA) como campos informativos — sem chave
-- estrangeira entre centros de custo, já que o dbliciti não tem hoje
-- uma tela de hierarquia. A ideia é permitir reimportar/atualizar a
-- partir do Benner sem duplicar (chave: id_organizacao + codigo_benner).
-- ============================================================

ALTER TABLE "centro_custo"
  ADD COLUMN IF NOT EXISTS "codigo_benner"          INTEGER,
  ADD COLUMN IF NOT EXISTS "ultimo_nivel"            BOOLEAN,
  ADD COLUMN IF NOT EXISTS "nivel_superior_benner"   INTEGER,
  ADD COLUMN IF NOT EXISTS "estrutura_benner"        TEXT,
  ADD COLUMN IF NOT EXISTS "data_inclusao_benner"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "data_alteracao_benner"   TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "centro_custo_id_organizacao_codigo_benner_key"
  ON "centro_custo" ("id_organizacao", "codigo_benner");
