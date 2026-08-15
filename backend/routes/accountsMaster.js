const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

const DEFAULT_GROUPS = [
  ['CASH', 'CASH'],
  ['BANK', 'ASSETS'],
  ['EXPOSER/PARTY', 'LIABILITES'],
  ['CUSTOMER', 'ASSETS'],
  ['PARTNER', 'ASSETS'],
  ['EMPLOYEE', 'LIABILITES'],
  ['CLIENT', 'LIABILITES'],
  ['LOAN', 'LIABILITES'],
  ['LOAN AND ADV.', 'ASSETS'],
  ['CREDITOR', 'LIABILITES'],
  ['DEBITOR', 'ASSETS'],
  ['INCOME', 'INCOME'],
  ['EXPENSES', 'EXPENSES'],
  ['DISCOUNT', 'OTHERS'],
  ['RAW PARTY', 'LIABILITES'],
  ['ADVERTISEMENT', 'EXPENSES'],
  ['SAVING', 'ASSETS'],
];

const init = pool.query(`
  CREATE TABLE IF NOT EXISTS account_groups (
    id          SERIAL PRIMARY KEY,
    group_name  VARCHAR(200) NOT NULL,
    head_group  VARCHAR(50) NOT NULL,
    is_system   BOOLEAN DEFAULT false,
    delete_flag BOOLEAN DEFAULT false,
    status_flag BOOLEAN DEFAULT true,
    entered_by  INTEGER,
    updated_by  INTEGER
  );
  ALTER TABLE account_groups ADD COLUMN IF NOT EXISTS head_group  VARCHAR(50);
  ALTER TABLE account_groups ADD COLUMN IF NOT EXISTS is_system   BOOLEAN DEFAULT false;
  ALTER TABLE account_groups ADD COLUMN IF NOT EXISTS delete_flag BOOLEAN DEFAULT false;
  ALTER TABLE account_groups ADD COLUMN IF NOT EXISTS status_flag BOOLEAN DEFAULT true;
  ALTER TABLE account_groups ADD COLUMN IF NOT EXISTS entered_by  INTEGER;
  ALTER TABLE account_groups ADD COLUMN IF NOT EXISTS updated_by  INTEGER;
  DROP INDEX IF EXISTS account_groups_name_uq;
  CREATE UNIQUE INDEX IF NOT EXISTS account_groups_name_uq ON account_groups (UPPER(group_name)) WHERE delete_flag=false;
`)
  .then(() => pool.query(
    `INSERT INTO account_groups (group_name, head_group, is_system)
     VALUES ${DEFAULT_GROUPS.map((_, i) => `($${i * 2 + 1},$${i * 2 + 2},true)`).join(',')}
     ON CONFLICT (UPPER(group_name)) WHERE delete_flag=false DO NOTHING`,
    DEFAULT_GROUPS.flat()
  ))
  .catch(err => console.error('account_groups table init error:', err.message));

router.get('/', auth, async (req, res) => {
  await init;
  const { search = '' } = req.query;
  try {
    let where = ['delete_flag=false'], params = [], i = 1;
    if (search) { where.push(`group_name ILIKE $${i}`); params.push(`%${search}%`); i++; }
    const r = await pool.query(
      `SELECT id, group_name, head_group, is_system, status_flag FROM account_groups WHERE ${where.join(' AND ')} ORDER BY group_name`,
      params
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  await init;
  try {
    const group_name = (req.body.group_name || '').trim().toUpperCase();
    const head_group  = (req.body.head_group || '').trim().toUpperCase();
    if (!group_name) return res.status(400).json({ error: 'Account Group Name is required' });
    if (!head_group)  return res.status(400).json({ error: 'Account Head is required' });

    const dup = await pool.query('SELECT id FROM account_groups WHERE UPPER(group_name)=$1 AND delete_flag=false', [group_name]);
    if (dup.rows.length) return res.status(400).json({ error: 'Account Group Name already exists' });

    const r = await pool.query(
      `INSERT INTO account_groups(group_name, head_group, delete_flag, status_flag, entered_by)
       VALUES($1,$2,false,true,$3) RETURNING *`,
      [group_name, head_group, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  await init;
  try {
    const group_name = (req.body.group_name || '').trim().toUpperCase();
    const head_group  = (req.body.head_group || '').trim().toUpperCase();
    if (!group_name) return res.status(400).json({ error: 'Account Group Name is required' });
    if (!head_group)  return res.status(400).json({ error: 'Account Head is required' });

    const dup = await pool.query(
      'SELECT id FROM account_groups WHERE UPPER(group_name)=$1 AND delete_flag=false AND id<>$2',
      [group_name, req.params.id]
    );
    if (dup.rows.length) return res.status(400).json({ error: 'Account Group Name already exists' });

    const r = await pool.query(
      `UPDATE account_groups SET group_name=$1, head_group=$2, updated_by=$3 WHERE id=$4 RETURNING *`,
      [group_name, head_group, req.user.id, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  await init;
  try {
    const g = await pool.query('SELECT is_system FROM account_groups WHERE id=$1', [req.params.id]);
    if (!g.rows.length) return res.status(404).json({ error: 'Not found' });
    if (g.rows[0].is_system) return res.status(400).json({ error: "Can't delete a default system group" });

    const used = await pool.query('SELECT COUNT(*) FROM accounts WHERE agent_id=$1 AND delete_flag=false', [req.params.id]);
    if (parseInt(used.rows[0].count, 10) > 0) return res.status(400).json({ error: 'Group is in use by an account' });

    await pool.query('UPDATE account_groups SET delete_flag=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
