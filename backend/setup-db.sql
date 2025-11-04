-- Setup script para criar o usuário e banco de dados
-- Execute como postgres: psql -U postgres -f setup-db.sql

-- Criar o usuário se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'challenge') THEN
    CREATE USER challenge WITH PASSWORD 'challenge_2024';
  END IF;
END
$$;

-- Criar o banco se não existir
SELECT 'CREATE DATABASE challenge_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'challenge_db')\gexec

-- Conectar ao banco challenge_db
\c challenge_db

-- Dar permissões ao usuário
GRANT ALL PRIVILEGES ON DATABASE challenge_db TO challenge;
GRANT ALL ON SCHEMA public TO challenge;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO challenge;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO challenge;

-- Verificar se deu certo
\du challenge
\l challenge_db
