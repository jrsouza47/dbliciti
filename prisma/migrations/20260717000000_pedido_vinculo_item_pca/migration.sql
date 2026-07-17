-- ============================================================
-- MIGRATION: Vínculo Pedido (M2) -> Item PCA
-- dbliciti — Sistema de Licitações — Cliente Terracap
--
-- Item 9.6 da especificação funcional do PCA: "A GECOP verifica,
-- antes de encaminhar qualquer demanda, se ela consta da listagem
-- do PCA vigente — é este o ponto de integração com o M2." e
-- "Toda demanda do PCA deve ser encaminhada à GECOP com
-- antecedência mínima de 60 dias da data desejada, acompanhada da
-- instrução processual — regra de validação a ser aplicada no M2."
--
-- A coluna id_item_pca fica NULLABLE no banco (pedidos já existentes
-- não têm vínculo e não serão retroativamente migrados), mas a
-- API passa a EXIGIR o vínculo em todo POST /pedidos novo — ver
-- pedido.schema.ts / pedido.service.ts.
-- ============================================================

ALTER TABLE "pedido"
  ADD COLUMN IF NOT EXISTS "id_item_pca" TEXT,
  ADD COLUMN IF NOT EXISTS "fora_da_janela_pca" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "justificativa_fora_janela_pca" TEXT;

ALTER TABLE "pedido"
  ADD CONSTRAINT "pedido_id_item_pca_fkey"
  FOREIGN KEY ("id_item_pca") REFERENCES "item_pca"("id") ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "pedido_id_item_pca_idx" ON "pedido"("id_item_pca");
