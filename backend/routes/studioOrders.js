const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

// Patch the studio order schema (modelled on the Outdoor Order Book).
const init = pool.query(`
  CREATE TABLE IF NOT EXISTS studio_orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(30),
    customer_address VARCHAR(200),
    customer_contact VARCHAR(30),
    inquiry_date DATE DEFAULT CURRENT_DATE,
    gross_total NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) DEFAULT 0,
    status BOOLEAN DEFAULT false
  );
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS order_date   DATE DEFAULT CURRENT_DATE;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS cust_name    VARCHAR(200);
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS mob_no       VARCHAR(30);
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS address      TEXT;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS quo_no       INTEGER;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS couple_name  VARCHAR(200);
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS ref_by       VARCHAR(200);
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS package_name VARCHAR(200);
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS remark       TEXT;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS sub_total    NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS discount     NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS grand_total  NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS advance      NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS total_pending NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30) DEFAULT 'Cash';
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS event_type   VARCHAR(100);
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS display_staff_expenses BOOLEAN DEFAULT false;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS final_delivery_notes    TEXT;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS prewedding_deliverables TEXT;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS family_detail TEXT;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS st_selection  BOOLEAN DEFAULT false;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS st_invitation BOOLEAN DEFAULT false;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS st_data       BOOLEAN DEFAULT false;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS st_delivery   BOOLEAN DEFAULT false;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS st_desining   BOOLEAN DEFAULT false;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS st_printing   BOOLEAN DEFAULT false;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS st_dvd_pendrive BOOLEAN DEFAULT false;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS st_done       BOOLEAN DEFAULT false;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS st_reels      BOOLEAN DEFAULT false;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS desining_opt  VARCHAR(200);
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS printing_opt  VARCHAR(200);
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS dvd_opt       VARCHAR(200);
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS entered_by    INTEGER;
  ALTER TABLE studio_orders ADD COLUMN IF NOT EXISTS updated_by    INTEGER;

  CREATE TABLE IF NOT EXISTS studio_order_items (
    id SERIAL PRIMARY KEY,
    studio_order_id INTEGER REFERENCES studio_orders(id) ON DELETE CASCADE,
    rate NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0
  );
  ALTER TABLE studio_order_items ADD COLUMN IF NOT EXISTS function_date DATE;
  ALTER TABLE studio_order_items ADD COLUMN IF NOT EXISTS item_name     VARCHAR(200);
  ALTER TABLE studio_order_items ADD COLUMN IF NOT EXISTS item_name_snap VARCHAR(200);
  ALTER TABLE studio_order_items ADD COLUMN IF NOT EXISTS event_name    VARCHAR(200);
  ALTER TABLE studio_order_items ADD COLUMN IF NOT EXISTS qnty          NUMERIC(12,2) DEFAULT 1;
  ALTER TABLE studio_order_items ADD COLUMN IF NOT EXISTS box_qty       NUMERIC(12,2) DEFAULT 1;
`).catch(err => console.error('studio_orders table init error:', err.message));

// GET /  — list (shape preserved)
router.get('/', auth, async (req, res) => {
  await init;
  const { page = 1, limit = 25, search = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['1=1'], params = [], i = 1;
    if (search) {
      where.push(`(s.order_no ILIKE $${i} OR s.customer_address ILIKE $${i} OR s.customer_contact ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    const q = `SELECT s.id, s.order_no, s.customer_address AS customer_name, s.customer_contact,
                      COALESCE(s.order_date, s.inquiry_date) AS inquiry_date, s.delivery_date,
                      s.grand_total AS gross_total, s.status
               FROM studio_orders s WHERE ${where.join(' AND ')}
               ORDER BY s.id DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);
    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM studio_orders s WHERE ${where.join(' AND ')}`, params.slice(0, -2))
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/next-no', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(order_no,'\\D','','g'),'')::int),0)+1 AS next FROM studio_orders`);
    res.json({ next: r.rows[0].next });
  } catch (err) { res.json({ next: 1 }); }
});

