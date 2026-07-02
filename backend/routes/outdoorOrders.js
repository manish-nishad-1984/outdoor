const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/outdoor-orders
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 25, search = '', event_type = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['1=1'];
    let params = [];
    let i = 1;
    if (search) { where.push(`(o.order_no ILIKE $${i} OR o.company_name ILIKE $${i} OR o.contact_no ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (event_type) { where.push(`o.event_type = $${i}`); params.push(event_type); i++; }

    const q = `
      SELECT o.id, o.order_no, o.company_name AS party_name, o.contact_no AS party_mobile,
             o.event_type, o.inquiry_date AS event_date, o.photo_by AS photographer_name,
             o.gross_total AS amount, o.advance, o.total_pending,
             o.has_data AS data_received
      FROM outdoor_orders o
      WHERE ${where.join(' AND ')}
      ORDER BY o.inquiry_date DESC
      LIMIT $${i} OFFSET $${i+1}
    `;
    params.push(limit, offset);

    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM outdoor_orders o WHERE ${where.join(' AND ')}`, params.slice(0,-2))
    ]);

    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page: +page, limit: +limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/outdoor-orders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await pool.query(`SELECT * FROM outdoor_orders WHERE id=$1`, [req.params.id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query(`SELECT * FROM outdoor_order_items WHERE order_id=$1`, [req.params.id]);
    res.json({ ...order.rows[0], items: items.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/outdoor-orders
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { party_name, party_mobile, party_address, event_type, event_date,
            event_location, photographer_name, videographer_name,
            amount, advance_amount, payment_mode, notes, items = [] } = req.body;

    const countRes = await client.query("SELECT COUNT(*) FROM outdoor_orders");
    const order_no = `OUT-${String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0')}`;

    const order = await client.query(`
      INSERT INTO outdoor_orders
        (order_no, company_name, contact_no, event_type, photo_by,
         gross_total, subtotal, advance, payment_mode, remark, entered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10) RETURNING *
    `, [order_no, party_name, party_mobile, event_type, photographer_name,
        amount || 0, advance_amount || 0, payment_mode, notes, req.user.id]);

    const orderId = order.rows[0].id;

    for (const item of items) {
      await client.query(`
        INSERT INTO outdoor_order_items (order_id, rate, qty, total)
        VALUES ($1,$2,$3,$4)
      `, [orderId, item.rate || 0, item.qty || 1, item.amount || 0]);
    }

    await client.query('COMMIT');
    res.status(201).json(order.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// PUT /api/outdoor-orders/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { party_name, party_mobile, event_type, photographer_name,
            amount, advance_amount, payment_mode, notes, has_data } = req.body;
    const result = await pool.query(`
      UPDATE outdoor_orders SET
        company_name=$1, contact_no=$2, event_type=$3, photo_by=$4,
        gross_total=$5, advance=$6, payment_mode=$7, remark=$8,
        has_data=$9, updated_by=$10
      WHERE id=$11 RETURNING *
    `, [party_name, party_mobile, event_type, photographer_name,
        amount||0, advance_amount||0, payment_mode, notes,
        has_data||false, req.user.id, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/outdoor-orders/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM outdoor_orders WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
