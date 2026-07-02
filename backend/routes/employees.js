const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM app_users ORDER BY full_name`);
    res.json(result.rows.map(u => ({ ...u, password_hash: undefined })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/attendance', auth, async (req, res) => {
  const { month, year } = req.query;
  try {
    const result = await pool.query(`
      SELECT * FROM attendance WHERE user_id=$1
      AND EXTRACT(MONTH FROM attend_date)=$2 AND EXTRACT(YEAR FROM attend_date)=$3
      ORDER BY attend_date
    `, [req.params.id, month, year]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/attendance', auth, async (req, res) => {
  try {
    const { records } = req.body; // [{ user_id, attend_date, status }]
    for (const r of records) {
      await pool.query(`
        INSERT INTO attendance (user_id, attend_date, status, entered_by)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id, attend_date) DO UPDATE SET status=$3
      `, [r.user_id, r.attend_date, r.status, req.user.id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
