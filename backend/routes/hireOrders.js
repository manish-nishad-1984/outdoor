const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req,res) => {
  const { page=1, limit=25, search='' } = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search) { where.push(`(h.customer_name ILIKE $${i} OR h.order_contact ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const q = `SELECT h.id,h.customer_name,h.order_contact,h.inquiry_date,h.gross_total,h.subtotal,h.remark,
                      COUNT(hi.id) AS item_count,
                      MIN(hi.order_date) AS from_date, MAX(hi.order_date) AS to_date
               FROM hire_orders h
               LEFT JOIN hire_order_items hi ON hi.hire_order_id=h.id
               WHERE ${where.join(' AND ')}
               GROUP BY h.id ORDER BY h.inquiry_date DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);
    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM hire_orders h WHERE ${where.join(' AND ')}`, params.slice(0,-2))
    ]);
    const stats = await pool.query(`SELECT COALESCE(SUM(gross_total),0) AS total_value, COUNT(*) AS total FROM hire_orders`);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), stats: stats.rows[0] });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req,res) => {
  try {
    const h = await pool.query('SELECT * FROM hire_orders WHERE id=$1', [req.params.id]);
    if (!h.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query('SELECT * FROM hire_order_items WHERE hire_order_id=$1', [req.params.id]);
    res.json({ ...h.rows[0], items: items.rows });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { customer_name, order_contact, remark, items=[] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const subtotal = items.reduce((s,it) => s + parseFloat(it.total||0), 0);
    const order = await client.query(
      `INSERT INTO hire_orders(customer_name,order_contact,remark,subtotal,gross_total,inquiry_date,entered_by)
       VALUES($1,$2,$3,$4,$4,CURRENT_DATE,$5) RETURNING *`,
      [customer_name, order_contact||'', remark||'', subtotal, req.user.id]
    );
    const oid = order.rows[0].id;
    for (const it of items) {
      await client.query(
        `INSERT INTO hire_order_items(hire_order_id,employee_name,item_name,place,order_date,time_slot,quantity,rate,total)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [oid, it.employee_name||'', it.item_name||'', it.place||'', it.order_date||null, it.time_slot||'', it.quantity||1, it.rate||0, it.total||0]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(order.rows[0]);
  } catch(err){ await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

router.delete('/:id', auth, async (req,res) => {
  try {
    await pool.query('DELETE FROM hire_order_items WHERE hire_order_id=$1', [req.params.id]);
    await pool.query('DELETE FROM hire_orders WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

module.exports = router;
