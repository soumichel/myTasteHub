import { Knex } from 'knex';
import { config } from '../config';

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
    },
    pool: {
      min: config.database.pool.min,
      max: config.database.pool.max,
    },
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },
  
  production: {
    client: 'pg',
    connection: {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: config.database.pool.min,
      max: config.database.pool.max,
    },
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
  },
};

export default knexConfig;
