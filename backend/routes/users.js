const router  = require('express').Router();
const pool    = require('../config/db');
const bcrypt  = require('bcryptjs');
const auth    = require('../middleware/auth');

// Web port of legacy FrmUserCreation.vb (OPT_LOGIN). app_users is this app's live
// equivalent of OPT_LOGIN — the same table backing /api/auth/login.
//
// Tables/columns that reference app_users.id, used to block deletes the same way
// legacy's DeleteValid() blocked deleting a user referenced as EBY/UBY across
// MST_AC/MST_AG/MST_BOOK/etc. — scoped to what actually exists in this app.
const REFERENCING = [
  ['accounts', 'entered_by'], ['accounts', 'updated_by'],
  ['account_groups', 'entered_by'], ['account_groups', 'updated_by'],
  ['deliverable_items', 'entered_by'], ['deliverable_items', 'updated_by'],
  ['events', 'entered_by'], ['events', 'updated_by'],
  ['items', 'entered_by'], ['items', 'updated_by'],
  ['bookings', 'entered_by'],
  ['outdoor_orders', 'entered_by'], ['outdoor_orders', 'updated_by'],
  ['outdoor_payments', 'entered_by'], ['outdoor_payments', 'updated_by'],
  ['studio_orders', 'entered_by'], ['studio_orders', 'updated_by'],
  ['quotations', 'entered_by'], ['quotations', 'updated_by'],
  ['attendance', 'employee_id'],
  ['employee_payroll', 'employee_id'],
  ['design_jobs', 'employee_id'], ['design_jobs', 'entered_by'],
  ['exposing_jobs', 'entered_by'],
  ['hire_orders', 'entered_by'],
];

router.get('/', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, username, user_type FROM app_users ORDER BY id');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { username, password, user_type } = req.body;
  if (!username?.trim() || !password) return res.status(400).json({ error: 'User Name and Password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO app_users(username, password_hash, user_type) VALUES ($1,$2,$3) RETURNING id, username, user_type`,
      [username.trim(), hash, user_type || 'USER']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500)
       .json({ error: err.code === '23505' ? 'User Name already exists' : err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { username, password, user_type } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'User Name is required' });
  try {
    const r = password
      ? await pool.query(
          `UPDATE app_users SET username=$1, user_type=$2, password_hash=$3 WHERE id=$4 RETURNING id, username, user_type`,
          [username.trim(), user_type, await bcrypt.hash(password, 10), req.params.id])
      : await pool.query(
          `UPDATE app_users SET username=$1, user_type=$2 WHERE id=$3 RETURNING id, username, user_type`,
          [username.trim(), user_type, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500)
       .json({ error: err.code === '23505' ? 'User Name already exists' : err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const id = req.params.id;
  if (String(req.user.id) === String(id)) {
    return res.status(400).json({ error: "You can't delete the account you're currently logged in as" });
  }
  try {
    const checkSql = REFERENCING.map(([t, c]) => `SELECT 1 FROM ${t} WHERE ${c}=$1 LIMIT 1`).join(' UNION ALL ');
    const used = await pool.query(checkSql, [id]);
    if (used.rows.length) {
      return res.status(409).json({ error: "This User Can't Delete — records exist against this user" });
    }
    const r = await pool.query('DELETE FROM app_users WHERE id=$1 RETURNING id', [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
