-- AlterTable: adiciona campo de autenticação ao usuário
ALTER TABLE "usuario" ADD COLUMN "senha_hash" TEXT;

-- Senha temporária para o admin de seed (hash de 'admin123' gerado por bcryptjs rounds=10)
-- Troque via PATCH /usuarios/:id/senha em produção
UPDATE "usuario"
SET "senha_hash" = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE id = '00000000-0000-0000-0000-000000000002';
