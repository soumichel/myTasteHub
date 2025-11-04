/**
 * Script para verificar e configurar o banco de dados PostgreSQL
 * Este script:
 * 1. Tenta conectar ao banco challenge_db com as credenciais do .env
 * 2. Se falhar, tenta conectar como postgres para criar usuário e banco
 * 3. Executa as configurações necessárias
 */

const { Client } = require('pg');
require('dotenv').config();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testConnection() {
  console.log('🔍 Testando conexão com o banco challenge_db...\n');
  
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'challenge_db',
    user: process.env.DB_USER || 'challenge',
    password: process.env.DB_PASSWORD || 'challenge_2024',
  });

  try {
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    const result = await client.query('SELECT version()');
    console.log(`📊 PostgreSQL versão: ${result.rows[0].version}\n`);
    
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ Falha na conexão: ${error.message}\n`);
    await client.end().catch(() => {});
    return false;
  }
}

async function setupDatabase() {
  console.log('🔧 Tentando configurar o banco como usuário postgres...\n');
  
  // Primeiro conectar ao banco postgres padrão
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres', // Senha padrão, pode precisar ajustar
  });

  try {
    await adminClient.connect();
    console.log('✅ Conectado como postgres\n');

    // Verificar se usuário existe
    const userCheck = await adminClient.query(
      "SELECT 1 FROM pg_user WHERE usename = 'challenge'"
    );

    if (userCheck.rows.length === 0) {
      console.log('👤 Criando usuário challenge...');
      await adminClient.query(
        "CREATE USER challenge WITH PASSWORD 'challenge_2024'"
      );
      console.log('✅ Usuário criado\n');
    } else {
      console.log('👤 Usuário challenge já existe\n');
      // Atualizar senha por garantia
      console.log('🔑 Atualizando senha do usuário...');
      await adminClient.query(
        "ALTER USER challenge WITH PASSWORD 'challenge_2024'"
      );
      console.log('✅ Senha atualizada\n');
    }

    // Verificar se banco existe
    const dbCheck = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'challenge_db'"
    );

    if (dbCheck.rows.length === 0) {
      console.log('🗄️  Criando banco challenge_db...');
      await adminClient.query('CREATE DATABASE challenge_db');
      console.log('✅ Banco criado\n');
    } else {
      console.log('🗄️  Banco challenge_db já existe\n');
    }

    // Dar permissões
    console.log('🔐 Configurando permissões...');
    await adminClient.query('GRANT ALL PRIVILEGES ON DATABASE challenge_db TO challenge');
    console.log('✅ Permissões concedidas\n');

    await adminClient.end();

    // Aguardar um pouco para garantir que as mudanças foram aplicadas
    await sleep(1000);

    // Conectar ao banco challenge_db para dar permissões no schema
    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: 'challenge_db',
      user: 'postgres',
      password: 'postgres',
    });

    await dbClient.connect();
    console.log('📝 Configurando permissões no schema public...');
    
    await dbClient.query('GRANT ALL ON SCHEMA public TO challenge');
    await dbClient.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO challenge');
    await dbClient.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO challenge');
    
    console.log('✅ Permissões do schema configuradas\n');
    
    await dbClient.end();

    return true;
  } catch (error) {
    console.error(`❌ Erro ao configurar banco: ${error.message}`);
    console.error('\n💡 Dicas:');
    console.error('   - Verifique se o PostgreSQL está rodando');
    console.error('   - Verifique a senha do usuário postgres');
    console.error('   - Execute o script setup-db.sql manualmente\n');
    await adminClient.end().catch(() => {});
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  myTasteHub - Setup de Banco de Dados');
  console.log('═══════════════════════════════════════════════\n');

  // Primeiro tenta conectar com as credenciais do .env
  const connected = await testConnection();

  if (connected) {
    console.log('✨ Banco de dados já está configurado e pronto para uso!\n');
    process.exit(0);
  }

  // Se falhar, tenta configurar
  console.log('🛠️  Banco não está configurado. Tentando configurar...\n');
  const setup = await setupDatabase();

  if (setup) {
    console.log('⏳ Testando conexão novamente...\n');
    await sleep(1000);
    
    const finalTest = await testConnection();
    
    if (finalTest) {
      console.log('═══════════════════════════════════════════════');
      console.log('  ✅ Setup concluído com sucesso!');
      console.log('═══════════════════════════════════════════════\n');
      console.log('Próximos passos:');
      console.log('  1. npm run migrate   # Criar tabelas');
      console.log('  2. npm run seed      # Gerar dados de teste');
      console.log('  3. npm run dev       # Iniciar servidor\n');
      process.exit(0);
    } else {
      console.log('❌ Setup realizado mas ainda há problemas de conexão\n');
      process.exit(1);
    }
  } else {
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ❌ Não foi possível configurar automaticamente');
    console.log('═══════════════════════════════════════════════\n');
    console.log('Por favor, execute manualmente:');
    console.log('  psql -U postgres -f setup-db.sql\n');
    process.exit(1);
  }
}

main();
