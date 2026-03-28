-- CreateTable
CREATE TABLE "organizacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "modelo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "alcada_valor" DECIMAL(15,2),
    "id_substituto" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centro_custo" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "centro_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "id_pai" TEXT,
    "nivel" INTEGER NOT NULL,
    "atributos" JSONB,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_catalogo" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "codigo_interno" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao_tecnica" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "unidade_medida" TEXT NOT NULL,
    "id_categoria" TEXT,
    "codigo_catmat_catser" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Rascunho',
    "sigilo" BOOLEAN NOT NULL DEFAULT false,
    "uso_unico" BOOLEAN NOT NULL DEFAULT false,
    "id_item_sucessor" TEXT,
    "atributos_extras" JSONB,
    "criado_por" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preco_referencia" (
    "id" TEXT NOT NULL,
    "id_item" TEXT NOT NULL,
    "valor" DECIMAL(15,4) NOT NULL,
    "fonte" TEXT NOT NULL,
    "data_referencia" DATE NOT NULL,
    "responsavel_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preco_referencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_item" (
    "id" TEXT NOT NULL,
    "id_item" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "campo" TEXT,
    "valor_antes" TEXT,
    "valor_depois" TEXT,
    "usuario_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "centro_custo_id_organizacao_codigo_key" ON "centro_custo"("id_organizacao", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "item_catalogo_id_organizacao_codigo_interno_key" ON "item_catalogo"("id_organizacao", "codigo_interno");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_substituto_fkey" FOREIGN KEY ("id_substituto") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centro_custo" ADD CONSTRAINT "centro_custo_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_id_pai_fkey" FOREIGN KEY ("id_pai") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_catalogo" ADD CONSTRAINT "item_catalogo_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_catalogo" ADD CONSTRAINT "item_catalogo_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_catalogo" ADD CONSTRAINT "item_catalogo_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_catalogo" ADD CONSTRAINT "item_catalogo_id_item_sucessor_fkey" FOREIGN KEY ("id_item_sucessor") REFERENCES "item_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preco_referencia" ADD CONSTRAINT "preco_referencia_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "item_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preco_referencia" ADD CONSTRAINT "preco_referencia_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_item" ADD CONSTRAINT "auditoria_item_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "item_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_item" ADD CONSTRAINT "auditoria_item_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
