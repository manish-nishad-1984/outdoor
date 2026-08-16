const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Web port of legacy FrmQuoOrder.vb ("Outdoor Order Book" — MST_OUTORDER/TNS_OUTORDER),
// carried forward from an earlier, simpler pass at this table. This revision brings it up
// to the same rigor as quotations.js (its mature sibling): real Account Master linkage for
// the customer and each item's operator, a Post Production Item grid (legacy TNS_WITEM3,
// same pattern as quotation_deliverable_items/TNS_WITEM2), previous-pending tracking, and a
// load-from-quotation flow mirroring CmbQNo_LostFocus.
//
// Deliberately NOT ported (confirmed dead/unportable in the legacy code itself, not just
// simplified): GST fields (TP/TR/SGP/SGR/IGP/IGR/GTYPE — all Visible=False in the Designer,
// and DisplayVatSettings() is an empty stub; production data is 0 across the board), the
// DPATH1/DPATH2 file-browse columns (Windows FolderBrowserDialog/explorer.exe — no web
// equivalent, no file-storage infra in this app), the second STFSMS flag and CMODEL per-row
// remark (both vestigial — the legacy "SMS" checkbox isn't even persisted, and CMODEL
// duplicates the existing item_remark field), the double-entry TNS_ORECIEPT/PAY_TNS ledger
// auto-sync on advance change (no live payments ledger exists yet, same documented gap as
// quotations.js's previous_pending), and the profit/expense panel (TxtPChrg/TxtOExpense via
// TNS_IO — no expense-ledger infra for orders exists yet).
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

  -- Added to bring this table up to quotations.js's level (client_id resolution, previous
  -- pending, bank-account-for-advance, optimistic concurrency, soft delete for symmetry).
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS client_id        INTEGER;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS bank_account_id  INTEGER;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS cheque_no        VARCHAR(50);
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS previous_pending NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS deliverables_total NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE outdoor_orders ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMP DEFAULT NOW();
  CREATE UNIQUE INDEX IF NOT EXISTS outdoor_orders_order_no_uidx ON outdoor_orders(order_no);

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
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS item_id       INTEGER;
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS event_id      INTEGER;
  ALTER TABLE outdoor_order_items ADD COLUMN IF NOT EXISTS operator_id   INTEGER;

  -- Post Production Item — legacy TNS_WITEM3, same shape/role as quotation_deliverable_items
  -- (TNS_WITEM2) for Quotation. Sums into sub_total alongside the main item grid, matching
  -- ShowTotal()'s confirmed TxtSTotal = SUM(TNS_OUTORDER.TOTAL) + SUM(TNS_WITEM3.AMT).
  CREATE TABLE IF NOT EXISTS outdoor_order_deliverable_items (
    id                  SERIAL PRIMARY KEY,
    outdoor_order_id    INTEGER REFERENCES outdoor_orders(id) ON DELETE CASCADE,
    deliverable_item_id INTEGER REFERENCES deliverable_items(id),
    item_name           VARCHAR(200),
    qnty                NUMERIC(12,2) DEFAULT 0,
    amount              NUMERIC(12,2) DEFAULT 0
  );
