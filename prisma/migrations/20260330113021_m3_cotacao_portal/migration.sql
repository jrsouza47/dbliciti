-- CreateTable
CREATE TABLE "cotacao" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "id_pedido" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "modalidade" TEXT NOT NULL,
    "prazo_respostas" TIMESTAMP(3) NOT NULL,
    "sigilo" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Aberta',
    "criado_por" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_cotacao" (
    "id" TEXT NOT NULL,
    "id_cotacao" TEXT NOT NULL,
    "id_item" TEXT NOT NULL,
    "quantidade" DECIMAL(15,4) NOT NULL,
    "unidade" TEXT NOT NULL,

    CONSTRAINT "item_cotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convite_cotacao" (
    "id" TEXT NOT NULL,
    "id_cotacao" TEXT NOT NULL,
    "id_fornecedor" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "enviado_em" TIMESTAMP(3),
    "respondido_em" TIMESTAMP(3),

    CONSTRAINT "convite_cotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposta" (
    "id" TEXT NOT NULL,
    "id_convite" TEXT NOT NULL,
    "id_item_cotacao" TEXT NOT NULL,
    "preco_unitario" DECIMAL(15,4) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "observacao" TEXT,
    "comprovante" TEXT,
    "homologada" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cotacao_id_organizacao_numero_key" ON "cotacao"("id_organizacao", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "convite_cotacao_token_key" ON "convite_cotacao"("token");

-- CreateIndex
CREATE UNIQUE INDEX "convite_cotacao_id_cotacao_id_fornecedor_key" ON "convite_cotacao"("id_cotacao", "id_fornecedor");

-- AddForeignKey
ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_cotacao" ADD CONSTRAINT "item_cotacao_id_cotacao_fkey" FOREIGN KEY ("id_cotacao") REFERENCES "cotacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_cotacao" ADD CONSTRAINT "item_cotacao_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "item_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_cotacao" ADD CONSTRAINT "convite_cotacao_id_cotacao_fkey" FOREIGN KEY ("id_cotacao") REFERENCES "cotacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_cotacao" ADD CONSTRAINT "convite_cotacao_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposta" ADD CONSTRAINT "proposta_id_convite_fkey" FOREIGN KEY ("id_convite") REFERENCES "convite_cotacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposta" ADD CONSTRAINT "proposta_id_item_cotacao_fkey" FOREIGN KEY ("id_item_cotacao") REFERENCES "item_cotacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