router.get('/:id', auth, async (req, res) => {
  await init;
  try {
    const s = await pool.query('SELECT * FROM studio_orders WHERE id=$1', [req.params.id]);
    if (!s.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query('SELECT * FROM studio_order_items WHERE studio_order_id=$1 ORDER BY id', [req.params.id]);
    res.json({ ...s.rows[0], items: items.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function totals(items = [], discount = 0) {
  const sub = items.reduce((s, it) => s + Number(it.total || 0), 0);
  const grand = Math.max(0, sub - Number(discount || 0));
  return { sub, grand };
}

async function insertItems(client, orderId, items = []) {
  for (const it of items) {
    await client.query(`
      INSERT INTO studio_order_items
        (studio_order_id, function_date, item_name, item_name_snap, event_name, qnty, box_qty, rate, total)
      VALUES ($1,$2,$3,$3,$4,$5,$5,$6,$7)`,
      [orderId, it.function_date || null, it.item_name || '', it.event_name || '',
       it.qnty || 0, it.rate || 0, it.total || 0]);
  }
}

const COLS = `customer_address, cust_name, customer_contact, mob_no, address, quo_no, couple_name,
  ref_by, package_name, remark, order_date, inquiry_date, delivery_date, event_type,
  sub_total, subtotal, discount, grand_total, gross_total, advance, total_pending, payment_mode,
  display_staff_expenses, final_delivery_notes, prewedding_deliverables, family_detail, status,
  st_selection, st_invitation, st_data, st_delivery, st_desining, st_printing, st_dvd_pendrive,
  st_done, st_reels, desining_opt, printing_opt, dvd_opt`;

function values(b, sub, grand) {
  const odate = b.order_date || new Date();
  const pending = Math.max(0, grand - Number(b.advance || 0));
  return [
    b.cust_name || '', b.cust_name || '', b.mob_no || '', b.mob_no || '', b.address || '',
    b.quo_no || null, b.couple_name || '', b.ref_by || '', b.package_name || '', b.remark || '',
    odate, odate, b.delivery_date || null, '', sub, sub, b.discount || 0, grand, grand,
    b.advance || 0, pending, b.payment_mode || 'Cash', !!b.display_staff_expenses,
    b.final_delivery_notes || '', b.prewedding_deliverables || '', b.family_detail || '', !!b.status,
    !!b.st_selection, !!b.st_invitation, !!b.st_data, !!b.st_delivery, !!b.st_desining,
    !!b.st_printing, !!b.st_dvd_pendrive, !!b.st_done, !!b.st_reels,
    b.desining_opt || '', b.printing_opt || '', b.dvd_opt || '',
  ];
}

router.post('/', auth, async (req, res) => {
  await init;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;
    const { sub, grand } = totals(b.items, b.discount);
    const noRes = await client.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(order_no,'\\D','','g'),'')::int),0)+1 AS next FROM studio_orders`);
    const order_no = `STU-${String(noRes.rows[0].next).padStart(3, '0')}`;
    const params = [order_no, req.user.id, ...values(b, sub, grand)];
    const ph = params.map((_, i) => `$${i+1}`).join(',');
    const order = await client.query(
      `INSERT INTO studio_orders (order_no, entered_by, ${COLS}) VALUES (${ph}) RETURNING *`, params);
    await insertItems(client, order.rows[0].id, b.items);
    await client.query('COMMIT');
    res.status(201).json(order.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.put('/:id', auth, async (req, res) => {
  await init;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;
    const { sub, grand } = totals(b.items, b.discount);
    const cols = ['updated_by', ...COLS.split(',').map(c => c.trim())];
    const vals = [req.user.id, ...values(b, sub, grand)];
    const setSql = cols.map((c, i) => `${c}=$${i+1}`).join(', ');
    vals.push(req.params.id);
    const order = await client.query(
      `UPDATE studio_orders SET ${setSql} WHERE id=$${vals.length} RETURNING *`, vals);
    await client.query('DELETE FROM studio_order_items WHERE studio_order_id=$1', [req.params.id]);
    await insertItems(client, req.params.id, b.items);
    await client.query('COMMIT');
    res.json(order.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.delete('/:id', auth, async (req, res) => {
  await init;
  try {
    await pool.query('DELETE FROM studio_order_items WHERE studio_order_id=$1', [req.params.id]);
    await pool.query('DELETE FROM studio_orders WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
