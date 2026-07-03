const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

const init = pool.query(`
  CREATE TABLE IF NOT EXISTS outdoor_payments (
    id            SERIAL PRIMARY KEY,
    trans_no      INTEGER,
    pay_date      DATE DEFAULT CURRENT_DATE,
    party_name    VARCHAR(200),
    contact_no    VARCHAR(30),
    address       TEXT,
    outdoor_order_id INTEGER REFERENCES outdoor_orders(id) ON DELETE SET NULL,
    payment_type  VARCHAR(30) DEFAULT 'CASH',
    amount        NUMERIC(12,2) DEFAULT 0,
    remark        TEXT,
    entered_by    INTEGER,
    updated_by    INTEGER
  );
`).catch(err => console.error('outdoor_payments table init error:', err.message));

// Distinct outdoor parties (customers) with latest contact/address
router.get('/parties', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query(`
      SELECT company_name AS party_name,
             MAX(COALESCE(NULLIF(mob_no,''), contact_no)) AS contact_no,
             MAX(address) AS address
      FROM outdoor_orders
      WHERE COALESCE(company_name,'') <> ''
      GROUP BY company_name ORDER BY company_name`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Next transaction number
router.get('/next-no', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query('SELECT COALESCE(MAX(trans_no),381)+1 AS next FROM outdoor_payments');
    res.json({ next: r.rows[0].next });
  } catch (err) { res.json({ next: 382 }); }
});

// Party detail: pending bills + payments + summary
router.get('/detail', auth, async (req, res) => {
  await init;
  const { party = '' } = req.query;
  try {
    const orders = await pool.query(`
      SELECT o.id, o.order_no, COALESCE(o.order_date, o.inquiry_date) AS order_date,
             COALESCE(o.grand_total,0) AS grand_total, COALESCE(o.advance,0) AS advance,
             COALESCE(pp.paid,0) AS extra_paid
      FROM outdoor_orders o
      LEFT JOIN (SELECT outdoor_order_id, SUM(amount) paid FROM outdoor_payments
                 GROUP BY outdoor_order_id) pp ON pp.outdoor_order_id = o.id
      WHERE o.company_name = $1 ORDER BY o.id`, [party]);

    const payments = await pool.query(`
      SELECT id, trans_no, pay_date, payment_type, amount, remark, outdoor_order_id
      FROM outdoor_payments WHERE party_name = $1 ORDER BY pay_date DESC, id DESC`, [party]);

    const bills = orders.rows.map(o => {
      const paid = Number(o.advance) + Number(o.extra_paid);
      return {
        id: o.id, order_no: o.order_no, order_date: o.order_date,
        grand_total: Number(o.grand_total), paid, pending: Number(o.grand_total) - paid,
      };
    });
    const order_total   = bills.reduce((s, b) => s + b.grand_total, 0);
    const total_paid    = bills.reduce((s, b) => s + b.paid, 0);
    const total_pending = order_total - total_paid;

    res.json({ bills, payments: payments.rows, summary: { order_total, total_paid, total_pending } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /  — list of all outdoor payments
router.get('/', auth, async (req, res) => {
  await init;
  const { page = 1, limit = 25, search = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['1=1'], params = [], i = 1;
    if (search) { where.push(`(p.party_name ILIKE $${i} OR CAST(p.trans_no AS TEXT) ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const q = `SELECT p.*, o.order_no FROM outdoor_payments p
               LEFT JOIN outdoor_orders o ON p.outdoor_order_id = o.id
               WHERE ${where.join(' AND ')} ORDER BY p.id DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);
    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM outdoor_payments p WHERE ${where.join(' AND ')}`, params.slice(0, -2))
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /
router.post('/', auth, async (req, res) => {
  await init;
  try {
    const b = req.body;
    if (!b.party_name) return res.status(400).json({ error: 'Outdoor party required' });
    if (!b.amount || Number(b.amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    const noRes = await pool.query('SELECT COALESCE(MAX(trans_no),381)+1 AS next FROM outdoor_payments');
    const trans_no = noRes.rows[0].next;
    const r = await pool.query(`
      INSERT INTO outdoor_payments
        (trans_no, pay_date, party_name, contact_no, address, outdoor_order_id, payment_type, amount, remark, entered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [trans_no, b.pay_date || new Date(), b.party_name, b.contact_no || '', b.address || '',
       b.outdoor_order_id || null, b.payment_type || 'CASH', b.amount, b.remark || '', req.user.id]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /:id
router.delete('/:id', auth, async (req, res) => {
  await init;
  try { await pool.query('DELETE FROM outdoor_payments WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
