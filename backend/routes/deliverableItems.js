const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

const init = pool.query(`
  CREATE TABLE IF NOT EXISTS deliverable_items (
    id           SERIAL PRIMARY KEY,
    item_name    VARCHAR(200) NOT NULL,
    qnty         INTEGER DEFAULT 0,
    item_type    VARCHAR(100),
    delete_flag  BOOLEAN DEFAULT false,
    status_flag  BOOLEAN DEFAULT true,
    entered_by   INTEGER,
    updated_by   INTEGER
  );
  ALTER TABLE deliverable_items ADD COLUMN IF NOT EXISTS qnty         INTEGER DEFAULT 0;
  ALTER TABLE deliverable_items ADD COLUMN IF NOT EXISTS item_type    VARCHAR(100);
  ALTER TABLE deliverable_items ADD COLUMN IF NOT EXISTS delete_flag  BOOLEAN DEFAULT false;
  ALTER TABLE deliverable_items ADD COLUMN IF NOT EXISTS status_flag  BOOLEAN DEFAULT true;
  ALTER TABLE deliverable_items ADD COLUMN IF NOT EXISTS entered_by   INTEGER;
  ALTER TABLE deliverable_items ADD COLUMN IF NOT EXISTS updated_by   INTEGER;
  CREATE UNIQUE INDEX IF NOT EXISTS deliverable_items_name_uidx
    ON deliverable_items (UPPER(item_name)) WHERE delete_flag=false;
`).catch(err => console.error('deliverable_items table init error:', err.message));

router.get('/', auth, async (req, res) => {
  await init;
  const { search = '' } = req.query;
  try {
    let where = ['delete_flag=false'], params = [], i = 1;
    if (search) { where.push(`(item_name ILIKE $${i} OR item_type ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const r = await pool.query(
      `SELECT id,item_name,qnty,item_type,status_flag FROM deliverable_items
       WHERE ${where.join(' AND ')} ORDER BY item_name`, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/types', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query(
      `SELECT DISTINCT item_type FROM deliverable_items
       WHERE delete_flag=false AND item_type IS NOT NULL AND item_type <> '' ORDER BY item_type`);
    res.json(r.rows.map(row => row.item_type));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  await init;
  try {
    const { item_name, qnty, item_type } = req.body;
    if (!item_name) return res.status(400).json({ error: 'Item name required' });
    const r = await pool.query(
      `INSERT INTO deliverable_items(item_name,qnty,item_type,delete_flag,status_flag,entered_by)
       VALUES($1,$2,$3,false,true,$4) RETURNING *`,
      [item_name, qnty || 0, item_type || null, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Item name already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  await init;
  try {
    const { item_name, qnty, item_type, status_flag } = req.body;
    if (!item_name) return res.status(400).json({ error: 'Item name required' });
    const r = await pool.query(
      `UPDATE deliverable_items SET item_name=$1,qnty=$2,item_type=$3,status_flag=$4,updated_by=$5
       WHERE id=$6 RETURNING *`,
      [item_name, qnty || 0, item_type || null, status_flag !== false, req.user.id, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Item name already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  await init;
  try { await pool.query('UPDATE deliverable_items SET delete_flag=true WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
