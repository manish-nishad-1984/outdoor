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

  -- Added for the FrmQuotaionNew migration (soft-delete + FKs + GST, matching every other master table)
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS delete_flag         BOOLEAN DEFAULT false;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS status_flag         BOOLEAN DEFAULT true;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_id           INTEGER;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_percent    NUMERIC(6,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS service_tax_percent NUMERIC(6,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS service_tax_amount  NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sgst_percent        NUMERIC(6,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sgst_amount         NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS igst_percent        NUMERIC(6,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS igst_amount         NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS gst_type            VARCHAR(20) DEFAULT 'STATE';
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS extra_charge        NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS previous_pending    NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS purchase_total      NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deliverables_total  NUMERIC(12,2) DEFAULT 0;

  -- Added by the behavioral audit fix pass:
  -- updated_at backs the optimistic-concurrency check on PUT (Audit: HIGH #3).
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  -- Partial unique index closes the quo_no race condition (Audit: CRITICAL #1).
  CREATE UNIQUE INDEX IF NOT EXISTS quotations_quo_no_uidx ON quotations(quo_no) WHERE delete_flag=false;

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
  ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS item_id       INTEGER;
  ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS event_id      INTEGER;
  ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS operator_id   INTEGER;
  ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS operator_name VARCHAR(200);
  ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS camera_model  VARCHAR(100);
  ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS place         VARCHAR(200);
  ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS op_rate       NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS op_time       VARCHAR(50);
  ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS pur_rate      NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS pur_total     NUMERIC(12,2) DEFAULT 0;

  -- New: Wedding Deliverables selections (legacy TNS_WITEM2) — these rows are what feed
  -- deliverables_total, which is added into sub_total, matching MST_QUOTATION.STOTAL's
  -- confirmed legacy formula (ShowTotal() in FrmQuotaionNew.vb).
  CREATE TABLE IF NOT EXISTS quotation_deliverable_items (
    id                  SERIAL PRIMARY KEY,
    quotation_id        INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
    deliverable_item_id INTEGER REFERENCES deliverable_items(id),
    item_name           VARCHAR(200),
    qnty                NUMERIC(12,2) DEFAULT 0,
    amount              NUMERIC(12,2) DEFAULT 0
  );
`).catch(err => console.error('quotations table init error:', err.message));

const CLIENT_GROUP = 'CLIENT';
const OPERATOR_GROUP = 'EXPOSER/PARTY';

async function getGroupId(client, groupName) {
  const r = await client.query('SELECT id FROM account_groups WHERE UPPER(group_name)=UPPER($1) AND delete_flag=false', [groupName]);
  return r.rows[0]?.id || null;
}

// Find an existing CLIENT-group account, or create one. Does NOT overwrite fields on an
// existing account (see "Known behavior differences" — legacy blindly overwrites most
// MST_AC fields with blanks/zeros on every save; not replicated, would clobber real data
// entered via the web Account Master).
//
// Audit fix (HIGH #2): resolution now prefers the caller-supplied client_id when it still
// points at an account whose name matches what's on screen — this is what a normal re-save
// of an existing quotation's unchanged client hits. Only when there's no usable client_id,
// or the account name has genuinely changed, does it fall back to the name-based
// lookup-or-create path. This stops a client rename in Account Master from causing every
// subsequent save of that client's quotations to spawn a duplicate account.
async function resolveOrCreateClient(client, { client_id, client_name, address, contact_no, email }, userId) {
  const name = (client_name || '').trim();
  if (!name) return null;

  if (client_id) {
    const byId = await client.query(
      'SELECT id, account_name FROM accounts WHERE id=$1 AND delete_flag=false', [client_id]);
    if (byId.rows.length && byId.rows[0].account_name.trim().toUpperCase() === name.toUpperCase()) {
      return byId.rows[0].id;
    }
  }

  const groupId = await getGroupId(client, CLIENT_GROUP);
  if (!groupId) return null;
  const existing = await client.query(
    'SELECT id FROM accounts WHERE UPPER(account_name)=UPPER($1) AND agent_id=$2 AND delete_flag=false',
    [name, groupId]);
  if (existing.rows.length) return existing.rows[0].id;
  const created = await client.query(
    `INSERT INTO accounts(account_name, agent_id, permanent_address, mobile_no, email, delete_flag, status_flag, entered_by)
     VALUES($1,$2,$3,$4,$5,false,true,$6) RETURNING id`,
    [name, groupId, address || null, contact_no || null, email || null, userId]);
  return created.rows[0].id;
}

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

// Audit fix (HIGH #1): previous_pending is now always computed here, server-side, from the
// resolved client_id — the value the browser sends is never trusted or persisted directly
// (it wasn't previously, unlike every other total in computeTotals()). Mirrors
// DisplayPreviousPending() in FrmQuotaionNew.vb, minus the PAY_TNS ledger subtraction (no
// equivalent working payments-by-account ledger exists yet — documented, not silently
// dropped, in the original implementation report).
async function computePreviousPending(client, clientId, excludeId) {
  if (!clientId) return 0;
  const acc = await client.query('SELECT opening_balance, credit_debit FROM accounts WHERE id=$1', [clientId]);
  if (!acc.rows.length) return 0;
  const billed = await client.query(
    'SELECT COALESCE(SUM(grand_total),0) AS t FROM quotations WHERE client_id=$1 AND delete_flag=false AND id<>$2',
    [clientId, excludeId || 0]);
  const openingDebit = acc.rows[0].credit_debit === 'Dr' ? Number(acc.rows[0].opening_balance || 0) : 0;
  return round2(Number(billed.rows[0].t) + openingDebit);
}

// Authoritative server-side totals — never trust totals sent by the browser.
// Mirrors ShowTotal()/DisplayGTotal() in FrmQuotaionNew.vb exactly, including the
// confirmed legacy quirk that SGST/IGST both compute regardless of gst_type (Rule 7 —
// preserved as-is, not "fixed").
function computeTotals(items = [], deliverables = [], b = {}) {
  const lineItems = items.map(it => ({ ...it, total: round2(Number(it.qnty || 0) * Number(it.rate || 0)) }));
  const linesTotal = lineItems.reduce((s, it) => s + it.total, 0);
  const deliverablesTotal = deliverables.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const subTotal = round2(linesTotal + deliverablesTotal);

  const discountPercent = Number(b.discount_percent) || 0;
  // One-directional, matching legacy TxtDiscP_TextChanged: a nonzero percent always
  // recomputes the Rs amount; a direct Rs-only entry (percent=0) is trusted as sent.
  const discount = discountPercent > 0 ? round2(subTotal * discountPercent / 100) : round2(Number(b.discount) || 0);

  const taxable = subTotal - discount;
  const serviceTaxPercent = Number(b.service_tax_percent) || 0;
  const sgstPercent = Number(b.sgst_percent) || 0;
  const igstPercent = Number(b.igst_percent) || 0;
  const serviceTaxAmount = round2(taxable * serviceTaxPercent / 100);
  const sgstAmount = round2(taxable * sgstPercent / 100);
  const igstAmount = round2(taxable * igstPercent / 100);

  const grandTotal = Math.round(taxable);
  const advance = Number(b.advance) || 0;
  const totalPending = round2(grandTotal - advance);
  const extraCharge = Number(b.extra_charge) || 0;
  const purchaseTotal = round2(lineItems.reduce((s, it) => s + (Number(it.qnty || 0) * Number(it.pur_rate || 0)), 0));

  return {
    lineItems, subTotal, deliverablesTotal, discount, discountPercent,
    serviceTaxPercent, serviceTaxAmount, sgstPercent, sgstAmount, igstPercent, igstAmount,
    grandTotal, advance, totalPending, extraCharge, purchaseTotal,
  };
}

// GET /api/quotations  — list
router.get('/', auth, async (req, res) => {
  await init;
  const { page = 1, limit = 25, search = '' } = req.query;
  const offset = (page - 1) * limit;
  try {
    let where = ['q.delete_flag=false'], params = [], i = 1;
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
  } catch (err) { res.status(500).json({ error: 'Failed to load quotations' }); console.error('quotations list error:', err.message); }
});

// GET /api/quotations/next-no  — next quotation number (matches legacy Autonumber(): MAX+1)
// Advisory only — the real, race-safe assignment happens inside insertQuotationWithRetry().
router.get('/next-no', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query('SELECT COALESCE(MAX(quo_no),406)+1 AS next FROM quotations');
    res.json({ next: r.rows[0].next });
  } catch (err) { res.status(500).json({ error: 'Failed to load next quotation number' }); console.error('next-no error:', err.message); }
});

// GET /api/quotations/client-info?client_name=  — mirrors CmbPName_SelectionChangeCommitted:
// auto-fill address/contact/email, previous pending, and credit-limit warning.
router.get('/client-info', auth, async (req, res) => {
  await init;
  const name = (req.query.client_name || '').trim();
  if (!name) return res.json(null);
  try {
    const groupId = await getGroupId(pool, CLIENT_GROUP);
    const acc = await pool.query(
      `SELECT id, permanent_address, mobile_no, email, credit_limit, opening_balance, credit_debit
       FROM accounts WHERE UPPER(account_name)=UPPER($1) AND agent_id=$2 AND delete_flag=false`,
      [name, groupId]);
    if (!acc.rows.length) return res.json(null);
    const a = acc.rows[0];

    const excludeId = req.query.exclude_id || 0;
    const previousPending = await computePreviousPending(pool, a.id, excludeId);
    const overLimit = Number(a.credit_limit || 0) > 0 && previousPending > Number(a.credit_limit);

    res.json({
      client_id: a.id,
      address: a.permanent_address || '',
      contact_no: a.mobile_no || '',
      email: a.email || '',
      previous_pending: previousPending,
      credit_limit: Number(a.credit_limit || 0),
      over_limit: overLimit,
    });
  } catch (err) { res.status(500).json({ error: 'Failed to load client info' }); console.error('client-info error:', err.message); }
});

// GET /api/quotations/:id  — full record + items + deliverables
router.get('/:id', auth, async (req, res) => {
  await init;
  try {
    const q = await pool.query('SELECT * FROM quotations WHERE id=$1 AND delete_flag=false', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query('SELECT * FROM quotation_items WHERE quotation_id=$1 ORDER BY id', [req.params.id]);
    const deliverables = await pool.query('SELECT * FROM quotation_deliverable_items WHERE quotation_id=$1 ORDER BY id', [req.params.id]);
    res.json({ ...q.rows[0], items: items.rows, deliverables: deliverables.rows });
  } catch (err) { res.status(500).json({ error: 'Failed to load quotation' }); console.error('quotation get error:', err.message); }
});

// Audit fix (MEDIUM #4): in-grid duplicate-line check, matching the legacy in-memory scan
// in Valid1() (FrmQuotaionNew.vb:204-218) — same function_date + item_name + operator_name
// within one quotation is rejected. This is independent of, and does not require, the
// still-deferred cross-quotation/cross-module operator double-booking check.
function findDuplicateLine(items) {
  const seen = new Map();
  for (const it of items) {
    const key = [it.function_date || '', (it.item_name || '').trim().toUpperCase(), (it.operator_name || '').trim().toUpperCase()].join('|');
    if (seen.has(key)) return { a: seen.get(key), b: it };
    seen.set(key, it);
  }
  return null;
}

function validateBody(b) {
  if (!b.client_name || !String(b.client_name).trim()) return 'Client name required';
  if (!Array.isArray(b.items) || b.items.length === 0) return 'Add at least one item to the quotation';
  for (const it of b.items) {
    if (!it.item_name || !String(it.item_name).trim()) return 'Every detail row requires an item name';
    if (!it.event_name || !String(it.event_name).trim()) return 'Every detail row requires an event name';
  }
  const dup = findDuplicateLine(b.items);
  if (dup) return `Duplicate line: "${dup.b.item_name}" on ${dup.b.function_date} is already added for this operator`;
  return null;
}

async function writeItemsAndDeliverables(client, quotationId, items, deliverables) {
  for (const it of items) {
    await client.query(`
      INSERT INTO quotation_items (
        quotation_id, function_date, item_name, item_id, event_name, event_id,
        qnty, rate, total, operator_id, operator_name, camera_model, place,
        op_rate, op_time, pur_rate, pur_total
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [quotationId, it.function_date || null, it.item_name || '', it.item_id || null,
       it.event_name || '', it.event_id || null, it.qnty || 0, it.rate || 0, it.total || 0,
       it.operator_id || null, it.operator_name || null, it.camera_model || null, it.place || null,
       it.op_rate || 0, it.op_time || null, it.pur_rate || 0,
       round2((Number(it.qnty) || 0) * (Number(it.pur_rate) || 0))]);
  }
  for (const d of deliverables) {
    if (!d.deliverable_item_id) continue;
    await client.query(`
      INSERT INTO quotation_deliverable_items (quotation_id, deliverable_item_id, item_name, qnty, amount)
      VALUES ($1,$2,$3,$4,$5)`,
      [quotationId, d.deliverable_item_id, d.item_name || '', d.qnty || 0, d.amount || 0]);
  }
}

// Audit fix (CRITICAL #1): quo_no is assigned inside the transaction and now backed by a
// partial unique index (quotations_quo_no_uidx). Two concurrent saves can still both read
// the same MAX(quo_no) under READ COMMITTED, but the second one to COMMIT now fails the
// unique constraint instead of silently creating a duplicate — this wrapper catches exactly
// that violation and retries with a freshly-recomputed number, up to a few attempts.
async function insertQuotationWithRetry(b, userId) {
  const MAX_ATTEMPTS = 8;
  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 15 + Math.random() * 60 * attempt));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const clientId = await resolveOrCreateClient(client, b, userId);
      const previousPending = await computePreviousPending(client, clientId, 0);
      const t = computeTotals(b.items, b.deliverables, b);

      const noRes = await client.query('SELECT COALESCE(MAX(quo_no),406)+1 AS next FROM quotations');
      const quo_no = noRes.rows[0].next;
      const qdate = b.quo_date || new Date();

      const q = await client.query(`
        INSERT INTO quotations
          (quo_no, order_no, quo_date, client_name, client_id, couple_name, ref_by, package_name,
           address, contact_no, email, sub_total, discount, discount_percent, grand_total, note,
           wedding_deliverables, prewedding_deliverables, display_purchase_rate,
           service_tax_percent, service_tax_amount, sgst_percent, sgst_amount,
           igst_percent, igst_amount, gst_type, extra_charge, advance, total_pending,
           previous_pending, purchase_total, deliverables_total, entered_by,
           company_name, event_type, inquiry_date, gross_total, subtotal)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,
                $34,$35,$36,$37,$38) RETURNING *`,
        [quo_no, b.order_no || '-', qdate, b.client_name || '', clientId, b.couple_name || '',
         b.ref_by || '', b.package_name || '', b.address || '', b.contact_no || '', b.email || '',
         t.subTotal, t.discount, t.discountPercent, t.grandTotal, b.note || '',
         b.wedding_deliverables || '', b.prewedding_deliverables || '', !!b.display_purchase_rate,
         t.serviceTaxPercent, t.serviceTaxAmount, t.sgstPercent, t.sgstAmount,
         t.igstPercent, t.igstAmount, b.gst_type || 'STATE', t.extraCharge, t.advance, t.totalPending,
         previousPending, t.purchaseTotal, t.deliverablesTotal, userId,
         // duplicate legacy-compat columns — explicit params, not reused placeholders
         // (Postgres can't always unify a repeated placeholder's type across two column
         // positions in the same statement; using fresh params avoids that ambiguity)
         b.client_name || '', '', qdate, t.grandTotal, t.subTotal]);

      const qid = q.rows[0].id;
      await writeItemsAndDeliverables(client, qid, t.lineItems, b.deliverables || []);

      await client.query('COMMIT');
      return q.rows[0];
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      lastErr = err;
      if (err.code === '23505' && err.constraint === 'quotations_quo_no_uidx' && attempt < MAX_ATTEMPTS - 1) {
        continue; // another save won the race for this number — retry with a fresh one
      }
      throw err;
    } finally { client.release(); }
  }
  throw lastErr;
}

