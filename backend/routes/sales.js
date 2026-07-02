const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 25, search = '', status = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['1=1'];
    let params = [];
    let i = 1;
    if (search) { where.push(`(s.invoice_no ILIKE $${i} OR a.name ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (status) { where.push(`s.status = $${i}`); params.push(status); i++; }

    const q = `
      SELECT s.*, a.name AS party_name, e.full_name AS photographer_name,
             COALESCE(SUM(r.amount),0) AS amount_received
      FROM sales s
      LEFT JOIN accounts a ON s.party_id = a.id
      LEFT JOIN app_users e ON s.photographer_id = e.id
      LEFT JOIN receipts r ON r.sale_id = s.id
      WHERE ${where.join(' AND ')}
      GROUP BY s.id, a.name, e.full_name
      ORDER BY s.sale_date DESC
      LIMIT $${i} OFFSET $${i+1}
    `;
    params.push(limit, offset);

    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM sales s LEFT JOIN accounts a ON s.party_id=a.id WHERE ${where.join(' AND ')}`, params.slice(0,-2))
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await pool.query(`
      SELECT s.*, a.name AS party_name, a.mobile, a.email, a.address
      FROM sales s LEFT JOIN accounts a ON s.party_id = a.id WHERE s.id = $1
    `, [req.params.id]);
    if (!sale.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query('SELECT si.*, i.name AS item_name FROM sale_items si LEFT JOIN items i ON si.item_id=i.id WHERE si.sale_id=$1', [req.params.id]);
    const receipts = await pool.query('SELECT * FROM receipts WHERE sale_id=$1 ORDER BY receipt_date DESC', [req.params.id]);
    res.json({ ...sale.rows[0], items: items.rows, receipts: receipts.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { party_id, sale_date, photographer_id, gross_amount, discount, net_amount, advance, payment_mode, remark, items = [] } = req.body;
    const countRes = await client.query('SELECT COUNT(*) FROM sales');
    const invoice_no = `INV-${String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0')}`;
    const sale = await client.query(`
      INSERT INTO sales (invoice_no, party_id, sale_date, photographer_id, gross_amount, discount, net_amount, advance, payment_mode, remark, entered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [invoice_no, party_id, sale_date, photographer_id, gross_amount, discount, net_amount, advance, payment_mode, remark, req.user.id]);

    for (const item of items) {
      await client.query(`INSERT INTO sale_items (sale_id,item_id,rate,discount,net_total,total,remark) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [sale.rows[0].id, item.item_id, item.rate, item.discount||0, item.net_total, item.total, item.remark||'']);
    }

    await client.query('COMMIT');
    res.status(201).json(sale.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { party_id, sale_date, gross_amount, discount, net_amount, remark, status } = req.body;
    const result = await pool.query(`
      UPDATE sales SET party_id=$1,sale_date=$2,gross_amount=$3,discount=$4,net_amount=$5,remark=$6,status=$7,updated_by=$8,updated_at=NOW()
      WHERE id=$9 RETURNING *
    `, [party_id, sale_date, gross_amount, discount, net_amount, remark, status, req.user.id, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM sales WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
