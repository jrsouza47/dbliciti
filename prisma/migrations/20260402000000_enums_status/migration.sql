-- Criar enums
CREATE TYPE "StatusItem" AS ENUM ('Rascunho', 'Ativo', 'Reprovado', 'Inativo');
CREATE TYPE "TipoItem" AS ENUM ('Material', 'Servico');
CREATE TYPE "StatusPedido" AS ENUM ('Rascunho', 'Submetido', 'EmAprovacao', 'Aprovado', 'Reprovado', 'Cancelado', 'Encaminhado');
CREATE TYPE "DestinoPedido" AS ENUM ('Cotacao', 'Licitacao');
CREATE TYPE "DecisaoAprovacao" AS ENUM ('Aprovado', 'Reprovado');
CREATE TYPE "StatusFornecedor" AS ENUM ('Ativo', 'Suspenso', 'Bloqueado');
CREATE TYPE "StatusDocumento" AS ENUM ('Vigente', 'Vencido', 'Cancelado');
CREATE TYPE "StatusCotacao" AS ENUM ('Aberta', 'Encerrada', 'Homologada', 'Deserta');
CREATE TYPE "StatusConvite" AS ENUM ('Pendente', 'Enviado', 'Respondido', 'Recusado');
CREATE TYPE "StatusContrato" AS ENUM ('Minuta', 'Vigente', 'Encerrado');
CREATE TYPE "StatusEntrega" AS ENUM ('Pendente', 'Confirmado', 'Contestado');
CREATE TYPE "StatusNegociacao" AS ENUM ('Aberta', 'Concluida');
CREATE TYPE "StatusLicitacao" AS ENUM ('Enviada', 'Aguardando', 'Concluida', 'Erro');
CREATE TYPE "StatusOcorrencia" AS ENUM ('Aberta', 'Resolvida');
CREATE TYPE "StatusAlertaSancao" AS ENUM ('Ativo', 'Resolvido');
CREATE TYPE "StatusFracionamento" AS ENUM ('Aberto', 'Resolvido');
CREATE TYPE "NivelRisco" AS ENUM ('Baixo', 'Medio', 'Alto');
CREATE TYPE "StatusEstrutura" AS ENUM ('Ativa', 'Inativa');

-- item_catalogo
ALTER TABLE "item_catalogo" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "item_catalogo" ALTER COLUMN "tipo" TYPE "TipoItem" USING "tipo"::"TipoItem";
ALTER TABLE "item_catalogo" ALTER COLUMN "status" TYPE "StatusItem" USING "status"::"StatusItem";
ALTER TABLE "item_catalogo" ALTER COLUMN "status" SET DEFAULT 'Rascunho'::"StatusItem";

-- pedido
ALTER TABLE "pedido" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "pedido" ALTER COLUMN "status" TYPE "StatusPedido" USING "status"::"StatusPedido";
ALTER TABLE "pedido" ALTER COLUMN "status" SET DEFAULT 'Rascunho'::"StatusPedido";
ALTER TABLE "pedido" ALTER COLUMN "destino_pos" TYPE "DestinoPedido" USING "destino_pos"::"DestinoPedido";

-- aprovacao_pedido
ALTER TABLE "aprovacao_pedido" ALTER COLUMN "decisao" TYPE "DecisaoAprovacao" USING "decisao"::"DecisaoAprovacao";

-- fornecedor
ALTER TABLE "fornecedor" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "fornecedor" ALTER COLUMN "status" TYPE "StatusFornecedor" USING "status"::"StatusFornecedor";
ALTER TABLE "fornecedor" ALTER COLUMN "status" SET DEFAULT 'Ativo'::"StatusFornecedor";

-- documento_fornecedor
ALTER TABLE "documento_fornecedor" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "documento_fornecedor" ALTER COLUMN "status" TYPE "StatusDocumento" USING "status"::"StatusDocumento";
ALTER TABLE "documento_fornecedor" ALTER COLUMN "status" SET DEFAULT 'Vigente'::"StatusDocumento";

-- cotacao
ALTER TABLE "cotacao" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "cotacao" ALTER COLUMN "status" TYPE "StatusCotacao" USING "status"::"StatusCotacao";
ALTER TABLE "cotacao" ALTER COLUMN "status" SET DEFAULT 'Aberta'::"StatusCotacao";

-- convite_cotacao
ALTER TABLE "convite_cotacao" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "convite_cotacao" ALTER COLUMN "status" TYPE "StatusConvite" USING "status"::"StatusConvite";
ALTER TABLE "convite_cotacao" ALTER COLUMN "status" SET DEFAULT 'Pendente'::"StatusConvite";

-- contrato
ALTER TABLE "contrato" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "contrato" ALTER COLUMN "status" TYPE "StatusContrato" USING "status"::"StatusContrato";
ALTER TABLE "contrato" ALTER COLUMN "status" SET DEFAULT 'Minuta'::"StatusContrato";

-- entrega
ALTER TABLE "entrega" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "entrega" ALTER COLUMN "status" TYPE "StatusEntrega" USING "status"::"StatusEntrega";
ALTER TABLE "entrega" ALTER COLUMN "status" SET DEFAULT 'Pendente'::"StatusEntrega";

-- negociacao
ALTER TABLE "negociacao" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "negociacao" ALTER COLUMN "status" TYPE "StatusNegociacao" USING "status"::"StatusNegociacao";
ALTER TABLE "negociacao" ALTER COLUMN "status" SET DEFAULT 'Aberta'::"StatusNegociacao";

-- licitacao
ALTER TABLE "licitacao" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "licitacao" ALTER COLUMN "status" TYPE "StatusLicitacao" USING "status"::"StatusLicitacao";
ALTER TABLE "licitacao" ALTER COLUMN "status" SET DEFAULT 'Enviada'::"StatusLicitacao";

-- ocorrencia_contrato
ALTER TABLE "ocorrencia_contrato" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ocorrencia_contrato" ALTER COLUMN "status" TYPE "StatusOcorrencia" USING "status"::"StatusOcorrencia";
ALTER TABLE "ocorrencia_contrato" ALTER COLUMN "status" SET DEFAULT 'Aberta'::"StatusOcorrencia";

-- alerta_sancao
ALTER TABLE "alerta_sancao" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "alerta_sancao" ALTER COLUMN "status" TYPE "StatusAlertaSancao" USING "status"::"StatusAlertaSancao";
ALTER TABLE "alerta_sancao" ALTER COLUMN "status" SET DEFAULT 'Ativo'::"StatusAlertaSancao";

-- log_fracionamento
ALTER TABLE "log_fracionamento" ALTER COLUMN "nivel_risco" TYPE "NivelRisco" USING "nivel_risco"::"NivelRisco";
ALTER TABLE "log_fracionamento" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "log_fracionamento" ALTER COLUMN "status" TYPE "StatusFracionamento" USING "status"::"StatusFracionamento";
ALTER TABLE "log_fracionamento" ALTER COLUMN "status" SET DEFAULT 'Aberto'::"StatusFracionamento";

-- estrutura_hierarquia
ALTER TABLE "estrutura_hierarquia" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "estrutura_hierarquia" ALTER COLUMN "status" TYPE "StatusEstrutura" USING "status"::"StatusEstrutura";
ALTER TABLE "estrutura_hierarquia" ALTER COLUMN "status" SET DEFAULT 'Inativa'::"StatusEstrutura";
