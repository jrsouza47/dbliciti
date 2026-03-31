-- CreateTable
CREATE TABLE "alerta_sancao" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "id_fornecedor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "data_deteccao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerta_sancao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_fracionamento" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "id_solicitante" TEXT NOT NULL,
    "valor_total" DECIMAL(15,2) NOT NULL,
    "quantidade_pedidos" INTEGER NOT NULL,
    "pedidos_ids" JSONB NOT NULL,
    "nivel_risco" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberto',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_fracionamento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "alerta_sancao" ADD CONSTRAINT "alerta_sancao_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_sancao" ADD CONSTRAINT "alerta_sancao_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_fracionamento" ADD CONSTRAINT "log_fracionamento_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_fracionamento" ADD CONSTRAINT "log_fracionamento_id_solicitante_fkey" FOREIGN KEY ("id_solicitante") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
