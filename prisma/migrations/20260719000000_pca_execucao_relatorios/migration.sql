-- ============================================================
-- MIGRATION: Tela 9 — Relatórios de execução
--
-- Item 9.7 da especificação: quem acompanha o PCA declara manualmente
-- o andamento de cada item (confirmado pela Terracap — não vem do
-- Benner nem é derivado do status do Pedido no M2, é editorial).
--
-- situacao_execucao: NO_PRAZO | ATRASADO | EXECUTADO (NULL = ainda não
-- avaliado). Só faz sentido em itens já Aprovados/Publicados.
--
-- relatorio_pca: histórico de gerações do relatório trimestral
-- (interno, GECOP -> Autoridade Competente) e do relatório simplificado
-- (público, divulgado no sítio em até 15 dias após a aprovação —
-- item 9.9 da norma).
-- ============================================================

ALTER TABLE "item_pca"
  ADD COLUMN IF NOT EXISTS "situacao_execucao" TEXT,
  ADD COLUMN IF NOT EXISTS "data_atualizacao_execucao" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "atualizado_execucao_por" TEXT;

ALTER TABLE "item_pca"
  ADD CONSTRAINT "item_pca_atualizado_execucao_por_fkey"
  FOREIGN KEY ("atualizado_execucao_por") REFERENCES "usuario"("id") ON UPDATE CASCADE;

CREATE TABLE "relatorio_pca" (
  "id"              TEXT NOT NULL,
  "id_organizacao"  TEXT NOT NULL,
  "id_plano"        TEXT NOT NULL,
  "tipo"            TEXT NOT NULL, -- TRIMESTRAL | SIMPLIFICADO
  "trimestre"       INTEGER,        -- só p/ TRIMESTRAL (1-4)
  "itens_executados" INTEGER NOT NULL DEFAULT 0,
  "itens_total"      INTEGER NOT NULL DEFAULT 0,
  "valor_executado"  DECIMAL(15,2) NOT NULL DEFAULT 0,
  "valor_total"      DECIMAL(15,2) NOT NULL DEFAULT 0,
  "id_gerado_por"   TEXT NOT NULL,
  "criado_em"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "relatorio_pca_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "relatorio_pca"
  ADD CONSTRAINT "relatorio_pca_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON UPDATE CASCADE,
  ADD CONSTRAINT "relatorio_pca_id_plano_fkey" FOREIGN KEY ("id_plano") REFERENCES "plano_contratacao_anual"("id") ON UPDATE CASCADE,
  ADD CONSTRAINT "relatorio_pca_id_gerado_por_fkey" FOREIGN KEY ("id_gerado_por") REFERENCES "usuario"("id") ON UPDATE CASCADE;

CREATE INDEX "relatorio_pca_id_organizacao_idx" ON "relatorio_pca"("id_organizacao");
CREATE INDEX "relatorio_pca_id_plano_idx" ON "relatorio_pca"("id_plano");
