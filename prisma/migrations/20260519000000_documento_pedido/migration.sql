-- Migration: documento_pedido
-- Armazena documentos (DFD, ETP, TR, pesquisa de preco) vinculados ao pedido
-- Status 12 = Pendente de Ajuste (devolvido pela area de Compras)

CREATE TABLE IF NOT EXISTS "documento_pedido" (
  "id"         TEXT         NOT NULL,
  "id_pedido"  TEXT         NOT NULL,
  "tipo"       TEXT         NOT NULL,
  "nome"       TEXT         NOT NULL,
  "tamanho"    INTEGER      NOT NULL,
  "mime_type"  TEXT         NOT NULL,
  "dados"      BYTEA        NOT NULL,
  "id_usuario" TEXT         NOT NULL,
  "criado_em"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "documento_pedido_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "documento_pedido_id_pedido_fkey"
    FOREIGN KEY ("id_pedido") REFERENCES "pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "documento_pedido_id_usuario_fkey"
    FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON UPDATE CASCADE
);
