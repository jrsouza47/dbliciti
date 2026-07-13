-- ============================================================
-- MIGRATION: Integração com ERP externo (Benner, Sankhya, ...)
-- dbliciti — Sistema de Licitações — Cliente Terracap
-- Parametrização por empresa da sincronização diária de itens
-- do ERP do cliente para dentro do Catálogo (item_catalogo).
-- ============================================================

CREATE OR REPLACE FUNCTION update_timestamp_integracao_erp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS "integracao_erp" (
  "id"                                TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "id_organizacao"                    TEXT         NOT NULL,

  "sistema_erp"                       TEXT         NOT NULL, -- BENNER | SANKHYA | ...
  "tipo_autenticacao"                 TEXT         NOT NULL, -- USUARIO_SENHA | API_KEY | TOKEN
  "url_integracao"                    TEXT         NOT NULL,

  "usuario"                           TEXT,
  "senha_criptografada"               TEXT,
  "api_key_criptografada"             TEXT,

  "ativo"                             BOOLEAN      NOT NULL DEFAULT true,
  "ultima_sincronizacao_em"           TIMESTAMP(3),
  "ultimo_resultado"                  TEXT,        -- SUCESSO | ERRO
  "ultima_mensagem_erro"              TEXT,
  "total_itens_ultima_sincronizacao"  INT,

  "criado_em"                         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"                     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "integracao_erp_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "integracao_erp_id_organizacao_key" UNIQUE ("id_organizacao"),
  CONSTRAINT "integracao_erp_id_organizacao_fkey"
    FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON UPDATE CASCADE
);

CREATE TRIGGER integracao_erp_update_timestamp BEFORE UPDATE ON "integracao_erp"
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_integracao_erp();
