const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 25, search = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['1=1'];
    let params = [];
    let i = 1;
    if (search) { where.push(`(s.order_no ILIKE $${i} OR s.customer_name ILIKE $${i} OR s.company_name ILIKE $${i})`); params.push(`%${search}%`); i++; }

    const q = `
      SELECT s.id, s.order_no AS invoice_no, s.customer_name AS party_name, s.inquiry_date AS sale_date,
             s.gross_total AS gross_amount, s.discount_rs AS discount, s.gross_total AS net_amount,
             s.advance AS amount_received, s.total_pending, s.status, s.payment_mode
      FROM sales s
      WHERE ${where.join(' AND ')}
      ORDER BY s.inquiry_date DESC
      LIMIT $${i} OFFSET $${i+1}
    `;
    params.push(limit, offset);

    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM sales s WHERE ${where.join(' AND ')}`, params.slice(0,-2))
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const cnt = await pool.query('SELECT COUNT(*) FROM sales');
    const order_no = `INV-${String(parseInt(cnt.rows[0].count)+1).padStart(4,'0')}`;
    const { customer_name, inquiry_date, payment_mode, gross_total, discount_rs, advance, status } = req.body;
    const total_pending = (parseFloat(gross_total)||0) - (parseFloat(discount_rs)||0) - (parseFloat(advance)||0);
    const r = await pool.query(
      `INSERT INTO sales(order_no,customer_name,inquiry_date,payment_mode,gross_total,discount_rs,advance,total_pending,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [order_no, customer_name, inquiry_date||new Date().toISOString().slice(0,10),
       payment_mode||'Cash', gross_total||0, discount_rs||0, advance||0, total_pending,
       status === true || status === 'Completed' || status === 'Done']
    );
    res.status(201).json(r.rows[0]);
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await pool.query(`SELECT * FROM sales WHERE id=$1`, [req.params.id]);
    if (!sale.rows.length) return res.status(404).json({ error: 'Not found' });
    const receipts = await pool.query('SELECT * FROM receipts WHERE sale_id=$1 ORDER BY payment_date DESC', [req.params.id]);
    res.json({ ...sale.rows[0], receipts: receipts.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
