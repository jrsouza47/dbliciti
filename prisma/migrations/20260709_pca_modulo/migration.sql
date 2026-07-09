-- ============================================================
-- MIGRATION: Módulo PCA (Plano de Contratações Anual)
-- dbliciti — Sistema de Licitações — Cliente Terracap
-- ============================================================

-- Função genérica de atualizado_em, reaproveitada por todas as
-- tabelas novas do módulo (equivalente à função criada em cada
-- migração anterior, porém compartilhada para reduzir duplicação).
CREATE OR REPLACE FUNCTION update_timestamp_pca()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 1) Plano de Contratações Anual (documento-mãe, por exercício) ─
CREATE TABLE IF NOT EXISTS "plano_contratacao_anual" (
  "id"                     UUID         NOT NULL DEFAULT gen_random_uuid(),
  "id_organizacao"         TEXT         NOT NULL,
  "ano"                    INT          NOT NULL,
  "versao"                 INT          NOT NULL DEFAULT 1,
  "status"                 INT          NOT NULL DEFAULT 1, -- 1=EM_ELABORACAO 2=EM_APROVACAO 3=APROVADO 4=PUBLICADO
  "id_aprovador"           UUID,
  "data_aprovacao"         TIMESTAMP(3),
  "data_publicacao_sitio"  TIMESTAMP(3),
  "criado_em"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "plano_contratacao_anual_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plano_contratacao_anual_organizacao_ano_versao_key" UNIQUE ("id_organizacao", "ano", "versao"),
  CONSTRAINT "plano_pca_id_organizacao_fkey"
    FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON UPDATE CASCADE,
  CONSTRAINT "plano_pca_id_aprovador_fkey"
    FOREIGN KEY ("id_aprovador") REFERENCES "usuario"("id") ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "plano_pca_id_organizacao_idx" ON "plano_contratacao_anual"("id_organizacao");
CREATE TRIGGER plano_pca_update_timestamp BEFORE UPDATE ON "plano_contratacao_anual"
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_pca();

-- ── 2) Demanda do Setor Requisitante (DFD) ────────────────────
CREATE TABLE IF NOT EXISTS "dfd" (
  "id"                          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "id_organizacao"              TEXT         NOT NULL,
  "id_plano"                    UUID         NOT NULL,
  "id_solicitante"               UUID         NOT NULL,
  "id_centro_custo"              UUID,
  "numero"                       TEXT         NOT NULL,
  "tipo_objeto"                   TEXT         NOT NULL,
  "codigo_sistema_corporativo"    TEXT         NOT NULL,
  "id_item_catalogo"               UUID,
  "unidade_fornecimento"           TEXT         NOT NULL,
  "quantidade"                      DECIMAL(15,4) NOT NULL,
  "descricao_objeto"                TEXT         NOT NULL,
  "justificativa"                    TEXT         NOT NULL,
  "valor_estimado"                    DECIMAL(15,2) NOT NULL DEFAULT 0,
  "prioridade"                          INT        NOT NULL DEFAULT 2,
  "data_desejada"                       DATE       NOT NULL,
  "id_item_vinculado"                    UUID,
  "status"                                INT        NOT NULL DEFAULT 1, -- 1=RASCUNHO 2=ENVIADO 3=CONSOLIDADO 4=CANCELADO
  "fora_da_janela"                         BOOLEAN    NOT NULL DEFAULT FALSE,
  "justificativa_fora_janela"               TEXT,
  "data_envio"                              TIMESTAMP(3),
  "id_item_pca"                              UUID,
  "criado_em"                                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"                            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dfd_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dfd_id_organizacao_numero_key" UNIQUE ("id_organizacao", "numero"),
  CONSTRAINT "dfd_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON UPDATE CASCADE,
  CONSTRAINT "dfd_id_plano_fkey"       FOREIGN KEY ("id_plano") REFERENCES "plano_contratacao_anual"("id") ON UPDATE CASCADE,
  CONSTRAINT "dfd_id_solicitante_fkey" FOREIGN KEY ("id_solicitante") REFERENCES "usuario"("id") ON UPDATE CASCADE,
  CONSTRAINT "dfd_id_centro_custo_fkey" FOREIGN KEY ("id_centro_custo") REFERENCES "centro_custo"("id") ON UPDATE CASCADE,
  CONSTRAINT "dfd_id_item_catalogo_fkey" FOREIGN KEY ("id_item_catalogo") REFERENCES "item_catalogo"("id") ON UPDATE CASCADE,
  CONSTRAINT "dfd_id_item_vinculado_fkey" FOREIGN KEY ("id_item_vinculado") REFERENCES "dfd"("id") ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "dfd_id_organizacao_idx" ON "dfd"("id_organizacao");
CREATE INDEX IF NOT EXISTS "dfd_id_plano_idx"       ON "dfd"("id_plano");
CREATE INDEX IF NOT EXISTS "dfd_status_idx"         ON "dfd"("status");
CREATE INDEX IF NOT EXISTS "dfd_id_item_pca_idx"    ON "dfd"("id_item_pca");
CREATE TRIGGER dfd_update_timestamp BEFORE UPDATE ON "dfd"
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_pca();

-- ── 3) Sugestão de IA (preço, duplicidade, agregação) ─────────
CREATE TABLE IF NOT EXISTS "sugestao_ia_dfd" (
  "id"                   UUID         NOT NULL DEFAULT gen_random_uuid(),
  "id_dfd"               UUID         NOT NULL,
  "tipo"                 TEXT         NOT NULL CHECK ("tipo" IN ('PRECO', 'DUPLICIDADE', 'AGREGACAO')),
  "status"               TEXT         NOT NULL DEFAULT 'PENDENTE' CHECK ("status" IN ('PENDENTE', 'ACEITA', 'REJEITADA')),
  "preco_sugerido"       DECIMAL(15,4),
  "fonte_preco"          TEXT,
  "dfds_relacionadas"    JSONB,
  "justificativa_ia"     TEXT,
  "id_decisor_usuario"   UUID,
  "data_decisao"         TIMESTAMP(3),
  "motivo_rejeicao"      TEXT,
  "criado_em"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sugestao_ia_dfd_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sugestao_ia_dfd_id_dfd_fkey"
    FOREIGN KEY ("id_dfd") REFERENCES "dfd"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sugestao_ia_dfd_id_decisor_usuario_fkey"
    FOREIGN KEY ("id_decisor_usuario") REFERENCES "usuario"("id") ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "sugestao_ia_dfd_id_dfd_idx" ON "sugestao_ia_dfd"("id_dfd");
CREATE INDEX IF NOT EXISTS "sugestao_ia_dfd_status_idx" ON "sugestao_ia_dfd"("status");

-- ── 4) Item PCA consolidado ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "item_pca" (
  "id"                              UUID         NOT NULL DEFAULT gen_random_uuid(),
  "id_organizacao"                  TEXT         NOT NULL,
  "id_plano"                        UUID         NOT NULL,
  "numero"                          TEXT         NOT NULL,
  "tipo_objeto"                     TEXT         NOT NULL,
  "descricao_objeto"                TEXT         NOT NULL,
  "id_item_catalogo"                UUID,
  "unidade_fornecimento"            TEXT         NOT NULL,
  "quantidade_total"                DECIMAL(15,4) NOT NULL DEFAULT 0,
  "valor_total"                     DECIMAL(15,2) NOT NULL DEFAULT 0,
  "prioridade"                      INT          NOT NULL DEFAULT 2,
  "data_desejada"                   DATE,
  "id_item_pca_dependencia"         UUID,
  "status"                          INT          NOT NULL DEFAULT 1, -- 1=EM_ELABORACAO 2=EM_APROVACAO 3=APROVADO 4=PUBLICADO 5=REJEITADO
  "id_consolidado_por"              UUID,
  "data_consolidacao"               TIMESTAMP(3),
  "exige_gestao_risco"              BOOLEAN      NOT NULL DEFAULT FALSE,
  "id_aprovador"                    UUID,
  "data_aprovacao"                  TIMESTAMP(3),
  "parecer_aprovacao"               TEXT,
  "motivo_rejeicao"                 TEXT,
  "id_aprovador_intermediario"      UUID,
  "data_aprovacao_intermediaria"    TIMESTAMP(3),
  "data_prevista_licitacao"         DATE,
  "criado_em"                       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "item_pca_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "item_pca_id_organizacao_numero_key" UNIQUE ("id_organizacao", "numero"),
  CONSTRAINT "item_pca_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON UPDATE CASCADE,
  CONSTRAINT "item_pca_id_plano_fkey"       FOREIGN KEY ("id_plano") REFERENCES "plano_contratacao_anual"("id") ON UPDATE CASCADE,
  CONSTRAINT "item_pca_id_item_catalogo_fkey" FOREIGN KEY ("id_item_catalogo") REFERENCES "item_catalogo"("id") ON UPDATE CASCADE,
  CONSTRAINT "item_pca_id_consolidado_por_fkey" FOREIGN KEY ("id_consolidado_por") REFERENCES "usuario"("id") ON UPDATE CASCADE,
  CONSTRAINT "item_pca_id_aprovador_fkey" FOREIGN KEY ("id_aprovador") REFERENCES "usuario"("id") ON UPDATE CASCADE,
  CONSTRAINT "item_pca_id_aprovador_intermediario_fkey" FOREIGN KEY ("id_aprovador_intermediario") REFERENCES "usuario"("id") ON UPDATE CASCADE,
  CONSTRAINT "item_pca_id_item_pca_dependencia_fkey" FOREIGN KEY ("id_item_pca_dependencia") REFERENCES "item_pca"("id") ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "item_pca_id_plano_idx" ON "item_pca"("id_plano");
CREATE INDEX IF NOT EXISTS "item_pca_status_idx"   ON "item_pca"("status");
CREATE TRIGGER item_pca_update_timestamp BEFORE UPDATE ON "item_pca"
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_pca();

-- ── 4.1) FK tardia: dfd.id_item_pca → item_pca (tabela criada acima) ─
ALTER TABLE "dfd" ADD CONSTRAINT "dfd_id_item_pca_fkey"
  FOREIGN KEY ("id_item_pca") REFERENCES "item_pca"("id") ON UPDATE CASCADE;

