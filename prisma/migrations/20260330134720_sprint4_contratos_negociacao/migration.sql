-- CreateTable
CREATE TABLE "contrato" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "id_cotacao" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "valor_total" DECIMAL(15,2) NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE NOT NULL,
    "id_fornecedor" TEXT NOT NULL,
    "id_fiscal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Minuta',
    "url_documento" TEXT,
    "assinado_em" TIMESTAMP(3),
    "criado_por" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_contrato" (
    "id" TEXT NOT NULL,
    "id_contrato" TEXT NOT NULL,
    "id_item" TEXT NOT NULL,
    "quantidade" DECIMAL(15,4) NOT NULL,
    "preco_unitario" DECIMAL(15,4) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "unidade" TEXT NOT NULL,

    CONSTRAINT "item_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrega" (
    "id" TEXT NOT NULL,
    "id_contrato" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "data_esperada" DATE NOT NULL,
    "data_efetiva" DATE,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "observacao" TEXT,
    "confirmado_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negociacao" (
    "id" TEXT NOT NULL,
    "id_contrato" TEXT NOT NULL,
    "iniciador_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberta',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "negociacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagem_negociacao" (
    "id" TEXT NOT NULL,
    "id_negociacao" TEXT NOT NULL,
    "remetente" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagem_negociacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contrato_id_cotacao_key" ON "contrato"("id_cotacao");

-- CreateIndex
CREATE UNIQUE INDEX "contrato_id_organizacao_numero_key" ON "contrato"("id_organizacao", "numero");

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_id_fiscal_fkey" FOREIGN KEY ("id_fiscal") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_contrato" ADD CONSTRAINT "item_contrato_id_contrato_fkey" FOREIGN KEY ("id_contrato") REFERENCES "contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_contrato" ADD CONSTRAINT "item_contrato_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "item_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega" ADD CONSTRAINT "entrega_id_contrato_fkey" FOREIGN KEY ("id_contrato") REFERENCES "contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega" ADD CONSTRAINT "entrega_confirmado_por_fkey" FOREIGN KEY ("confirmado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negociacao" ADD CONSTRAINT "negociacao_id_contrato_fkey" FOREIGN KEY ("id_contrato") REFERENCES "contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negociacao" ADD CONSTRAINT "negociacao_iniciador_id_fkey" FOREIGN KEY ("iniciador_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagem_negociacao" ADD CONSTRAINT "mensagem_negociacao_id_negociacao_fkey" FOREIGN KEY ("id_negociacao") REFERENCES "negociacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