`).catch(err => console.error('outdoor_orders table init error:', err.message));

const CLIENT_GROUP   = 'CLIENT';
const OPERATOR_GROUP = 'EXPOSER/PARTY';
const BANK_GROUP      = 'BANK';

async function getGroupId(client, groupName) {
  const r = await client.query('SELECT id FROM account_groups WHERE UPPER(group_name)=UPPER($1) AND delete_flag=false', [groupName]);
  return r.rows[0]?.id || null;
}

// Same resolve-by-id-then-by-name-or-create pattern as quotations.js's resolveOrCreateClient.
async function resolveAccountInGroup(client, groupName, { id, name, address, contact_no, email }, userId, createIfMissing) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  if (id) {
    const byId = await client.query('SELECT id, account_name FROM accounts WHERE id=$1 AND delete_flag=false', [id]);
    if (byId.rows.length && byId.rows[0].account_name.trim().toUpperCase() === trimmed.toUpperCase()) {
      return byId.rows[0].id;
    }
  }

  const groupId = await getGroupId(client, groupName);
  if (!groupId) return null;
  const existing = await client.query(
    'SELECT id FROM accounts WHERE UPPER(account_name)=UPPER($1) AND agent_id=$2 AND delete_flag=false',
    [trimmed, groupId]);
  if (existing.rows.length) return existing.rows[0].id;
  if (!createIfMissing) return null;
  const created = await client.query(
    `INSERT INTO accounts(account_name, agent_id, permanent_address, mobile_no, email, delete_flag, status_flag, entered_by)
     VALUES($1,$2,$3,$4,$5,false,true,$6) RETURNING id`,
    [trimmed, groupId, address || null, contact_no || null, email || null, userId]);
  return created.rows[0].id;
}

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

// Mirrors computePreviousPending in quotations.js, scoped to outdoor_orders.
async function computePreviousPending(client, clientId, excludeId) {
  if (!clientId) return 0;
  const acc = await client.query('SELECT opening_balance, credit_debit FROM accounts WHERE id=$1', [clientId]);
  if (!acc.rows.length) return 0;
  const billed = await client.query(
    'SELECT COALESCE(SUM(grand_total),0) AS t FROM outdoor_orders WHERE client_id=$1 AND id<>$2',
    [clientId, excludeId || 0]);
  const openingDebit = acc.rows[0].credit_debit === 'Dr' ? Number(acc.rows[0].opening_balance || 0) : 0;
  return round2(Number(billed.rows[0].t) + openingDebit);
}

// Authoritative server-side totals — mirrors ShowTotal()/DisplayGTotal() in FrmQuoOrder.vb,
// minus the (confirmed dead/hidden) GST lines. GTOTAL(legacy) = SubTotal - Discount;
// TPENDING = GTotal - Advance; PPENDING = previous_pending, computed separately.
function computeTotals(items = [], deliverables = [], b = {}) {
  const lineItems = items.map(it => ({ ...it, total: round2(Number(it.qnty || 0) * Number(it.rate || 0)) }));
  const linesTotal = lineItems.reduce((s, it) => s + it.total, 0);
  const deliverablesTotal = deliverables.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const subTotal = round2(linesTotal + deliverablesTotal);
  const discount = round2(Number(b.discount) || 0);
  const grandTotal = Math.max(0, round2(subTotal - discount));
  const advance = Number(b.advance) || 0;
  const totalPending = Math.max(0, round2(grandTotal - advance));
  return { lineItems, subTotal, deliverablesTotal, discount, grandTotal, advance, totalPending };
}

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

// GET /api/outdoor-orders/client-info?client_name=  — mirrors quotations.js's client-info:
// auto-fill address/contact, and this client's previous pending balance from other orders.
router.get('/client-info', auth, async (req, res) => {
  await init;
  const name = (req.query.client_name || '').trim();
  if (!name) return res.json(null);
  try {
    const groupId = await getGroupId(pool, CLIENT_GROUP);
    const acc = await pool.query(
      `SELECT id, permanent_address, mobile_no, email FROM accounts
       WHERE UPPER(account_name)=UPPER($1) AND agent_id=$2 AND delete_flag=false`,
      [name, groupId]);
    if (!acc.rows.length) return res.json(null);
    const a = acc.rows[0];
    const excludeId = req.query.exclude_id || 0;
    const previousPending = await computePreviousPending(pool, a.id, excludeId);
    res.json({
      client_id: a.id, address: a.permanent_address || '', contact_no: a.mobile_no || '',
      email: a.email || '', previous_pending: previousPending,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/outdoor-orders/available-quotations?client_name=
// Mirrors CmbPName_SelectionChangeCommitted's CmbQNo fill: this client's quotations that
// aren't already linked to another order (legacy: MST_OUTORDER.QNO NOT IN subquery). Add-mode
// only, per the confirmed legacy behavior (Edit mode doesn't filter — see report §5); the
// frontend only calls this when composing a new order.
router.get('/available-quotations', auth, async (req, res) => {
  await init;
  const name = (req.query.client_name || '').trim();
  try {
    const used = await pool.query('SELECT DISTINCT quo_no FROM outdoor_orders WHERE quo_no IS NOT NULL');
    const usedNos = used.rows.map(r => r.quo_no);
    const params = [usedNos];
    let where = 'delete_flag=false AND NOT (quo_no = ANY($1))';
    if (name) { where += ' AND UPPER(client_name)=UPPER($2)'; params.push(name); }
    const r = await pool.query(
      `SELECT id, quo_no, quo_date, client_name, couple_name FROM quotations WHERE ${where} ORDER BY quo_no DESC`,
      params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/outdoor-orders/from-quotation/:quoNo — prefill payload for a brand-new order,
// mirrors CmbQNo_LostFocus copying MST_QUOTATION + TNS_QUOTATION + TNS_WITEM2 into the order
// form (operator left blank per row — a quotation doesn't book staff).
router.get('/from-quotation/:quoNo', auth, async (req, res) => {
  await init;
  try {
    const q = await pool.query('SELECT * FROM quotations WHERE quo_no=$1 AND delete_flag=false', [req.params.quoNo]);
    if (!q.rows.length) return res.status(404).json({ error: 'Quotation not found' });
    const quotation = q.rows[0];
    const items = await pool.query('SELECT * FROM quotation_items WHERE quotation_id=$1 ORDER BY id', [quotation.id]);
    const deliverables = await pool.query('SELECT * FROM quotation_deliverable_items WHERE quotation_id=$1 ORDER BY id', [quotation.id]);
    res.json({
      client_name: quotation.client_name, client_id: quotation.client_id,
      couple_name: quotation.couple_name, remark: quotation.note, ref_by: quotation.ref_by,
      address: quotation.address, mob_no: quotation.contact_no, package_name: quotation.package_name,
      discount: quotation.discount,
      items: items.rows.map(it => ({
        function_date: it.function_date, item_name: it.item_name, item_id: it.item_id,
        event_name: it.event_name, event_id: it.event_id, qnty: it.qnty, rate: it.rate,
        total: it.total, place: it.place,
        operator_name: '', operator_id: null, op_rate: 0, // legacy: operator not carried over
      })),
      deliverables: deliverables.rows.map(d => ({
        deliverable_item_id: d.deliverable_item_id, item_name: d.item_name, qnty: d.qnty, amount: d.amount,
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/outdoor-orders/:id
router.get('/:id', auth, async (req, res) => {
  await init;
  try {
    const order = await pool.query(`SELECT * FROM outdoor_orders WHERE id=$1`, [req.params.id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query(`SELECT * FROM outdoor_order_items WHERE outdoor_order_id=$1 ORDER BY id`, [req.params.id]);
    const deliverables = await pool.query(`SELECT * FROM outdoor_order_deliverable_items WHERE outdoor_order_id=$1 ORDER BY id`, [req.params.id]);
    res.json({ ...order.rows[0], items: items.rows, deliverables: deliverables.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function validateBody(b) {
  if (!b.cust_name || !String(b.cust_name).trim()) return 'Customer name required';
  if (!Array.isArray(b.items) || b.items.length === 0) return 'Add at least one item';
  return null;
}

async function writeDetails(client, orderId, items = [], deliverables = []) {
  for (const it of items) {
    await client.query(`
      INSERT INTO outdoor_order_items
        (outdoor_order_id, function_date, item_name, item_name_snap, item_id, event_name, event_id,
         qnty, box_qty, rate, total, place, time_slot, data_issue_from_operator,
         operator_id, operator_name, op_rate, item_remark, sms_flag, data_flag, data1, date1)
      VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [orderId, it.function_date || null, it.item_name || '', it.item_id || null,
       it.event_name || '', it.event_id || null, it.qnty || 0, it.rate || 0, it.total || 0,
       it.place || '', it.time_slot || '', !!it.data_issue_from_operator, it.operator_id || null,
       it.operator_name || '', it.op_rate || 0, it.item_remark || '', !!it.sms_flag,
       !!it.data_flag, it.data1 || '', it.date1 || null]);
  }
  for (const d of deliverables) {
    if (!d.deliverable_item_id) continue;
    await client.query(`
      INSERT INTO outdoor_order_deliverable_items (outdoor_order_id, deliverable_item_id, item_name, qnty, amount)
      VALUES ($1,$2,$3,$4,$5)`,
      [orderId, d.deliverable_item_id, d.item_name || '', d.qnty || 0, d.amount || 0]);
  }
}

