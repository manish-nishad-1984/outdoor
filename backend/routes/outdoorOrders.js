const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Patch the outdoor order schema to match the client's Outdoor Order Book.
// ALTERs add missing columns to pre-existing tables (idempotent).
const init = pool.query(`
  CREATE TABLE IF NOT EXISTS outdoor_orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(30),
    company_name VARCHAR(200),
    contact_no VARCHAR(30),
    inquiry_date DATE DEFAULT CURRENT_DATE,
    gross_total NUMERIC(12,2) DEFAULT 0,
    advance NUMERIC(12,2) DEFAULT 0,
    entered_by INTEGER
  );
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS order_date   DATE DEFAULT CURRENT_DATE;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS cust_name    VARCHAR(200);
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS mob_no       VARCHAR(30);
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS address      TEXT;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS quo_no       INTEGER;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS couple_name  VARCHAR(200);
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS ref_by       VARCHAR(200);
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS package_name VARCHAR(200);
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS sub_total    NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS discount     NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS grand_total  NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30) DEFAULT 'Cash';
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS remark       TEXT;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS subtotal     NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS event_type   VARCHAR(100);
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS photo_by     VARCHAR(100);
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS total_pending NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS updated_by   INTEGER;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS display_staff_expenses BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS final_delivery_notes   TEXT;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS prewedding_deliverables TEXT;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS family_detail TEXT;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS st_selection  BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS st_invitation BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS st_data       BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS st_delivery   BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS st_desining   BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS st_printing   BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS st_dvd_pendrive BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS st_done       BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS st_reels      BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS desining_opt  VARCHAR(200);
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS printing_opt  VARCHAR(200);
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS dvd_opt       VARCHAR(200);

  CREATE TABLE IF NOT EXISTS outdoor_order_items (
    id SERIAL PRIMARY KEY,
    outdoor_order_id INTEGER REFERENCES outdoor_orders(id) ON DELETE CASCADE,
    rate NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0
  );
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS function_date DATE;
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS item_name     VARCHAR(200);
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS item_name_snap VARCHAR(200);
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS event_name    VARCHAR(200);
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS qnty          NUMERIC(12,2) DEFAULT 1;
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS box_qty       NUMERIC(12,2) DEFAULT 1;
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS place         VARCHAR(200);
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS time_slot     VARCHAR(50);
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS data_issue_from_operator BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS operator_name VARCHAR(200);
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS op_rate       NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS item_remark   VARCHAR(300);
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS sms_flag      BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS data_flag     BOOLEAN DEFAULT false;
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS data1         VARCHAR(200);
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS date1         DATE;
`).catch(err => console.error('outdoor_orders table init error:', err.message));

// GET /api/outdoor-orders  — list (shape preserved for existing list page)
router.get('/', auth, async (req, res) => {
  await init;
  const { page = 1, limit = 25, search = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['1=1'], params = [], i = 1;
    if (search) {
      where.push(`(o.order_no ILIKE $${i} OR o.company_name ILIKE $${i} OR o.contact_no ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    const q = `
      SELECT o.id, o.order_no, o.company_name AS party_name, o.contact_no AS party_mobile,
             o.event_type, COALESCE(o.order_date, o.inquiry_date) AS event_date,
             o.photo_by AS photographer_name, o.grand_total AS amount, o.advance,
             GREATEST(COALESCE(o.grand_total,0) - COALESCE(o.advance,0), 0) AS total_pending
      FROM outdoor_orders o WHERE ${where.join(' AND ')}
      ORDER BY o.id DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);
    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM outdoor_orders o WHERE ${where.join(' AND ')}`, params.slice(0, -2))
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page: +page, limit: +limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/outdoor-orders/next-no
router.get('/next-no', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(order_no,'\\D','','g'),'')::int),260)+1 AS next FROM outdoor_orders`);
    res.json({ next: r.rows[0].next });
  } catch (err) { res.json({ next: 261 }); }
});

