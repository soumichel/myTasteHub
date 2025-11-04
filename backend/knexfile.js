require('dotenv').config();
require('ts-node/register');

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'challenge_db',
      user: process.env.DB_USER || 'challenge',
      password: process.env.DB_PASSWORD || 'challenge_2024',
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
      loadExtensions: ['.ts']
    },
  },
  
  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts'
    },
  },
};
