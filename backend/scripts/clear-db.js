/**
 * Script para limpar todas as tabelas do banco
 */

const { Client } = require('pg');
require('dotenv').config();

async function clearDatabase() {
  console.log('🗑️  Limpando banco de dados...\n');
  
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'challenge_db',
    user: process.env.DB_USER || 'challenge',
    password: process.env.DB_PASSWORD || 'challenge_2024',
  });

  try {
    await client.connect();
    
    // Lista de tabelas para limpar (ordem inversa das dependências)
    const tables = [
      'item_product_sales',
      'product_sales',
      'delivery_addresses',
      'delivery_sales',
      'payments',
      'sales',
      'product_options',
      'products',
      'customers',
      'stores'
    ];
    
    for (const table of tables) {
      console.log(`  ↻ Limpando ${table}...`);
      await client.query(`DELETE FROM ${table}`);
      console.log(`  ✓ ${table} limpa`);
    }
    
    console.log('\n✅ Banco de dados limpo com sucesso!\n');
    
  } catch (error) {
    console.error('❌ Erro ao limpar banco:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

clearDatabase();