// GET /api/outdoor-orders/:id
router.get('/:id', auth, async (req, res) => {
  await init;
  try {
    const order = await pool.query(`SELECT * FROM outdoor_orders WHERE id=$1`, [req.params.id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query(`SELECT * FROM outdoor_order_items WHERE outdoor_order_id=$1 ORDER BY id`, [req.params.id]);
    res.json({ ...order.rows[0], items: items.rows });
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
      INSERT INTO outdoor_order_items
        (outdoor_order_id, function_date, item_name, item_name_snap, event_name, qnty, box_qty,
         rate, total, place, time_slot, data_issue_from_operator, operator_name, op_rate,
         item_remark, sms_flag, data_flag, data1, date1)
      VALUES ($1,$2,$3,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [orderId, it.function_date || null, it.item_name || '', it.event_name || '',
       it.qnty || 0, it.rate || 0, it.total || 0, it.place || '', it.time_slot || '',
       !!it.data_issue_from_operator, it.operator_name || '', it.op_rate || 0,
       it.item_remark || '', !!it.sms_flag, !!it.data_flag, it.data1 || '', it.date1 || null]);
  }
}

const ORDER_COLS = `mob_no, address, quo_no, couple_name, ref_by, package_name,
  sub_total, subtotal, discount, grand_total, gross_total, advance, total_pending, payment_mode,
  remark, display_staff_expenses, final_delivery_notes, prewedding_deliverables, family_detail,
  st_selection, st_invitation, st_data, st_delivery, st_desining, st_printing, st_dvd_pendrive,
  st_done, st_reels, desining_opt, printing_opt, dvd_opt`;

function orderValues(b, sub, grand) {
  const pending = Math.max(0, grand - Number(b.advance || 0));
  return [
    b.mob_no || '', b.address || '', b.quo_no || null, b.couple_name || '', b.ref_by || '',
    b.package_name || '', sub, sub, b.discount || 0, grand, grand, b.advance || 0, pending,
    b.payment_mode || 'Cash', b.remark || '', !!b.display_staff_expenses, b.final_delivery_notes || '',
    b.prewedding_deliverables || '', b.family_detail || '', !!b.st_selection, !!b.st_invitation,
    !!b.st_data, !!b.st_delivery, !!b.st_desining, !!b.st_printing, !!b.st_dvd_pendrive,
    !!b.st_done, !!b.st_reels, b.desining_opt || '', b.printing_opt || '', b.dvd_opt || '',
  ];
}

// POST /api/outdoor-orders
router.post('/', auth, async (req, res) => {
  await init;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;
    const { sub, grand } = totals(b.items, b.discount);
    const noRes = await client.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(order_no,'\\D','','g'),'')::int),260)+1 AS next FROM outdoor_orders`);
    const order_no = String(noRes.rows[0].next);
    const odate = b.order_date || new Date();

    // Fixed leading columns: order_no, company_name, cust_name, contact_no, event_type,
    // order_date, inquiry_date, entered_by  then ORDER_COLS
    const params = [order_no, b.cust_name || '', b.cust_name || '', b.mob_no || '', '',
                    odate, odate, req.user.id, ...orderValues(b, sub, grand)];
    const ph = params.map((_, i) => `$${i+1}`).join(',');
    const order = await client.query(
      `INSERT INTO outdoor_orders
         (order_no, company_name, cust_name, contact_no, event_type, order_date, inquiry_date, entered_by, ${ORDER_COLS})
       VALUES (${ph}) RETURNING *`, params);

    await insertItems(client, order.rows[0].id, b.items);
    await client.query('COMMIT');
    res.status(201).json(order.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// PUT /api/outdoor-orders/:id
router.put('/:id', auth, async (req, res) => {
  await init;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;
    const { sub, grand } = totals(b.items, b.discount);
    const odate = b.order_date || new Date();
    // Leading SET cols then ORDER_COLS, matched positionally
    const lead = ['company_name', 'cust_name', 'contact_no', 'order_date', 'inquiry_date', 'updated_by'];
    const leadVals = [b.cust_name || '', b.cust_name || '', b.mob_no || '', odate, odate, req.user.id];
    const allCols = [...lead, ...ORDER_COLS.split(',').map(c => c.trim())];
    const allVals = [...leadVals, ...orderValues(b, sub, grand)];
    const setSql = allCols.map((c, i) => `${c}=$${i+1}`).join(', ');
    allVals.push(req.params.id);
    const order = await client.query(
      `UPDATE outdoor_orders SET ${setSql} WHERE id=$${allVals.length} RETURNING *`, allVals);

    await client.query('DELETE FROM outdoor_order_items WHERE outdoor_order_id=$1', [req.params.id]);
    await insertItems(client, req.params.id, b.items);
    await client.query('COMMIT');
    res.json(order.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// DELETE /api/outdoor-orders/:id
router.delete('/:id', auth, async (req, res) => {
  await init;
  try {
    await pool.query('DELETE FROM outdoor_order_items WHERE outdoor_order_id=$1', [req.params.id]);
    await pool.query('DELETE FROM outdoor_orders WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
