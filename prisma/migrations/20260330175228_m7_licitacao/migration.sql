-- CreateTable
CREATE TABLE "licitacao" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "id_contrato" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "modalidade" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Enviada',
    "url_sistema_externo" TEXT,
    "data_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_resultado" TIMESTAMP(3),
    "resultado" TEXT,
    "observacao" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_integracao" (
    "id" TEXT NOT NULL,
    "id_licitacao" TEXT NOT NULL,
    "tentativa" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "resposta" JSONB,
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_integracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licitacao_id_contrato_key" ON "licitacao"("id_contrato");

-- CreateIndex
CREATE UNIQUE INDEX "licitacao_id_organizacao_numero_key" ON "licitacao"("id_organizacao", "numero");

-- AddForeignKey
ALTER TABLE "licitacao" ADD CONSTRAINT "licitacao_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licitacao" ADD CONSTRAINT "licitacao_id_contrato_fkey" FOREIGN KEY ("id_contrato") REFERENCES "contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_integracao" ADD CONSTRAINT "log_integracao_id_licitacao_fkey" FOREIGN KEY ("id_licitacao") REFERENCES "licitacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
