-- Migration: pedido_observacao_tipo
-- Adiciona campos observacao e tipo_pedido ao model Pedido
-- observacao: campo livre de observações do solicitante
-- tipo_pedido: 1=Consumo 2=Permanente 3=Serviço (Int opcional)

ALTER TABLE "pedido" ADD COLUMN IF NOT EXISTS "observacao"   TEXT;
ALTER TABLE "pedido" ADD COLUMN IF NOT EXISTS "tipo_pedido"  INTEGER;
