const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

const init = pool.query(`
  CREATE TABLE IF NOT EXISTS payments (
    id            SERIAL PRIMARY KEY,
    voucher_no    VARCHAR(30),
    purchase_id   INTEGER REFERENCES purchases(id) ON DELETE SET NULL,
    party_id      INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    cheque_no     VARCHAR(50),
    payment_date  DATE DEFAULT CURRENT_DATE,
    inquiry_date  DATE,
    amount        NUMERIC(12,2) DEFAULT 0,
    payment_type  VARCHAR(30) DEFAULT 'CASH',
    pass_type     VARCHAR(30),
    remark        VARCHAR(255),
    entered_by    INTEGER,
    updated_by    INTEGER
  );
`).catch(err => console.error('payments table init error:', err.message));

// Active accounts (vendor/party) for the dropdown
router.get('/parties', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query(`
      SELECT id, account_name AS party_name, mobile_no AS contact_no, permanent_address AS address
      FROM accounts WHERE delete_flag=false AND status_flag=true ORDER BY account_name`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Next voucher number
router.get('/next-no', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query('SELECT COUNT(*) FROM payments');
    res.json({ next: `PAY-${String(parseInt(r.rows[0].count) + 1).padStart(4, '0')}` });
  } catch (err) { res.json({ next: 'PAY-0001' }); }
});

// Party detail: pending bills (purchases) + payment history + summary
router.get('/detail', auth, async (req, res) => {
  await init;
  const { party_id } = req.query;
  if (!party_id) return res.json({ bills: [], payments: [], summary: { order_total: 0, total_paid: 0, total_pending: 0 } });
  try {
    const purchases = await pool.query(`
      SELECT id, booking_no, inquiry_date, COALESCE(gross_total,0) AS gross_total
      FROM purchases WHERE party_id=$1 ORDER BY inquiry_date, id`, [party_id]);

    const paymentsRes = await pool.query(`
      SELECT id, voucher_no, payment_date, payment_type, amount, remark, purchase_id
      FROM payments WHERE party_id=$1 ORDER BY payment_date DESC, id DESC`, [party_id]);

    const total_paid = paymentsRes.rows.reduce((s, p) => s + Number(p.amount), 0);
    let running = total_paid;
    const bills = purchases.rows.map(b => {
      const total = Number(b.gross_total);
      const paid = Math.min(Math.max(running, 0), total);
      running -= paid;
      return { id: b.id, order_no: b.booking_no, order_date: b.inquiry_date, grand_total: total, paid, pending: total - paid };
    });
    const order_total = bills.reduce((s, b) => s + b.grand_total, 0);
    const total_pending = order_total - total_paid;

    res.json({ bills, payments: paymentsRes.rows, summary: { order_total, total_paid, total_pending } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /by-voucher/:voucherNo — lookup an existing payment for edit
router.get('/by-voucher/:voucherNo', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query(`
      SELECT p.*, a.account_name AS party_name, a.mobile_no AS contact_no, a.permanent_address AS address
      FROM payments p LEFT JOIN accounts a ON p.party_id = a.id
      WHERE p.voucher_no=$1 ORDER BY p.id DESC LIMIT 1`, [req.params.voucherNo]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /
router.post('/', auth, async (req, res) => {
  await init;
  try {
    const b = req.body;
    if (!b.party_id) return res.status(400).json({ error: 'Party required' });
    if (!b.amount || Number(b.amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    const cnt = await pool.query('SELECT COUNT(*) FROM payments');
    const voucher_no = `PAY-${String(parseInt(cnt.rows[0].count) + 1).padStart(4, '0')}`;
    const r = await pool.query(`
      INSERT INTO payments (voucher_no, party_id, purchase_id, cheque_no, payment_date, amount, payment_type, remark, entered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [voucher_no, b.party_id, b.purchase_id || null, b.cheque_no || '', b.pay_date || new Date(),
       b.amount, b.payment_type || 'CASH', b.remark || '', req.user.id]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /:id — update an existing payment
router.put('/:id', auth, async (req, res) => {
  await init;
  try {
    const b = req.body;
    if (!b.party_id) return res.status(400).json({ error: 'Party required' });
    if (!b.amount || Number(b.amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    const r = await pool.query(`
      UPDATE payments SET
        payment_date=$1, party_id=$2, purchase_id=$3, cheque_no=$4,
        amount=$5, payment_type=$6, remark=$7, updated_by=$8
      WHERE id=$9 RETURNING *`,
      [b.pay_date || new Date(), b.party_id, b.purchase_id || null, b.cheque_no || '',
       b.amount, b.payment_type || 'CASH', b.remark || '', req.user.id, req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /:id
router.delete('/:id', auth, async (req, res) => {
  await init;
  try { await pool.query('DELETE FROM payments WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
