const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  ssl: { rejectUnauthorized: false },
});

pool.on('connect', () => console.log('PostgreSQL connected'));
pool.on('error', (err) => console.error('PostgreSQL error:', err));

module.exports = pool;
