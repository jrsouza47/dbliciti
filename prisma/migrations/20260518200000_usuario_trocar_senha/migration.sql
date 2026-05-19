-- Adiciona campo trocar_senha na tabela usuario
-- true = usuario deve trocar a senha no proximo login
-- Padrao true para usuarios existentes (admin devem redefinir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuario' AND column_name = 'trocar_senha'
  ) THEN
    ALTER TABLE "usuario" ADD COLUMN "trocar_senha" BOOLEAN NOT NULL DEFAULT true;
    -- Admin nao precisa trocar (ja tem senha propria)
    UPDATE "usuario" SET "trocar_senha" = false WHERE perfil IN ('Admin', 'Administrador', 'Gestor');
  END IF;
END$$;
