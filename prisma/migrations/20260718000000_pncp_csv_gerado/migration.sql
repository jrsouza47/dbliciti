-- ============================================================
-- MIGRATION: Rastreio de geração do CSV de referência PNCP
-- Tela 8 (Monitor PNCP) — guarda quando/quem gerou o CSV de apoio
-- pra inclusão manual no site do PNCP, pra sinalizar na tela quais
-- itens já foram exportados.
-- ============================================================

ALTER TABLE "pncp_envio_pca"
  ADD COLUMN IF NOT EXISTS "csv_gerado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "csv_gerado_por" TEXT;

ALTER TABLE "pncp_envio_pca"
  ADD CONSTRAINT "pncp_envio_pca_csv_gerado_por_fkey"
  FOREIGN KEY ("csv_gerado_por") REFERENCES "usuario"("id") ON UPDATE CASCADE;
