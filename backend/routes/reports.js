const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/reports/dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const [orders, sales, receipts, pending] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='in_progress') AS in_progress, COUNT(*) FILTER (WHERE status='delivered') AS delivered FROM outdoor_orders WHERE DATE_TRUNC('month',order_date)=DATE_TRUNC('month',NOW())`),
      pool.query(`SELECT COALESCE(SUM(net_amount),0) AS total FROM sales WHERE DATE_TRUNC('month',sale_date)=DATE_TRUNC('month',NOW())`),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM receipts WHERE DATE_TRUNC('month',receipt_date)=DATE_TRUNC('month',NOW())`),
      pool.query(`SELECT COALESCE(SUM(net_amount - COALESCE(advance,0)),0) AS total FROM outdoor_orders WHERE status != 'delivered'`),
    ]);
    res.json({
      orders: orders.rows[0],
      monthly_sales: sales.rows[0].total,
      monthly_receipts: receipts.rows[0].total,
      pending_amount: pending.rows[0].total,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/sales?from=&to=
router.get('/sales', auth, async (req, res) => {
  const { from, to } = req.query;
  try {
    const result = await pool.query(`
      SELECT s.invoice_no, a.name AS party, s.sale_date, s.gross_amount, s.discount, s.net_amount,
             COALESCE(SUM(r.amount),0) AS received, s.net_amount - COALESCE(SUM(r.amount),0) AS pending
      FROM sales s
      LEFT JOIN accounts a ON s.party_id=a.id
      LEFT JOIN receipts r ON r.sale_id=s.id
      WHERE s.sale_date BETWEEN $1 AND $2
      GROUP BY s.id, a.name ORDER BY s.sale_date DESC
    `, [from, to]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/pl?from=&to=
router.get('/pl', auth, async (req, res) => {
  const { from, to } = req.query;
  try {
    const [income, expenses] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(net_amount),0) AS total FROM sales WHERE sale_date BETWEEN $1 AND $2`, [from, to]),
      pool.query(`SELECT COALESCE(SUM(net_amount),0) AS total FROM purchases WHERE purchase_date BETWEEN $1 AND $2`, [from, to]),
    ]);
    res.json({
      income: income.rows[0].total,
      expenses: expenses.rows[0].total,
      profit: income.rows[0].total - expenses.rows[0].total,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
