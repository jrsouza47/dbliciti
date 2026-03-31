/*
  Warnings:

  - Added the required column `atualizado_em` to the `categoria` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "categoria" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "atualizado_em" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id_estrutura" TEXT,
ALTER COLUMN "nivel" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "estrutura_hierarquia" (
    "id" TEXT NOT NULL,
    "id_organizacao" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "mascara" TEXT NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "status" TEXT NOT NULL DEFAULT 'Inativa',
    "criado_por" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estrutura_hierarquia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_categoria" (
    "id" TEXT NOT NULL,
    "id_item" TEXT NOT NULL,
    "id_categoria" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_categoria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_id_estrutura_fkey" FOREIGN KEY ("id_estrutura") REFERENCES "estrutura_hierarquia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estrutura_hierarquia" ADD CONSTRAINT "estrutura_hierarquia_id_organizacao_fkey" FOREIGN KEY ("id_organizacao") REFERENCES "organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estrutura_hierarquia" ADD CONSTRAINT "estrutura_hierarquia_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_categoria" ADD CONSTRAINT "item_categoria_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "item_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_categoria" ADD CONSTRAINT "item_categoria_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
