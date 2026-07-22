-- ============================================================
-- MIGRATION: Centro de Custo — remover restrição de único em "código"
--
-- A estrutura do Benner tem casos legítimos de código (sigla) repetido
-- entre uma linha "agrupadora" e sua própria linha-folha (ex.: "DICOM"
-- aparece tanto na Diretoria de Comercialização quanto no seu próprio
-- nível-folha). Pra importar a estrutura completa do Benner sem perder
-- nenhuma linha, removemos a exigência de código único.
--
-- Efeito colateral (avisado ao cliente): a tela de cadastro manual de
-- Centro de Custo (Cadastro > Centros de Custo) também deixa de
-- bloquear a criação de um código duplicado — antes isso era barrado
-- pela mesma restrição do banco. Se for necessário reintroduzir esse
-- bloqueio só para cadastro manual, isso passa a exigir validação em
-- código (pedido.service.ts), não mais no banco.
-- ============================================================

DROP INDEX IF EXISTS "centro_custo_id_organizacao_codigo_key";