-- ── 5) Gestão de riscos (N hipóteses por Item PCA) ────────────
CREATE TABLE IF NOT EXISTS "risco_item_pca" (
  "id"                 UUID         NOT NULL DEFAULT gen_random_uuid(),
  "id_item_pca"        UUID         NOT NULL,
  "hipotese"           TEXT         NOT NULL,
  "medida_preventiva"  TEXT         NOT NULL,
  "medida_mitigadora"  TEXT         NOT NULL,
  "id_responsavel"     UUID,
  "criado_em"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "risco_item_pca_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "risco_item_pca_id_item_pca_fkey"
    FOREIGN KEY ("id_item_pca") REFERENCES "item_pca"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "risco_item_pca_id_responsavel_fkey"
    FOREIGN KEY ("id_responsavel") REFERENCES "usuario"("id") ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "risco_item_pca_id_item_pca_idx" ON "risco_item_pca"("id_item_pca");
CREATE TRIGGER risco_item_pca_update_timestamp BEFORE UPDATE ON "risco_item_pca"
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_pca();

-- ── 6) De-para: código Sistemas Corporativos ↔ Catálogo (M1) ──
CREATE TABLE IF NOT EXISTS "de_para_item_sistema_corporativo" (
  "id"                          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "id_organizacao"              TEXT         NOT NULL,
  "codigo_sistema_corporativo"  TEXT         NOT NULL,
  "id_item_catalogo"            UUID         NOT NULL,
  "ativo"                       BOOLEAN      NOT NULL DEFAULT TRUE,
  "criado_em"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "de_para_item_sistema_corporativo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "de_para_organizacao_codigo_key" UNIQUE ("id_organizacao", "codigo_sistema_corporativo"),
  CONSTRAINT "de_para_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON UPDATE CASCADE,
  CONSTRAINT "de_para_id_item_catalogo_fkey" FOREIGN KEY ("id_item_catalogo") REFERENCES "item_catalogo"("id") ON UPDATE CASCADE
);
CREATE TRIGGER de_para_update_timestamp BEFORE UPDATE ON "de_para_item_sistema_corporativo"
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_pca();

