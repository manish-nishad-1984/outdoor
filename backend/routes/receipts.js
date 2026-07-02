const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 25, search = '', payment_mode = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['1=1']; let params = []; let i = 1;
    if (search) { where.push(`(r.receipt_no ILIKE $${i} OR a.name ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (payment_mode) { where.push(`r.payment_mode = $${i}`); params.push(payment_mode); i++; }
    params.push(limit, offset);
    const q = `SELECT r.*, a.name AS party_name FROM receipts r LEFT JOIN accounts a ON r.party_id=a.id WHERE ${where.join(' AND ')} ORDER BY r.receipt_date DESC LIMIT $${i} OFFSET $${i+1}`;
    const data = await pool.query(q, params);
    const count = await pool.query(`SELECT COUNT(*) FROM receipts r LEFT JOIN accounts a ON r.party_id=a.id WHERE ${where.join(' AND ')}`, params.slice(0,-2));
    res.json({ data: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { party_id, sale_id, outdoor_order_id, amount, payment_mode, reference, receipt_date } = req.body;
    const countRes = await pool.query('SELECT COUNT(*) FROM receipts');
    const receipt_no = `REC-${String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0')}`;
    const result = await pool.query(`
      INSERT INTO receipts (receipt_no,party_id,sale_id,outdoor_order_id,amount,payment_mode,reference,receipt_date,entered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [receipt_no, party_id, sale_id||null, outdoor_order_id||null, amount, payment_mode, reference||'', receipt_date, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM receipts WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