// POST /api/quotations
router.post('/', auth, async (req, res) => {
  await init;
  const b = req.body;
  const validationError = validateBody(b);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const row = await insertQuotationWithRetry(b, req.user.id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save quotation' });
    console.error('quotation create error:', err.message);
  }
});

// PUT /api/quotations/:id
router.put('/:id', auth, async (req, res) => {
  await init;
  const b = req.body;
  const validationError = validateBody(b);
  if (validationError) return res.status(400).json({ error: validationError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id, updated_at FROM quotations WHERE id=$1 AND delete_flag=false', [req.params.id]);
    if (!existing.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }

    // Audit fix (HIGH #3): optimistic concurrency. If the caller loaded this quotation
    // before someone else saved a change to it, updated_at will have moved — reject rather
    // than silently overwrite the other person's save.
    if (b.updated_at) {
      const dbTime = new Date(existing.rows[0].updated_at).getTime();
      const clientTime = new Date(b.updated_at).getTime();
      if (dbTime !== clientTime) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'This quotation was changed by someone else. Reload and try again.' });
      }
    }

    const clientId = await resolveOrCreateClient(client, b, req.user.id);
    const previousPending = await computePreviousPending(client, clientId, req.params.id);
    const t = computeTotals(b.items, b.deliverables, b);

    const q = await client.query(`
      UPDATE quotations SET
        quo_date=$1, client_name=$2, client_id=$3, couple_name=$4, ref_by=$5, package_name=$6,
        address=$7, contact_no=$8, email=$9, sub_total=$10, discount=$11, discount_percent=$12,
        grand_total=$13, note=$14, wedding_deliverables=$15, prewedding_deliverables=$16,
        display_purchase_rate=$17, service_tax_percent=$18, service_tax_amount=$19,
        sgst_percent=$20, sgst_amount=$21, igst_percent=$22, igst_amount=$23, gst_type=$24,
        extra_charge=$25, advance=$26, total_pending=$27, previous_pending=$28,
        purchase_total=$29, deliverables_total=$30, updated_by=$31, order_no=$37, updated_at=NOW(),
        company_name=$33, inquiry_date=$34, gross_total=$35, subtotal=$36
      WHERE id=$32 RETURNING *`,
      [b.quo_date || new Date(), b.client_name || '', clientId, b.couple_name || '', b.ref_by || '',
       b.package_name || '', b.address || '', b.contact_no || '', b.email || '', t.subTotal,
       t.discount, t.discountPercent, t.grandTotal, b.note || '', b.wedding_deliverables || '',
       b.prewedding_deliverables || '', !!b.display_purchase_rate, t.serviceTaxPercent,
       t.serviceTaxAmount, t.sgstPercent, t.sgstAmount, t.igstPercent, t.igstAmount,
       b.gst_type || 'STATE', t.extraCharge, t.advance, t.totalPending,
       previousPending, t.purchaseTotal, t.deliverablesTotal, req.user.id,
       req.params.id,
       // duplicate legacy-compat columns — explicit params (see insertQuotationWithRetry comment)
       b.client_name || '', b.quo_date || new Date(), t.grandTotal, t.subTotal,
       b.order_no || '-']);

    // Matches legacy TransData()/DeleteTransData(): full delete-and-reinsert of detail
    // rows, but wrapped in this transaction so a mid-save failure can't leave the header
    // saved with missing/partial details (legacy has no such guarantee).
    await client.query('DELETE FROM quotation_items WHERE quotation_id=$1', [req.params.id]);
    await client.query('DELETE FROM quotation_deliverable_items WHERE quotation_id=$1', [req.params.id]);
    await writeItemsAndDeliverables(client, req.params.id, t.lineItems, b.deliverables || []);

    await client.query('COMMIT');
    res.json(q.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to save quotation' });
    console.error('quotation update error:', err.message);
  } finally { client.release(); }
});

// DELETE /api/quotations/:id — blocked if this quo_no is referenced by an outdoor order
// (matches legacy DeleteValid(): MST_OUTORDER.QNO lifecycle guard), otherwise soft-deleted
// (delete_flag, matching every other table in this database — legacy hard-deletes, since
// it has no soft-delete concept anywhere; see "Known behavior differences").
router.delete('/:id', auth, async (req, res) => {
  await init;
  try {
    const q = await pool.query('SELECT quo_no FROM quotations WHERE id=$1 AND delete_flag=false', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ error: 'Not found' });

    // outdoor_orders has no delete_flag column (unlike every soft-deletable master table
    // in this database) — every row in it is live by definition today.
    const used = await pool.query(
      'SELECT COUNT(*) FROM outdoor_orders WHERE quo_no=$1',
      [q.rows[0].quo_no]);
    if (parseInt(used.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Quotation No is used in Order form' });
    }

    await pool.query('UPDATE quotations SET delete_flag=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete quotation' }); console.error('quotation delete error:', err.message); }
});

module.exports = router;
