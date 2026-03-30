-- CreateTable
CREATE TABLE "alcada_aprovacao" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "valor_minimo" DECIMAL(15,2) NOT NULL,
    "valor_maximo" DECIMAL(15,2),
    "nivel" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alcada_aprovacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "id_solicitante" TEXT NOT NULL,
    "id_centro_custo" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,
    "valor_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Rascunho',
    "nivel_atual" INTEGER NOT NULL DEFAULT 0,
    "destino_pos" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_pedido" (
    "id" TEXT NOT NULL,
    "id_pedido" TEXT NOT NULL,
    "id_item" TEXT NOT NULL,
    "quantidade" DECIMAL(15,4) NOT NULL,
    "preco_unitario" DECIMAL(15,4) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "item_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aprovacao_pedido" (
    "id" TEXT NOT NULL,
    "id_pedido" TEXT NOT NULL,
    "id_alcada" TEXT NOT NULL,
    "id_aprovador" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "decisao" TEXT NOT NULL,
    "justificativa" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aprovacao_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_pedido" (
    "id" TEXT NOT NULL,
    "id_pedido" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "campo" TEXT,
    "valor_antes" TEXT,
    "valor_depois" TEXT,
    "usuario_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedor" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "motivo_bloqueio" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualificacao_fornecedor" (
    "id" TEXT NOT NULL,
    "id_fornecedor" TEXT NOT NULL,
    "id_categoria" TEXT NOT NULL,
    "capacidade" TEXT,
    "certificacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "qualificacao_fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_fornecedor" (
    "id" TEXT NOT NULL,
    "id_fornecedor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" TEXT,
    "data_emissao" DATE,
    "data_vencimento" DATE,
    "arquivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Vigente',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pedido_id_organizacao_numero_key" ON "pedido"("id_organizacao", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedor_id_organizacao_cnpj_key" ON "fornecedor"("id_organizacao", "cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "qualificacao_fornecedor_id_fornecedor_id_categoria_key" ON "qualificacao_fornecedor"("id_fornecedor", "id_categoria");

-- AddForeignKey
ALTER TABLE "alcada_aprovacao" ADD CONSTRAINT "alcada_aprovacao_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_id_solicitante_fkey" FOREIGN KEY ("id_solicitante") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_id_centro_custo_fkey" FOREIGN KEY ("id_centro_custo") REFERENCES "centro_custo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "item_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacao_pedido" ADD CONSTRAINT "aprovacao_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacao_pedido" ADD CONSTRAINT "aprovacao_pedido_id_alcada_fkey" FOREIGN KEY ("id_alcada") REFERENCES "alcada_aprovacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacao_pedido" ADD CONSTRAINT "aprovacao_pedido_id_aprovador_fkey" FOREIGN KEY ("id_aprovador") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_pedido" ADD CONSTRAINT "auditoria_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_pedido" ADD CONSTRAINT "auditoria_pedido_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedor" ADD CONSTRAINT "fornecedor_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualificacao_fornecedor" ADD CONSTRAINT "qualificacao_fornecedor_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualificacao_fornecedor" ADD CONSTRAINT "qualificacao_fornecedor_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_fornecedor" ADD CONSTRAINT "documento_fornecedor_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