const ORDER_COLS = `mob_no, address, quo_no, couple_name, ref_by, package_name,
  sub_total, subtotal, discount, grand_total, gross_total, advance, total_pending, payment_mode,
  remark, display_staff_expenses, final_delivery_notes, prewedding_deliverables, family_detail,
  st_selection, st_invitation, st_data, st_delivery, st_desining, st_printing, st_dvd_pendrive,
  st_done, st_reels, desining_opt, printing_opt, dvd_opt,
  client_id, bank_account_id, cheque_no, previous_pending, deliverables_total`;

function orderValues(b, t, clientId, bankAccountId, previousPending) {
  return [
    b.mob_no || '', b.address || '', b.quo_no || null, b.couple_name || '', b.ref_by || '',
    b.package_name || '', t.subTotal, t.subTotal, t.discount, t.grandTotal, t.grandTotal,
    t.advance, t.totalPending, b.payment_mode || 'Cash', b.remark || '', !!b.display_staff_expenses,
    b.final_delivery_notes || '', b.prewedding_deliverables || '', b.family_detail || '',
    !!b.st_selection, !!b.st_invitation, !!b.st_data, !!b.st_delivery, !!b.st_desining,
    !!b.st_printing, !!b.st_dvd_pendrive, !!b.st_done, !!b.st_reels, b.desining_opt || '',
    b.printing_opt || '', b.dvd_opt || '',
    clientId, bankAccountId, b.cheque_no || '', previousPending, t.deliverablesTotal,
  ];
}

