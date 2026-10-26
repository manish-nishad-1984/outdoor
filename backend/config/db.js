const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const net = require('net');
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

// The DB is remote (~270 ms round trip) and every new connection costs TCP + TLS + auth, i.e.
// well over a second. pg's default closes a connection after 10 s idle, so nearly every click
// after a pause paid that cost again. Keep connections open and alive instead, and fail fast
// rather than hanging on the OS TCP timeout when the host is unreachable.
const POOL_SIZE = 10;
const WARM = 4;
const HOSTNAME = creds.host;
const pool = new Pool({
  ...creds,
  // servername keeps TLS SNI on the real hostname even after we switch `host` to its IP below.
  ssl: net.isIP(HOSTNAME) ? { rejectUnauthorized: false } : { rejectUnauthorized: false, servername: HOSTNAME },
  max: POOL_SIZE,
  idleTimeoutMillis: 10 * 60 * 1000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

let connectedLogged = false;
pool.on('connect', () => { if (!connectedLogged) { console.log('PostgreSQL connected'); connectedLogged = true; } });
pool.on('error', (err) => console.error('PostgreSQL error:', err.message));

// The OS resolver on this host intermittently fails/stalls on the DB hostname ("No such host is
// known") while a direct DNS query answers instantly. Resolve once ourselves (OS-configured
// servers, then public fallbacks) and point the pool at the IP, so new connections never wait
// on DNS. Re-resolved periodically in case the provider moves the host.
async function resolveHost() {
  if (net.isIP(HOSTNAME)) return;
  const attempts = [() => dns.promises.resolve4(HOSTNAME)];
  attempts.push(() => { const r = new dns.promises.Resolver(); r.setServers(['8.8.8.8', '1.1.1.1']); return r.resolve4(HOSTNAME); });
  for (const attempt of attempts) {
    try {
      const [ip] = await attempt();
      if (ip) { pool.options.host = ip; return; }
    } catch { /* try next */ }
  }
  console.error(`PostgreSQL: could not resolve ${HOSTNAME}; using hostname`);
}

// Hold every connection attempt until the first resolution finishes — routes fire their
// schema-init queries the moment they are required, before the IP is known.
const ready = resolveHost();
const rawConnect = pool.connect.bind(pool);
pool.connect = (cb) => {
  if (typeof cb === 'function') { ready.then(() => rawConnect(cb)); return undefined; }
  return ready.then(() => rawConnect());
};

// Pre-warm a few connections at startup so the first requests don't each pay the handshake.
async function warm() {
  const clients = [];
  await Promise.all(Array.from({ length: WARM }, () => pool.connect().then(c => clients.push(c))))
    .catch(err => console.error('PostgreSQL warm-up failed:', err.message))
    .finally(() => clients.forEach(c => c.release()));
}
warm();
setInterval(resolveHost, 30 * 60 * 1000).unref();

module.exports = pool;
