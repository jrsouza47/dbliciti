-- ============================================================
-- MIGRATION: Módulo 2 — Análise Inicial (Compras / CPL)
-- dbliciti — Sistema de Licitações
-- ============================================================

-- ── Tabela de domínio: motivos de devolução / reprovação ────
-- Pendência TERRACAP item 4: lista predefinida implementada.
-- O campo "motivo" na análise aceita tanto o id desta tabela
-- quanto texto livre (campo motivoTexto), cobrindo ambas as opções.
CREATE TABLE IF NOT EXISTS "motivo_analise_cpl" (
  "id"          SERIAL PRIMARY KEY,
  "codigo"      TEXT NOT NULL UNIQUE,
  "descricao"   TEXT NOT NULL,
  "tipo"        TEXT NOT NULL CHECK ("tipo" IN ('DEVOLUCAO', 'REPROVACAO', 'AMBOS')),
  "ativo"       BOOLEAN NOT NULL DEFAULT TRUE,
  "ordem"       INT NOT NULL DEFAULT 0
);

INSERT INTO "motivo_analise_cpl" ("codigo", "descricao", "tipo", "ordem") VALUES
  ('TR_INADEQUADO',          'Termo de Referência inadequado ou incompleto',             'DEVOLUCAO',   1),
  ('ESTIMATIVA_INCONSISTENTE','Estimativa de preços inconsistente ou sem pesquisa válida','DEVOLUCAO',   2),
  ('DOCUMENTACAO_INCOMPLETA', 'Documentação obrigatória incompleta (DFD, ETP, TR/PB)',   'DEVOLUCAO',   3),
  ('ENQUADRAMENTO_INCORRETO', 'Enquadramento legal incorreto',                            'DEVOLUCAO',   4),
  ('OBJETO_GENERICO',         'Objeto genérico ou com indício de direcionamento',         'DEVOLUCAO',   5),
  ('DOTACAO_AUSENTE',         'Dotação orçamentária não informada ou insuficiente',       'AMBOS',       6),
  ('INVIABILIDADE_TECNICA',   'Inviabilidade técnica comprovada',                         'REPROVACAO',  7),
  ('INVIABILIDADE_ADMIN',     'Inviabilidade administrativa',                             'REPROVACAO',  8),
  ('IRREGULARIDADE_GRAVE',    'Irregularidade grave identificada',                        'REPROVACAO',  9),
  ('SEM_INTERESSE_PUBLICO',   'Ausência de interesse público demonstrado',                'REPROVACAO', 10),
  ('OUTRO',                   'Outro (descrever no campo de justificativa)',               'AMBOS',      99)
ON CONFLICT ("codigo") DO NOTHING;

-- ── Tabela principal: análise CPL por pedido ────────────────
CREATE TABLE IF NOT EXISTS "analise_cpl" (
  "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
  "id_pedido"         UUID        NOT NULL,
  "id_organizacao"    TEXT        NOT NULL,
  "id_analista"       UUID,                         -- quem está conduzindo a análise
  "versao"            INT         NOT NULL DEFAULT 1, -- incrementa a cada devolução
  "status_anterior"   INT,                           -- status do pedido antes desta ação
  "status_resultado"  INT,                           -- status resultante (3, 4/12, 5, 6)
  "parecer_tecnico"   TEXT,                          -- obrigatório para aprovação
  "id_motivo"         INT REFERENCES "motivo_analise_cpl"("id"),
  "motivo_texto"      TEXT,                          -- texto livre complementar
  "riscos_observados" TEXT,                          -- observações de risco
  "exige_matriz_risco" BOOLEAN    NOT NULL DEFAULT FALSE,
  "checklist"         JSONB,                         -- critérios de decisão (6 itens)
  "sla_prazo"         TIMESTAMP(3),                  -- prazo alvo (calculado na recepção)
  "data_recebimento"  TIMESTAMP(3),
  "data_conclusao"    TIMESTAMP(3),
  "em_atraso"         BOOLEAN     NOT NULL DEFAULT FALSE,
  "criado_em"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "analise_cpl_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "analise_cpl_id_pedido_fkey"
    FOREIGN KEY ("id_pedido") REFERENCES "pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "analise_cpl_id_analista_fkey"
    FOREIGN KEY ("id_analista") REFERENCES "usuario"("id") ON UPDATE CASCADE
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS "analise_cpl_id_pedido_idx"     ON "analise_cpl"("id_pedido");
CREATE INDEX IF NOT EXISTS "analise_cpl_id_organizacao_idx" ON "analise_cpl"("id_organizacao");
CREATE INDEX IF NOT EXISTS "analise_cpl_id_analista_idx"    ON "analise_cpl"("id_analista");
CREATE INDEX IF NOT EXISTS "analise_cpl_status_resultado_idx" ON "analise_cpl"("status_resultado");

-- Função para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_analise_cpl_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analise_cpl_update_timestamp
  BEFORE UPDATE ON "analise_cpl"
  FOR EACH ROW EXECUTE FUNCTION update_analise_cpl_timestamp();
