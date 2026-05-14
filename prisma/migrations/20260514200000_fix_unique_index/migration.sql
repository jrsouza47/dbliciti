-- Renomeia o unique index para o nome esperado pelo Prisma
-- Isso resolve o schema drift entre Prisma e banco Neon
ALTER INDEX IF EXISTS "usuario_organizacao_usuario_org_filial_key"
  RENAME TO "usuario_organizacao_id_usuario_id_organizacao_id_filial_key";
