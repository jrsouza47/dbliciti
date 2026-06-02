-- Migration: adiciona coluna origem em edital_comentario
-- Caminho: prisma/migrations/20250530_edital_comentario_origem/migration.sql

ALTER TABLE edital_comentario
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'ELABORADOR';
