-- ============================================================
-- MIGRATION: Tela 10 — Revisão e redimensionamento
--
-- Item 9.8 da norma: inclusão, exclusão ou redimensionamento de itens só
-- nas janelas previstas (1-30/set, 16-30/nov, ou 15 dias após aprovação
-- da LDO), com aprovação da Autoridade Competente e nova divulgação no
-- sítio eletrônico. Cada revisão aprovada gera uma NOVA VERSÃO do plano
-- (decisão registrada com o usuário em jul/2026: nova linha em
-- plano_contratacao_anual, histórico completo preservado).
--
-- A tabela revisao_pca já existia (criada junto com o módulo PCA) só
-- com um campo de descrição livre — aqui ela vira estruturada, com o
-- item alvo, o tipo de alteração e os valores antes/depois.
-- ============================================================

ALTER TABLE "revisao_pca"
  ADD COLUMN IF NOT EXISTS "id_item_pca"           TEXT,
  ADD COLUMN IF NOT EXISTS "tipo_alteracao"         TEXT NOT NULL DEFAULT 'REDIMENSIONAMENTO',
  ADD COLUMN IF NOT EXISTS "descricao_novo_item"    TEXT,
  ADD COLUMN IF NOT EXISTS "valor_anterior"         DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "novo_valor"             DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "status"                 TEXT NOT NULL DEFAULT 'EM_APROVACAO',
  ADD COLUMN IF NOT EXISTS "id_solicitante"         TEXT,
  ADD COLUMN IF NOT EXISTS "fora_da_janela"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "justificativa_fora_janela" TEXT;

-- remove o default temporário do tipo_alteracao (só serviu pra preencher linhas antigas, se houver)
ALTER TABLE "revisao_pca" ALTER COLUMN "tipo_alteracao" DROP DEFAULT;

ALTER TABLE "revisao_pca"
  ADD CONSTRAINT "revisao_pca_id_item_pca_fkey" FOREIGN KEY ("id_item_pca") REFERENCES "item_pca"("id") ON UPDATE CASCADE,
  ADD CONSTRAINT "revisao_pca_id_solicitante_fkey" FOREIGN KEY ("id_solicitante") REFERENCES "usuario"("id") ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "revisao_pca_status_idx" ON "revisao_pca"("status");
CREATE INDEX IF NOT EXISTS "revisao_pca_id_item_pca_idx" ON "revisao_pca"("id_item_pca");
