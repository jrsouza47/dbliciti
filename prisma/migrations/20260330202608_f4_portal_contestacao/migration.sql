-- AlterTable
ALTER TABLE "entrega" ADD COLUMN     "contestado_em" TIMESTAMP(3),
ADD COLUMN     "motivo_contestacao" TEXT,
ADD COLUMN     "status_contestacao" TEXT;
