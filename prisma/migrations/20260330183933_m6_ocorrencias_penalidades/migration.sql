-- CreateTable
CREATE TABLE "ocorrencia_contrato" (
    "id" TEXT NOT NULL,
    "id_contrato" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data_ocorrencia" DATE NOT NULL,
    "registrado_por" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberta',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocorrencia_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penalidade_contrato" (
    "id" TEXT NOT NULL,
    "id_ocorrencia" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(15,2),
    "descricao" TEXT NOT NULL,
    "aplicado_por" TEXT NOT NULL,
    "data_aplicacao" DATE NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penalidade_contrato_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ocorrencia_contrato" ADD CONSTRAINT "ocorrencia_contrato_id_contrato_fkey" FOREIGN KEY ("id_contrato") REFERENCES "contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencia_contrato" ADD CONSTRAINT "ocorrencia_contrato_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalidade_contrato" ADD CONSTRAINT "penalidade_contrato_id_ocorrencia_fkey" FOREIGN KEY ("id_ocorrencia") REFERENCES "ocorrencia_contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalidade_contrato" ADD CONSTRAINT "penalidade_contrato_aplicado_por_fkey" FOREIGN KEY ("aplicado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
