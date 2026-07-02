const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/outdoor-orders
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 25, search = '', status = '', event_type = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['1=1'];
    let params = [];
    let i = 1;

    if (search) {
      where.push(`(o.order_no ILIKE $${i} OR a.name ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    if (status) { where.push(`o.status = $${i}`); params.push(status); i++; }
    if (event_type) { where.push(`o.event_type = $${i}`); params.push(event_type); i++; }

    const q = `
      SELECT o.*, a.name AS party_name, a.mobile AS party_mobile,
             e.full_name AS photographer_name,
             COALESCE(SUM(r.amount),0) AS amount_received
      FROM outdoor_orders o
      LEFT JOIN accounts a ON o.party_id = a.id
      LEFT JOIN app_users e ON o.photographer_id = e.id
      LEFT JOIN receipts r ON r.outdoor_order_id = o.id
      WHERE ${where.join(' AND ')}
      GROUP BY o.id, a.name, a.mobile, e.full_name
      ORDER BY o.order_date DESC
      LIMIT $${i} OFFSET $${i+1}
    `;
    params.push(limit, offset);

    const countQ = `
      SELECT COUNT(*) FROM outdoor_orders o
      LEFT JOIN accounts a ON o.party_id = a.id
      WHERE ${where.join(' AND ')}
    `;

    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(countQ, params.slice(0, -2))
    ]);

    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page: +page, limit: +limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/outdoor-orders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await pool.query(`
      SELECT o.*, a.name AS party_name, a.mobile AS party_mobile, a.email AS party_email,
             e.full_name AS photographer_name
      FROM outdoor_orders o
      LEFT JOIN accounts a ON o.party_id = a.id
      LEFT JOIN app_users e ON o.photographer_id = e.id
      WHERE o.id = $1
    `, [req.params.id]);

    if (!order.rows.length) return res.status(404).json({ error: 'Not found' });

    const items = await pool.query(
      'SELECT oi.*, i.name AS item_name FROM outdoor_order_items oi LEFT JOIN items i ON oi.item_id = i.id WHERE oi.order_id = $1',
      [req.params.id]
    );

    const receipts = await pool.query(
      'SELECT * FROM receipts WHERE outdoor_order_id = $1 ORDER BY receipt_date DESC',
      [req.params.id]
    );

    res.json({ ...order.rows[0], items: items.rows, receipts: receipts.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outdoor-orders
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { party_id, event_type, event_date, photographer_id, amount, advance,
            payment_mode, remark, items = [] } = req.body;

    const countRes = await client.query("SELECT COUNT(*) FROM outdoor_orders");
    const order_no = `OUT-${String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0')}`;

    const order = await client.query(`
      INSERT INTO outdoor_orders (order_no, party_id, event_type, event_date,
        photographer_id, amount, advance, payment_mode, remark, entered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [order_no, party_id, event_type, event_date, photographer_id,
        amount, advance, payment_mode, remark, req.user.id]);

    const orderId = order.rows[0].id;

    for (const item of items) {
      await client.query(`
        INSERT INTO outdoor_order_items (order_id, item_id, event_date, rate, qty, total, camera_model)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [orderId, item.item_id, item.event_date, item.rate, item.qty, item.total, item.camera_model]);
    }

    if (advance > 0) {
      await client.query(`
        INSERT INTO receipts (receipt_no, party_id, outdoor_order_id, amount, payment_mode, receipt_date, entered_by)
        VALUES ($1,$2,$3,$4,$5,NOW(),$6)
      `, [`REC-${orderId}`, party_id, orderId, advance, payment_mode, req.user.id]);
    }

    await client.query('COMMIT');
    res.status(201).json(order.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/outdoor-orders/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { party_id, event_type, event_date, photographer_id, amount,
            remark, status, data_received, selection_done, design_done,
            print_done, dvd_done, delivered } = req.body;

    const result = await pool.query(`
      UPDATE outdoor_orders SET
        party_id=$1, event_type=$2, event_date=$3, photographer_id=$4,
        amount=$5, remark=$6, status=$7, data_received=$8, selection_done=$9,
        design_done=$10, print_done=$11, dvd_done=$12, delivered=$13,
        updated_by=$14, updated_at=NOW()
      WHERE id=$15 RETURNING *
    `, [party_id, event_type, event_date, photographer_id, amount, remark, status,
        data_received, selection_done, design_done, print_done, dvd_done, delivered,
        req.user.id, req.params.id]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/outdoor-orders/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM outdoor_orders WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
