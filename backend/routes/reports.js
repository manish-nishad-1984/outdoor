const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/reports/dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const [orders, sales, receipts, pending] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE has_data=true) AS in_progress, 0 AS delivered FROM outdoor_orders WHERE DATE_TRUNC('month',inquiry_date)=DATE_TRUNC('month',NOW())`),
      pool.query(`SELECT COALESCE(SUM(gross_total),0) AS total FROM sales WHERE DATE_TRUNC('month',inquiry_date)=DATE_TRUNC('month',NOW())`),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM receipts WHERE DATE_TRUNC('month',inquiry_date)=DATE_TRUNC('month',NOW())`),
      pool.query(`SELECT COALESCE(SUM(total_pending),0) AS total FROM outdoor_orders`),
    ]);
    res.json({
      orders: orders.rows[0],
      monthly_sales: sales.rows[0].total,
      monthly_receipts: receipts.rows[0].total,
      pending_amount: pending.rows[0].total,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/unassigned-staff — order items whose Item Master entry is marked "Staff
// Required" but no photographer/operator has been assigned yet. Upcoming functions first.
router.get('/unassigned-staff', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT oi.id, oi.outdoor_order_id AS order_id, o.order_no,
             COALESCE(NULLIF(o.company_name,''), o.cust_name) AS client_name,
             COALESCE(NULLIF(o.mob_no,''), o.contact_no) AS mobile,
             oi.function_date, COALESCE(NULLIF(oi.item_name,''), oi.item_name_snap) AS item_name,
             oi.event_name, oi.place, oi.time_slot,
             (oi.function_date - CURRENT_DATE) AS days_left
      FROM outdoor_order_items oi
      JOIN outdoor_orders o ON o.id = oi.outdoor_order_id
      JOIN items i ON i.id = oi.item_id
      WHERE i.staff_req = true
        AND COALESCE(oi.operator_name,'') = '' AND oi.operator_id IS NULL
      ORDER BY (oi.function_date < CURRENT_DATE),
               CASE WHEN oi.function_date >= CURRENT_DATE THEN oi.function_date END ASC,
               oi.function_date DESC
      LIMIT 200`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD — everything that occupies a date:
// order items (confirmed shoots), bookings, and quotation items not yet converted to an order
// (tentative). Dates are returned as plain YYYY-MM-DD strings so no timezone shift happens.
router.get('/calendar', auth, async (req, res) => {
  const { from, to } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) {
    return res.status(400).json({ error: 'from and to (YYYY-MM-DD) are required' });
  }
  try {
    const [orders, bookings, quotes] = await Promise.all([
      pool.query(`
        SELECT 'order' AS type, oi.id, o.id AS ref_id, o.order_no AS doc_no,
               to_char(oi.function_date, 'YYYY-MM-DD') AS date,
               COALESCE(NULLIF(o.company_name,''), o.cust_name) AS client,
               COALESCE(NULLIF(oi.item_name,''), oi.item_name_snap) AS item, oi.event_name AS event,
               oi.place, oi.time_slot AS time, oi.operator_name AS staff,
               COALESCE(i.staff_req, false) AS staff_req
        FROM outdoor_order_items oi
        JOIN outdoor_orders o ON o.id = oi.outdoor_order_id
        LEFT JOIN items i ON i.id = oi.item_id
        WHERE oi.function_date BETWEEN $1 AND $2`, [from, to]),
      pool.query(`
        SELECT 'booking' AS type, b.id, b.id AS ref_id, b.booking_no AS doc_no,
               to_char(b.event_date, 'YYYY-MM-DD') AS date, b.customer_name AS client,
               NULL AS item, b.event_type AS event, b.venue AS place, NULL AS time,
               b.photo_by AS staff, false AS staff_req, b.status
        FROM bookings b
        WHERE b.event_date BETWEEN $1 AND $2 AND COALESCE(b.status,'') <> 'Cancelled'`, [from, to]),
      pool.query(`
        SELECT 'quote' AS type, qi.id, q.id AS ref_id, q.quo_no::text AS doc_no,
               to_char(qi.function_date, 'YYYY-MM-DD') AS date, q.client_name AS client,
               qi.item_name AS item, qi.event_name AS event, qi.place, qi.op_time AS time,
               qi.operator_name AS staff, false AS staff_req
        FROM quotation_items qi
        JOIN quotations q ON q.id = qi.quotation_id
        WHERE q.delete_flag = false
          AND qi.function_date BETWEEN $1 AND $2
          AND q.quo_no NOT IN (SELECT quo_no FROM outdoor_orders WHERE quo_no IS NOT NULL)`, [from, to]),
    ]);
    res.json([...orders.rows, ...bookings.rows, ...quotes.rows]);
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
