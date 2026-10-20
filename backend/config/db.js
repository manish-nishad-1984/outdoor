const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// The DB password contains a special character that dotenv mis-parses (inline-comment / quote
// handling), which corrupts DB_PASS and breaks the connection. To avoid that, resolve credentials
// without relying on dotenv's value parsing. Priority:
//   1) repo-root .env.local  ConnectionStrings__Default   (local dev)
//   2) backend/.env read RAW, line by line                (server / IIS, and local)
//   3) process.env DB_*                                   (last resort)

function fromConnString(file) {
  try {
    const line = fs.readFileSync(file, 'utf8').split(/\r?\n/)
      .find((l) => l.startsWith('ConnectionStrings__Default='));
    if (!line) return null;
    const g = (k) => (line.match(new RegExp(k + '=([^;]*)')) || [])[1];
    return { host: g('Host'), port: parseInt(g('Port')), database: g('Database'), user: g('Username'), password: g('Password') };
  } catch {
    return null;
  }
}

function fromDotenvRaw(file) {
  try {
    const map = {};
    for (const l of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!l || l.trimStart().startsWith('#')) continue;
      const i = l.indexOf('=');
      if (i < 1) continue;
      map[l.slice(0, i).trim()] = l.slice(i + 1); // raw value: no comment/quote stripping
    }
    if (!map.DB_HOST || !map.DB_PASS) return null;
    return { host: map.DB_HOST.trim(), port: parseInt(map.DB_PORT), database: map.DB_NAME.trim(), user: map.DB_USER.trim(), password: map.DB_PASS };
  } catch {
    return null;
  }
}

const creds =
  fromConnString(path.join(__dirname, '..', '..', '.env.local')) ||
  fromDotenvRaw(path.join(__dirname, '..', '.env')) ||
  { host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS };

const pool = new Pool({ ...creds, ssl: { rejectUnauthorized: false } });

pool.on('connect', () => console.log('PostgreSQL connected'));
pool.on('error', (err) => console.error('PostgreSQL error:', err));

module.exports = pool;
