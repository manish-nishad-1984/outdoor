const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 25, search = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['1=1']; let params = []; let i = 1;
    if (search) { where.push(`(r.voucher_no ILIKE $${i})`); params.push(`%${search}%`); i++; }
    params.push(limit, offset);
    const q = `
      SELECT r.id, r.voucher_no AS receipt_no, r.amount, r.payment_type AS payment_mode,
             r.payment_date AS receipt_date, r.cheque_no AS reference, r.remark
      FROM receipts r
      WHERE ${where.join(' AND ')}
      ORDER BY r.payment_date DESC
      LIMIT $${i} OFFSET $${i+1}
    `;
    const data = await pool.query(q, params);
    const count = await pool.query(`SELECT COUNT(*) FROM receipts r WHERE ${where.join(' AND ')}`, params.slice(0,-2));
    res.json({ data: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM receipts WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