-- ── 7) Fila de envio ao PNCP ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "pncp_envio_pca" (
  "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
  "id_organizacao"    TEXT         NOT NULL,
  "id_item_pca"       UUID,
  "id_plano"          UUID,
  "tipo_envio"        TEXT         NOT NULL CHECK ("tipo_envio" IN ('PLANO', 'ITEM', 'REVISAO')),
  "status"            TEXT         NOT NULL DEFAULT 'PENDENTE' CHECK ("status" IN ('PENDENTE', 'EM_CONFERENCIA', 'ENVIADO', 'ERRO')),
  "payload"           JSONB,
  "resposta_pncp"     JSONB,
  "mensagem_erro"     TEXT,
  "tentativas"        INT          NOT NULL DEFAULT 0,
  "id_conferido_por"  UUID,
  "data_conferencia"  TIMESTAMP(3),
  "data_envio"        TIMESTAMP(3),
  "criado_em"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pncp_envio_pca_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pncp_envio_pca_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON UPDATE CASCADE,
  CONSTRAINT "pncp_envio_pca_id_item_pca_fkey" FOREIGN KEY ("id_item_pca") REFERENCES "item_pca"("id") ON UPDATE CASCADE,
  CONSTRAINT "pncp_envio_pca_id_plano_fkey" FOREIGN KEY ("id_plano") REFERENCES "plano_contratacao_anual"("id") ON UPDATE CASCADE,
  CONSTRAINT "pncp_envio_pca_id_conferido_por_fkey" FOREIGN KEY ("id_conferido_por") REFERENCES "usuario"("id") ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "pncp_envio_pca_id_organizacao_idx" ON "pncp_envio_pca"("id_organizacao");
CREATE INDEX IF NOT EXISTS "pncp_envio_pca_status_idx" ON "pncp_envio_pca"("status");
CREATE TRIGGER pncp_envio_pca_update_timestamp BEFORE UPDATE ON "pncp_envio_pca"
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_pca();

-- ── 8) Revisão / redimensionamento / histórico de versões ─────
CREATE TABLE IF NOT EXISTS "revisao_pca" (
  "id"                      UUID         NOT NULL DEFAULT gen_random_uuid(),
  "id_plano"                UUID         NOT NULL,
  "id_organizacao"          TEXT         NOT NULL,
  "tipo_janela"             TEXT         NOT NULL CHECK ("tipo_janela" IN ('SET_NOV', 'POS_LDO', 'EXECUCAO')),
  "motivo"                  TEXT         NOT NULL,
  "descricao_alteracoes"    TEXT         NOT NULL,
  "versao_resultante"       INT          NOT NULL,
  "id_aprovador"            UUID,
  "data_aprovacao"          TIMESTAMP(3),
  "data_publicacao_sitio"   TIMESTAMP(3),
  "criado_em"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "revisao_pca_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "revisao_pca_id_plano_fkey" FOREIGN KEY ("id_plano") REFERENCES "plano_contratacao_anual"("id") ON UPDATE CASCADE,
  CONSTRAINT "revisao_pca_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON UPDATE CASCADE,
  CONSTRAINT "revisao_pca_id_aprovador_fkey" FOREIGN KEY ("id_aprovador") REFERENCES "usuario"("id") ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "revisao_pca_id_plano_idx" ON "revisao_pca"("id_plano");
