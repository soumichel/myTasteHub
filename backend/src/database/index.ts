import knex, { Knex } from 'knex';
import knexConfig from './knexfile';
import { config } from '../config';

const environment = config.env;
const dbConfig = knexConfig[environment];

export const db: Knex = knex(dbConfig);

export default db;