// POST /api/outdoor-orders
router.post('/', auth, async (req, res) => {
  await init;
  const b = req.body;
  const validationError = validateBody(b);
  if (validationError) return res.status(400).json({ error: validationError });

  const MAX_ATTEMPTS = 5;
  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 15 + Math.random() * 60 * attempt));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const clientId = await resolveAccountInGroup(client, CLIENT_GROUP,
        { id: b.client_id, name: b.cust_name, address: b.address, contact_no: b.mob_no }, req.user.id, true);
      const bankAccountId = b.payment_mode === 'Bank Transfer' || b.payment_mode === 'Cheque'
        ? await resolveAccountInGroup(client, BANK_GROUP, { id: b.bank_account_id, name: b.bank_name }, req.user.id, false)
        : null;
      const previousPending = await computePreviousPending(client, clientId, 0);
      const t = computeTotals(b.items, b.deliverables, b);

      const noRes = await client.query(
        `SELECT COALESCE(MAX(NULLIF(regexp_replace(order_no,'\\D','','g'),'')::int),260)+1 AS next FROM outdoor_orders`);
      const order_no = String(noRes.rows[0].next);
      const odate = b.order_date || new Date();

      const params = [order_no, b.cust_name || '', b.cust_name || '', b.mob_no || '', '',
                      odate, odate, req.user.id, ...orderValues(b, t, clientId, bankAccountId, previousPending)];
      const ph = params.map((_, i) => `$${i+1}`).join(',');
      const order = await client.query(
        `INSERT INTO outdoor_orders
           (order_no, company_name, cust_name, contact_no, event_type, order_date, inquiry_date, entered_by, ${ORDER_COLS})
         VALUES (${ph}) RETURNING *`, params);

      await writeDetails(client, order.rows[0].id, t.lineItems, b.deliverables);
      await client.query('COMMIT');
      return res.status(201).json(order.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      lastErr = err;
      if (err.code === '23505' && err.constraint === 'outdoor_orders_order_no_uidx' && attempt < MAX_ATTEMPTS - 1) {
        continue; // race on order_no — retry with a fresh number
      }
      return res.status(500).json({ error: err.message });
    } finally { client.release(); }
  }
  res.status(500).json({ error: lastErr?.message || 'Failed to save order' });
});

// PUT /api/outdoor-orders/:id
router.put('/:id', auth, async (req, res) => {
  await init;
  const b = req.body;
  const validationError = validateBody(b);
  if (validationError) return res.status(400).json({ error: validationError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id, updated_at FROM outdoor_orders WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    if (b.updated_at) {
      const dbTime = new Date(existing.rows[0].updated_at).getTime();
      const clientTime = new Date(b.updated_at).getTime();
      if (dbTime !== clientTime) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'This order was changed by someone else. Reload and try again.' });
      }
    }

    const clientId = await resolveAccountInGroup(client, CLIENT_GROUP,
      { id: b.client_id, name: b.cust_name, address: b.address, contact_no: b.mob_no }, req.user.id, true);
    const bankAccountId = b.payment_mode === 'Bank Transfer' || b.payment_mode === 'Cheque'
      ? await resolveAccountInGroup(client, BANK_GROUP, { id: b.bank_account_id, name: b.bank_name }, req.user.id, false)
      : null;
    const previousPending = await computePreviousPending(client, clientId, req.params.id);
    const t = computeTotals(b.items, b.deliverables, b);
    const odate = b.order_date || new Date();

    const lead = ['company_name', 'cust_name', 'contact_no', 'order_date', 'inquiry_date', 'updated_by', 'updated_at'];
    const leadVals = [b.cust_name || '', b.cust_name || '', b.mob_no || '', odate, odate, req.user.id, new Date()];
    const allCols = [...lead, ...ORDER_COLS.split(',').map(c => c.trim())];
    const allVals = [...leadVals, ...orderValues(b, t, clientId, bankAccountId, previousPending)];
    const setSql = allCols.map((c, i) => `${c}=$${i+1}`).join(', ');
    allVals.push(req.params.id);
    const order = await client.query(
      `UPDATE outdoor_orders SET ${setSql} WHERE id=$${allVals.length} RETURNING *`, allVals);

    await client.query('DELETE FROM outdoor_order_items WHERE outdoor_order_id=$1', [req.params.id]);
    await client.query('DELETE FROM outdoor_order_deliverable_items WHERE outdoor_order_id=$1', [req.params.id]);
    await writeDetails(client, req.params.id, t.lineItems, b.deliverables);
    await client.query('COMMIT');
    res.json(order.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// DELETE /api/outdoor-orders/:id
router.delete('/:id', auth, async (req, res) => {
  await init;
  try {
    await pool.query('DELETE FROM outdoor_order_items WHERE outdoor_order_id=$1', [req.params.id]);
    await pool.query('DELETE FROM outdoor_order_deliverable_items WHERE outdoor_order_id=$1', [req.params.id]);
    await pool.query('DELETE FROM outdoor_orders WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
