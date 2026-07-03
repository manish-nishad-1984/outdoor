const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

// Create table on first load if it doesn't exist (mirrors client's Item Master).
// ALTER statements patch pre-existing `items` tables that were created with an
// older/different shape, so missing columns get added instead of failing on save.
const init = pool.query(`
  CREATE TABLE IF NOT EXISTS items (
    id               SERIAL PRIMARY KEY,
    item_name        VARCHAR(200) NOT NULL,
    hsn_code         VARCHAR(30)  DEFAULT '0',
    rate             NUMERIC(12,2) DEFAULT 0,
    not_use          BOOLEAN DEFAULT false,
    staff_req        BOOLEAN DEFAULT false,
    not_print        BOOLEAN DEFAULT false,
    conve_multi_qnty BOOLEAN DEFAULT false,
    delete_flag      BOOLEAN DEFAULT false,
    status_flag      BOOLEAN DEFAULT true,
    entered_by       INTEGER,
    updated_by       INTEGER
  );
  ALTER TABLE items ADD COLUMN IF NOT EXISTS hsn_code         VARCHAR(30)  DEFAULT '0';
  ALTER TABLE items ADD COLUMN IF NOT EXISTS rate             NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE items ADD COLUMN IF NOT EXISTS not_use          BOOLEAN DEFAULT false;
  ALTER TABLE items ADD COLUMN IF NOT EXISTS staff_req        BOOLEAN DEFAULT false;
  ALTER TABLE items ADD COLUMN IF NOT EXISTS not_print        BOOLEAN DEFAULT false;
  ALTER TABLE items ADD COLUMN IF NOT EXISTS conve_multi_qnty BOOLEAN DEFAULT false;
  ALTER TABLE items ADD COLUMN IF NOT EXISTS delete_flag      BOOLEAN DEFAULT false;
  ALTER TABLE items ADD COLUMN IF NOT EXISTS status_flag      BOOLEAN DEFAULT true;
  ALTER TABLE items ADD COLUMN IF NOT EXISTS entered_by       INTEGER;
  ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_by       INTEGER;
`).catch(err => console.error('items table init error:', err.message));

router.get('/', auth, async (req, res) => {
  await init;
  const { search='' } = req.query;
  try {
    let where = ['delete_flag=false'], params = [], i = 1;
    if (search) { where.push(`(item_name ILIKE $${i} OR hsn_code ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const r = await pool.query(
      `SELECT id,item_name,hsn_code,rate,not_use,staff_req,not_print,conve_multi_qnty,status_flag
         FROM items WHERE ${where.join(' AND ')} ORDER BY item_name`, params);
    res.json(r.rows);
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  await init;
  try {
    const { item_name, hsn_code, rate, not_use, staff_req, not_print, conve_multi_qnty } = req.body;
    if (!item_name) return res.status(400).json({ error: 'Item name required' });
    const r = await pool.query(
      `INSERT INTO items(item_name,hsn_code,rate,not_use,staff_req,not_print,conve_multi_qnty,delete_flag,status_flag,entered_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,false,true,$8) RETURNING *`,
      [item_name, hsn_code||'0', rate||0, !!not_use, !!staff_req, !!not_print, !!conve_multi_qnty, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  await init;
  try {
    const { item_name, hsn_code, rate, not_use, staff_req, not_print, conve_multi_qnty, status_flag } = req.body;
    if (!item_name) return res.status(400).json({ error: 'Item name required' });
    const r = await pool.query(
      `UPDATE items SET item_name=$1,hsn_code=$2,rate=$3,not_use=$4,staff_req=$5,not_print=$6,
       conve_multi_qnty=$7,status_flag=$8,updated_by=$9 WHERE id=$10 RETURNING *`,
      [item_name, hsn_code||'0', rate||0, !!not_use, !!staff_req, !!not_print, !!conve_multi_qnty,
       status_flag!==false, req.user.id, req.params.id]
    );
    res.json(r.rows[0]);
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  await init;
  try { await pool.query('UPDATE items SET delete_flag=true WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch(err){ res.status(500).json({ error: err.message }); }
});

module.exports = router;
