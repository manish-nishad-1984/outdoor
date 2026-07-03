const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

const init = pool.query(`
  CREATE TABLE IF NOT EXISTS events (
    id          SERIAL PRIMARY KEY,
    event_name  VARCHAR(200) NOT NULL,
    not_use     BOOLEAN DEFAULT false,
    delete_flag BOOLEAN DEFAULT false,
    status_flag BOOLEAN DEFAULT true,
    entered_by  INTEGER,
    updated_by  INTEGER
  );
  ALTER TABLE events ADD COLUMN IF NOT EXISTS not_use     BOOLEAN DEFAULT false;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS delete_flag BOOLEAN DEFAULT false;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS status_flag BOOLEAN DEFAULT true;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS entered_by  INTEGER;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_by  INTEGER;
`).catch(err => console.error('events table init error:', err.message));

router.get('/', auth, async (req, res) => {
  await init;
  const { search = '' } = req.query;
  try {
    let where = ['delete_flag=false'], params = [], i = 1;
    if (search) { where.push(`event_name ILIKE $${i}`); params.push(`%${search}%`); i++; }
    const r = await pool.query(
      `SELECT id, event_name, not_use, status_flag FROM events WHERE ${where.join(' AND ')} ORDER BY event_name`, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  await init;
  try {
    const { event_name, not_use } = req.body;
    if (!event_name) return res.status(400).json({ error: 'Event name required' });
    const r = await pool.query(
      `INSERT INTO events(event_name, not_use, delete_flag, status_flag, entered_by)
       VALUES($1,$2,false,true,$3) RETURNING *`,
      [event_name, !!not_use, req.user.id]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  await init;
  try {
    const { event_name, not_use, status_flag } = req.body;
    if (!event_name) return res.status(400).json({ error: 'Event name required' });
    const r = await pool.query(
      `UPDATE events SET event_name=$1, not_use=$2, status_flag=$3, updated_by=$4 WHERE id=$5 RETURNING *`,
      [event_name, !!not_use, status_flag !== false, req.user.id, req.params.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  await init;
  try { await pool.query('UPDATE events SET delete_flag=true WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
