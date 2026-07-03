const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

// Ensure the quotations schema matches the client's Quotation form.
// ALTERs patch the pre-existing table so new columns are added instead of failing.
const init = pool.query(`
  CREATE TABLE IF NOT EXISTS quotations (
    id            SERIAL PRIMARY KEY,
    quo_no        INTEGER,
    order_no      VARCHAR(30),
    quo_date      DATE DEFAULT CURRENT_DATE,
    client_name   VARCHAR(200),
    couple_name   VARCHAR(200),
    ref_by        VARCHAR(200),
    package_name  VARCHAR(200),
    address       TEXT,
    contact_no    VARCHAR(30),
    email         VARCHAR(200),
    sub_total     NUMERIC(12,2) DEFAULT 0,
    discount      NUMERIC(12,2) DEFAULT 0,
    grand_total   NUMERIC(12,2) DEFAULT 0,
    note          TEXT,
    wedding_deliverables    TEXT,
    prewedding_deliverables TEXT,
    display_purchase_rate   BOOLEAN DEFAULT false,
    entered_by    INTEGER,
    updated_by    INTEGER
  );
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quo_no       INTEGER;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quo_date     DATE DEFAULT CURRENT_DATE;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_name  VARCHAR(200);
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS couple_name  VARCHAR(200);
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS ref_by       VARCHAR(200);
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS package_name VARCHAR(200);
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS address      TEXT;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS contact_no   VARCHAR(30);
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS email        VARCHAR(200);
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sub_total    NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount     NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS grand_total  NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS note         TEXT;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS wedding_deliverables    TEXT;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS prewedding_deliverables TEXT;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS display_purchase_rate   BOOLEAN DEFAULT false;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS entered_by   INTEGER;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS updated_by   INTEGER;

  -- Legacy columns kept in sync so older consumers / NOT NULL constraints don't break
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS company_name  VARCHAR(200);
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS event_type    VARCHAR(100);
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS inquiry_date  DATE DEFAULT CURRENT_DATE;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS gross_total   NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS advance       NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total_pending NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS subtotal      NUMERIC(12,2) DEFAULT 0;

  CREATE TABLE IF NOT EXISTS quotation_items (
    id            SERIAL PRIMARY KEY,
    quotation_id  INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
    function_date DATE,
    item_name     VARCHAR(200),
    event_name    VARCHAR(200),
    qnty          NUMERIC(12,2) DEFAULT 1,
    rate          NUMERIC(12,2) DEFAULT 0,
    total         NUMERIC(12,2) DEFAULT 0
  );
`).catch(err => console.error('quotations table init error:', err.message));

// GET /api/quotations  — list
router.get('/', auth, async (req, res) => {
  await init;
  const { page = 1, limit = 25, search = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['1=1'], params = [], i = 1;
    if (search) {
      where.push(`(CAST(q.quo_no AS TEXT) ILIKE $${i} OR q.client_name ILIKE $${i} OR q.couple_name ILIKE $${i} OR q.contact_no ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    const listQ = `SELECT q.id, q.quo_no, q.quo_date, q.client_name, q.couple_name,
                          q.contact_no, q.grand_total, q.discount, q.sub_total
                     FROM quotations q WHERE ${where.join(' AND ')}
                     ORDER BY q.quo_no DESC NULLS LAST, q.id DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);
    const [data, count] = await Promise.all([
      pool.query(listQ, params),
      pool.query(`SELECT COUNT(*) FROM quotations q WHERE ${where.join(' AND ')}`, params.slice(0, -2))
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/quotations/next-no  — next quotation number
router.get('/next-no', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query('SELECT COALESCE(MAX(quo_no),406)+1 AS next FROM quotations');
    res.json({ next: r.rows[0].next });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/quotations/:id  — full record + items
router.get('/:id', auth, async (req, res) => {
  await init;
  try {
    const q = await pool.query('SELECT * FROM quotations WHERE id=$1', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query('SELECT * FROM quotation_items WHERE quotation_id=$1 ORDER BY id', [req.params.id]);
    res.json({ ...q.rows[0], items: items.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function totals(items = [], discount = 0) {
  const sub = items.reduce((s, it) => s + Number(it.total || 0), 0);
  const grand = Math.max(0, sub - Number(discount || 0));
  return { sub, grand };
}

// POST /api/quotations
router.post('/', auth, async (req, res) => {
  await init;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;
    const { sub, grand } = totals(b.items, b.discount);
    const noRes = await client.query('SELECT COALESCE(MAX(quo_no),406)+1 AS next FROM quotations');
    const quo_no = noRes.rows[0].next;

    const qdate = b.quo_date || new Date();
    const q = await client.query(`
      INSERT INTO quotations
        (quo_no, order_no, quo_date, client_name, couple_name, ref_by, package_name,
         address, contact_no, email, sub_total, discount, grand_total, note,
         wedding_deliverables, prewedding_deliverables, display_purchase_rate, entered_by,
         company_name, event_type, inquiry_date, gross_total, subtotal, total_pending)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
              $4,'',$3,$13,$11,$13) RETURNING *`,
      [quo_no, String(quo_no), qdate, b.client_name || '', b.couple_name || '',
       b.ref_by || '', b.package_name || '', b.address || '', b.contact_no || '', b.email || '',
       sub, b.discount || 0, grand, b.note || '', b.wedding_deliverables || '',
       b.prewedding_deliverables || '', !!b.display_purchase_rate, req.user.id]);

    const qid = q.rows[0].id;
    for (const it of (b.items || [])) {
      await client.query(`
        INSERT INTO quotation_items (quotation_id, function_date, item_name, event_name, qnty, rate, total)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [qid, it.function_date || null, it.item_name || '', it.event_name || '',
         it.qnty || 0, it.rate || 0, it.total || 0]);
    }
    await client.query('COMMIT');
    res.status(201).json(q.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// PUT /api/quotations/:id
router.put('/:id', auth, async (req, res) => {
  await init;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;
    const { sub, grand } = totals(b.items, b.discount);
    const q = await client.query(`
      UPDATE quotations SET
        quo_date=$1, client_name=$2, couple_name=$3, ref_by=$4, package_name=$5,
        address=$6, contact_no=$7, email=$8, sub_total=$9, discount=$10, grand_total=$11,
        note=$12, wedding_deliverables=$13, prewedding_deliverables=$14,
        display_purchase_rate=$15, updated_by=$16,
        company_name=$2, inquiry_date=$1, gross_total=$11, subtotal=$9, total_pending=$11
      WHERE id=$17 RETURNING *`,
      [b.quo_date || new Date(), b.client_name || '', b.couple_name || '', b.ref_by || '',
       b.package_name || '', b.address || '', b.contact_no || '', b.email || '', sub,
       b.discount || 0, grand, b.note || '', b.wedding_deliverables || '',
       b.prewedding_deliverables || '', !!b.display_purchase_rate, req.user.id, req.params.id]);

    await client.query('DELETE FROM quotation_items WHERE quotation_id=$1', [req.params.id]);
    for (const it of (b.items || [])) {
      await client.query(`
        INSERT INTO quotation_items (quotation_id, function_date, item_name, event_name, qnty, rate, total)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.params.id, it.function_date || null, it.item_name || '', it.event_name || '',
         it.qnty || 0, it.rate || 0, it.total || 0]);
    }
    await client.query('COMMIT');
    res.json(q.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// DELETE /api/quotations/:id
router.delete('/:id', auth, async (req, res) => {
  await init;
  try {
    await pool.query('DELETE FROM quotation_items WHERE quotation_id=$1', [req.params.id]);
    await pool.query('DELETE FROM quotations WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
